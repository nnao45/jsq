/**
 * Transform expression to handle special cases like standalone '$'
 * This is used for non-streaming mode where $ is a complex function/proxy
 */
export function transformExpression(expression: string): string {
  const trimmed = expression.trim();

  // Handle variable declaration with pipeline (const a = 'xx' | a.toString())
  if (hasVariablePipelineDeclaration(trimmed)) {
    return transformVariablePipelineDeclaration(trimmed);
  }

  // Handle pipe operations like '$.users | $'
  if (hasPipeOperator(trimmed)) {
    return transformPipeExpression(trimmed);
  }

  // Handle array literals with method calls
  if (isArrayLiteralWithMethods(trimmed)) {
    return transformArrayLiteralExpression(trimmed);
  }

  // Handle async methods that return generators (interval, timer)
  if (hasAsyncGeneratorMethods(trimmed)) {
    return transformAsyncGeneratorExpression(trimmed);
  }

  // Handle standalone '$' - convert to '$()' to get the data wrapper
  if (trimmed === '$') {
    return '$()';
  }

  return expression;
}

/**
 * Check if expression contains async generator methods
 */
export function hasAsyncGeneratorMethods(expression: string): boolean {
  // Check for methods that return async generators
  const asyncGeneratorMethods = ['interval', 'timer'];
  return asyncGeneratorMethods.some(
    method =>
      expression.includes(`.${method}(`) || expression.match(new RegExp(`\\$\\.${method}\\(`))
  );
}

/**
 * Check if expression is an array literal with method calls
 */
export function isArrayLiteralWithMethods(expression: string): boolean {
  const trimmed = expression.trim();
  return (
    trimmed.startsWith('[') &&
    trimmed.includes('].') &&
    !trimmed.startsWith('$.') &&
    !trimmed.startsWith('_.')
  );
}

/**
 * Find the end index of an array literal considering nested structures and strings
 */
function findArrayEndIndex(expression: string): number {
  let bracketCount = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    const prevChar = expression[i - 1];

    if (shouldUpdateStringState(char, prevChar, inString, stringChar)) {
      const stringState = getStringState(char, prevChar, inString, stringChar);
      inString = stringState.inString;
      stringChar = stringState.stringChar;
      continue;
    }

    if (inString) continue;

    if (char === '[') {
      bracketCount++;
    } else if (char === ']') {
      bracketCount--;
      if (bracketCount === 0) {
        return i;
      }
    }
  }

  return -1; // Malformed array
}

/**
 * Check if string state should be updated
 */
function shouldUpdateStringState(
  char: string,
  prevChar: string,
  inString: boolean,
  stringChar: string
): boolean {
  return (!inString && isQuoteChar(char)) || (inString && char === stringChar && prevChar !== '\\');
}

/**
 * Get updated string state
 */
function getStringState(
  char: string,
  prevChar: string,
  inString: boolean,
  stringChar: string
): { inString: boolean; stringChar: string } {
  if (!inString && isQuoteChar(char)) {
    return { inString: true, stringChar: char };
  }

  if (inString && char === stringChar && prevChar !== '\\') {
    return { inString: false, stringChar: '' };
  }

  return { inString, stringChar };
}

/**
 * Check if character is a quote character
 */
function isQuoteChar(char: string): boolean {
  return char === '"' || char === "'" || char === '`';
}

/**
 * Transform array literal expressions to wrap with createSmartDollar
 */
export function transformArrayLiteralExpression(expression: string): string {
  const trimmed = expression.trim();
  const arrayEndIndex = findArrayEndIndex(trimmed);

  if (arrayEndIndex === -1) {
    return expression; // Malformed array
  }

  const arrayPart = trimmed.substring(0, arrayEndIndex + 1);
  const methodPart = trimmed.substring(arrayEndIndex + 1);

  // Transform to createSmartDollar(array).methods
  return `createSmartDollar(${arrayPart})${methodPart}`;
}

/**
 * Transform expressions with async generator methods
 */
export function transformAsyncGeneratorExpression(expression: string): string {
  // For now, just return the expression as-is
  // The evaluator will handle async generator detection and processing
  return expression;
}

interface ParseState {
  inString: boolean;
  stringChar: string;
  parenDepth: number;
  braceDepth: number;
  bracketDepth: number;
}

function createInitialParseState(): ParseState {
  return {
    inString: false,
    stringChar: '',
    parenDepth: 0,
    braceDepth: 0,
    bracketDepth: 0,
  };
}

function updateStringState(state: ParseState, char: string, prevChar: string): void {
  if (!state.inString && (char === '"' || char === "'" || char === '`')) {
    state.inString = true;
    state.stringChar = char;
    return;
  }

  if (state.inString && char === state.stringChar && prevChar !== '\\') {
    state.inString = false;
    state.stringChar = '';
  }
}

function updateBracketDepth(state: ParseState, char: string): void {
  if (char === '(') state.parenDepth++;
  if (char === ')') state.parenDepth--;
  if (char === '{') state.braceDepth++;
  if (char === '}') state.braceDepth--;
  if (char === '[') state.bracketDepth++;
  if (char === ']') state.bracketDepth--;
}

function isPipeOperatorAt(expression: string, i: number, state: ParseState): boolean {
  const char = expression[i];
  const next = expression[i + 1];
  const afterNext = expression[i + 2];

  return (
    char === ' ' &&
    next === '|' &&
    afterNext === ' ' &&
    state.parenDepth === 0 &&
    state.braceDepth === 0 &&
    state.bracketDepth === 0
  );
}

/**
 * Check if expression contains pipe operator
 */
export function hasPipeOperator(expression: string): boolean {
  const state = createInitialParseState();

  for (let i = 0; i < expression.length - 2; i++) {
    const char = expression[i];
    const prevChar = expression[i - 1] || '';

    updateStringState(state, char, prevChar);

    if (state.inString) continue;

    updateBracketDepth(state, char);

    if (isPipeOperatorAt(expression, i, state)) {
      return true;
    }
  }

  return false;
}

/**
 * Transform pipe expressions like '$.users | $.filter(...) | $.length'
 */
export function transformPipeExpression(expression: string): string {
  const parts = splitByPipe(expression);

  if (parts.length <= 1) {
    return expression;
  }

  let result = parts[0].trim();

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();

    // If the part starts with '$', replace it with the result of previous operation
    if (part.startsWith('$')) {
      // Replace '$' with the result from previous operation
      result = part.replace(/^\$/, `(${result})`);
    } else if (
      part.startsWith('_.') ||
      part.startsWith('lodash.') ||
      part.match(
        /^(Math|Date|Object|Array|String|Number|Boolean|console)\.[a-zA-Z_$][a-zA-Z0-9_$]*\(/
      )
    ) {
      // If it's a utility function call (_.method, lodash.method) or global object method (Math.max, Date.now), use it directly
      result = part;
    } else {
      // If it doesn't start with '$', assume it's a method call on the previous result
      result = `(${result}).${part}`;
    }
  }

  return result;
}

function handleStringChar(state: ParseState, char: string, prev: string): string {
  updateStringState(state, char, prev);
  return char;
}

function shouldSplitAtPipe(char: string, prev: string, next: string, state: ParseState): boolean {
  return (
    char === '|' &&
    prev === ' ' &&
    next === ' ' &&
    state.parenDepth === 0 &&
    state.braceDepth === 0 &&
    state.bracketDepth === 0
  );
}

function processSplit(parts: string[], current: string): string {
  parts.push(current.trim());
  return '';
}

function addFinalPart(parts: string[], current: string): void {
  if (current.trim()) {
    parts.push(current.trim());
  }
}

/**
 * Split expression by pipe operator, respecting strings and parentheses
 */
export function splitByPipe(expression: string): string[] {
  const parts: string[] = [];
  let current = '';
  const state = createInitialParseState();

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    const next = expression[i + 1];
    const prev = expression[i - 1];

    const charToAdd = handleStringChar(state, char, prev);
    current += charToAdd;

    if (state.inString) continue;

    updateBracketDepth(state, char);

    if (shouldSplitAtPipe(char, prev, next, state)) {
      current = current.slice(0, -1); // Remove the '|' from current
      current = processSplit(parts, current);
      i++; // Skip the space after '|'
    }
  }

  addFinalPart(parts, current);
  return parts;
}

/**
 * Check if expression contains variable declaration with pipeline syntax
 * Examples: const a = 'xx' | a.toString(), let b = [1,2,3] | b.length
 */
function hasVariablePipelineDeclaration(expression: string): boolean {
  const trimmed = expression.trim();

  // Match patterns like "const varName = value | ..." or "let varName = value | ..."
  const variableDeclarationPattern =
    /^(const|let)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^|]+)\s*\|\s*(.+)$/;
  return variableDeclarationPattern.test(trimmed);
}

/**
 * Transform variable pipeline declaration into executable JavaScript
 * const a = 'xx' | a.toString() becomes (() => { const a = 'xx'; return a.toString(); })()
 */
function transformVariablePipelineDeclaration(expression: string): string {
  const trimmed = expression.trim();

  // Extract parts: declaration type, variable name, initial value, pipeline expression
  const match = trimmed.match(
    /^(const|let)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^|]+)\s*\|\s*(.+)$/
  );

  if (!match) {
    return expression; // Should not happen if hasVariablePipelineDeclaration returned true
  }

  const [, _declType, varName, initialValue, pipelineExpr] = match;

  // Create an IIFE (Immediately Invoked Function Expression) to scope the variable
  // Also unwrap ChainableWrapper values using valueOf() or .value if available
  return `(() => { 
    let ${varName} = ${initialValue.trim()}; 
    if (${varName} && typeof ${varName} === 'object' && ('value' in ${varName} || 'valueOf' in ${varName})) {
      ${varName} = ${varName}.value !== undefined ? ${varName}.value : ${varName}.valueOf();
    }
    return ${pipelineExpr.trim()}; 
  })()`;
}

// Keep backwards compatibility
export const ExpressionTransformer = {
  transform: transformExpression,
  hasPipeOperator,
  transformPipeExpression,
  splitByPipe,
  hasVariablePipelineDeclaration,
  transformVariablePipelineDeclaration,
};
