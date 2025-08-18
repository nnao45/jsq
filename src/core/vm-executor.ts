import ivm from 'isolated-vm';
import { VMExecutionContext } from '@/types/cli';

export class VMExecutor {
  private context: VMExecutionContext;
  private isolate: ivm.Isolate;
  private persistentContext: ivm.Context;
  private jail: ivm.Reference<any>;
  private isInitialized = false;

  constructor(context: VMExecutionContext) {
    this.context = context;
    // Create an isolated VM instance with memory limits for security
    this.isolate = new ivm.Isolate({ 
      memoryLimit: 128, // 128MB memory limit
      inspector: false  // Disable debugging for security
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
      // Ensure the persistent VM is initialized
      await this.ensureInitialized();
      
      // Transfer only data to the persistent context
      await this.transferDataOnly(contextData);

      // Transform the expression to use VM methods
      const transformedExpression = this.transformExpressionForVM(expression);

      // Wrap the expression in a function to handle return values properly
      // For complex objects/arrays, stringify before returning to handle VM boundary issues
      const code = `
        (function() {
          "use strict";
          try {
            var result = (${transformedExpression});
            // Handle VM boundary transfer for complex data
            if (result && (typeof result === 'object' || (result && typeof result.length === 'number'))) {
              return jsonStringify(result);
            }
            return result;
          } catch (error) {
            throw new Error('Expression evaluation failed: ' + error.message + ' | Stack: ' + error.stack);
          }
        })()
      `;

      // Create and run the script in the persistent context
      if (process.env.NODE_ENV === 'development') {
        console.log('Debug: Compiling script with code:', code);
      }
      const script = await this.isolate.compileScript(code, {
        filename: '<jsq-expression>'
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('Debug: Running script in VM...');
      }
      const result = await script.run(this.persistentContext, {
        timeout: 30000 // 30 second timeout
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('Debug: Script execution completed, result type:', typeof result);
      }
      
      // Process the result for VM boundary transfer
      const processedResult = await this.processResult(result);
      if (process.env.NODE_ENV === 'development') {
        console.log('Debug: VM result processed successfully:', typeof processedResult);
      }
      return processedResult;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Script execution timed out')) {
          throw new Error('Expression execution timed out');
        }
        if (error.message.includes('Script execution was interrupted')) {
          throw new Error('Expression execution was interrupted');
        }
        
        // Provide more detailed error information
        console.error('VM execution error details:', {
          message: error.message,
          stack: error.stack,
          expression: expression,
          contextKeys: Object.keys(contextData)
        });
        
        throw new Error(`VM execution failed: ${error.message}`);
      }
      throw new Error(`VM execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async setupPersistentEnvironment(): Promise<void> {
    // Setup safe console functions using References
    const consoleLog = new ivm.Reference((...args: unknown[]) => {
      console.log(...args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)));
    });
    const consoleError = new ivm.Reference((...args: unknown[]) => {
      console.error(...args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)));
    });
    const consoleWarn = new ivm.Reference((...args: unknown[]) => {
      console.warn(...args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)));
    });
    
    await this.jail.set('console', new ivm.ExternalCopy({
      log: consoleLog,
      error: consoleError,
      warn: consoleWarn
    }).copyInto());

    // Setup Math object with all its methods as References
    const mathObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(Math)) {
      if (typeof value === 'function') {
        mathObj[key] = new ivm.Reference(value);
      } else {
        mathObj[key] = value;
      }
    }
    await this.jail.set('Math', new ivm.ExternalCopy(mathObj).copyInto());

    // JSON will be set up in the native methods script

    // Setup basic constructors and utilities
    await this.jail.set('Array', new ivm.Reference((...args: any[]) => new Array(...args)));
    const objectKeys = new ivm.Reference((obj: any) => Object.keys(obj));
    const objectValues = new ivm.Reference((obj: any) => Object.values(obj));
    const objectEntries = new ivm.Reference((obj: any) => Object.entries(obj));
    await this.jail.set('Object', new ivm.ExternalCopy({
      keys: objectKeys,
      values: objectValues,
      entries: objectEntries
    }).copyInto());
    await this.jail.set('String', new ivm.Reference((value?: any) => String(value)));
    await this.jail.set('Number', new ivm.Reference((value?: any) => Number(value)));
    await this.jail.set('Boolean', new ivm.Reference((value?: any) => Boolean(value)));
    
    // Setup utility functions
    await this.jail.set('isArray', new ivm.Reference((obj: any) => Array.isArray(obj)));
    await this.jail.set('parseInt', new ivm.Reference((string: string, radix?: number) => parseInt(string, radix)));
    await this.jail.set('parseFloat', new ivm.Reference((string: string) => parseFloat(string)));
    await this.jail.set('isNaN', new ivm.Reference((value: any) => isNaN(value)));
    await this.jail.set('isFinite', new ivm.Reference((value: any) => isFinite(value)));

    // Setup helper function for array detection in VM
    await this.jail.set('__isArray', new ivm.Reference((obj: any) => {
      return obj && typeof obj === 'object' && typeof obj.length === 'number' && obj.constructor && obj.constructor.name === 'Array';
    }));

    // Setup helper function to get array data from VMChainableWrapper
    await this.jail.set('__getArrayData', new ivm.Reference((obj: any) => {
      if (obj && obj.data && Array.isArray(obj.data)) {
        return obj.data;
      }
      if (Array.isArray(obj)) {
        return obj;
      }
      return [];
    }));
    
    // Setup VMChainable method references
    await this.setupVMChainableMethods();
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
      
      // Make it available as JSON.stringify
      if (typeof JSON === 'undefined') {
        var JSON = { stringify: jsonStringify };
      } else if (!JSON.stringify) {
        JSON.stringify = jsonStringify;
      }
      
      // Helper function to extract array data
      function getArrayData(obj) {
        // Debug what we received
        try {
          if (typeof console !== 'undefined' && console.log) {
            console.log('getArrayData received:', typeof obj, obj);
            if (obj && typeof obj === 'object') {
              console.log('Object keys:', Object.keys(obj));
              if (obj.data) console.log('obj.data:', obj.data, 'length:', typeof obj.data === 'object' ? obj.data.length : 'n/a');
              if (obj.value) console.log('obj.value:', obj.value, 'length:', typeof obj.value === 'object' ? obj.value.length : 'n/a');
            }
          }
        } catch (e) {
          // Ignore console errors
        }
        
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
    `;
    
    // Execute the native methods script in the VM context
    const script = await this.isolate.compileScript(nativeMethodsScript);
    await script.run(this.persistentContext);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Debug: Set up native VM methods');
    }
  }

  private async transferDataOnly(contextData: Record<string, unknown>): Promise<void> {
    // Only transfer pure data, no functions or complex objects
    for (const [key, value] of Object.entries(contextData)) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Debug: Processing ${key}, type: ${typeof value}, isVMChainableWrapper: ${!!(value && typeof value === 'object' && (value as any).__isVMChainableWrapper)}, isFunction: ${typeof value === 'function'}, hasData: ${!!(value as any)?.data}, hasValue: ${!!(value as any)?.value}`);
        }
        
        if (value && typeof value === 'object' && (value as any).__isVMChainableWrapper) {
          // Extract data from VMChainableWrapper and create enhanced proxy
          const data = (value as any).data || (value as any).value;
          if (process.env.NODE_ENV === 'development') {
            console.log(`Debug: Transferring VMChainableWrapper ${key} with data:`, data);
          }
          await this.transferVMChainableData(key, data);
        } else if (typeof value === 'function' && key === '$') {
          // Special handling for $ function - check if it has VMChainableWrapper properties
          const dollarData = (value as any).data || (value as any).value;
          if (process.env.NODE_ENV === 'development') {
            console.log(`Debug: Processing $ function, hasData: ${dollarData !== undefined}, data:`, dollarData);
          }
          if (dollarData !== undefined) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`Debug: Transferring $ function data via transferVMChainableData`);
            }
            await this.transferVMChainableData(key, dollarData);
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log(`Debug: Creating simple $ data with undefined`);
            }
            // Create a simple $ function that returns data directly 
            const simpleData = {
              data: undefined,
              value: undefined
            };
            await this.transferVMChainableData(key, simpleData);
          }
        } else if (this.isTransferable(value)) {
          // Simple transferable values
          const copy = new ivm.ExternalCopy(value);
          await this.jail.set(key, copy.copyInto());
        } else if (typeof value === 'function') {
          // Skip regular functions - they're handled by persistent methods
          if (this.context.unsafe || process.env.NODE_ENV === 'development') {
            console.log(`Debug: Skipping function ${key} (handled by persistent methods)`);
          }
        } else {
          // Try to serialize complex objects
          try {
            const serialized = JSON.stringify(value);
            const parsed = JSON.parse(serialized);
            const copy = new ivm.ExternalCopy(parsed);
            await this.jail.set(key, copy.copyInto());
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
  }

  private async transferVMChainableData(key: string, data: any): Promise<void> {
    try {
      // For arrays and complex objects, use JSON string transfer to avoid VM boundary issues
      if (Array.isArray(data) || (typeof data === 'object' && data !== null)) {
        const jsonData = JSON.stringify(data);
        const jsonCopy = new ivm.ExternalCopy(jsonData);
        await this.jail.set(`${key}_json`, jsonCopy.copyInto());
        
        // Parse it back to native data in VM context
        const parseScript = `var ${key} = JSON.parse(${key}_json);`;
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
    // Transform method calls to use VM functions
    // This is a simple regex-based transformation for common cases
    let transformed = expression;
    
    // Transform .map() calls - improved to handle $ directly and with properties
    transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.map\(([^)]+)\)/g, '__vm_map($1, $2)');
    
    // Transform .filter() calls  
    transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.filter\(([^)]+)\)/g, '__vm_filter($1, $2)');
    
    // Transform .find() calls
    transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.find\(([^)]+)\)/g, '__vm_find($1, $2)');
    
    // Transform .pluck() calls
    transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.pluck\(([^)]+)\)/g, '__vm_pluck($1, $2)');
    
    // Transform .where() calls
    transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.where\(([^)]+)\)/g, '__vm_where($1, $2)');
    
    // Transform .sortBy() calls
    transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.sortBy\(([^)]+)\)/g, '__vm_sortBy($1, $2)');
    
    // Transform .take() calls
    transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.take\(([^)]+)\)/g, '__vm_take($1, $2)');
    
    // Transform .skip() calls
    transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.skip\(([^)]+)\)/g, '__vm_skip($1, $2)');
    
    // Transform .sum() calls
    transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.sum\(([^)]*)\)/g, '__vm_sum($1, $2)');
    
    // Transform .length() calls
    transformed = transformed.replace(/(\$(?:\.[\w.]+)?)\.length\(\)/g, '__vm_length($1)');
    
    if (process.env.NODE_ENV === 'development' && transformed !== expression) {
      console.log(`Debug: Transformed expression: ${expression} -> ${transformed}`);
    }
    
    return transformed;
  }

  private async processResult(result: any): Promise<unknown> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Debug: Processing VM result, type:', typeof result, 'hasCopy:', !!(result && typeof result.copy === 'function'));
        if (result) {
          console.log('Debug: Result value:', result);
        }
        console.log('Debug: Result is null/undefined:', result === null || result === undefined);
        console.log('Debug: Result constructor:', result && result.constructor ? result.constructor.name : 'unknown');
      }
      
      // The result from script.run() might not always be an ExternalCopy
      if (result && typeof result.copy === 'function') {
        const copied = result.copy();
        if (process.env.NODE_ENV === 'development') {
          console.log('Debug: Copied result, type:', typeof copied, 'value:', copied);
        }
        
        // Check if the copied result is a JSON string from VM array methods
        if (typeof copied === 'string' && copied.startsWith('[') && copied.endsWith(']')) {
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
            // Remove outer quotes and unescape
            jsonStr = JSON.parse(result);
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
    
    if (value instanceof Array) {
      return value.every(item => this.isTransferable(item));
    }
    
    if (type === 'object') {
      // Check if this is a VMChainableWrapper or similar object
      const obj = value as Record<string, unknown>;
      if (obj.__isVMChainableWrapper || 'data' in obj || 'value' in obj) {
        return false; // These should be processed by extractObjectProperties
      }
      
      try {
        JSON.stringify(value);
        return true;
      } catch {
        return false;
      }
    }
    
    return false;
  }










  private executeUnsafe(expression: string, contextData: Record<string, unknown>): unknown {
    // Fallback to regular Function evaluation
    const contextKeys = Object.keys(contextData);
    const contextValues = Object.values(contextData);
    
    try {
      const func = new Function(...contextKeys, `
        "use strict";
        return (${expression});
      `);
      
      return func(...contextValues);
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error instanceof Error ? error.message : 'Syntax error'}`);
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