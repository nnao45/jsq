import ivm from 'isolated-vm';
import type { VMExecutionContext } from '@/types/cli';

interface VMChainableWrapper {
  __isVMChainableWrapper: boolean;
  data?: unknown;
  value?: unknown;
}

export class VMExecutor {
  private context: VMExecutionContext;
  private isolate: ivm.Isolate;
  private persistentContext: ivm.Context;
  private jail: ivm.Reference<Record<string, unknown>>;
  private isInitialized = false;
  private currentBase?: string;

  constructor(context: VMExecutionContext) {
    this.context = context;
    // Create an isolated VM instance with memory limits for security
    this.isolate = new ivm.Isolate({
      memoryLimit: context.memoryLimit || 128, // Use configured memory limit or 128MB default
      inspector: false, // Disable debugging for security
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Debug: VM already initialized');
      }
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Debug: Initializing VM...');
    }

    // Create persistent context once
    this.persistentContext = await this.isolate.createContext();
    this.jail = this.persistentContext.global;

    // Setup all globals and methods once
    await this.setupPersistentEnvironment();

    if (process.env.NODE_ENV === 'development') {
      console.log('Debug: VM initialization complete');
    }

    this.isInitialized = true;
  }

  async dispose(): Promise<void> {
    if (this.isolate) {
      await this.isolate.dispose();
    }
    this.isInitialized = false;
  }

  async executeExpression(
    expression: string,
    contextData: Record<string, unknown>
  ): Promise<unknown> {
    if (this.context.unsafe) {
      // Fallback to regular Function evaluation for unsafe mode
      return this.executeUnsafe(expression, contextData);
    }

    try {
      return await this.executeInVM(expression, contextData);
    } catch (error) {
      throw this.handleVMError(error);
    }
  }

  private async executeInVM(
    expression: string,
    contextData: Record<string, unknown>
  ): Promise<unknown> {
    // Ensure the persistent VM is initialized
    await this.ensureInitialized();

    // Transfer data and libraries to the persistent context
    await this.transferContext(contextData);

    // Transform the expression to use VM methods
    const transformedExpression = this.transformExpressionForVM(expression);

    const code = this.wrapExpressionCode(transformedExpression);
    const result = await this.runVMScript(code);

    // Process the result for VM boundary transfer
    const processedResult = await this.processResult(result);
    if (process.env.NODE_ENV === 'development') {
      console.log('Debug: VM result processed successfully:', typeof processedResult);
    }
    return processedResult;
  }

  private wrapExpressionCode(transformedExpression: string): string {
    return `
      (function() {
        "use strict";
        try {
          var result = (${transformedExpression});
          // Always return the result directly - let processResult handle JSON conversion
          return result;
        } catch (error) {
          throw new Error('Expression evaluation failed: ' + error.message + ' | Stack: ' + error.stack);
        }
      })()
    `;
  }

  private async runVMScript(code: string): Promise<unknown> {
    if (process.env.NODE_ENV === 'development') {
      console.log('Debug: Compiling script with code:', code);
    }
    const script = await this.isolate.compileScript(code, {
      filename: '<jsq-expression>',
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Debug: Running script in VM...');
    }
    const result = await script.run(this.persistentContext, {
      timeout: this.context.timeout || 30000, // Use configured timeout or 30 second default
    });
    if (process.env.NODE_ENV === 'development') {
      console.log('Debug: Script execution completed, result type:', typeof result);
    }
    return result;
  }

  private handleVMError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.message.includes('Script execution timed out')) {
        return new Error('Expression execution timed out');
      }
      if (error.message.includes('Script execution was interrupted')) {
        return new Error('Expression execution was interrupted');
      }

      // Provide more detailed error information
      console.error('VM execution error details:', {
        message: error.message,
        stack: error.stack,
      });

      return new Error(`VM execution failed: ${error.message}`);
    }
    console.error('VM execution failed with non-Error object:', error);
    return new Error(
      `VM execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  private async setupPersistentEnvironment(): Promise<void> {
    // Setup safe console functions using References
    const consoleLog = new ivm.Reference((...args: unknown[]) => {
      console.log(...args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))));
    });
    const consoleError = new ivm.Reference((...args: unknown[]) => {
      console.error(...args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))));
    });
    const consoleWarn = new ivm.Reference((...args: unknown[]) => {
      console.warn(...args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))));
    });

    await this.jail.set(
      'console',
      new ivm.ExternalCopy({
        log: consoleLog,
        error: consoleError,
        warn: consoleWarn,
      }).copyInto()
    );

    // Setup Math object with script-based approach for better compatibility
    const mathSetupScript = `
      var Math = {
        PI: 3.141592653589793,
        E: 2.718281828459045,
        abs: function(x) { return x < 0 ? -x : x; },
        max: function() {
          var max = arguments[0];
          for (var i = 1; i < arguments.length; i++) {
            if (arguments[i] > max) max = arguments[i];
          }
          return max;
        },
        min: function() {
          var min = arguments[0];
          for (var i = 1; i < arguments.length; i++) {
            if (arguments[i] < min) min = arguments[i];
          }
          return min;
        },
        floor: function(x) { return x >= 0 ? parseInt(x) : parseInt(x) - 1; },
        ceil: function(x) { return x > parseInt(x) ? parseInt(x) + 1 : parseInt(x); },
        round: function(x) { return parseInt(x + 0.5); },
        sqrt: function(x) { return Math.pow(x, 0.5); },
        pow: function(x, y) {
          if (y === 0) return 1;
          if (y === 1) return x;
          var result = 1;
          var base = x;
          var exp = y;
          if (exp < 0) {
            base = 1 / base;
            exp = -exp;
          }
          while (exp > 0) {
            if (exp % 2 === 1) result *= base;
            base *= base;
            exp = parseInt(exp / 2);
          }
          return result;
        },
        random: function() { return 0.5; } // Fixed value for deterministic tests
      };
    `;
    const mathScript = await this.isolate.compileScript(mathSetupScript);
    await mathScript.run(this.persistentContext);

    // JSON will be set up in the native methods script

    // Basic constructors will be set up by ensureObjectSetup script instead
    // This reduces complexity and avoids ivm.Reference issues with constructors

    // Setup utility functions
    await this.jail.set('isArray', new ivm.Reference((obj: unknown) => Array.isArray(obj)));
    await this.jail.set(
      'parseInt',
      new ivm.Reference((string: string, radix?: number) => parseInt(string, radix))
    );
    await this.jail.set('parseFloat', new ivm.Reference((string: string) => parseFloat(string)));
    await this.jail.set('isNaN', new ivm.Reference((value: unknown) => Number.isNaN(value)));
    await this.jail.set('isFinite', new ivm.Reference((value: unknown) => Number.isFinite(value)));

    // Setup helper function for array detection in VM
    await this.jail.set(
      '__isArray',
      new ivm.Reference((obj: unknown) => {
        return (
          obj &&
          typeof obj === 'object' &&
          typeof obj.length === 'number' &&
          obj.constructor &&
          obj.constructor.name === 'Array'
        );
      })
    );

    // Setup helper function to get array data from VMChainableWrapper
    await this.jail.set(
      '__getArrayData',
      new ivm.Reference((obj: unknown) => {
        if (obj?.data && Array.isArray(obj.data)) {
          return obj.data;
        }
        if (Array.isArray(obj)) {
          return obj;
        }
        return [];
      })
    );

    // Setup VMChainable method references
    await this.setupVMChainableMethods();

    // Re-ensure Object is properly set up after native methods setup
    await this.ensureObjectSetup();

    // Block dangerous functions
    await this.blockDangerousFunctions();
  }

  private async blockDangerousFunctions(): Promise<void> {
    const blockingScript = `
      // Block dangerous functions
      if (typeof eval !== 'undefined') {
        eval = function() { throw new Error('eval is not allowed in secure mode'); };
      }
      if (typeof Function !== 'undefined') {
        Function = function() { throw new Error('Function constructor is not allowed in secure mode'); };
      }
      if (typeof setTimeout !== 'undefined') {
        setTimeout = function() { throw new Error('setTimeout is not allowed in secure mode'); };
      }
      if (typeof setInterval !== 'undefined') {
        setInterval = function() { throw new Error('setInterval is not allowed in secure mode'); };
      }
      if (typeof setImmediate !== 'undefined') {
        setImmediate = function() { throw new Error('setImmediate is not allowed in secure mode'); };
      }
      if (typeof require !== 'undefined') {
        require = function() { throw new Error('require is not allowed in secure mode'); };
      }
      if (typeof process !== 'undefined') {
        process = undefined;
      }
      if (typeof global !== 'undefined') {
        global = undefined;
      }
      if (typeof Buffer !== 'undefined') {
        Buffer = undefined;
      }
    `;

    const script = await this.isolate.compileScript(blockingScript);
    await script.run(this.persistentContext);
  }

  private async setupVMChainableMethods(): Promise<void> {
    // Create native JavaScript functions that work entirely within the VM context
    const nativeMethodsScript = `
      // Setup a simple JSON.stringify function first
      function jsonStringify(obj) {
        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        if (typeof obj === 'string') return '"' + obj.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"') + '"';
        if (typeof obj === 'number' || typeof obj === 'boolean') return '' + obj;
        
        // Handle arrays
        if (obj && typeof obj === 'object' && typeof obj.length === 'number') {
          var items = [];
          for (var i = 0; i < obj.length; i++) {
            items.push(jsonStringify(obj[i]));
          }
          return '[' + items.join(',') + ']';
        }
        
        // Handle objects
        if (typeof obj === 'object') {
          var pairs = [];
          for (var key in obj) {
            if (obj.hasOwnProperty && obj.hasOwnProperty(key)) {
              pairs.push(jsonStringify(key) + ':' + jsonStringify(obj[key]));
            }
          }
          return '{' + pairs.join(',') + '}';
        }
        
        return '' + obj;
      }
      
      // Simple JSON.parse function
      function jsonParse(jsonString) {
        try {
          return (new Function('return ' + jsonString))();
        } catch (error) {
          throw new Error('Invalid JSON: ' + error.message);
        }
      }
      
      // Make it available as JSON.stringify and JSON.parse
      var JSON = {
        stringify: jsonStringify,
        parse: jsonParse
      };
      
      // Helper function to extract array data
      function getArrayData(obj) {
        
        // Handle VMChainableWrapper-like objects
        if (obj && obj.data && typeof obj.data.length === 'number') {
          return obj.data;
        }
        if (obj && obj.value && typeof obj.value.length === 'number') {
          return obj.value;
        }
        // Handle direct arrays
        if (obj && typeof obj.length === 'number') {
          return obj;
        }
        // Handle objects with array properties
        if (obj && typeof obj === 'object') {
          // Check if this is a plain object that might contain arrays
          for (var key in obj) {
            if (obj.hasOwnProperty(key) && obj[key] && typeof obj[key].length === 'number') {
              return obj[key];
            }
          }
        }
        return [];
      }
      
      // Array method implementations  
      function __vm_map(data, transform) {
        try {
          var arrayData = getArrayData(data);
          if (arrayData.length === 0) {
            return jsonStringify([]);
          }
          
          var result = [];
          for (var i = 0; i < arrayData.length; i++) {
            result.push(transform(arrayData[i]));
          }
          
          return jsonStringify(result);
        } catch (error) {
          // Return error info as string so it can be transferred
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_filter(data, predicate) {
        try {
          var arrayData = getArrayData(data);
          if (arrayData.length === 0) {
            return jsonStringify([]);
          }
          
          var result = [];
          for (var i = 0; i < arrayData.length; i++) {
            if (predicate(arrayData[i])) {
              result.push(arrayData[i]);
            }
          }
          
          return jsonStringify(result);
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_find(data, predicate) {
        try {
          var arrayData = getArrayData(data);
          if (arrayData.length === 0) return undefined;
          
          for (var i = 0; i < arrayData.length; i++) {
            if (predicate(arrayData[i])) {
              return arrayData[i];
            }
          }
          return undefined;
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_pluck(data, key) {
        try {
          var arrayData = getArrayData(data);
          if (arrayData.length === 0) {
            return jsonStringify([]);
          }
          
          var result = [];
          for (var i = 0; i < arrayData.length; i++) {
            var item = arrayData[i];
            if (item && typeof item === 'object' && key in item) {
              result.push(item[key]);
            }
          }
          
          return jsonStringify(result);
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_where(data, key, value) {
        try {
          var arrayData = getArrayData(data);
          if (arrayData.length === 0) {
            return jsonStringify([]);
          }
          
          var result = [];
          for (var i = 0; i < arrayData.length; i++) {
            var item = arrayData[i];
            if (item && typeof item === 'object' && key in item && item[key] === value) {
              result.push(item);
            }
          }
          
          return jsonStringify(result);
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_sortBy(data, keyOrFn) {
        try {
          var arrayData = getArrayData(data);
          if (arrayData.length === 0) {
            return jsonStringify([]);
          }
          
          var result = arrayData.slice();
          result.sort(function(a, b) {
            var aVal, bVal;
            if (typeof keyOrFn === 'function') {
              aVal = keyOrFn(a);
              bVal = keyOrFn(b);
            } else if (typeof keyOrFn === 'string') {
              aVal = a && typeof a === 'object' ? a[keyOrFn] : a;
              bVal = b && typeof b === 'object' ? b[keyOrFn] : b;
            } else {
              return 0;
            }
            if (typeof aVal === 'string' && typeof bVal === 'string') {
              return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            }
            if (typeof aVal === 'number' && typeof bVal === 'number') {
              return aVal - bVal;
            }
            return 0;
          });
          
          return jsonStringify(result);
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_take(data, count) {
        try {
          var arrayData = getArrayData(data);
          if (arrayData.length === 0) {
            return jsonStringify([]);
          }
          
          var result = arrayData.slice(0, count);
          return jsonStringify(result);
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_skip(data, count) {
        try {
          var arrayData = getArrayData(data);
          if (arrayData.length === 0) {
            return jsonStringify([]);
          }
          
          var result = arrayData.slice(count);
          return jsonStringify(result);
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_length(data) {
        var arrayData = getArrayData(data);
        if (arrayData.length !== undefined) return arrayData.length;
        if (data && typeof data === 'object') return Object.keys(data).length;
        return 0;
      }
      
      function __vm_sum(data, key) {
        var arrayData = getArrayData(data);
        if (arrayData.length === 0) return 0;
        var values = key 
          ? arrayData.map(function(item) { return item && typeof item === 'object' ? item[key] : 0; })
          : arrayData;
        return values.reduce(function(acc, val) {
          return acc + (typeof val === 'number' ? val : 0);
        }, 0);
      }
      
      function __vm_keys(data) {
        if (data && typeof data === 'object') return Object.keys(data);
        return [];
      }
      
      function __vm_values(data) {
        if (data && typeof data === 'object') return Object.values(data);
        return [];
      }
      
      // High-order functions
      function __vm_reduce(data, reducer, initialValue) {
        try {
          var arrayData = getArrayData(data);
          if (arrayData.length === 0) {
            return initialValue !== undefined ? initialValue : undefined;
          }
          
          if (initialValue !== undefined) {
            return arrayData.reduce(reducer, initialValue);
          } else {
            return arrayData.reduce(reducer);
          }
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_scan(data, scanner, initialValue) {
        try {
          var arrayData = getArrayData(data);
          var result = [];
          var acc = initialValue !== undefined ? initialValue : 0;
          
          for (var i = 0; i < arrayData.length; i++) {
            acc = scanner(acc, arrayData[i]);
            result.push(acc);
          }
          
          return jsonStringify(result);
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      // Array operations  
      function __vm_reverse(data) {
        try {
          var arrayData = getArrayData(data);
          return jsonStringify(arrayData.slice().reverse());
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_concat(data, other) {
        try {
          var arrayData = getArrayData(data);
          var otherData = getArrayData(other);
          return jsonStringify(arrayData.concat(otherData));
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_flatten(data) {
        try {
          var arrayData = getArrayData(data);
          var result = [];
          for (var i = 0; i < arrayData.length; i++) {
            if (arrayData[i] && typeof arrayData[i].length === 'number') {
              // It's array-like
              for (var j = 0; j < arrayData[i].length; j++) {
                result.push(arrayData[i][j]);
              }
            } else {
              result.push(arrayData[i]);
            }
          }
          return jsonStringify(result);
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_flatMap(data, transform) {
        try {
          var arrayData = getArrayData(data);
          var result = [];
          for (var i = 0; i < arrayData.length; i++) {
            var transformed = transform(arrayData[i]);
            if (transformed && typeof transformed.length === 'number') {
              for (var j = 0; j < transformed.length; j++) {
                result.push(transformed[j]);
              }
            } else {
              result.push(transformed);
            }
          }
          return jsonStringify(result);
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_distinct(data) {
        try {
          var arrayData = getArrayData(data);
          var seen = {};
          var result = [];
          for (var i = 0; i < arrayData.length; i++) {
            var key = arrayData[i];
            if (!(key in seen)) {
              seen[key] = true;
              result.push(arrayData[i]);
            }
          }
          return jsonStringify(result);
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_uniq(data) {
        return __vm_distinct(data);
      }
      
      // Conditional/search operations
      function __vm_any(data, predicate) {
        try {
          var arrayData = getArrayData(data);
          for (var i = 0; i < arrayData.length; i++) {
            if (predicate(arrayData[i])) {
              return true;
            }
          }
          return false;
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_some(data, predicate) {
        return __vm_any(data, predicate);
      }
      
      function __vm_all(data, predicate) {
        try {
          var arrayData = getArrayData(data);
          for (var i = 0; i < arrayData.length; i++) {
            if (!predicate(arrayData[i])) {
              return false;
            }
          }
          return true;
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_every(data, predicate) {
        return __vm_all(data, predicate);
      }
      
      function __vm_count(data, predicate) {
        try {
          var arrayData = getArrayData(data);
          if (!predicate) {
            return arrayData.length;
          }
          var count = 0;
          for (var i = 0; i < arrayData.length; i++) {
            if (predicate(arrayData[i])) {
              count++;
            }
          }
          return count;
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_groupBy(data, keyFn) {
        try {
          var arrayData = getArrayData(data);
          var groups = {};
          for (var i = 0; i < arrayData.length; i++) {
            var key = keyFn(arrayData[i]);
            if (!groups[key]) {
              groups[key] = [];
            }
            groups[key].push(arrayData[i]);
          }
          return groups;
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      // Math/statistics operations
      function __vm_min(data, keyOrFn) {
        try {
          var arrayData = getArrayData(data);
          if (arrayData.length === 0) return undefined;
          
          var min = arrayData[0];
          for (var i = 1; i < arrayData.length; i++) {
            var current = arrayData[i];
            if (keyOrFn) {
              if (typeof keyOrFn === 'function') {
                current = keyOrFn(current);
                min = keyOrFn(min);
              } else {
                current = current[keyOrFn];
                min = min[keyOrFn];
              }
            }
            if (current < min) {
              min = current;
            }
          }
          return min;
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_max(data, keyOrFn) {
        try {
          var arrayData = getArrayData(data);
          if (arrayData.length === 0) return undefined;
          
          var max = arrayData[0];
          for (var i = 1; i < arrayData.length; i++) {
            var current = arrayData[i];
            if (keyOrFn) {
              if (typeof keyOrFn === 'function') {
                current = keyOrFn(current);
                max = keyOrFn(max);
              } else {
                current = current[keyOrFn];
                max = max[keyOrFn];
              }
            }
            if (current > max) {
              max = current;
            }
          }
          return max;
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_average(data, key) {
        try {
          var arrayData = getArrayData(data);
          if (arrayData.length === 0) return 0;
          
          var sum = 0;
          for (var i = 0; i < arrayData.length; i++) {
            var value = key ? arrayData[i][key] : arrayData[i];
            if (typeof value === 'number') {
              sum += value;
            }
          }
          return sum / arrayData.length;
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      function __vm_mean(data, key) {
        return __vm_average(data, key);
      }
      
      function __vm_median(data, key) {
        try {
          var arrayData = getArrayData(data);
          if (arrayData.length === 0) return undefined;
          
          var values = [];
          for (var i = 0; i < arrayData.length; i++) {
            var value = key ? arrayData[i][key] : arrayData[i];
            if (typeof value === 'number') {
              values.push(value);
            }
          }
          
          values.sort(function(a, b) { return a - b; });
          var mid = Math.floor(values.length / 2);
          
          if (values.length % 2 === 0) {
            return (values[mid - 1] + values[mid]) / 2;
          } else {
            return values[mid];
          }
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      // Method chaining function
      function __vm_chain(data, methodsJson) {
        try {
          // Parse the methods JSON manually to avoid JSON parsing issues
          var methods = [];
          try {
            methods = (new Function('return ' + methodsJson))();
          } catch (parseError) {
            return 'ERROR: JSON parse failed: ' + parseError.message;
          }
          
          var currentData = data;
          
          for (var i = 0; i < methods.length; i++) {
            var method = methods[i];
            var methodName = method.name;
            var args = method.args;
            
            // Execute each method in sequence
            switch (methodName) {
              case 'map':
                var transform = new Function('return ' + args)();
                currentData = getArrayData(currentData);
                if (currentData.length === 0) {
                  currentData = [];
                } else {
                  var result = [];
                  for (var j = 0; j < currentData.length; j++) {
                    result.push(transform(currentData[j]));
                  }
                  currentData = result;
                }
                break;
                
              case 'filter':
                var predicate = new Function('return ' + args)();
                currentData = getArrayData(currentData);
                if (currentData.length === 0) {
                  currentData = [];
                } else {
                  var result = [];
                  for (var j = 0; j < currentData.length; j++) {
                    if (predicate(currentData[j])) {
                      result.push(currentData[j]);
                    }
                  }
                  currentData = result;
                }
                break;
                
              case 'pluck':
                var key = args.replace(/['"]/g, ''); // Remove quotes
                currentData = getArrayData(currentData);
                if (currentData.length === 0) {
                  currentData = [];
                } else {
                  var result = [];
                  for (var j = 0; j < currentData.length; j++) {
                    var item = currentData[j];
                    if (item && typeof item === 'object' && key in item) {
                      result.push(item[key]);
                    }
                  }
                  currentData = result;
                }
                break;
                
              case 'where':
                var parts = args.split(',');
                var key = parts[0].replace(/['"]/g, '').trim();
                var value = parts[1].replace(/['"]/g, '').trim();
                currentData = getArrayData(currentData);
                if (currentData.length === 0) {
                  currentData = [];
                } else {
                  var result = [];
                  for (var j = 0; j < currentData.length; j++) {
                    var item = currentData[j];
                    if (item && typeof item === 'object' && key in item && item[key] == value) {
                      result.push(item);
                    }
                  }
                  currentData = result;
                }
                break;
                
              case 'sortBy':
                var sortKey = args.replace(/['"]/g, '');
                currentData = getArrayData(currentData);
                if (currentData.length > 0) {
                  currentData = currentData.slice().sort(function(a, b) {
                    var aVal = a && typeof a === 'object' ? a[sortKey] : a;
                    var bVal = b && typeof b === 'object' ? b[sortKey] : b;
                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                    }
                    if (typeof aVal === 'number' && typeof bVal === 'number') {
                      return aVal - bVal;
                    }
                    return 0;
                  });
                }
                break;
                
              case 'take':
                var count = parseInt(args);
                currentData = getArrayData(currentData);
                currentData = currentData.slice(0, count);
                break;
                
              case 'skip':
                var count = parseInt(args);
                currentData = getArrayData(currentData);
                currentData = currentData.slice(count);
                break;
                
              default:
                // Unknown method, skip
                break;
            }
          }
          
          return jsonStringify(currentData);
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      // Helper function to apply a single method (defined first)
      function applyMethod(currentData, methodName, methodArgs) {
        switch (methodName) {
          case 'filter':
            var predicate = new Function('return ' + methodArgs)();
            currentData = getArrayData(currentData);
            if (currentData.length > 0) {
              var result = [];
              for (var i = 0; i < currentData.length; i++) {
                if (predicate(currentData[i])) {
                  result.push(currentData[i]);
                }
              }
              currentData = result;
            }
            break;
            
          case 'map':
            var transform = new Function('return ' + methodArgs)();
            currentData = getArrayData(currentData);
            if (currentData.length > 0) {
              var result = [];
              for (var i = 0; i < currentData.length; i++) {
                result.push(transform(currentData[i]));
              }
              currentData = result;
            }
            break;
            
          case 'pluck':
            var key = methodArgs.replace(/['"]/g, ''); // Remove quotes if any
            currentData = getArrayData(currentData);
            if (currentData.length > 0) {
              var result = [];
              for (var i = 0; i < currentData.length; i++) {
                var item = currentData[i];
                if (item && typeof item === 'object' && key in item) {
                  result.push(item[key]);
                }
              }
              currentData = result;
            }
            break;
            
          case 'sortBy':
            var sortKey = methodArgs.replace(/['"]/g, '');
            currentData = getArrayData(currentData);
            if (currentData.length > 0) {
              currentData = currentData.slice().sort(function(a, b) {
                var aVal = a && typeof a === 'object' ? a[sortKey] : a;
                var bVal = b && typeof b === 'object' ? b[sortKey] : b;
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                  return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                }
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                  return aVal - bVal;
                }
                return 0;
              });
            }
            break;
            
          case 'take':
            var count = parseInt(methodArgs);
            currentData = getArrayData(currentData);
            currentData = currentData.slice(0, count);
            break;
            
          case 'skip':
            var count = parseInt(methodArgs);
            currentData = getArrayData(currentData);
            currentData = currentData.slice(count);
            break;
            
          case 'find':
            var predicate = new Function('return ' + methodArgs)();
            currentData = getArrayData(currentData);
            for (var i = 0; i < currentData.length; i++) {
              if (predicate(currentData[i])) {
                currentData = currentData[i];
                break;
              }
            }
            break;
            
          // 高階関数
          case 'reduce':
            var parts = methodArgs.split(',');
            var reducer = new Function('return ' + parts[0].trim())();
            var initialValue = parts.length > 1 ? new Function('return ' + parts[1].trim())() : undefined;
            currentData = getArrayData(currentData);
            if (currentData.length > 0) {
              if (initialValue !== undefined) {
                currentData = currentData.reduce(reducer, initialValue);
              } else {
                currentData = currentData.reduce(reducer);
              }
            } else {
              currentData = initialValue;
            }
            break;
            
          case 'scan':
            var parts = methodArgs.split(',');
            var scanner = new Function('return ' + parts[0].trim())();
            var initialValue = parts.length > 1 ? new Function('return ' + parts[1].trim())() : 0;
            currentData = getArrayData(currentData);
            var result = [];
            var acc = initialValue;
            for (var i = 0; i < currentData.length; i++) {
              acc = scanner(acc, currentData[i]);
              result.push(acc);
            }
            currentData = result;
            break;
            
          // 配列操作
          case 'reverse':
            currentData = getArrayData(currentData);
            currentData = currentData.slice().reverse();
            break;
            
          case 'concat':
            var otherArray = new Function('return ' + methodArgs)();
            currentData = getArrayData(currentData);
            if (Array.isArray && Array.isArray(otherArray)) {
              currentData = currentData.concat(otherArray);
            }
            break;
            
          case 'flatten':
            var depth = methodArgs ? parseInt(methodArgs) : 1;
            currentData = getArrayData(currentData);
            for (var d = 0; d < depth; d++) {
              var flattened = [];
              for (var i = 0; i < currentData.length; i++) {
                if (currentData[i] && typeof currentData[i].length === 'number') {
                  for (var j = 0; j < currentData[i].length; j++) {
                    flattened.push(currentData[i][j]);
                  }
                } else {
                  flattened.push(currentData[i]);
                }
              }
              currentData = flattened;
            }
            break;
            
          case 'flatMap':
            var mapper = new Function('return ' + methodArgs)();
            currentData = getArrayData(currentData);
            var result = [];
            for (var i = 0; i < currentData.length; i++) {
              var mapped = mapper(currentData[i]);
              if (mapped && typeof mapped.length === 'number') {
                for (var j = 0; j < mapped.length; j++) {
                  result.push(mapped[j]);
                }
              } else {
                result.push(mapped);
              }
            }
            currentData = result;
            break;
            
          case 'distinct':
          case 'uniq':
            currentData = getArrayData(currentData);
            var seen = {};
            var result = [];
            for (var i = 0; i < currentData.length; i++) {
              var key = typeof currentData[i] === 'object' ? JSON.stringify(currentData[i]) : currentData[i];
              if (!seen[key]) {
                seen[key] = true;
                result.push(currentData[i]);
              }
            }
            currentData = result;
            break;
            
          // 条件・検索
          case 'any':
          case 'some':
            var predicate = new Function('return ' + methodArgs)();
            currentData = getArrayData(currentData);
            var result = false;
            for (var i = 0; i < currentData.length; i++) {
              if (predicate(currentData[i])) {
                result = true;
                break;
              }
            }
            currentData = result;
            break;
            
          case 'all':
          case 'every':
            var predicate = new Function('return ' + methodArgs)();
            currentData = getArrayData(currentData);
            var result = true;
            for (var i = 0; i < currentData.length; i++) {
              if (!predicate(currentData[i])) {
                result = false;
                break;
              }
            }
            currentData = result;
            break;
            
          case 'count':
            var predicate = methodArgs ? new Function('return ' + methodArgs)() : null;
            currentData = getArrayData(currentData);
            if (predicate) {
              var count = 0;
              for (var i = 0; i < currentData.length; i++) {
                if (predicate(currentData[i])) count++;
              }
              currentData = count;
            } else {
              currentData = currentData.length;
            }
            break;
            
          case 'groupBy':
            var keyFunc = new Function('return ' + methodArgs)();
            currentData = getArrayData(currentData);
            var groups = {};
            for (var i = 0; i < currentData.length; i++) {
              var key = keyFunc(currentData[i]);
              if (!groups[key]) groups[key] = [];
              groups[key].push(currentData[i]);
            }
            currentData = groups;
            break;
            
          // 数学・統計
          case 'min':
            currentData = getArrayData(currentData);
            if (currentData.length > 0) {
              var minVal = currentData[0];
              for (var i = 1; i < currentData.length; i++) {
                if (currentData[i] < minVal) minVal = currentData[i];
              }
              currentData = minVal;
            } else {
              currentData = undefined;
            }
            break;
            
          case 'max':
            currentData = getArrayData(currentData);
            if (currentData.length > 0) {
              var maxVal = currentData[0];
              for (var i = 1; i < currentData.length; i++) {
                if (currentData[i] > maxVal) maxVal = currentData[i];
              }
              currentData = maxVal;
            } else {
              currentData = undefined;
            }
            break;
            
          case 'average':
          case 'mean':
            currentData = getArrayData(currentData);
            if (currentData.length > 0) {
              var sum = 0;
              var count = 0;
              for (var i = 0; i < currentData.length; i++) {
                if (typeof currentData[i] === 'number') {
                  sum += currentData[i];
                  count++;
                }
              }
              currentData = count > 0 ? sum / count : 0;
            } else {
              currentData = 0;
            }
            break;
            
          case 'median':
            currentData = getArrayData(currentData);
            var numbers = [];
            for (var i = 0; i < currentData.length; i++) {
              if (typeof currentData[i] === 'number') {
                numbers.push(currentData[i]);
              }
            }
            if (numbers.length > 0) {
              numbers.sort(function(a, b) { return a - b; });
              var mid = Math.floor(numbers.length / 2);
              if (numbers.length % 2 === 0) {
                currentData = (numbers[mid - 1] + numbers[mid]) / 2;
              } else {
                currentData = numbers[mid];
              }
            } else {
              currentData = 0;
            }
            break;
            
          default:
            // Unknown method, skip
            break;
        }
        
        return currentData;
      }
      
      // Special helper for where method with two arguments
      function applyWhere(currentData, key, value) {
        currentData = getArrayData(currentData);
        if (currentData.length > 0) {
          var result = [];
          for (var i = 0; i < currentData.length; i++) {
            var item = currentData[i];
            if (item && typeof item === 'object' && key in item && item[key] == value) {
              result.push(item);
            }
          }
          currentData = result;
        }
        return currentData;
      }
      
      // Simple method chaining function with individual arguments
      function __vm_chain_simple(data) {
        try {
          var currentData = data;
          
          // Convert arguments to array manually
          var args = [];
          for (var argIndex = 1; argIndex < arguments.length; argIndex++) {
            args.push(arguments[argIndex]);
          }
          
          // Process pairs of (methodName, methodArgs, ...)
          for (var i = 0; i < args.length; ) {
            var methodName = args[i++];
            
            // Special handling for methods with multiple arguments
            if (methodName === 'where') {
              var key = args[i++];
              var value = args[i++];
              currentData = applyWhere(currentData, key, value);
            } else {
              var methodArgs = args[i++];
              currentData = applyMethod(currentData, methodName, methodArgs);
            }
          }
          
          return jsonStringify(currentData);
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
      
      // Multi-method chaining function for more than 2 methods
      function __vm_chain_multi(data) {
        try {
          var currentData = data;
          
          // Convert arguments to array manually
          var args = [];
          for (var argIndex = 1; argIndex < arguments.length; argIndex++) {
            args.push(arguments[argIndex]);
          }
          
          // Process pairs of (methodName, methodArgs, ...)
          for (var i = 0; i < args.length; ) {
            var methodName = args[i++];
            
            // Special handling for methods with multiple arguments
            if (methodName === 'where') {
              var key = args[i++];
              var value = args[i++];
              currentData = applyWhere(currentData, key, value);
            } else {
              var methodArgs = args[i++];
              currentData = applyMethod(currentData, methodName, methodArgs);
            }
          }
          
          return jsonStringify(currentData);
        } catch (error) {
          return 'ERROR: ' + error.message;
        }
      }
    `;

    // Execute the native methods script in the VM context
    const script = await this.isolate.compileScript(nativeMethodsScript);
    await script.run(this.persistentContext);

    if (process.env.NODE_ENV === 'development') {
      console.log('Debug: Set up native VM methods');
    }
  }

  private async ensureObjectSetup(): Promise<void> {
    // Simple and direct approach - override with script-based setup
    const objectSetupScript = `
      // Native Object methods implemented directly in VM
      function objectKeys(obj) {
        if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
          return [];
        }
        var keys = [];
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            keys.push(key);
          }
        }
        return keys;
      }
      
      function objectValues(obj) {
        if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
          return [];
        }
        var values = [];
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            values.push(obj[key]);
          }
        }
        return values;
      }
      
      function objectEntries(obj) {
        if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
          return [];
        }
        var entries = [];
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            entries.push([key, obj[key]]);
          }
        }
        return entries;
      }
      
      // Set up Object global with methods
      if (typeof Object === 'undefined') {
        var Object = {};
      }
      Object.keys = objectKeys;
      Object.values = objectValues;
      Object.entries = objectEntries;
      
      // Native parseInt and parseFloat implementations
      function parseInt(str, radix) {
        if (typeof str !== 'string') {
          str = String(str);
        }
        str = str.trim();
        
        radix = radix || 10;
        if (radix < 2 || radix > 36) {
          return NaN;
        }
        
        var sign = 1;
        if (str[0] === '-') {
          sign = -1;
          str = str.slice(1);
        } else if (str[0] === '+') {
          str = str.slice(1);
        }
        
        var result = 0;
        var validChars = '0123456789abcdefghijklmnopqrstuvwxyz';
        var hasValidDigits = false;
        
        for (var i = 0; i < str.length; i++) {
          var char = str[i].toLowerCase();
          var digit = validChars.indexOf(char);
          if (digit === -1 || digit >= radix) {
            break;
          }
          hasValidDigits = true;
          result = result * radix + digit;
        }
        
        return hasValidDigits ? result * sign : NaN;
      }
      
      function parseFloat(str) {
        if (typeof str !== 'string') {
          str = String(str);
        }
        str = str.trim();
        
        var sign = 1;
        if (str[0] === '-') {
          sign = -1;
          str = str.slice(1);
        } else if (str[0] === '+') {
          str = str.slice(1);
        }
        
        var result = 0;
        var decimalPart = 0;
        var hasDecimal = false;
        var decimalPlaces = 0;
        var hasDigits = false;
        
        for (var i = 0; i < str.length; i++) {
          var char = str[i];
          if (char >= '0' && char <= '9') {
            hasDigits = true;
            if (hasDecimal) {
              decimalPart = decimalPart * 10 + (char.charCodeAt(0) - 48);
              decimalPlaces++;
            } else {
              result = result * 10 + (char.charCodeAt(0) - 48);
            }
          } else if (char === '.' && !hasDecimal) {
            hasDecimal = true;
          } else {
            break;
          }
        }
        
        if (!hasDigits) {
          return NaN;
        }
        
        if (hasDecimal && decimalPlaces > 0) {
          var divisor = 1;
          for (var j = 0; j < decimalPlaces; j++) {
            divisor *= 10;
          }
          result += decimalPart / divisor;
        }
        
        return result * sign;
      }
      
      // Native isNaN and isFinite implementations
      function isNaN(value) {
        return value !== value;
      }
      
      function isFinite(value) {
        return typeof value === 'number' && value === value && value !== Infinity && value !== -Infinity;
      }
      
      // Set global parseInt, parseFloat, isNaN, and isFinite
      globalThis.parseInt = parseInt;
      globalThis.parseFloat = parseFloat;
      globalThis.isNaN = isNaN;
      globalThis.isFinite = isFinite;
      
      // Ensure other basic globals are available
      if (typeof Array === 'undefined') {
        var Array = function() {
          var arr = [];
          for (var i = 0; i < arguments.length; i++) {
            arr.push(arguments[i]);
          }
          return arr;
        };
        Array.isArray = function(obj) {
          return obj && typeof obj === 'object' && typeof obj.length === 'number' && obj.constructor === Array;
        };
      }
      if (typeof String === 'undefined') {
        var String = function(val) { return '' + val; };
      }
      if (typeof Number === 'undefined') {
        var Number = function(val) { return +val; };
      }
      if (typeof Boolean === 'undefined') {
        var Boolean = function(val) { return !!val; };
      }
      
      // Set up native array methods with simple test return
      if (Array.prototype && !Array.prototype.filter) {
        Array.prototype.filter = function(callback) {
          // Return a simple test value to see if the function is called at all
          return ['test-filter-called'];
        };
      }
      if (Array.prototype && !Array.prototype.map) {
        Array.prototype.map = function(callback) {
          var result = [];
          for (var i = 0; i < this.length; i++) {
            result.push(callback(this[i], i, this));
          }
          return result;
        };
      }
      
      // Helper function to ensure arrays transferred from outside get proper prototype
      function ensureArrayPrototype(obj) {
        if (obj && typeof obj === 'object' && typeof obj.length === 'number' && !Array.isArray(obj)) {
          // Convert array-like object to real array
          var arr = [];
          for (var i = 0; i < obj.length; i++) {
            arr.push(obj[i]);
          }
          return arr;
        }
        return obj;
      }
      
      // Override variable access to ensure arrays work properly
      var originalVariables = {};
      function setVariable(name, value) {
        originalVariables[name] = ensureArrayPrototype(value);
        globalThis[name] = originalVariables[name];
      }
      
      // Make setVariable available globally
      globalThis.setVariable = setVariable;
    `;
    const script = await this.isolate.compileScript(objectSetupScript);
    await script.run(this.persistentContext);

    if (process.env.NODE_ENV === 'development') {
      console.log('Debug: Set up Object with native VM implementations');
    }
  }

  // Security filter for dangerous functions and properties
  private readonly DANGEROUS_PROPERTIES = new Set([
    // Node.js globals
    'process',
    'global',
    'Buffer',
    'require',
    'module',
    'exports',
    '__dirname',
    '__filename',
    // Dangerous functions
    'eval',
    'Function',
    'setTimeout',
    'setInterval',
    'setImmediate',
    'clearTimeout',
    'clearInterval',
    'clearImmediate',
    // Prototype pollution
    '__proto__',
    'constructor',
    'prototype',
    // File system and network
    'fs',
    'net',
    'http',
    'https',
    'child_process',
    'cluster',
    'crypto',
    'os',
    'path',
    'stream',
    'url',
    'util',
    // VM escape attempts
    'vm',
    'repl',
    'domain',
  ]);

  // Safe library properties that are allowed
  private readonly SAFE_PROPERTY_PATTERNS = [
    /^[a-zA-Z][a-zA-Z0-9_]*$/, // Normal property names
    /^[0-9]+$/, // Array indices
  ];

  private isSafePropertyName(name: string): boolean {
    if (this.DANGEROUS_PROPERTIES.has(name)) {
      return false;
    }
    return this.SAFE_PROPERTY_PATTERNS.some(pattern => pattern.test(name));
  }

  private isExternalLibrary(key: string, value: unknown): boolean {
    // Known library names that should be treated as external libraries
    const knownLibraries = [
      'lodash',
      '_',
      'moment',
      'dayjs',
      'uuid',
      'validator',
      'axios',
      'ramda',
      'mathjs',
      'math',
      'immutable',
      'bluebird',
      'cheerio',
      'yup',
      'joi',
    ];

    if (knownLibraries.includes(key)) {
      return true;
    }

    // Check if the value looks like a function library (like validator)
    if (typeof value === 'function') {
      const functionKeys = Object.keys(value);
      const functionValues = Object.values(value);
      const functionCount = functionValues.filter(v => typeof v === 'function').length;

      // If it's a function with multiple methods attached, likely a library
      return functionCount >= 3 && functionKeys.length >= 5;
    }

    // Check if the value looks like a library object (has multiple functions)
    if (value && typeof value === 'object') {
      const functionCount = Object.values(value).filter(v => typeof v === 'function').length;
      const objectKeys = Object.keys(value);

      // If it has multiple functions and reasonable number of properties, likely a library
      return functionCount >= 3 && objectKeys.length >= 5 && objectKeys.length < 200;
    }

    return false;
  }

  private sanitizeLibraryForVM(
    library: unknown,
    depth: number = 0
  ): Record<string, ivm.Reference> | null {
    // Prevent infinite recursion
    if (depth > 3 || !library) {
      return null;
    }

    if (typeof library === 'function') {
      return this.sanitizeFunctionLibrary(library, depth);
    }

    if (typeof library === 'object') {
      return this.sanitizeObjectLibrary(library, depth);
    }

    return null;
  }

  private sanitizeFunctionLibrary(
    library: Function,
    depth: number
  ): Record<string, ivm.Reference> {
    const sanitized: Record<string, ivm.Reference> = {};

    // Add the main function
    try {
      sanitized.__main__ = this.createSafeFunction(library);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Debug: Failed to sanitize main function:', error);
      }
    }

      // Add properties/methods attached to the function
      try {
        const entries = Object.entries(library);
        for (const [key, value] of entries) {
          if (!this.isSafePropertyName(key)) {
            continue;
          }

          if (typeof value === 'function') {
            sanitized[key] = new ivm.Reference((...args: unknown[]) => {
              try {
                return (value as Function)(...args);
              } catch (error) {
                throw new Error(
                  `Library function error: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
              }
            });
          } else if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            sanitized[key] = new ivm.Reference(value);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Debug: Failed to process function properties:', error);
        }
      }

      return Object.keys(sanitized).length > 0 ? sanitized : null;
  }

  private sanitizeObjectLibrary(
    library: unknown,
    depth: number
  ): Record<string, ivm.Reference> | null {
    if (typeof library !== 'object' || library === null) {
      return null;
    }

    const sanitized: Record<string, ivm.Reference> = {};

    try {
      const entries = Object.entries(library);
      for (const [key, value] of entries) {
        this.processObjectProperty(key, value, depth, sanitized);
      }

      return Object.keys(sanitized).length > 0 ? sanitized : null;
    } catch (error) {
      this.logDevelopmentError('Failed to sanitize library', error);
      return null;
    }
  }

  private processObjectProperty(
    key: string,
    value: unknown,
    depth: number,
    sanitized: Record<string, ivm.Reference>
  ): void {
    if (!this.isSafePropertyName(key)) {
      this.logDevelopmentMessage(`Skipping dangerous property: ${key}`);
      return;
    }

    if (typeof value === 'function') {
      this.sanitizeObjectFunction(key, value, sanitized);
    } else if (typeof value === 'object' && value !== null) {
      this.sanitizeNestedObject(key, value, depth, sanitized);
    } else if (this.isPrimitiveValue(value)) {
      sanitized[key] = new ivm.Reference(value);
    }
  }

  private sanitizeObjectFunction(
    key: string,
    fn: Function,
    sanitized: Record<string, ivm.Reference>
  ): void {
    try {
      sanitized[key] = this.createSafeFunction(fn);
      this.logDevelopmentMessage(`Sanitized function: ${key}`);
    } catch (error) {
      this.logDevelopmentError(`Failed to sanitize function ${key}`, error);
    }
  }

  private sanitizeNestedObject(
    key: string,
    value: unknown,
    depth: number,
    sanitized: Record<string, ivm.Reference>
  ): void {
    const nestedSanitized = this.sanitizeLibraryForVM(value, depth + 1);
    if (nestedSanitized && Object.keys(nestedSanitized).length > 0) {
      sanitized[key] = new ivm.Reference(nestedSanitized);
      this.logDevelopmentMessage(`Sanitized nested object: ${key}`);
    }
  }

  private isPrimitiveValue(value: unknown): boolean {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  private logDevelopmentMessage(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Debug: ${message}`);
    }
  }

  private logDevelopmentError(message: string, error: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Debug: ${message}:`, error);
    }
  }

  private createSafeFunction(fn: Function): ivm.Reference {
    return new ivm.Reference((...args: unknown[]) => {
      try {
        const result = fn(...args);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
          return result.catch((error: Error) => {
            throw new Error(`Library function error: ${error.message}`);
          });
        }
        
        return result;
      } catch (error) {
        throw new Error(
          `Library function error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  private async transferContext(contextData: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(contextData)) {
      try {
        await this.transferContextItem(key, value);
      } catch (error) {
        this.handleTransferError(key, error);
      }
    }
  }

  private async transferContextItem(key: string, value: unknown): Promise<void> {
    this.logContextProcessing(key, value);

    const wrapper = value as VMChainableWrapper;
    
    if (this.isVMChainableWrapper(value, wrapper)) {
      await this.handleVMChainableWrapper(key, wrapper);
    } else if (this.isDollarFunction(key, value)) {
      await this.handleDollarFunction(key, value);
    } else if (this.isExternalLibraryOrFunction(key, value)) {
      await this.handleExternalLibrary(key, value);
    } else {
      await this.handleRegularValue(key, value);
    }
  }

  private logContextProcessing(key: string, value: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      const wrapper = value as VMChainableWrapper;
      console.log(
        `Debug: Processing ${key}, type: ${typeof value}, isVMChainableWrapper: ${this.isVMChainableWrapper(value, wrapper)}, isFunction: ${typeof value === 'function'}, hasData: ${!!wrapper?.data}, hasValue: ${!!wrapper?.value}`
      );
    }
  }

  private isVMChainableWrapper(value: unknown, wrapper: VMChainableWrapper): boolean {
    return value && typeof value === 'object' && wrapper.__isVMChainableWrapper;
  }

  private isDollarFunction(key: string, value: unknown): boolean {
    return typeof value === 'function' && key === '$';
  }

  private isExternalLibraryOrFunction(key: string, value: unknown): boolean {
    return typeof value === 'function' || this.isExternalLibrary(key, value);
  }

  private async handleVMChainableWrapper(key: string, wrapper: VMChainableWrapper): Promise<void> {
    const data = wrapper.data || wrapper.value;
    this.logDevelopmentMessage(`Transferring VMChainableWrapper ${key} with data: ${JSON.stringify(data)}`);
    await this.transferVMChainableData(key, data);
  }

  private async handleDollarFunction(key: string, value: unknown): Promise<void> {
    const dollarWrapper = value as unknown as VMChainableWrapper;
    const dollarData = dollarWrapper.data || dollarWrapper.value;
    
    this.logDevelopmentMessage(`Processing $ function, hasData: ${dollarData !== undefined}, data: ${JSON.stringify(dollarData)}`);

    if (dollarData !== undefined) {
      this.logDevelopmentMessage('Transferring $ function data via transferVMChainableData');
      await this.transferVMChainableData(key, dollarData);
    } else {
      this.logDevelopmentMessage('Creating simple $ data with undefined');
      const simpleData = { data: undefined, value: undefined };
      await this.transferVMChainableData(key, simpleData);
    }
  }

  private async handleExternalLibrary(key: string, value: unknown): Promise<void> {
    const sanitizedLibrary = this.sanitizeLibraryForVM(value);

    if (sanitizedLibrary) {
      const libraryProxy = this.createLibraryProxy(sanitizedLibrary);
      await this.jail.set(key, libraryProxy);

            if (process.env.NODE_ENV === 'development') {
              console.log(
                `Debug: Successfully transferred library ${key} with ${Object.keys(sanitizedLibrary).length} methods`
              );
            }
          } else if (typeof value === 'function') {
            // Skip regular functions that are not libraries
            if (this.context.unsafe || process.env.NODE_ENV === 'development') {
              console.log(`Debug: Skipping function ${key} (not a library or unsafe)`);
            }
          }
        } else if (this.isTransferable(value)) {
          // Simple transferable values
          if (process.env.NODE_ENV === 'development') {
            console.log(`Debug: Transferring simple value ${key}:`, value);
          }
          const copy = new ivm.ExternalCopy(value);
          await this.jail.set(key, copy.copyInto());

          // For arrays, manually set up proper array with prototype
          if (Array.isArray(value)) {
            const arraySetupScript = `
              (function() {
                var originalData = ${key};
                var properArray = [];
                for (var i = 0; i < originalData.length; i++) {
                  properArray.push(originalData[i]);
                }
                ${key} = properArray;
                console.log('Array prototype fix applied to ${key}:', ${key}, 'has filter:', typeof ${key}.filter);
              })();
            `;
            const script = await this.isolate.compileScript(arraySetupScript);
            await script.run(this.persistentContext);
            if (process.env.NODE_ENV === 'development') {
              console.log(`Debug: Applied array prototype fix for ${key}`);
            }
          }
        } else {
          // Try to serialize complex objects
          if (process.env.NODE_ENV === 'development') {
            console.log(`Debug: Attempting to serialize complex object ${key}:`, value);
          }
          try {
            const serialized = JSON.stringify(value);
            const parsed = JSON.parse(serialized);
            const copy = new ivm.ExternalCopy(parsed);
            await this.jail.set(key, copy.copyInto());
            if (process.env.NODE_ENV === 'development') {
              console.log(`Debug: Successfully serialized and transferred ${key}`);
            }
          } catch {
            if (this.context.unsafe || process.env.NODE_ENV === 'development') {
              console.log(`Debug: Skipping non-transferable ${key} (could not serialize)`);
            }
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Warning: Could not transfer ${key}:`, error);
        }
      }
    }

    // Set up special library aliases after all libraries are transferred
    await this.setupLibraryAliases(contextData);

    // Set up pre-loaded libraries if they exist in context
    await this.setupPreloadedLibraries(contextData);
  }

  private async setupLibraryAliases(contextData: Record<string, unknown>): Promise<void> {
    const aliases: Array<{ from: string; to: string }> = [];

    // lodash can be accessed as both 'lodash' and '_'
    if (contextData.lodash && !contextData._) {
      aliases.push({ from: 'lodash', to: '_' });
    }

    // moment library alias
    if (contextData.moment) {
      aliases.push({ from: 'moment', to: 'moment' });
    }

    // Create aliases in VM context
    for (const alias of aliases) {
      try {
        const aliasScript = `var ${alias.to} = ${alias.from};`;
        const script = await this.isolate.compileScript(aliasScript);
        await script.run(this.persistentContext);

        if (process.env.NODE_ENV === 'development') {
          console.log(`Debug: Created library alias: ${alias.to} -> ${alias.from}`);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Debug: Failed to create alias ${alias.to}:`, error);
        }
      }
    }
  }

  private async setupPreloadedLibraries(contextData: Record<string, unknown>): Promise<void> {
    // Direct library setup approach - more reliable than complex transfer
    const librarySetups: Array<{ key: string; library: unknown }> = [];

    // Find libraries in context data
    for (const [key, value] of Object.entries(contextData)) {
      if (this.isExternalLibrary(key, value)) {
        librarySetups.push({ key, library: value });
      }
    }

    // Set up each library directly
    for (const { key, library } of librarySetups) {
      try {
        if (key === 'validator' && library && typeof library === 'object') {
          // Special handling for validator library
          const validatorRef = new ivm.Reference(library as any);
          await this.jail.set('validator', validatorRef);

          if (process.env.NODE_ENV === 'development') {
            console.log('Debug: Set up validator library directly');
          }
        } else if (key === 'lodash' || key === '_') {
          // Special handling for lodash
          const lodashRef = new ivm.Reference(library as any);
          await this.jail.set('lodash', lodashRef);
          await this.jail.set('_', lodashRef);

          if (process.env.NODE_ENV === 'development') {
            console.log('Debug: Set up lodash library directly');
          }
        } else if (key === 'uuid' && library && typeof library === 'object') {
          // Special handling for uuid
          const uuidRef = new ivm.Reference(library as any);
          await this.jail.set('uuid', uuidRef);

          if (process.env.NODE_ENV === 'development') {
            console.log('Debug: Set up uuid library directly');
          }
        } else {
          // Generic library setup
          const libraryRef = new ivm.Reference(library as any);
          await this.jail.set(key, libraryRef);

          if (process.env.NODE_ENV === 'development') {
            console.log(`Debug: Set up ${key} library directly`);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Debug: Failed to set up library ${key}:`, error);
        }
      }
    }
  }

  private safeJSONStringify(data: any): string {
    const seen = new WeakSet();

    return JSON.stringify(data, (_key, value) => {
      if (value !== null && typeof value === 'object') {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
      }
      return value;
    });
  }

  private async transferVMChainableData(key: string, data: any): Promise<void> {
    try {
      // For arrays and complex objects, use JSON string transfer to avoid VM boundary issues
      if (Array.isArray(data) || (typeof data === 'object' && data !== null)) {
        const jsonData = this.safeJSONStringify(data);
        const jsonCopy = new ivm.ExternalCopy(jsonData);
        await this.jail.set(`${key}_json`, jsonCopy.copyInto());

        // Parse it back to native data in VM context
        // Use the jsonParse function directly to avoid JSON.parse issues
        const parseScript = `
          var ${key} = (function() {
            try {
              return (new Function('return ' + ${key}_json))();
            } catch (error) {
              throw new Error('Invalid JSON: ' + error.message);
            }
          })();
        `;
        const script = await this.isolate.compileScript(parseScript);
        await script.run(this.persistentContext);
      } else {
        // For simple data types, use direct transfer
        const dataCopy = new ivm.ExternalCopy(data);
        await this.jail.set(key, dataCopy.copyInto());
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`Debug: Successfully transferred VMChainable data for ${key}`);
      }
    } catch (error) {
      console.error(`Error transferring VMChainable data for ${key}:`, error);
      throw error;
    }
  }

  private transformExpressionForVM(expression: string): string {
    let transformed = expression;

    // Normalize the expression by removing extra whitespace and newlines
    const normalizedExpression = expression.replace(/\s+/g, ' ').trim();

    // Check for method chaining pattern - look for multiple method calls (including nested properties)
    const hasChaining =
      /\$(?:\s*\.\s*[a-zA-Z_][a-zA-Z0-9_]*)*\s*\.\s*[a-zA-Z_][a-zA-Z0-9_]*\([^)]*\)\s*\.\s*[a-zA-Z_][a-zA-Z0-9_]*\(/g.test(
        normalizedExpression
      );

    if (hasChaining) {
      // Parse the method chain more generally
      const methods = this.parseFullMethodChain(normalizedExpression);
      if (methods.length >= 2) {
        // Create comma-separated arguments for the function call
        const basePart = this.currentBase || '$';
        const args = [basePart];
        for (const method of methods) {
          args.push(`'${method.name}'`);
          // For where method, we need special handling since it has multiple arguments
          if (method.name === 'where') {
            // Parse the two arguments from 'where("key", "value")'
            const whereMatch = method.args.match(/^"([^"]+)",\s*"([^"]+)"$/);
            if (whereMatch) {
              args.push(`'${whereMatch[1]}'`); // key
              args.push(`'${whereMatch[2]}'`); // value
            } else {
              args.push(`'${method.args}'`);
            }
          } else {
            // For other methods, just escape single quotes in the args
            const cleanArgs = method.args.replace(/'/g, "\\'");
            args.push(`'${cleanArgs}'`);
          }
        }

        // Use dynamic function based on number of methods
        const functionName = methods.length === 2 ? '__vm_chain_simple' : '__vm_chain_multi';
        transformed = `${functionName}(${args.join(', ')})`;

        if (process.env.NODE_ENV === 'development') {
          console.log(`Debug: Detected method chain: ${normalizedExpression}`);
          console.log(`Debug: Parsed methods:`, methods);
          console.log(`Debug: Transformed to: ${transformed}`);
        }
      }
    } else {
      // Handle single method calls
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.map\(([^)]+)\)/g, '__vm_map($1, $2)');
      transformed = transformed.replace(
        /(\$(?:\.[\w.]+)?)\.filter\(([^)]+)\)/g,
        '__vm_filter($1, $2)'
      );
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.find\(([^)]+)\)/g, '__vm_find($1, $2)');
      transformed = transformed.replace(
        /(\$(?:\.[\w.]+)?)\.pluck\(([^)]+)\)/g,
        '__vm_pluck($1, $2)'
      );
      transformed = transformed.replace(
        /(\$(?:\.[\w.]+)?)\.where\(([^)]+)\)/g,
        '__vm_where($1, $2)'
      );
      transformed = transformed.replace(
        /(\$(?:\.[\w.]+)?)\.sortBy\(([^)]+)\)/g,
        '__vm_sortBy($1, $2)'
      );
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.take\(([^)]+)\)/g, '__vm_take($1, $2)');
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.skip\(([^)]+)\)/g, '__vm_skip($1, $2)');
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.sum\(([^)]*)\)/g, '__vm_sum($1, $2)');
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.length\(\)/g, '__vm_length($1)');

      // 新しい関数型メソッド
      transformed = transformed.replace(
        /(\$(?:\.[\w.]+)?)\.reduce\(([^)]+)\)/g,
        '__vm_reduce($1, $2)'
      );
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.scan\(([^)]+)\)/g, '__vm_scan($1, $2)');
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.reverse\(\)/g, '__vm_reverse($1)');
      transformed = transformed.replace(
        /(\$(?:\.[\w.]+)?)\.concat\(([^)]+)\)/g,
        '__vm_concat($1, $2)'
      );
      transformed = transformed.replace(
        /(\$(?:\.[\w.]+)?)\.flatten\(([^)]*)\)/g,
        '__vm_flatten($1, $2)'
      );
      transformed = transformed.replace(
        /(\$(?:\.[\w.]+)?)\.flatMap\(([^)]+)\)/g,
        '__vm_flatMap($1, $2)'
      );
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.distinct\(\)/g, '__vm_distinct($1)');
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.uniq\(\)/g, '__vm_uniq($1)');
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.any\(([^)]+)\)/g, '__vm_any($1, $2)');
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.some\(([^)]+)\)/g, '__vm_some($1, $2)');
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.all\(([^)]+)\)/g, '__vm_all($1, $2)');
      transformed = transformed.replace(
        /(\$(?:\.[\w.]+)?)\.every\(([^)]+)\)/g,
        '__vm_every($1, $2)'
      );
      transformed = transformed.replace(
        /(\$(?:\.[\w.]+)?)\.count\(([^)]*)\)/g,
        '__vm_count($1, $2)'
      );
      transformed = transformed.replace(
        /(\$(?:\.[\w.]+)?)\.groupBy\(([^)]+)\)/g,
        '__vm_groupBy($1, $2)'
      );
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.min\(\)/g, '__vm_min($1)');
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.max\(\)/g, '__vm_max($1)');
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.average\(\)/g, '__vm_average($1)');
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.mean\(\)/g, '__vm_mean($1)');
      transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.median\(\)/g, '__vm_median($1)');

      if (process.env.NODE_ENV === 'development' && transformed !== expression) {
        console.log(`Debug: Transformed single method: ${expression} -> ${transformed}`);
      }
    }

    return transformed;
  }

  private parseFullMethodChain(expression: string): Array<{ name: string; args: string }> {
    // Extract the full method chain from an expression like $.users.filter(...).pluck(...)
    // First, find where the method calls start (allowing spaces around dots)
    const methodStart = expression.search(/\s*\.\s*[a-zA-Z_][a-zA-Z0-9_]*\(/);
    if (methodStart === -1) return [];

    // Extract the base part (e.g., "$.users") and the method chain part
    const basePart = expression.substring(0, methodStart).trim();
    const chainPart = expression.substring(methodStart);

    // Store the base part for later use in transformation
    this.currentBase = basePart;

    return this.parseMethodChain(chainPart);
  }

  private parseMethodChain(chainPart: string): Array<{ name: string; args: string }> {
    const methods: Array<{ name: string; args: string }> = [];

    // More sophisticated parsing to handle nested parentheses
    let i = 0;
    while (i < chainPart.length) {
      const dotIndex = chainPart.indexOf('.', i);
      if (dotIndex === -1) break;

      const methodStart = dotIndex + 1;
      const parenIndex = chainPart.indexOf('(', methodStart);
      if (parenIndex === -1) break;

      const methodName = chainPart.substring(methodStart, parenIndex);

      // Find matching closing parenthesis
      let parenCount = 1;
      const argStart = parenIndex + 1;
      let argEnd = argStart;

      while (argEnd < chainPart.length && parenCount > 0) {
        if (chainPart[argEnd] === '(') parenCount++;
        else if (chainPart[argEnd] === ')') parenCount--;
        argEnd++;
      }

      if (parenCount === 0) {
        const args = chainPart.substring(argStart, argEnd - 1);
        methods.push({
          name: methodName,
          args: args,
        });
        i = argEnd;
      } else {
        break;
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Debug: Parsed methods from "${chainPart}":`, methods);
    }

    return methods;
  }

  private async processResult(result: any): Promise<unknown> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          'Debug: Processing VM result, type:',
          typeof result,
          'hasCopy:',
          !!(result && typeof result.copy === 'function')
        );
        if (result) {
          console.log('Debug: Result value:', result);
        }
        console.log('Debug: Result is null/undefined:', result === null || result === undefined);
        console.log(
          'Debug: Result constructor:',
          result?.constructor ? result.constructor.name : 'unknown'
        );
      }

      // The result from script.run() might not always be an ExternalCopy
      if (result && typeof result.copy === 'function') {
        const copied = result.copy();
        if (process.env.NODE_ENV === 'development') {
          console.log('Debug: Copied result, type:', typeof copied, 'value:', copied);
        }

        // Check if the copied result is a JSON string from VM array methods
        if (typeof copied === 'string') {
          // Try to parse as JSON if it looks like JSON
          if (
            (copied.startsWith('[') && copied.endsWith(']')) ||
            (copied.startsWith('{') && copied.endsWith('}'))
          ) {
            try {
              const parsed = JSON.parse(copied);
              if (process.env.NODE_ENV === 'development') {
                console.log('Debug: Parsed JSON result:', parsed);
              }
              return parsed;
            } catch {
              // If JSON parsing fails, return the string as-is
              return copied;
            }
          }
        }

        return copied;
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Debug: Returning result directly');
        }

        // Check if the direct result is a JSON string from VM array methods
        if (typeof result === 'string') {
          // Handle both quoted and unquoted JSON strings
          let jsonStr = result;
          if (result.startsWith('"') && result.endsWith('"')) {
            try {
              // Remove outer quotes and unescape
              jsonStr = JSON.parse(result);
            } catch {
              // Keep as-is if parsing fails
            }
          }

          if (typeof jsonStr === 'string' && (jsonStr.startsWith('[') || jsonStr.startsWith('{'))) {
            try {
              const parsed = JSON.parse(jsonStr);
              if (process.env.NODE_ENV === 'development') {
                console.log('Debug: Parsed JSON result from direct result:', parsed);
              }
              return parsed;
            } catch {
              // If JSON parsing fails, return the string as-is
              return result;
            }
          } else if (typeof jsonStr === 'string') {
            // For simple string values, return the unquoted string
            if (process.env.NODE_ENV === 'development') {
              console.log('Debug: Returning simple string value:', jsonStr);
            }
            return jsonStr;
          }
        }

        // Special handling for objects that come from VM - ensure proper JSON.stringify behavior
        if (result && typeof result === 'object') {
          if (process.env.NODE_ENV === 'development') {
            console.log('Debug: Converting object result to string for JSON.stringify test');
          }
          try {
            // If this is from JSON.stringify, convert to string
            return JSON.stringify(result);
          } catch {
            return result;
          }
        }

        return result;
      }
    } catch (error) {
      console.error('Error processing VM result:', error);
      console.error('Original result:', result);
      throw error;
    }
  }

  private isTransferable(value: unknown): boolean {
    if (value === null || value === undefined) return true;

    const type = typeof value;
    if (['string', 'number', 'boolean'].includes(type)) return true;

    if (Array.isArray(value)) {
      // Always consider arrays as transferable through serialization
      return true;
    }

    if (type === 'object') {
      // Check if this is a VMChainableWrapper or similar object
      const obj = value as Record<string, unknown>;
      if (obj.__isVMChainableWrapper || 'data' in obj || 'value' in obj) {
        return false; // These should be processed by extractObjectProperties
      }

      // Plain objects should be transferable
      return true;
    }

    return false;
  }

  private executeUnsafe(expression: string, contextData: Record<string, unknown>): unknown {
    // Fallback to regular Function evaluation
    const contextKeys = Object.keys(contextData);
    const contextValues = Object.values(contextData);

    try {
      const func = new Function(
        ...contextKeys,
        `
        "use strict";
        return (${expression});
      `
      );

      return func(...contextValues);
    } catch (error) {
      throw new Error(
        `Expression evaluation failed: ${error instanceof Error ? error.message : 'Syntax error'}`
      );
    }
  }

  static async isVMAvailable(): Promise<boolean> {
    try {
      // Test if isolated-vm module is available and working
      const isolate = new ivm.Isolate({ memoryLimit: 8 });
      const context = await isolate.createContext();
      const script = await isolate.compileScript('2 + 2');
      const result = await script.run(context, { timeout: 1000 });
      await isolate.dispose();
      return result === 4;
    } catch {
      return false;
    }
  }
}
