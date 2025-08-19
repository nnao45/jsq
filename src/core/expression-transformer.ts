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