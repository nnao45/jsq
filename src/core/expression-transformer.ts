/**
 * Transform expression to handle special cases like standalone '$'
 * This is used for non-streaming mode where $ is a complex function/proxy
 */
export function transformExpression(expression: string): string {
  const trimmed = expression.trim();

  // Handle pipe operations like '$.users | $'
  if (hasPipeOperator(trimmed)) {
    return transformPipeExpression(trimmed);
  }

  // Handle standalone '$' - convert to '$()' to get the data wrapper
  if (trimmed === '$') {
    return '$()';
  }

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

// Keep backwards compatibility
export const ExpressionTransformer = {
  transform: transformExpression,
  hasPipeOperator,
  transformPipeExpression,
  splitByPipe,
};
