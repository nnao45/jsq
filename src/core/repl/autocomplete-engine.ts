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

export class AutocompleteEngine {
  private readonly maxCompletions = 100;
  private readonly maxDepth = 3;
  private readonly cache = new Map<string, CompletionResult>();
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
  // Lodash methods extracted from lodash-shared-methods.ts
  private readonly lodashMethodNames = [
    'filter',
    'map',
    'find',
    'findIndex',
    'reduce',
    'each',
    'forEach',
    'includes',
    'some',
    'every',
    'flatten',
    'flattenDeep',
    'flattenDepth',
    'compact',
    'concat',
    'chunk',
    'difference',
    'drop',
    'dropRight',
    'fill',
    'findLastIndex',
    'head',
    'first',
    'indexOf',
    'initial',
    'intersection',
    'last',
    'lastIndexOf',
    'nth',
    'pull',
    'pullAll',
    'pullAt',
    'slice',
    'tail',
    'take',
    'takeRight',
    'union',
    'uniq',
    'uniqBy',
    'uniqWith',
    'without',
    'xor',
    'zip',
    'unzip',
    'where',
    'pluck',
    'size',
    'sample',
    'shuffle',
    'reverse',
    'join',
    'split',
    'sortBy',
    'orderBy',
    'groupBy',
    'countBy',
    'keyBy',
    'partition',
    'reject',
    'invoke',
    'indexBy',
    'sum',
    'sumBy',
    'mean',
    'meanBy',
    'min',
    'minBy',
    'max',
    'maxBy',
    'add',
    'subtract',
    'multiply',
    'divide',
    'round',
    'floor',
    'ceil',
    'now',
    'isArray',
    'isObject',
    'isString',
    'isNumber',
    'isBoolean',
    'isFunction',
    'isUndefined',
    'isNull',
    'isEmpty',
    'isEqual',
    'isNaN',
    'isFinite',
    'has',
    'get',
    'set',
    'unset',
    'pick',
    'omit',
    'keys',
    'values',
    'entries',
    'merge',
    'assign',
    'defaults',
    'clone',
    'cloneDeep',
    'extend',
    'tap',
    'thru',
    'at',
    'property',
    'propertyOf',
    'matcher',
    'matches',
    'isMatch',
    'escape',
    'unescape',
    'template',
    'trim',
    'trimStart',
    'trimEnd',
    'truncate',
    'pad',
    'padStart',
    'padEnd',
    'repeat',
    'replace',
    'split',
    'toLower',
    'toLowerCase',
    'toUpper',
    'toUpperCase',
    'capitalize',
    'camelCase',
    'kebabCase',
    'snakeCase',
    'lowerCase',
    'upperCase',
    'startCase',
    'words',
    'parseInt',
    'constant',
    'identity',
    'noop',
    'times',
    'uniqueId',
    'result',
    'chain',
    'value',
    'debounce',
    'throttle',
    'curry',
    'partial',
    'partialRight',
    'memoize',
    'once',
    'wrap',
    'negate',
    'compose',
    'flow',
    'flowRight',
    'bind',
    'bindKey',
    'delay',
    'defer',
    'flip',
    'overArgs',
    'rearg',
    'rest',
    'spread',
  ];
  // SmartDollar methods extracted from smart-dollar-shared-methods.ts
  private readonly smartDollarMethodNames = [
    'map',
    'filter',
    'reduce',
    'each',
    'forEach',
    'find',
    'some',
    'every',
    'includes',
    'indexOf',
    'slice',
    'concat',
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'join',
    'reverse',
    'sort',
    'keys',
    'values',
    'entries',
    'hasOwn',
    'hasOwnProperty',
    'assign',
    'pipe',
    'tap',
    'log',
    'value',
    'split',
    'replace',
    'trim',
    'toLowerCase',
    'toUpperCase',
    'substring',
    'substr',
    'charAt',
    'charCodeAt',
    'match',
    'search',
    'test',
    'where',
    'pluck',
    'sortBy',
    'groupBy',
    'countBy',
    'uniq',
    'first',
    'last',
    'take',
    'skip',
    'flatten',
    'flatMap',
    'compact',
    'pick',
    'omit',
    'merge',
    'extend',
    'clone',
    'isEmpty',
    'isArray',
    'isObject',
    'isString',
    'isNumber',
    'parseJSON',
    'sum',
    'mean',
    'min',
    'max',
    'range',
    'random',
    'clamp',
    'capitalize',
    'escape',
    'unescape',
    'debounce',
    'throttle',
    'once',
    'memoize',
    'curry',
    'partial',
    'mapAsync',
    'mapAsyncSeq',
    'filterAsync',
    'reduceAsync',
    'forEachAsync',
    'forEachAsyncSeq',
    'fold',
    'scan',
    'takeWhile',
    'dropWhile',
    'partition',
    'chunk',
    'zip',
    'zipWith',
    'unzip',
    'fromPairs',
    'toPairs',
    'invert',
    'mapKeys',
    'mapValues',
    'keyBy',
    'difference',
    'intersection',
    'union',
    'xor',
    'without',
    'pull',
    'pullAt',
    'nth',
    'sample',
    'sampleSize',
    'shuffle',
    'size',
    'at',
    'get',
    'set',
    'update',
    'defaults',
    'defaultsDeep',
    'has',
    'hasIn',
    'invertBy',
    'findKey',
    'findIndex',
    'findLastIndex',
    'head',
    'tail',
    'initial',
    'cons',
    'snoc',
    'repeat',
    'cycle',
    'iterate',
    'unfold',
    'span',
    'break',
    'splitAt',
    'elem',
    'notElem',
    'lookup',
    'findIndices',
    'elemIndex',
    'elemIndices',
    'nub',
    'nubBy',
    'all',
    'any',
    'and',
    'or',
    'not',
  ];

  getSuggestions(context: CompletionContext): CompletionResult {
    const { input, cursorPosition } = context;

    // Extract the expression to complete
    const { expression, replaceStart, replaceEnd } = this.extractExpression(input, cursorPosition);

    // Debug log
    // console.log('Extracted expression:', expression, 'from', input, 'at', cursorPosition);

    if (!expression) {
      return { completions: [], replaceStart: cursorPosition, replaceEnd: cursorPosition };
    }

    // ドット（.）の後の部分の補完の場合、置換開始位置を調整
    let adjustedReplaceStart = replaceStart;
    const lastDotIndex = input.lastIndexOf('.', cursorPosition - 1);
    if (lastDotIndex >= 0 && lastDotIndex >= replaceStart) {
      adjustedReplaceStart = lastDotIndex + 1;
    }

    // Check cache
    const cacheKey = `${expression}:${JSON.stringify(context.currentData?.constructor?.name)}`;
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
    // Find the start of the current expression
    let start = cursorPosition;
    while (start > 0 && /[a-zA-Z0-9_.$[\]]/.test(input[start - 1])) {
      start--;
    }

    // カーソル位置までの式を抽出（カーソル位置より後ろは含めない）
    const expression = input.slice(start, cursorPosition);

    // 置換範囲はカーソル位置までとする
    return { expression, replaceStart: start, replaceEnd: cursorPosition };
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
      
      // Special case: if objPath ends with ., it might be $.., which should be treated as $
      if (objPath === '$.') {
        return this.getPropertyCompletions('$', prefix, context);
      }
      
      // Check if it's lodash methods
      if (objPath === '_') {
        return this.getMethodCompletions(prefix);
      }
      return this.getPropertyCompletions(objPath, prefix, context);
    }

    // Handle $ or _ at the beginning (without dot)
    if (expression === '$' || expression === '_') {
      // Just return the symbol itself
      return [expression];
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

        // Simple property access evaluation
        // This is a simplified version - in production, we'd want proper AST parsing
        let current: unknown = context.currentData;
        const parts = subPath.split('.');

        for (const part of parts) {
          if (!part) continue;

          // Handle array access
          const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
          if (arrayMatch) {
            const [, prop, index] = arrayMatch;
            if (current && typeof current === 'object' && prop in current) {
              const obj = current as Record<string, unknown>;
              const arr = obj[prop];
              if (Array.isArray(arr)) {
                current = arr[parseInt(index, 10)];
              } else {
                current = undefined;
              }
            } else {
              current = undefined;
            }
          } else {
            if (current && typeof current === 'object' && part in current) {
              current = (current as Record<string, unknown>)[part];
            } else {
              current = undefined;
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
}
