/**
 * Lightweight syntax checker for partial expressions
 */
export class SyntaxChecker {
  private static readonly OPENING_BRACKETS = ['(', '[', '{'];
  private static readonly CLOSING_BRACKETS = [')', ']', '}'];
  private static readonly BRACKET_PAIRS: { [key: string]: string } = {
    '(': ')',
    '[': ']',
    '{': '}'
  };

  /**
   * Check if expression looks like it could be partial/incomplete
   */
  static isLikelyPartial(expression: string): boolean {
    const trimmed = expression.trim();
    
    if (!trimmed) return true;
    
    // Ends with operators that expect more input
    if (this.endsWithOperator(trimmed)) return true;
    
    // Has unmatched brackets
    if (this.hasUnmatchedBrackets(trimmed)) return true;
    
    // Ends with dot (property access)
    if (trimmed.endsWith('.')) return true;
    
    // Inside string literal
    if (this.isInsideString(trimmed)) return true;
    
    return false;
  }
  
  /**
   * Get completion suggestions for the current expression
   */
  static getSuggestions(expression: string): string[] {
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
  
  private static endsWithOperator(expression: string): boolean {
    const operators = ['+', '-', '*', '/', '%', '===', '==', '!==', '!=', '>', '<', '>=', '<=', '&&', '||', '=', '=>'];
    return operators.some(op => expression.trimEnd().endsWith(op));
  }
  
  private static hasUnmatchedBrackets(expression: string): boolean {
    const stack: string[] = [];
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];
      const prevChar = i > 0 ? expression[i - 1] : '';
      
      // Handle string literals
      if ((char === '"' || char === "'") && prevChar !== '\\\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
        continue;
      }
      
      if (inString) continue;
      
      if (this.OPENING_BRACKETS.includes(char)) {
        stack.push(char);
      } else if (this.CLOSING_BRACKETS.includes(char)) {
        if (stack.length === 0) return true; // Unmatched closing bracket
        
        const lastOpening = stack.pop();
        if (this.BRACKET_PAIRS[lastOpening!] !== char) {
          return true; // Mismatched bracket pair
        }
      }
    }
    
    return stack.length > 0 || inString; // Unmatched opening brackets or unclosed string
  }
  
  private static isInsideString(expression: string): boolean {
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];
      const prevChar = i > 0 ? expression[i - 1] : '';
      
      if ((char === '"' || char === "'") && prevChar !== '\\\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
    }
    
    return inString;
  }
}