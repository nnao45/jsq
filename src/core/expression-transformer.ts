/**
 * Expression transformer to handle special cases and syntax sugar
 */
export class ExpressionTransformer {
  
  /**
   * Transform expression to handle special cases like standalone '$'
   * This is used for non-streaming mode where $ is a complex function/proxy
   */
  static transform(expression: string): string {
    const trimmed = expression.trim();
    
    // Handle pipe operations like '$.users | $'
    if (this.hasPipeOperator(trimmed)) {
      return this.transformPipeExpression(trimmed);
    }
    
    // Handle standalone '$' - convert to '$()' to get the data wrapper
    if (trimmed === '$') {
      return '$()';
    }
    
    // For arithmetic expressions with $.property, convert to data.property for consistency
    // This avoids the ChainableWrapper issue in complex expressions
    if (this.hasArithmeticWithDollar(trimmed)) {
      return this.toDataExpression(trimmed);
    }
    
    // Handle '$.' patterns - these should work as-is for simple property access
    if (trimmed.startsWith('$.') && !this.hasArithmeticOperators(trimmed)) {
      return trimmed;
    }
    
    // Handle other $ patterns that might need transformation
    // For now, pass through as-is
    return trimmed;
  }
  
  /**
   * Check if expression has pipe operators
   */
  static hasPipeOperator(expression: string): boolean {
    return expression.includes('|');
  }
  
  /**
   * Transform pipe expressions like '$.users | $' to proper function calls
   */
  static transformPipeExpression(expression: string): string {
    // Split by pipe operator, but be careful with strings and nested expressions
    const parts = this.splitByPipe(expression);
    
    if (parts.length < 2) {
      return expression;
    }
    
    // Start with the first expression
    let result = parts[0].trim();
    
    // Apply each subsequent pipe operation
    for (let i = 1; i < parts.length; i++) {
      const pipeExpr = parts[i].trim();
      
      if (pipeExpr === '$') {
        // '| $' means "pass the result through unchanged"
        // Convert to a function call that returns the value
        result = `(function(temp) { return $(temp).valueOf(); })(${result})`;
      } else if (pipeExpr.startsWith('$.')) {
        // '| $.method()' or '| $.property' means "apply to the result"
        const chainExpression = pipeExpr.substring(2);
        
        // Check if the result is already a $ expression to avoid double wrapping
        if (result.startsWith('$.')) {
          // Already a $ expression - just chain directly
          result = `${result}.${chainExpression}`;
        } else {
          // Complex expression or method call - wrap in $()
          result = `$(${result}).${chainExpression}`;
        }
      } else {
        // General pipe operation - wrap in a function
        // Replace $ in the pipe expression with the result
        const transformedPipe = pipeExpr.replace(/\$/g, `$(${result})`);
        result = transformedPipe;
      }
    }
    
    return result;
  }
  
  /**
   * Split expression by pipe operator, respecting strings and parentheses
   */
  static splitByPipe(expression: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];
      const prevChar = i > 0 ? expression[i - 1] : '';
      
      if (!inString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
        } else if (char === '(') {
          depth++;
        } else if (char === ')') {
          depth--;
        } else if (char === '|' && depth === 0) {
          parts.push(current);
          current = '';
          continue;
        }
      } else {
        if (char === stringChar && prevChar !== '\\') {
          inString = false;
          stringChar = '';
        }
      }
      
      current += char;
    }
    
    if (current) {
      parts.push(current);
    }
    
    return parts;
  }
  
  /**
   * Check if expression has arithmetic operations with $ references
   */
  static hasArithmeticWithDollar(expression: string): boolean {
    // Check for any $ reference in combination with arithmetic operators
    return /\$/.test(expression) && /[\+\-\*\/\%]/.test(expression);
  }
  
  /**
   * Check if expression has arithmetic operators
   */
  static hasArithmeticOperators(expression: string): boolean {
    return /[\+\-\*\/\%]/.test(expression);
  }
  
  /**
   * Detect if expression needs data access optimization
   */
  static needsDataAccess(expression: string): boolean {
    const trimmed = expression.trim();
    return trimmed === '$' || trimmed.startsWith('$.') || trimmed.includes('$.');
  }
  
  /**
   * Convert expression to use 'data' variable for better performance in streaming
   */
  static toDataExpression(expression: string): string {
    const trimmed = expression.trim();
    
    // Convert standalone '$' to 'data'
    if (trimmed === '$') {
      return 'data';
    }
    
    // Handle more complex patterns first (contains operators or multiple $ references)
    let transformed = trimmed;
    
    // Replace all $.property patterns with data.property
    transformed = transformed.replace(/\$\.(\w+)/g, 'data.$1');
    
    // Replace standalone $ in expressions like '$ > 10' with 'data > 10'
    transformed = transformed.replace(/\b\$\b(?!\()/g, 'data');
    
    return transformed;
  }
}