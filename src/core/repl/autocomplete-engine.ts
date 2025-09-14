import { LODASH_METHODS } from '../lodash/lodash-shared-methods';
import { SMART_DOLLAR_METHODS } from '../smart-dollar/smart-dollar-shared-methods';

export interface CompletionContext {
  input: string;
  cursorPosition: number;
  currentData?: unknown;
  previousExpression?: string;
}

export interface CompletionResult {
  completions: string[];
  replaceStart: number;
  replaceEnd: number;
}

// Helper function to extract method names from shared method definitions
function extractMethodNamesFromSource(source: string): string[] {
  // Look for patterns like:
  // methodName: function(...) 
  // within the methods object
  const methodRegex = /^\s*(\w+):\s*function\s*\(/gm;
  const asyncMethodRegex = /^\s*(\w+):\s*async\s*function\s*\(/gm;
  const methods: string[] = [];
  
  // Extract regular functions
  let match: RegExpExecArray | null = methodRegex.exec(source);
  while (match !== null) {
    const methodName = match[1];
    if (methodName && !methods.includes(methodName)) {
      methods.push(methodName);
    }
    match = methodRegex.exec(source);
  }
  
  // Extract async functions
  match = asyncMethodRegex.exec(source);
  while (match !== null) {
    const methodName = match[1];
    if (methodName && !methods.includes(methodName)) {
      methods.push(methodName);
    }
    match = asyncMethodRegex.exec(source);
  }
  
  return methods.sort();
}

export class AutocompleteEngine {
  private readonly maxCompletions = 100;
  private readonly maxDepth = 3;
  private readonly cache = new Map<string, CompletionResult>();
  
  // JavaScript built-in methods (these remain hardcoded as they're not from our source files)
  private readonly jsArrayMethods = [
    'concat',
    'every',
    'filter',
    'find',
    'findIndex',
    'flat',
    'flatMap',
    'forEach',
    'includes',
    'indexOf',
    'join',
    'lastIndexOf',
    'map',
    'pop',
    'push',
    'reduce',
    'reduceRight',
    'reverse',
    'shift',
    'slice',
    'some',
    'sort',
    'splice',
    'unshift',
    'at',
    'fill',
    'copyWithin',
    'entries',
    'keys',
    'values',
    'toLocaleString',
    'toString',
    'length',
  ];
  private readonly jsObjectMethods = [
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
    'toString',
    'valueOf',
    'constructor',
  ];
  private readonly jsStringMethods = [
    'charAt',
    'charCodeAt',
    'concat',
    'endsWith',
    'includes',
    'indexOf',
    'lastIndexOf',
    'match',
    'padEnd',
    'padStart',
    'repeat',
    'replace',
    'search',
    'slice',
    'split',
    'startsWith',
    'substring',
    'toLowerCase',
    'toUpperCase',
    'trim',
    'trimEnd',
    'trimStart',
    'valueOf',
    'toString',
    'length',
    'localeCompare',
    'normalize',
  ];
  
  // Dynamically extracted method names from shared sources
  private readonly lodashMethodNames: string[];
  private readonly smartDollarMethodNames: string[];
  
  constructor() {
    // Extract method names dynamically from the source files
    this.lodashMethodNames = extractMethodNamesFromSource(LODASH_METHODS);
    this.smartDollarMethodNames = extractMethodNamesFromSource(SMART_DOLLAR_METHODS);
  }

  getSuggestions(context: CompletionContext): CompletionResult {
    const { input, cursorPosition } = context;

    // Extract the expression to complete
    const { expression, replaceStart, replaceEnd } = this.extractExpression(input, cursorPosition);

    // Debug log
    // console.error('[DEBUG AutocompleteEngine] Extracted expression:', expression, 'from', input, 'at', cursorPosition);

    if (!expression) {
      return { completions: [], replaceStart: cursorPosition, replaceEnd: cursorPosition };
    }

    // ドット（.）の後の部分の補完の場合、置換開始位置を調整
    let adjustedReplaceStart = replaceStart;
    const lastDotIndex = input.lastIndexOf('.', cursorPosition - 1);
    if (lastDotIndex >= 0 && lastDotIndex >= replaceStart) {
      adjustedReplaceStart = lastDotIndex + 1;
    }

    // Check cache - include a hash of the data structure to ensure cache invalidation when data changes
    const dataHash = this.getDataHash(context.currentData);
    const cacheKey = `${expression}:${dataHash}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          replaceStart: adjustedReplaceStart,
          replaceEnd,
        };
      }
    }

    try {
      const completions = this.generateCompletions(expression, context);

      const result = {
        completions: completions.slice(0, this.maxCompletions),
        replaceStart: adjustedReplaceStart,
        replaceEnd,
      };
      
      // console.error('[DEBUG] Returning result:', JSON.stringify(result));

      // Don't cache empty results
      if (result.completions.length > 0) {
        this.cache.set(cacheKey, result);
      }
      return result;
    } catch {
      // Return empty completions on error
      return { completions: [], replaceStart, replaceEnd };
    }
  }

  private extractExpression(
    input: string,
    cursorPosition: number
  ): {
    expression: string;
    replaceStart: number;
    replaceEnd: number;
  } {
    // For method chaining, we need to include parentheses and their contents
    // Start from cursor and go back to find the beginning of the expression
    let start = cursorPosition;
    let parenDepth = 0;
    
    while (start > 0) {
      const char = input[start - 1];
      
      // Count parentheses depth
      if (char === ')') {
        parenDepth++;
      } else if (char === '(') {
        parenDepth--;
      }
      
      // If we're inside parentheses, continue
      if (parenDepth > 0) {
        start--;
        continue;
      }
      
      // Track bracket depth for array literals
      if (char === ']') {
        parenDepth++;
      } else if (char === '[') {
        parenDepth--;
      }
      
      // If parentheses/brackets are balanced and we hit a non-expression character, stop
      if (parenDepth === 0 && !/[a-zA-Z0-9_.$[\]()=>,\s"']/.test(char)) {
        // Special case: If we hit an operator like +, -, *, /, check if the next expression starts with _ or $
        if (['+', '-', '*', '/', '&', '|', '%', '^'].includes(char)) {
          // Look for _ or $ at the start of our current expression
          const currentExpr = input.slice(start, cursorPosition).trim();
          if (currentExpr.startsWith('_') || currentExpr.startsWith('$')) {
            // This is the start of a new expression after an operator
            break;
          }
        }
        break;
      }
      
      start--;
    }

    // カーソル位置までの式を抽出（カーソル位置より後ろは含めない）
    const expression = input.slice(start, cursorPosition).trim();

    // 置換範囲の終了位置を探す（カーソル位置から右側の単語境界まで）
    let end = cursorPosition;
    while (end < input.length && /[a-zA-Z0-9_]/.test(input[end])) {
      end++;
    }

    // If we trimmed the expression, adjust the start position
    const trimmedStart = input.slice(start, cursorPosition).search(/\S/);
    const adjustedStart = trimmedStart >= 0 ? start + trimmedStart : start;

    // 置換範囲はカーソル位置から単語の終わりまでとする
    return { expression, replaceStart: adjustedStart, replaceEnd: end };
  }

  private generateCompletions(expression: string, context: CompletionContext): string[] {
    const completions: string[] = [];

    // Handle $.. pattern (recursive descent - not yet supported in jsq)
    if (expression === '$..') {
      // Return a special message or empty array
      // Since jsq doesn't support the .. operator, we'll show available properties instead
      return this.getPropertyCompletions('$', '', context);
    }

    // Handle property access (e.g., "obj.prop", "arr[0].prop")
    const propertyMatch = expression.match(/^(.+)\.([^.]*)$/);
    if (propertyMatch) {
      const [, objPath, prefix] = propertyMatch;
      
      // console.error('[DEBUG generateCompletions] propertyMatch:', objPath, prefix);

      // Special case: if objPath ends with ., it might be $.., which should be treated as $
      if (objPath === '$.') {
        return this.getPropertyCompletions('$', prefix, context);
      }

      // Check if it's lodash methods
      if (objPath === '_') {
        return this.getMethodCompletions(prefix);
      }
      
      // Check if it's lodash method chain (e.g., _.map(...))
      if (objPath.startsWith('_')) {
        // Special case: _. is treated as _.., which is invalid
        if (objPath === '_.') {
          return [];
        }
        return this.getLodashChainCompletions(objPath, prefix, context);
      }
      
      // Check if it's an array literal (e.g., [1,2,3])
      if (objPath.match(/^\[.*\]$/)) {
        // console.error('[DEBUG] Array literal detected:', objPath, 'prefix:', prefix);
        return this.getArrayLiteralCompletions(prefix);
      }
      
      return this.getPropertyCompletions(objPath, prefix, context);
    }

    // Handle $ or _ at the beginning (without dot)
    if (expression === '$') {
      // Return available properties for $
      return this.getPropertyCompletions('$', '', context);
    }
    if (expression === '_') {
      // Return available methods for _
      return this.getMethodCompletions('');
    }

    // Handle $.xxx pattern (e.g., $.ma for map, $.na for name)
    if (expression.startsWith('$.')) {
      const prefix = expression.slice(2);
      return this.getPropertyCompletions('$', prefix, context);
    }

    // Handle _.xxx pattern for lodash methods
    if (expression.startsWith('_.')) {
      const prefix = expression.slice(2);
      return this.getMethodCompletions(prefix);
    }

    // Handle partial method names
    if (expression && !expression.includes('.')) {
      // Global completions
      completions.push(...this.getGlobalCompletions(expression));
    }

    return completions;
  }

  private getPropertyCompletions(
    objPath: string,
    prefix: string,
    context: CompletionContext
  ): string[] {
    if (!context.currentData) {
      return [];
    }

    try {
      // Evaluate the object path
      const obj = this.evaluateObjectPath(objPath, context);
      // console.error('[DEBUG getPropertyCompletions] objPath:', objPath, 'evaluated to:', obj);
      if (obj === null || obj === undefined) {
        return [];
      }

      const completions: string[] = [];
      const prefixLower = prefix.toLowerCase();

      // Add own properties for objects
      if (obj && typeof obj === 'object') {
        const keys = this.getObjectKeys(obj);
        completions.push(
          ...keys.filter(key => key.toLowerCase().startsWith(prefixLower)).map(key => key) // Return just the key, not the full path
        );
      }

      // Add array methods if it's an array
      if (Array.isArray(obj)) {
        completions.push(
          ...this.jsArrayMethods
            .filter(method => method.toLowerCase().startsWith(prefixLower))
            .map(method => method) // Return just the method name
        );
      }

      // Add string methods if it's a string
      if (typeof obj === 'string') {
        completions.push(
          ...this.jsStringMethods
            .filter(method => method.toLowerCase().startsWith(prefixLower))
            .map(method => method) // Return just the method name
        );
      }

      // Add boolean methods if it's a boolean
      if (typeof obj === 'boolean') {
        completions.push(
          ...['toString', 'valueOf']
            .filter(method => method.toLowerCase().startsWith(prefixLower))
            .map(method => method)
        );
      }

      // Add number methods if it's a number
      if (typeof obj === 'number') {
        completions.push(
          ...['toString', 'valueOf', 'toFixed', 'toExponential', 'toPrecision', 'toLocaleString']
            .filter(method => method.toLowerCase().startsWith(prefixLower))
            .map(method => method)
        );
      }

      // Add object methods (for all types except null/undefined)
      if (obj !== null && obj !== undefined) {
        completions.push(
          ...this.jsObjectMethods
            .filter(method => method.toLowerCase().startsWith(prefixLower))
            .map(method => method) // Return just the method name
        );
      }

      return [...new Set(completions)].sort();
    } catch {
      return [];
    }
  }

  private getMethodCompletions(prefix: string): string[] {
    const prefixLower = prefix.toLowerCase();
    const completions: string[] = [];

    // Add lodash methods
    completions.push(
      ...this.lodashMethodNames
        .filter(method => method.toLowerCase().startsWith(prefixLower))
        .map(method => method) // Return just the method name
    );

    // Add SmartDollar methods
    completions.push(
      ...this.smartDollarMethodNames
        .filter(method => method.toLowerCase().startsWith(prefixLower))
        .map(method => method) // Return just the method name
    );

    return [...new Set(completions)].sort();
  }
  
  private getArrayLiteralCompletions(prefix: string): string[] {
    const prefixLower = prefix.toLowerCase();
    const completions: string[] = [];
    
    // Add array methods
    completions.push(
      ...this.jsArrayMethods
        .filter(method => method.toLowerCase().startsWith(prefixLower))
    );
    
    // Add object methods
    completions.push(
      ...this.jsObjectMethods
        .filter(method => method.toLowerCase().startsWith(prefixLower))
    );
    
    return [...new Set(completions)].sort();
  }
  
  private getLodashChainCompletions(
    objPath: string,
    prefix: string,
    context: CompletionContext
  ): string[] {
    // Parse the lodash chain to infer the return type
    const segments = this.parsePathSegments(objPath.slice(1)); // Remove the '_'
    
    let currentType: 'array' | 'object' | 'string' | 'number' | 'boolean' | 'unknown' = 'unknown';
    
    // Start with the data type
    if (context.currentData) {
      currentType = this.getDataType(context.currentData);
    }
    
    // Process each method in the chain to infer the final type
    for (const segment of segments) {
      if (segment.type === 'method' && segment.name) {
        const inferredType = this.inferMethodReturnType(segment.name, currentType);
        if (inferredType) {
          currentType = inferredType;
        }
      }
    }
    
    // Based on the final type, return appropriate methods
    const completions: string[] = [];
    const prefixLower = prefix.toLowerCase();
    
    // For lodash chains, return methods based on the current type
    // This prevents the list from being too long and missing important methods
    
    // Always include common lodash methods
    const commonLodashMethods = [
      'chain', 'value', 'tap', 'thru', 'each', 'forEach', 'map', 'filter', 
      'reduce', 'find', 'some', 'every', 'includes', 'sortBy', 'groupBy',
      'uniq', 'flatten', 'compact', 'keys', 'values', 'pick', 'omit',
      'merge', 'clone', 'isEmpty', 'isArray', 'isObject', 'get', 'set'
    ];
    
    // Add type-specific methods based on inferred type
    let typeSpecificMethods: string[] = [];
    
    if (currentType === 'array') {
      typeSpecificMethods = [
        'concat', 'slice', 'join', 'reverse', 'sort', 'indexOf', 'lastIndexOf',
        'first', 'last', 'nth', 'take', 'drop', 'chunk', 'zip', 'unzip',
        'difference', 'intersection', 'union', 'without', 'pluck', 'where',
        'findIndex', 'pull', 'remove', 'sample', 'shuffle', 'size',
        'countBy', 'partition', 'reject', 'takeWhile', 'dropWhile'
      ];
    } else if (currentType === 'object') {
      typeSpecificMethods = [
        'has', 'hasIn', 'keys', 'values', 'entries', 'pairs', 'toPairs',
        'fromPairs', 'invert', 'invertBy', 'mapKeys', 'mapValues', 'extend',
        'assign', 'defaults', 'defaultsDeep', 'forOwn', 'forOwnRight',
        'functions', 'result', 'transform', 'update', 'updateWith'
      ];
    } else if (currentType === 'string') {
      typeSpecificMethods = [
        'split', 'replace', 'trim', 'trimStart', 'trimEnd', 'pad', 'padStart',
        'padEnd', 'repeat', 'toLower', 'toLowerCase', 'toUpper', 'toUpperCase', 'camelCase', 'kebabCase',
        'snakeCase', 'startCase', 'capitalize', 'deburr', 'escape', 'unescape',
        'truncate', 'words', 'parseInt', 'template'
      ];
    } else if (currentType === 'number') {
      typeSpecificMethods = [
        'add', 'subtract', 'multiply', 'divide', 'sum', 'sumBy', 'mean',
        'meanBy', 'min', 'minBy', 'max', 'maxBy', 'round', 'floor', 'ceil',
        'inRange', 'random', 'clamp'
      ];
    }
    
    // Combine and filter by prefix
    const allMethods = [...new Set([...commonLodashMethods, ...typeSpecificMethods])];
    completions.push(
      ...allMethods
        .filter(method => method.toLowerCase().startsWith(prefixLower))
    );
    
    return [...new Set(completions)].sort();
  }

  private getGlobalCompletions(prefix: string): string[] {
    const prefixLower = prefix.toLowerCase();
    const completions: string[] = [];

    // Add $ and _ shortcuts
    if ('$'.startsWith(prefix)) {
      completions.push('$');
    }
    if ('_'.startsWith(prefix)) {
      completions.push('_');
    }

    // Add common globals
    const globals = ['console', 'JSON', 'Math', 'Date', 'Array', 'Object', 'String'];
    completions.push(...globals.filter(g => g.toLowerCase().startsWith(prefixLower)));

    return completions;
  }

  private evaluateObjectPath(path: string, context: CompletionContext): unknown {
    // For now, we'll just handle simple cases
    // In the future, this could use a proper AST parser
    if (path === '$' && context.currentData) {
      return context.currentData;
    }

    // Handle simple property access
    if (path.startsWith('$') && context.currentData) {
      try {
        // Remove $ and evaluate the rest
        const subPath = path.slice(1);
        if (!subPath) return context.currentData;

        // Parse the path to handle method calls and property access
        const segments = this.parsePathSegments(subPath);
        
        let current: unknown = context.currentData;
        let currentType: 'array' | 'object' | 'string' | 'number' | 'boolean' | 'unknown' = this.getDataType(current);

        for (const segment of segments) {
          if (!segment) continue;

          if (segment.type === 'property') {
            // Handle property access
            if (current && typeof current === 'object' && segment.name in current) {
              current = (current as Record<string, unknown>)[segment.name];
              currentType = this.getDataType(current);
            } else {
              return undefined;
            }
          } else if (segment.type === 'method') {
            // Handle method call - infer return type without actually executing
            const inferredType = this.inferMethodReturnType(segment.name, currentType);
            if (inferredType) {
              currentType = inferredType;
              // Create a mock object with the inferred type for completion
              current = this.createMockDataForType(currentType, current);
            } else {
              return undefined;
            }
          } else if (segment.type === 'index') {
            // Handle array index access
            if (Array.isArray(current) && segment.index !== undefined) {
              current = current[segment.index];
              currentType = this.getDataType(current);
            } else {
              return undefined;
            }
          }

          if (current === undefined || current === null) {
            return undefined;
          }
        }

        return current;
      } catch {
        return undefined;
      }
    }

    return undefined;
  }
  
  private getDataType(data: unknown): 'array' | 'object' | 'string' | 'number' | 'boolean' | 'unknown' {
    if (Array.isArray(data)) return 'array';
    if (typeof data === 'string') return 'string';
    if (typeof data === 'number') return 'number';
    if (typeof data === 'boolean') return 'boolean';
    if (data && typeof data === 'object') return 'object';
    return 'unknown';
  }
  
  private inferMethodReturnType(
    methodName: string, 
    currentType: 'array' | 'object' | 'string' | 'number' | 'boolean' | 'unknown'
  ): 'array' | 'object' | 'string' | 'number' | 'boolean' | 'unknown' | null {
    // Array methods that return arrays
    const arrayReturningMethods = ['map', 'filter', 'slice', 'concat', 'flat', 'flatMap', 
      'reverse', 'sort', 'splice', 'fill', 'copyWithin'];
    // Array methods that return strings
    const stringReturningMethods = ['join', 'toString', 'toLocaleString'];
    // Array methods that return numbers
    const numberReturningMethods = ['indexOf', 'lastIndexOf', 'findIndex', 'push', 'unshift'];
    // Array methods that return booleans
    const booleanReturningMethods = ['every', 'some', 'includes'];
    // Methods that return single values
    const singleValueMethods = ['find', 'at', 'pop', 'shift'];
    
    // String methods that return strings
    const stringToStringMethods = ['slice', 'substring', 'substr', 'toLowerCase', 'toUpperCase',
      'trim', 'trimStart', 'trimEnd', 'padStart', 'padEnd', 'repeat', 'replace', 'concat',
      'normalize', 'toString', 'valueOf'];
    // String methods that return arrays
    const stringToArrayMethods = ['split', 'match'];
    // String methods that return numbers
    const stringToNumberMethods = ['indexOf', 'lastIndexOf', 'search', 'charCodeAt', 'localeCompare'];
    // String methods that return booleans
    const stringToBooleanMethods = ['startsWith', 'endsWith', 'includes'];
    
    if (currentType === 'array') {
      if (arrayReturningMethods.includes(methodName)) return 'array';
      if (stringReturningMethods.includes(methodName)) return 'string';
      if (numberReturningMethods.includes(methodName)) return 'number';
      if (booleanReturningMethods.includes(methodName)) return 'boolean';
      if (singleValueMethods.includes(methodName)) return 'unknown'; // Could be any type
      // Handle reduce/reduceRight specially - they can return any type
      if (methodName === 'reduce' || methodName === 'reduceRight') return 'unknown';
    }
    
    if (currentType === 'string') {
      if (stringToStringMethods.includes(methodName)) return 'string';
      if (stringToArrayMethods.includes(methodName)) return 'array';
      if (stringToNumberMethods.includes(methodName)) return 'number';
      if (stringToBooleanMethods.includes(methodName)) return 'boolean';
      if (methodName === 'charAt') return 'string';
    }
    
    // Lodash/SmartDollar specific methods
    if (methodName === 'pluck') return 'array';
    if (methodName === 'where') return 'array';
    if (methodName === 'sortBy') return 'array';
    if (methodName === 'groupBy') return 'object';
    if (methodName === 'countBy') return 'object';
    if (methodName === 'keyBy') return 'object';
    if (methodName === 'indexBy') return 'object';
    if (methodName === 'partition') return 'array'; // Returns [truthy[], falsy[]]
    if (methodName === 'chunk') return 'array';
    if (methodName === 'zip') return 'array';
    if (methodName === 'unzip') return 'array';
    if (methodName === 'fromPairs') return 'object';
    if (methodName === 'toPairs') return 'array';
    if (methodName === 'keys') return 'array';
    if (methodName === 'values') return 'array';
    if (methodName === 'entries') return 'array';
    if (methodName === 'pick') return 'object';
    if (methodName === 'omit') return 'object';
    if (methodName === 'merge') return 'object';
    if (methodName === 'extend') return 'object';
    if (methodName === 'assign') return 'object';
    if (methodName === 'defaults') return 'object';
    if (methodName === 'clone') return 'unknown'; // Returns same type as input
    if (methodName === 'cloneDeep') return 'unknown'; // Returns same type as input
    if (methodName === 'mapValues') return 'object';
    if (methodName === 'mapKeys') return 'object';
    if (methodName === 'invert') return 'object';
    if (methodName === 'invertBy') return 'object';
    if (methodName === 'value') return 'unknown';
    
    // Lodash string returning methods (work on various types)
    if (methodName === 'join') return 'string';
    if (methodName === 'toString') return 'string';
    if (methodName === 'camelCase') return 'string';
    if (methodName === 'kebabCase') return 'string';
    if (methodName === 'snakeCase') return 'string';
    if (methodName === 'lowerCase') return 'string';
    if (methodName === 'upperCase') return 'string';
    if (methodName === 'startCase') return 'string';
    if (methodName === 'capitalize') return 'string';
    if (methodName === 'escape') return 'string';
    if (methodName === 'unescape') return 'string';
    if (methodName === 'template') return 'string';
    
    // Lodash number returning methods
    if (methodName === 'size') return 'number';
    if (methodName === 'sum') return 'number';
    if (methodName === 'mean') return 'number';
    if (methodName === 'min') return 'number';
    if (methodName === 'max') return 'number';
    if (methodName === 'round') return 'number';
    if (methodName === 'floor') return 'number';
    if (methodName === 'ceil') return 'number';
    
    // Lodash boolean returning methods
    if (methodName === 'isEmpty') return 'boolean';
    if (methodName === 'isArray') return 'boolean';
    if (methodName === 'isObject') return 'boolean';
    if (methodName === 'isString') return 'boolean';
    if (methodName === 'isNumber') return 'boolean';
    if (methodName === 'isBoolean') return 'boolean';
    if (methodName === 'isFunction') return 'boolean';
    if (methodName === 'isNull') return 'boolean';
    if (methodName === 'isUndefined') return 'boolean';
    if (methodName === 'isNaN') return 'boolean';
    if (methodName === 'isFinite') return 'boolean';
    if (methodName === 'isEqual') return 'boolean';
    if (methodName === 'isMatch') return 'boolean';
    if (methodName === 'has') return 'boolean';
    if (methodName === 'hasIn') return 'boolean';
    
    return null;
  }
  
  private createMockDataForType(
    type: 'array' | 'object' | 'string' | 'number' | 'boolean' | 'unknown',
    originalData?: unknown
  ): unknown {
    switch (type) {
      case 'array':
        // Return empty array to provide array methods
        return [];
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'object':
        return {};
      default:
        // For unknown, try to preserve some context if possible
        if (Array.isArray(originalData) && originalData.length > 0) {
          return originalData[0]; // Use first element as representative
        }
        return {};
    }
  }

  private parsePathSegments(path: string): Array<{ type: 'property' | 'method' | 'index'; name?: string; index?: number }> {
    const segments: Array<{ type: 'property' | 'method' | 'index'; name?: string; index?: number }> = [];
    let current = '';
    let i = 0;
    
    while (i < path.length) {
      const char = path[i];
      
      if (char === '.') {
        // Process accumulated segment
        if (current) {
          segments.push(this.createSegment(current));
          current = '';
        }
        i++;
      } else if (char === '(') {
        // Method call detected
        if (current) {
          segments.push({ type: 'method', name: current });
          current = '';
        }
        // Skip to matching closing parenthesis
        let depth = 1;
        i++;
        while (i < path.length && depth > 0) {
          if (path[i] === '(') depth++;
          else if (path[i] === ')') depth--;
          i++;
        }
      } else if (char === '[') {
        // Array index access
        if (current) {
          segments.push(this.createSegment(current));
          current = '';
        }
        // Extract index
        i++;
        let indexStr = '';
        while (i < path.length && path[i] !== ']') {
          indexStr += path[i];
          i++;
        }
        if (path[i] === ']') {
          i++;
          const index = parseInt(indexStr, 10);
          if (!isNaN(index)) {
            segments.push({ type: 'index', index });
          }
        }
      } else {
        current += char;
        i++;
      }
    }
    
    // Process final segment
    if (current) {
      segments.push(this.createSegment(current));
    }
    
    return segments;
  }
  
  private createSegment(name: string): { type: 'property' | 'method' | 'index'; name?: string; index?: number } {
    // Check if it ends with array access pattern
    const arrayMatch = name.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, prop] = arrayMatch;
      return { type: 'property', name: prop };
    }
    
    return { type: 'property', name };
  }

  private getObjectKeys(obj: unknown, depth = 0): string[] {
    if (depth >= this.maxDepth || !obj || typeof obj !== 'object') {
      return [];
    }

    const keys: string[] = [];
    const seen = new WeakSet();

    const addKeys = (o: object) => {
      if (seen.has(o)) return;
      seen.add(o);

      try {
        // Get own enumerable properties
        keys.push(...Object.keys(o));

        // For arrays, add numeric indices up to length
        if (Array.isArray(o) && o.length > 0) {
          for (let i = 0; i < Math.min(o.length, 10); i++) {
            keys.push(`[${i}]`);
          }
          keys.push('length');
        }
      } catch {
        // Ignore errors when accessing properties
      }
    };

    addKeys(obj);
    return [...new Set(keys)];
  }

  clearCache(): void {
    this.cache.clear();
  }

  private getDataHash(data: unknown): string {
    if (data === null) return 'null';
    if (data === undefined) return 'undefined';

    const type = typeof data;
    if (type === 'object') {
      // Create a simple hash based on object structure
      try {
        if (Array.isArray(data)) {
          return `array:${data.length}`;
        }
        const keys = Object.keys(data).sort().slice(0, 10); // First 10 keys for performance
        return `object:${keys.join(',')}`;
      } catch {
        return `object:unknown`;
      }
    }

    return `${type}:${String(data).slice(0, 20)}`;
  }
}
