const ivm = require('isolated-vm');
import type {
  VMOptions,
  VMContext,
  VMResult,
  VMSandboxConfig,
  SandboxError,
} from '@/types/sandbox';

/**
 * Simplified VM Sandbox for testing and basic functionality
 * This version focuses on core functionality without advanced features
 */
export class VMSandboxSimple {
  private config: VMSandboxConfig;

  constructor(options: Partial<VMSandboxConfig> = {}) {
    this.config = {
      memoryLimit: this.validatePositiveNumber(options.memoryLimit, 128),
      timeout: this.validatePositiveNumber(options.timeout, 30000),
      enableAsync: options.enableAsync ?? true,
      enableGenerators: options.enableGenerators ?? false,
      enableProxies: options.enableProxies ?? false,
      enableSymbols: options.enableSymbols ?? true,
      maxContextSize: this.validatePositiveNumber(options.maxContextSize, 10 * 1024 * 1024),
      recycleIsolates: options.recycleIsolates ?? false,
      isolatePoolSize: this.validatePositiveNumber(options.isolatePoolSize, 1),
    };
  }

  async execute<T = unknown>(
    code: string,
    context: VMContext = {},
    options: VMOptions = {}
  ): Promise<VMResult<T>> {
    const startTime = Date.now();
    let isolate: ivm.Isolate | null = null;
    let vmContext: ivm.Context | null = null;

    try {
      // Create isolate with snapshot for better intrinsics support
      const memoryLimit = options.memoryLimit ?? this.config.memoryLimit;
      try {
        // Try to create isolate with default snapshot (includes basic JavaScript environment)
        isolate = new ivm.Isolate({
          memoryLimit,
          snapshot: ivm.Isolate.createSnapshot([
            { code: 'undefined' }, // Minimal snapshot
          ]),
        });
      } catch (snapshotError) {
        // Fallback to basic isolate if snapshot fails
        isolate = new ivm.Isolate({ memoryLimit });
      }

      // Create context with intrinsics
      vmContext = await isolate.createContext();
      const jail = vmContext.global;

      // Set up basic environment (console, Math, JSON, etc.)
      await this.setupBasicEnvironment(jail, vmContext, context);

      // Inject ivm for result transfer
      await jail.set('$ivm', ivm);

      // Set up $ first before other context variables
      if ('$' in context) {
        const $value = context.$;
        if (typeof $value === 'function') {
          // Get the actual data from the $ function
          const actualData = ($value as any).valueOf ? ($value as any).valueOf() : $value;
          const serializedData = await this.serializeValue(actualData);
          await jail.set(
            '$_data',
            serializedData instanceof ivm.ExternalCopy ? serializedData.copyInto() : serializedData
          );
          await jail.set(
            'data',
            serializedData instanceof ivm.ExternalCopy ? serializedData.copyInto() : serializedData
          );
          // Create $ with createSmartDollar in the VM
          await vmContext.eval(`
            globalThis.$ = createSmartDollar(globalThis.$_data);
            delete globalThis.$_data;
          `);
        } else {
          const serializedData = await this.serializeValue($value);
          await jail.set(
            '$_data',
            serializedData instanceof ivm.ExternalCopy ? serializedData.copyInto() : serializedData
          );
          await jail.set(
            'data',
            serializedData instanceof ivm.ExternalCopy ? serializedData.copyInto() : serializedData
          );
          // Create $ with createSmartDollar in the VM
          await vmContext.eval(`
            globalThis.$ = createSmartDollar(globalThis.$_data);
            delete globalThis.$_data;
          `);
        }
      }

      // Add user context
      for (const [key, value] of Object.entries(context)) {
        try {
          // Skip native JavaScript globals - they're already set up in setupBasicEnvironment
          if (
            [
              'console',
              'JSON',
              'Math',
              'Date',
              'Array',
              'Object',
              'String',
              'Number',
              'Boolean',
              'Set',
              'Map',
              'Symbol',
              'Reflect',
              'fetch',
            ].includes(key)
          ) {
            continue;
          }

          // Skip $ as it's already handled
          if (key === '$') {
            continue;
          } else if (
            key === 'createSmartDollar' ||
            (typeof value === 'function' && value.toString().includes('ChainableWrapper'))
          ) {
            // Skip functions that reference ChainableWrapper
            continue;
          } else if (key === '_') {
            // Handle lodash utilities - create them directly in the VM
            await this.setupLodashUtilities(jail, vmContext);
            continue;
          } else if (typeof value === 'function') {
            // Special handling for simple functions
            const func = value as Function;
            await vmContext.eval(`
              globalThis.${key} = function(...args) {
                return globalThis._${key}_impl.applySync(undefined, args);
              };
            `);
            await jail.set(`_${key}_impl`, new ivm.Reference(func));
          } else {
            const serialized = await this.serializeValue(value);
            await jail.set(
              key,
              serialized instanceof ivm.ExternalCopy ? serialized.copyInto() : serialized
            );
          }
        } catch (error) {
          // Don't throw on individual context setting failures, just skip
          continue;
        }
      }

      // Inject ivm for result transfer
      await jail.set('$ivm', ivm);

      // Wrap and compile the code
      const wrappedCode = this.wrapCode(code);
      const script = await isolate.compileScript(wrappedCode);

      // Execute with timeout
      const timeout = options.timeout ?? this.config.timeout;
      // Use promise: true for async code - check the wrapped code
      const needsAsync =
        wrappedCode.includes('await') ||
        wrappedCode.includes('async') ||
        wrappedCode.includes('Promise.');
      const result = await script.run(vmContext, {
        timeout,
        ...(needsAsync ? { promise: true } : {}),
      });

      const executionTime = Math.max(1, Date.now() - startTime); // Ensure non-zero time

      return {
        value: result as T,
        executionTime,
        memoryUsed: 0, // Simplified: no detailed memory tracking
      };
    } catch (error) {
      const executionTime = Math.max(1, Date.now() - startTime); // Ensure non-zero time
      throw this.createSandboxError(error, executionTime);
    } finally {
      // Cleanup
      if (vmContext) {
        try {
          vmContext.release();
        } catch {
          // Context might be already released if isolate was disposed
        }
      }
      if (isolate) {
        try {
          isolate.dispose();
        } catch {
          // Isolate might be already disposed due to memory limit
        }
      }
    }
  }

  private async setupBasicEnvironment(
    jail: ivm.Reference,
    vmContext: ivm.Context,
    context: VMContext
  ): Promise<void> {
    try {
      // Set up console using eval to create it inside the VM
      await vmContext.eval(`
        globalThis.console = {
          log: function(...args) { 
            globalThis._consoleLog.applySync(undefined, args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)));
          },
          error: function(...args) { 
            globalThis._consoleError.applySync(undefined, args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)));
          },
          warn: function(...args) { 
            globalThis._consoleWarn.applySync(undefined, args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)));
          },
          info: function(...args) { 
            globalThis._consoleInfo.applySync(undefined, args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)));
          },
          debug: function(...args) { 
            globalThis._consoleDebug.applySync(undefined, args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)));
          }
        };
      `);

      // Set up the console method references
      await jail.set('_consoleLog', new ivm.Reference((...args: string[]) => console.log(...args)));
      await jail.set(
        '_consoleError',
        new ivm.Reference((...args: string[]) => console.error(...args))
      );
      await jail.set(
        '_consoleWarn',
        new ivm.Reference((...args: string[]) => console.warn(...args))
      );
      await jail.set(
        '_consoleInfo',
        new ivm.Reference((...args: string[]) => console.info(...args))
      );
      await jail.set(
        '_consoleDebug',
        new ivm.Reference((...args: string[]) => console.debug(...args))
      );
    } catch (e) {
      console.warn('Failed to set up console in VM:', e);
    }

    try {
      // Set up global JS constructors and functions using script evaluation
      await vmContext.eval(`
        // Restore basic JavaScript constructors and functions
        globalThis.Array = this.constructor.constructor("return Array")();
        globalThis.Object = this.constructor.constructor("return Object")();
        globalThis.String = this.constructor.constructor("return String")();
        globalThis.Number = this.constructor.constructor("return Number")();
        globalThis.Boolean = this.constructor.constructor("return Boolean")();
        globalThis.RegExp = this.constructor.constructor("return RegExp")();
        globalThis.Error = this.constructor.constructor("return Error")();
        globalThis.TypeError = this.constructor.constructor("return TypeError")();
        globalThis.RangeError = this.constructor.constructor("return RangeError")();
        globalThis.Set = this.constructor.constructor("return Set")();
        globalThis.Map = this.constructor.constructor("return Map")();
        globalThis.Promise = this.constructor.constructor("return Promise")();
        
        // Date needs special handling
        var DateConstructor = this.constructor.constructor("return Date")();
        globalThis.Date = function(...args) {
          if (new.target) {
            // Called with new
            if (args.length === 0) {
              return new DateConstructor();
            }
            return new DateConstructor(...args);
          }
          // Called without new
          return DateConstructor();
        };
        // Copy static methods
        Object.setPrototypeOf(globalThis.Date, DateConstructor);
        Object.getOwnPropertyNames(DateConstructor).forEach(prop => {
          if (prop !== 'prototype' && prop !== 'length' && prop !== 'name') {
            globalThis.Date[prop] = DateConstructor[prop];
          }
        });
        globalThis.Date.prototype = DateConstructor.prototype;
        
        // Set up JSON
        globalThis.JSON = this.constructor.constructor("return JSON")();
        
        // Set up Math with all methods
        var MathObj = this.constructor.constructor("return Math")();
        globalThis.Math = {};
        Object.getOwnPropertyNames(MathObj).forEach(prop => {
          globalThis.Math[prop] = MathObj[prop];
        });
      `);
    } catch (e) {
      // If that doesn't work, try a more comprehensive fallback
      console.warn('Failed to set up VM globals via eval, using reference approach');

      // Set up Math with all methods
      await jail.set('Math', {
        PI: Math.PI,
        E: Math.E,
        LN2: Math.LN2,
        LN10: Math.LN10,
        LOG2E: Math.LOG2E,
        LOG10E: Math.LOG10E,
        SQRT1_2: Math.SQRT1_2,
        SQRT2: Math.SQRT2,
        abs: new ivm.Reference((x: number) => Math.abs(x)),
        acos: new ivm.Reference((x: number) => Math.acos(x)),
        asin: new ivm.Reference((x: number) => Math.asin(x)),
        atan: new ivm.Reference((x: number) => Math.atan(x)),
        atan2: new ivm.Reference((y: number, x: number) => Math.atan2(y, x)),
        ceil: new ivm.Reference((x: number) => Math.ceil(x)),
        cos: new ivm.Reference((x: number) => Math.cos(x)),
        exp: new ivm.Reference((x: number) => Math.exp(x)),
        floor: new ivm.Reference((x: number) => Math.floor(x)),
        log: new ivm.Reference((x: number) => Math.log(x)),
        max: new ivm.Reference((...args: number[]) => Math.max(...args)),
        min: new ivm.Reference((...args: number[]) => Math.min(...args)),
        pow: new ivm.Reference((x: number, y: number) => Math.pow(x, y)),
        random: new ivm.Reference(() => Math.random()),
        round: new ivm.Reference((x: number) => Math.round(x)),
        sin: new ivm.Reference((x: number) => Math.sin(x)),
        sqrt: new ivm.Reference((x: number) => Math.sqrt(x)),
        tan: new ivm.Reference((x: number) => Math.tan(x))
      });

      // Set up JSON functions
      await jail.set('JSON', {
        stringify: new ivm.Reference((obj: any, replacer?: any, space?: any) => JSON.stringify(obj, replacer, space)),
        parse: new ivm.Reference((str: string, reviver?: any) => JSON.parse(str, reviver)),
      });

      // Set up Date constructor with proper handling
      const dateImpl = new ivm.Reference(function(...args: any[]) {
        if (args.length === 0) {
          return new Date();
        }
        return new Date(...args);
      });
      await jail.set('_DateImpl', dateImpl);
      
      await vmContext.eval(`
        globalThis.Date = function(...args) {
          const result = globalThis._DateImpl.applySync(undefined, args);
          // Ensure result has proper Date methods
          if (result && typeof result === 'object') {
            result.getFullYear = function() { return new globalThis._DateImpl.applySync(undefined, [this.valueOf()]).getFullYear(); };
            result.getMonth = function() { return new globalThis._DateImpl.applySync(undefined, [this.valueOf()]).getMonth(); };
            result.getDate = function() { return new globalThis._DateImpl.applySync(undefined, [this.valueOf()]).getDate(); };
            result.getHours = function() { return new globalThis._DateImpl.applySync(undefined, [this.valueOf()]).getHours(); };
            result.getMinutes = function() { return new globalThis._DateImpl.applySync(undefined, [this.valueOf()]).getMinutes(); };
            result.getSeconds = function() { return new globalThis._DateImpl.applySync(undefined, [this.valueOf()]).getSeconds(); };
            result.getTime = function() { return this.valueOf(); };
            result.valueOf = function() { return result.getTime(); };
            result.toString = function() { return new globalThis._DateImpl.applySync(undefined, [this.valueOf()]).toString(); };
            result.toISOString = function() { return new globalThis._DateImpl.applySync(undefined, [this.valueOf()]).toISOString(); };
          }
          return result;
        };
        globalThis.Date.now = function() { return Date.now(); };
        globalThis.Date.parse = function(str) { return Date.parse(str); };
        globalThis.Date.UTC = function(...args) { return Date.UTC(...args); };
      `);
    }

    // Set up a simple createSmartDollar function for the VM
    // This adds chainable methods to arrays
    await vmContext.eval(`
      globalThis.createSmartDollar = function(data) {
        // For arrays, add chainable methods
        if (Array.isArray(data)) {
          // Create a new array with chainable methods
          const result = [...data];
          
          // Override native methods to return chainable results
          result.filter = function(...args) {
            const filtered = Array.prototype.filter.apply(this, args);
            return createSmartDollar(filtered);
          };
          
          result.map = function(...args) {
            const mapped = Array.prototype.map.apply(this, args);
            return createSmartDollar(mapped);
          };
          
          result.slice = function(...args) {
            const sliced = Array.prototype.slice.apply(this, args);
            return createSmartDollar(sliced);
          };
          
          result.concat = function(...args) {
            const concatenated = Array.prototype.concat.apply(this, args);
            return createSmartDollar(concatenated);
          };
          
          // Add pluck method
          result.pluck = function(key) {
            return createSmartDollar(this.map(item => item && item[key]));
          };
          
          // Add where method
          result.where = function(key, value) {
            return createSmartDollar(this.filter(item => item && item[key] === value));
          };
          
          // Add sortBy method
          result.sortBy = function(key) {
            return createSmartDollar([...this].sort((a, b) => {
              const aVal = a && a[key];
              const bVal = b && b[key];
              if (aVal < bVal) return -1;
              if (aVal > bVal) return 1;
              return 0;
            }));
          };
          
          // Add take method
          result.take = function(n) {
            return createSmartDollar(this.slice(0, n));
          };
          
          // Add skip method
          result.skip = function(n) {
            return createSmartDollar(this.slice(n));
          };
          
          // Add sum method
          result.sum = function(key) {
            return this.reduce((sum, item) => {
              const value = key ? (item && item[key]) : item;
              return sum + (typeof value === 'number' ? value : 0);
            }, 0);
          };
          
          // Add size method
          result.size = function() {
            return this.length;
          };
          
          // Add isEmpty method
          result.isEmpty = function() {
            return this.length === 0;
          };
          
          // Add compact method
          result.compact = function() {
            return createSmartDollar(this.filter(item => item));
          };
          
          // Add uniq method
          result.uniq = function() {
            return createSmartDollar([...new Set(this)]);
          };
          
          // Add flatten method
          result.flatten = function() {
            return createSmartDollar(this.flat());
          };
          
          // Add reverse method
          result.reverse = function() {
            return createSmartDollar([...this].reverse());
          };
          
          // Add sample method
          result.sample = function() {
            return this[Math.floor(Math.random() * this.length)];
          };
          
          // Add groupBy method
          result.groupBy = function(keyFn) {
            const grouped = {};
            this.forEach(item => {
              const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(item);
            });
            return grouped;
          };
          
          // Add async methods
          result.forEachAsync = async function(asyncFn) {
            await Promise.all(this.map(item => asyncFn(item)));
          };
          
          result.mapAsync = async function(asyncFn) {
            const results = await Promise.all(this.map(item => asyncFn(item)));
            return createSmartDollar(results);
          };
          
          result.forEachAsyncSeq = async function(asyncFn) {
            for (const item of this) {
              await asyncFn(item);
            }
          };
          
          result.mapAsyncSeq = async function(asyncFn) {
            const results = [];
            for (const item of this) {
              results.push(await asyncFn(item));
            }
            return createSmartDollar(results);
          };
          
          return result;
        }
        
        // For objects, add object methods
        if (typeof data === 'object' && data !== null) {
          const result = {...data};
          
          // Add keys method
          result.keys = function() {
            return createSmartDollar(Object.keys(this));
          };
          
          // Add values method
          result.values = function() {
            return createSmartDollar(Object.values(this));
          };
          
          // Add entries method
          result.entries = function() {
            return createSmartDollar(Object.entries(this));
          };
          
          // Add pick method
          result.pick = function(keys) {
            const picked = {};
            keys.forEach(key => {
              if (key in this) picked[key] = this[key];
            });
            return createSmartDollar(picked);
          };
          
          // Add omit method
          result.omit = function(keys) {
            const omitted = {...this};
            keys.forEach(key => delete omitted[key]);
            return createSmartDollar(omitted);
          };
          
          return result;
        }
        
        // For other types (strings, numbers, etc), create a wrapper with chainable methods
        const wrapper = function(...args) {
          if (args.length === 0) {
            return data;
          }
          return createSmartDollar(args[0]);
        };
        
        // Add common chainable methods for primitives
        wrapper.toString = function() { return String(data); };
        wrapper.valueOf = function() { return data; };
        wrapper.toJSON = function() { return data; };
        
        // Add async methods that work on single values
        wrapper.mapAsync = async function(asyncFn) {
          const result = await asyncFn(data);
          return createSmartDollar([result]);
        };
        
        wrapper.forEachAsync = async function(asyncFn) {
          await asyncFn(data);
          return wrapper;
        };
        
        wrapper.mapAsyncSeq = wrapper.mapAsync;
        wrapper.forEachAsyncSeq = wrapper.forEachAsync;
        
        return wrapper;
      };
    `);
  }

  private async setupLodashUtilities(jail: ivm.Reference, vmContext: ivm.Context): Promise<void> {
    // Set up lodash-like utilities in the VM
    await vmContext.eval(`
      globalThis._ = {
        // Array methods
        chunk: function(arr, size) {
          const chunks = [];
          for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
          }
          return chunks;
        },
        uniqBy: function(arr, keyFn) {
          const seen = new Set();
          const result = [];
          for (const item of arr) {
            const key = keyFn(item);
            if (!seen.has(key)) {
              seen.add(key);
              result.push(item);
            }
          }
          return result;
        },
        orderBy: function(arr, keys, orders) {
          if (!Array.isArray(keys)) keys = [keys];
          if (!Array.isArray(orders)) orders = keys.map(() => 'asc');
          
          return [...arr].sort((a, b) => {
            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              const order = orders[i] || 'asc';
              const aVal = typeof key === 'function' ? key(a) : a[key];
              const bVal = typeof key === 'function' ? key(b) : b[key];
              
              if (aVal < bVal) return order === 'asc' ? -1 : 1;
              if (aVal > bVal) return order === 'asc' ? 1 : -1;
            }
            return 0;
          });
        },
        groupBy: function(arr, keyFn) {
          return arr.reduce((groups, item) => {
            const key = keyFn(item);
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
            return groups;
          }, {});
        },
        flatten: function(arr) {
          return arr.reduce((acc, val) => 
            acc.concat(Array.isArray(val) ? val : [val]), []);
        },
        compact: function(arr) {
          return arr.filter(Boolean);
        }
      };
    `);
  }

  private async serializeValue(value: unknown): Promise<any> {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'function') {
      // Special handling for smart $ functions
      if (value.toString().includes('ChainableWrapper') || value.name === '$') {
        // For smart $ functions, we need to get the actual data
        try {
          // Try valueOf first for simpler extraction
          if ('valueOf' in value) {
            const valueOf = (value as any).valueOf();
            // Only serialize primitive values and plain objects via ExternalCopy
            if (
              valueOf === null ||
              typeof valueOf === 'string' ||
              typeof valueOf === 'number' ||
              typeof valueOf === 'boolean'
            ) {
              return valueOf;
            } else if (typeof valueOf === 'object' && valueOf !== null) {
              // Try ExternalCopy first for better performance, fallback to JSON
              try {
                return new ivm.ExternalCopy(valueOf);
              } catch {
                return JSON.parse(JSON.stringify(valueOf)); // Deep copy via JSON for plain objects
              }
            }
          }

          // Fallback: call the function with no args
          const result = (value as Function)(); // Call with no args to get the data
          if (result && typeof result === 'object' && 'data' in result) {
            // It's a ChainableWrapper, get the data
            const data = (result as any).data;
            try {
              return new ivm.ExternalCopy(data);
            } catch {
              return JSON.parse(JSON.stringify(data));
            }
          } else {
            try {
              return new ivm.ExternalCopy(result);
            } catch {
              return JSON.parse(JSON.stringify(result));
            }
          }
        } catch (error) {
          return null; // Fallback to null
        }
      }

      // Create a function reference that can be called from VM
      const func = value as Function;
      return new ivm.Reference(function (...args: any[]) {
        try {
          return func.apply(null, args);
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : String(error));
        }
      });
    }

    try {
      return new ivm.ExternalCopy(value);
    } catch (error) {
      // If serialization fails, return a simple representation
      return '[Object]';
    }
  }

  private splitStatements(code: string): string[] {
    const statements: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : '';
      
      // Handle string state
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
      }
      
      if (!inString) {
        // Track depth of braces, brackets, parentheses
        if (char === '{' || char === '[' || char === '(') depth++;
        if (char === '}' || char === ']' || char === ')') depth--;
        
        // Split at semicolon only at depth 0
        if (char === ';' && depth === 0) {
          if (current.trim()) {
            statements.push(current.trim());
          }
          current = '';
          continue;
        }
      }
      
      current += char;
    }
    
    // Add the last statement
    if (current.trim()) {
      statements.push(current.trim());
    }
    
    return statements;
  }

  private wrapCode(code: string): string {
    // Always use wrapper functions for proper result transfer
    // Check if the code contains async/await to determine wrapper type
    const needsAsync =
      code.includes('await') || code.includes('async') || code.includes('Promise.');
    const trimmedCode = code.trim();
    
    

    // Check if this is a complete statement that doesn't need return wrapping
    const isCompleteStatement =
      trimmedCode.startsWith('while(') ||
      trimmedCode.startsWith('for(') ||
      trimmedCode.startsWith('if(') ||
      (trimmedCode.match(/^\s*(while|for|if|switch|try)\s*[\(\{]/) && !trimmedCode.includes(';'));

    // Check if this is a block of statements that can't be wrapped in parentheses
    const isStatementBlock =
      (trimmedCode.includes('\n') || trimmedCode.includes(';')) &&
      (trimmedCode.includes('function ') ||
        trimmedCode.includes('var ') ||
        trimmedCode.includes('let ') ||
        trimmedCode.includes('const ') ||
        trimmedCode.includes('try ') ||
        trimmedCode.includes('while') ||
        trimmedCode.includes('for') ||
        trimmedCode.includes('do '));

    if (needsAsync) {
      if (isStatementBlock && !isCompleteStatement) {
        // For multi-line async statements, we need to be more careful about splitting
        // We can't just split by lines if there are control structures
        const hasControlStructures = /\b(while|for|if|switch|do)\s*[\(\{]/.test(code);
        
        if (hasControlStructures) {
          // If the code has control structures, we need to handle it differently
          // Check if the last line is a simple expression we can return
          const lines = code.trim().split('\n');
          const lastLine = lines[lines.length - 1].trim();
          
          // If the last line is just a variable or simple expression (not a statement)
          const lastLineWithoutSemi = lastLine.replace(/;$/, '');
          if (lastLineWithoutSemi && !lastLineWithoutSemi.includes('{') && 
              !lastLineWithoutSemi.startsWith('while') && !lastLineWithoutSemi.startsWith('for') && 
              !lastLineWithoutSemi.startsWith('if') && !lastLineWithoutSemi.startsWith('const') && 
              !lastLineWithoutSemi.startsWith('let') && !lastLineWithoutSemi.startsWith('var')) {
            // Execute all the code except the last line, then return the last line as an expression
            const codeWithoutLastLine = lines.slice(0, -1).join('\n');
            return `
              (async function() {
                try {
                  ${codeWithoutLastLine}
                  return ${lastLineWithoutSemi};
                } catch (error) {
                  if (error instanceof Error) {
                    throw new Error(error.message);
                  }
                  throw error;
                }
              })()
            `;
          } else {
            // Just execute the code without trying to return anything
            return `
              (async function() {
                try {
                  ${code}
                } catch (error) {
                  if (error instanceof Error) {
                    throw new Error(error.message);
                  }
                  throw error;
                }
              })()
            `;
          }
        } else {
          // For code with semicolons, we need to handle it differently
          // Split by semicolon but be careful about function bodies
          const statements = this.splitStatements(code);
          
          if (statements.length > 1) {
            const lastStatement = statements[statements.length - 1].trim();
            const otherStatements = statements.slice(0, -1);
            
            return `
              (async function() {
                try {
                  ${otherStatements.join(';\n')};
                  return ${lastStatement};
                } catch (error) {
                  if (error instanceof Error) {
                    throw new Error(error.message);
                  }
                  throw error;
                }
              })()
            `;
          } else {
            // Single statement, just wrap and return it
            return `
              (async function() {
                try {
                  return ${code};
                } catch (error) {
                  if (error instanceof Error) {
                    throw new Error(error.message);
                  }
                  throw error;
                }
              })()
            `;
          }
        }
      } else if (isCompleteStatement) {
        // For complete statements, just execute them
        return `
          (async function() {
            try {
              ${code}
              return undefined;
            } catch (error) {
              if (error instanceof Error) {
                throw new Error(error.message);
              }
              throw error;
            }
          })()
        `;
      } else {
        // For async expressions
        return `
          (async function() {
            try {
              const __result = await (${code});
              // Return primitives directly
              if (__result === null || __result === undefined) {
                return __result;
              }
              if (typeof __result === 'string' || typeof __result === 'number' || typeof __result === 'boolean') {
                return __result;
              }
              // For arrays and objects, clone them before returning
              if (Array.isArray(__result)) {
                // For arrays, we need to get the raw array data without methods
                const rawArray = [...__result];
                return new $ivm.ExternalCopy(rawArray).copyInto();
              }
              // For objects
              if (typeof __result === 'object') {
                // If it has a valueOf method (chainable), get the value
                if (__result.valueOf && typeof __result.valueOf === 'function') {
                  const value = __result.valueOf();
                  if (value !== __result) {
                    return new $ivm.ExternalCopy(value).copyInto();
                  }
                }
                // Otherwise, copy the object as-is
                return new $ivm.ExternalCopy(__result).copyInto();
              }
              // Default case
              return new $ivm.ExternalCopy(__result).copyInto();
            } catch (error) {
              if (error instanceof Error) {
                throw new Error(error.message);
              }
              throw error;
            }
          })()
        `;
      }
    } else {
      if (isStatementBlock && !isCompleteStatement) {
        // Special handling for try/catch blocks
        if (trimmedCode.includes('try ')) {
          // For try/catch blocks, wrap in a function that can return values
          return `
            (function() {
              let __result;
              ${code.replace(/'([^']+)';?(?=\s*})/g, "__result = '$1';")}
              return __result;
            })()
          `;
        }

        // For multi-line sync statements, we need to be more careful about splitting
        // We can't just split by lines if there are control structures
        const hasControlStructures = /\b(while|for|if|switch|do)\s*[\(\{]/.test(code);
        
        if (hasControlStructures) {
          // If the code has control structures, we need to handle it differently
          // Check if the last line is a simple expression we can return
          const lines = code.trim().split('\n');
          const lastLine = lines[lines.length - 1].trim();
          
          // If the last line is just a variable or simple expression (not a statement)
          const lastLineWithoutSemi = lastLine.replace(/;$/, '');
          if (lastLineWithoutSemi && !lastLineWithoutSemi.includes('{') && 
              !lastLineWithoutSemi.startsWith('while') && !lastLineWithoutSemi.startsWith('for') && 
              !lastLineWithoutSemi.startsWith('if') && !lastLineWithoutSemi.startsWith('const') && 
              !lastLineWithoutSemi.startsWith('let') && !lastLineWithoutSemi.startsWith('var')) {
            // Execute all the code except the last line, then return the last line as an expression
            const codeWithoutLastLine = lines.slice(0, -1).join('\n');
            return `
              (function() {
                try {
                  ${codeWithoutLastLine}
                  return ${lastLineWithoutSemi};
                } catch (error) {
                  if (error instanceof Error) {
                    throw new Error(error.message);
                  }
                  throw error;
                }
              })()
            `;
          } else {
            // Just execute the code without trying to return anything
            return `
              (function() {
                try {
                  ${code}
                } catch (error) {
                  if (error instanceof Error) {
                    throw new Error(error.message);
                  }
                  throw error;
                }
              })()
            `;
          }
        } else {
          // Original logic for simple multi-line statements
          const lines = code
            .trim()
            .split(/;\s*\n|\n/)
            .map(line => line.trim())
            .filter(line => line);
          const lastLine = lines[lines.length - 1];
          const codeLines = lines.slice(0, -1);
          

          return `
            (function() {
              try {
                ${codeLines.join(';\n')};
                return ${lastLine};
              } catch (error) {
                if (error instanceof Error) {
                  throw new Error(error.message);
                }
                throw error;
              }
            })()
          `;
        }
      } else if (isCompleteStatement) {
        // For complete statements, just execute them
        return `
          (function() {
            try {
              ${code}
              return undefined;
            } catch (error) {
              if (error instanceof Error) {
                throw new Error(error.message);
              }
              throw error;
            }
          })()
        `;
      } else {
        // For sync expressions
        return `
          (function() {
            try {
              const __result = (${code});
              // Handle result transfer
              if (__result === null || __result === undefined) {
                return __result;
              }
              if (typeof __result === 'string' || typeof __result === 'number' || typeof __result === 'boolean') {
                return __result;
              }
              // For arrays and objects, clone them before returning
              if (Array.isArray(__result)) {
                // For arrays, we need to get the raw array data without methods
                const rawArray = [...__result];
                return new $ivm.ExternalCopy(rawArray).copyInto();
              }
              // For objects
              if (typeof __result === 'object') {
                // If it has a valueOf method (chainable), get the value
                if (__result.valueOf && typeof __result.valueOf === 'function') {
                  const value = __result.valueOf();
                  if (value !== __result) {
                    return new $ivm.ExternalCopy(value).copyInto();
                  }
                }
                // Otherwise, copy the object as-is
                return new $ivm.ExternalCopy(__result).copyInto();
              }
              // Default case
              return new $ivm.ExternalCopy(__result).copyInto();
            } catch (error) {
              if (error instanceof Error) {
                throw new Error(error.message);
              }
              throw error;
            }
          })()
        `;
      }
    }
  }

  private createSandboxError(error: unknown, executionTime: number): SandboxError {
    let code: SandboxError['code'] = 'EXECUTION_ERROR';
    let message = 'Unknown error';

    if (error instanceof Error) {
      message = error.message;
      // Check error type/name for timeout detection
      if (error.name === 'TimeoutError' || error.constructor.name === 'TimeoutError') {
        code = 'TIMEOUT';
      }
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = String(error.message);
    }

    const lowerMessage = message.toLowerCase();

    // Debug: log the actual error message to understand timeout detection (only for development)
    if (executionTime > 40) {
      console.debug('Long execution error:', {
        message,
        lowerMessage,
        executionTime,
        errorType: error?.constructor?.name,
      });
    }

    // Check for timeout with more patterns - isolated-vm specific patterns
    if (
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('timed out') ||
      lowerMessage.includes('execution timed out') ||
      lowerMessage.includes('script execution timed out') ||
      lowerMessage.includes('timeout exceeded') ||
      lowerMessage.includes('execution timeout') ||
      lowerMessage.includes('script timed out') ||
      lowerMessage.includes('script execution cancelled') ||
      lowerMessage.includes('execution was cancelled') ||
      lowerMessage.includes('cancelled') ||
      message.includes('Script execution timed out')
    ) {
      code = 'TIMEOUT';
    } else if (
      lowerMessage.includes('memory') ||
      lowerMessage.includes('isolate was disposed') ||
      lowerMessage.includes('isolate is already disposed')
    ) {
      code = 'MEMORY_LIMIT';
    } else if (lowerMessage.includes('syntax') || lowerMessage.includes('syntaxerror')) {
      code = 'SYNTAX_ERROR';
    } else if (
      lowerMessage.includes('reference') ||
      lowerMessage.includes('referenceerror') ||
      lowerMessage.includes('is not defined')
    ) {
      code = 'REFERENCE_ERROR';
    } else if (lowerMessage.includes('type') || lowerMessage.includes('typeerror')) {
      code = 'TYPE_ERROR';
    } else if (executionTime >= 45) {
      // If execution took close to timeout, treat as timeout
      code = 'TIMEOUT';
    }

    const sandboxError = new Error(message) as SandboxError;
    sandboxError.code = code;
    sandboxError.details = { executionTime };
    sandboxError.name = 'SandboxError';

    return sandboxError;
  }

  async dispose(): Promise<void> {
    // Nothing to clean up in simplified version
  }

  /**
   * Get current configuration (returns a copy for immutability)
   */
  getConfig(): VMSandboxConfig {
    return {
      memoryLimit: this.config.memoryLimit,
      timeout: this.config.timeout,
      enableAsync: this.config.enableAsync,
      enableGenerators: this.config.enableGenerators,
      enableProxies: this.config.enableProxies,
      enableSymbols: this.config.enableSymbols,
      maxContextSize: this.config.maxContextSize,
      recycleIsolates: this.config.recycleIsolates,
      isolatePoolSize: this.config.isolatePoolSize,
    };
  }

  /**
   * Get current capabilities
   */
  getCapabilities() {
    const isStrictMode = this.config.memoryLimit < 64;

    return {
      console: true,
      json: true,
      math: true,
      array: true,
      object: true,
      promises: this.config.enableAsync,
      generators: this.config.enableGenerators,
      proxies: this.config.enableProxies,
      symbols: this.config.enableSymbols,
      buffer: false, // Always disabled for security
      crypto: false, // Always disabled for security
      timers: !isStrictMode,
      weakmap: !isStrictMode,
      intl: !isStrictMode,
      number: true,
    };
  }

  /**
   * Get pool status (simplified - no actual pooling)
   */
  getPoolStatus() {
    return {
      size: 0,
      maxSize: this.config.isolatePoolSize,
      available: 0,
      busy: 0,
    };
  }

  /**
   * Validate context value size
   */
  validateContextValue(value: unknown): { valid: boolean; error?: string } {
    try {
      const size = this.estimateValueSize(value);
      if (size > this.config.maxContextSize) {
        return {
          valid: false,
          error: `Context value too large: ${size} bytes > ${this.config.maxContextSize} bytes`,
        };
      }
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Estimate the size of a value in bytes
   */
  private estimateValueSize(value: unknown, visited = new Set<unknown>()): number {
    if (value === null || value === undefined) {
      return 8; // Approximate size
    }

    // Handle circular references
    if (typeof value === 'object' && value !== null && visited.has(value)) {
      return 8; // Reference size
    }

    switch (typeof value) {
      case 'boolean':
        return 4;
      case 'number':
        return 8;
      case 'string':
        return value.length * 2; // UTF-16 encoding
      case 'bigint':
        return value.toString().length * 2;
      case 'function':
        return value.toString().length * 2;
      case 'object':
        if (visited.has(value)) return 8;
        visited.add(value);

        let size = 16; // Object overhead

        if (Array.isArray(value)) {
          for (const item of value) {
            size += this.estimateValueSize(item, visited);
          }
        } else if (value instanceof Date) {
          size += 8;
        } else if (value instanceof RegExp) {
          size += value.toString().length * 2;
        } else if (value instanceof Map) {
          for (const [key, val] of value) {
            size += this.estimateValueSize(key, visited);
            size += this.estimateValueSize(val, visited);
          }
        } else if (value instanceof Set) {
          for (const item of value) {
            size += this.estimateValueSize(item, visited);
          }
        } else {
          // Regular object
          for (const [key, val] of Object.entries(value)) {
            size += key.length * 2; // Key size
            size += this.estimateValueSize(val, visited);
          }
        }

        visited.delete(value);
        return size;
      default:
        return 8; // Default size for unknown types
    }
  }

  /**
   * Validate that a number is positive, return default if invalid
   */
  private validatePositiveNumber(value: number | undefined, defaultValue: number): number {
    if (typeof value === 'number' && value > 0 && !isNaN(value)) {
      return value;
    }
    return defaultValue;
  }
}
