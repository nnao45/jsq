/**
 * Lightweight syntax checker for partial expressions
 */

const OPENING_BRACKETS = ['(', '[', '{'];
const CLOSING_BRACKETS = [')', ']', '}'];
const BRACKET_PAIRS: { [key: string]: string } = {
  '(': ')',
  '[': ']',
  '{': '}',
};

/**
 * Check if expression looks like it could be partial/incomplete
 */
export function isLikelyPartial(expression: string): boolean {
  const trimmed = expression.trim();

  if (!trimmed) return true;

  // Ends with operators that expect more input
  if (endsWithOperator(trimmed)) return true;

  // Has unmatched brackets
  if (hasUnmatchedBrackets(trimmed)) return true;

  // Ends with dot (property access)
  if (trimmed.endsWith('.')) return true;

  // Inside string literal
  if (isInsideString(trimmed)) return true;

  return false;
}

/**
 * Get completion suggestions for the current expression
 */
export function getSuggestions(expression: string): string[] {
  const trimmed = expression.trim();

  if (trimmed.endsWith('$.')) {
    return ['filter()', 'map()', 'find()', 'length', 'pluck()', 'where()', 'sortBy()'];
  }

  if (trimmed.endsWith('$.users.')) {
    return ['filter()', 'map()', 'find()', 'length', 'pluck()', 'where()', 'sortBy()'];
  }

  if (trimmed === '$') {
    return ['.filter()', '.map()', '.length', '.keys()'];
  }

  return [];
}

function endsWithOperator(expression: string): boolean {
  const operators = [
    '+',
    '-',
    '*',
    '/',
    '%',
    '===',
    '==',
    '!==',
    '!=',
    '>',
    '<',
    '>=',
    '<=',
    '&&',
    '||',
    '=',
    '=>',
  ];
  return operators.some(op => expression.trimEnd().endsWith(op));
}

function hasUnmatchedBrackets(expression: string): boolean {
  const stack: string[] = [];
  const { inString } = processStringLiterals(expression, (_i, char) => {
    if (OPENING_BRACKETS.includes(char)) {
      stack.push(char);
      return true;
    }

    if (CLOSING_BRACKETS.includes(char)) {
      return processBracketPair(stack, char);
    }

    return true;
  });

  return stack.length > 0 || inString;
}

function processStringLiterals(
  expression: string,
  callback: (index: number, char: string) => boolean
): { inString: boolean } {
  let inString = false;
  let stringChar: string | undefined;

  for (let i = 0; i < expression.length; i++) {
    const char = expression.charAt(i);
    const prevChar = i > 0 ? expression.charAt(i - 1) : '';

    if (handleStringDelimiter(char, prevChar, inString, stringChar)) {
      const result = updateStringState(char, inString, stringChar);
      inString = result.inString;
      stringChar = result.stringChar;
      continue;
    }

    if (!inString && !callback(i, char)) {
      break;
    }
  }

  return { inString };
}

function handleStringDelimiter(
  char: string,
  prevChar: string,
  _inString: boolean,
  _stringChar: string | undefined
): boolean {
  return (char === '"' || char === "'") && prevChar !== '\\\\';
}

function updateStringState(
  char: string,
  inString: boolean,
  stringChar: string | undefined
): { inString: boolean; stringChar: string | undefined } {
  if (!inString) {
    return { inString: true, stringChar: char };
  }

  if (char === stringChar) {
    return { inString: false, stringChar: '' };
  }

  return { inString, stringChar };
}

function processBracketPair(stack: string[], char: string): boolean {
  if (stack.length === 0) return false; // Unmatched closing bracket

  const lastOpening = stack.pop();
  if (lastOpening && BRACKET_PAIRS[lastOpening] !== char) {
    return false; // Mismatched bracket pair
  }

  return true;
}

function isInsideString(expression: string): boolean {
  const { inString } = processStringLiterals(expression, () => true);
  return inString;
}
