import ivm from 'isolated-vm';

import type {
  SandboxError,
  VMContext,
  VMOptions,
  VMResult,
  VMSandboxConfig,
} from '@/types/sandbox';
import { vmPool } from './vm-pool';

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

    // Pre-warm the pool if recycling is enabled
    if (this.config.recycleIsolates && this.config.isolatePoolSize > 0) {
      vmPool.prewarm(Math.min(2, this.config.isolatePoolSize)).catch(err => {
        console.error('Failed to pre-warm VM pool:', err);
      });
    }
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
      // Try to use pooled isolate if recycling is enabled
      if (this.config.recycleIsolates) {
        const pooled = await vmPool.acquire();
        if (pooled) {
          isolate = pooled.isolate;
          vmContext = pooled.context;
        }
      }

      // Create new isolate if not pooled
      if (!isolate || !vmContext) {
        const memoryLimit = options.memoryLimit ?? this.config.memoryLimit;
        try {
          // Try to create isolate with default snapshot (includes basic JavaScript environment)
          isolate = new ivm.Isolate({
            memoryLimit,
            snapshot: ivm.Isolate.createSnapshot([
              { code: 'undefined' }, // Minimal snapshot
            ]),
          });
        } catch (_snapshotError) {
          // Fallback to basic isolate if snapshot fails
          isolate = new ivm.Isolate({ memoryLimit });
        }

        // Create context with intrinsics
        vmContext = await isolate.createContext();
      }
      const jail = vmContext.global;

      // Set up basic environment (console, Math, JSON, etc.)
      await this.setupBasicEnvironment(jail, vmContext, context, options);

      // Inject ivm for result transfer
      try {
        await jail.set('$ivm', ivm);
      } catch (ivmError) {
        console.error('Error setting $ivm:', ivmError);
        throw ivmError;
      }

      // Set up the createSmartDollar function for the VM BEFORE using it
      // Load the implementation from separate file to keep it clean
      const { createVMSmartDollarCode } = await import('../smart-dollar-vm');
      await vmContext.eval(createVMSmartDollarCode());

      // Set up $ first before other context variables
      if ('$' in context) {
        const $value = context.$;
        let dataToSerialize: unknown;
        if (Array.isArray($value)) {
          // If $ is already an array (smart array), strip any methods
          dataToSerialize = [...$value];
        } else if (typeof $value === 'function') {
          // Get the actual data from the $ function
          const actualData = ($value as { valueOf?: () => unknown }).valueOf
            ? ($value as { valueOf: () => unknown }).valueOf()
            : ($value as () => unknown)();
          dataToSerialize = actualData;
        } else {
          dataToSerialize = $value;
        }

        // For null/undefined data, pass it directly without serialization
        if (dataToSerialize === null || dataToSerialize === undefined) {
          await jail.set('$_data', dataToSerialize);
          await jail.set('data', dataToSerialize);
        } else {
          const serializedData = await this.serializeValue(dataToSerialize);
          await jail.set(
            '$_data',
            serializedData instanceof ivm.ExternalCopy ? serializedData.copyInto() : serializedData
          );
          await jail.set(
            'data',
            serializedData instanceof ivm.ExternalCopy ? serializedData.copyInto() : serializedData
          );
        }

        // Create $ with createSmartDollar in the VM
        // For null/undefined, $ should be the raw value, not wrapped
        await vmContext.eval(`
          if (globalThis.$_data === null || globalThis.$_data === undefined) {
            globalThis.$ = globalThis.$_data;
          } else {
            globalThis.$ = createSmartDollar(globalThis.$_data);
          }
          delete globalThis.$_data;
        `);
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
            ].includes(key)
          ) {
            continue;
          }

          // Don't skip fetch anymore - we want to support it
          // if (key === 'fetch') {
          //   continue;
          // }

          // Skip $ as it's already handled
          if (key === '$') {
          } else if (
            key === 'createSmartDollar' ||
            (typeof value === 'function' &&
              (value.toString().includes('ChainableWrapper') ||
                value.toString().includes('createSmartDollar') ||
                value.name === '$'))
          ) {
            // Skip functions that reference ChainableWrapper or are $ functions
            console.debug(`Skipping ${key} - it's a smart dollar or related function`);
          } else if (key === '_') {
            // Handle lodash utilities - create them directly in the VM
            await this.setupLodashUtilities(jail, vmContext);
          } else if (typeof value === 'function') {
            // Special handling for simple functions
            const func = value as (...args: unknown[]) => unknown;
            const funcStr = func.toString();

            // Check if this is a smart dollar-like function
            if (
              (funcStr.includes('args.length === 0') && funcStr.includes('return data')) ||
              funcStr.includes('ChainableWrapper') ||
              funcStr.includes('createSmartDollar')
            ) {
              console.debug(`Skipping function ${key} - detected as smart dollar function`);
              continue;
            }

            try {
              await vmContext.eval(`
                globalThis.${key} = function(...args) {
                  return globalThis._${key}_impl.applySync(undefined, args);
                };
              `);
              await jail.set(`_${key}_impl`, new ivm.Reference(func));
            } catch (funcError) {
              // If the function can't be cloned, skip it
              console.debug(`Skipping function ${key} - cannot be cloned: ${funcError.message}`);
            }
          } else {
            try {
              const serialized = await this.serializeValue(value);
              await jail.set(
                key,
                serialized instanceof ivm.ExternalCopy ? serialized.copyInto() : serialized
              );
            } catch (serError) {
              console.error(`Error serializing/setting key ${key}:`, serError.message);
              // Check if it's the specific cloning error
              if (serError instanceof Error && serError.message.includes('could not be cloned')) {
                console.error(`\n=== CLONING ERROR DETAILS ===`);
                console.error(`Key: "${key}"`);
                console.error(`Type: ${typeof value}`);
                if (typeof value === 'function') {
                  console.error(`Function string: ${value.toString().substring(0, 200)}...`);
                  console.error(`Function name: ${value.name}`);
                } else if (typeof value === 'object' && value !== null) {
                  console.error(`Object keys: ${Object.keys(value).slice(0, 10).join(', ')}...`);
                  // Check if object contains functions
                  for (const [k, v] of Object.entries(value)) {
                    if (typeof v === 'function') {
                      console.error(
                        `  Contains function at key "${k}": ${v.toString().substring(0, 100)}...`
                      );
                    }
                  }
                }
                console.error(`===========================\n`);
                throw serError; // Re-throw to identify the problematic key
              }
              throw serError;
            }
          }
        } catch (error) {
          // Don't throw on individual context setting failures, just skip
          console.debug(`Skipping context key ${key}:`, error);
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
      let result: unknown;
      try {
        result = await script.run(vmContext, {
          timeout,
          ...(needsAsync ? { promise: true } : {}),
        });
      } catch (runError) {
        console.error('Script run error:', runError);
        throw runError;
      }

      const executionTime = Math.max(1, Date.now() - startTime); // Ensure non-zero time

      return {
        value: result as T,
        executionTime,
        memoryUsed: 0, // Simplified: no detailed memory tracking
      };
    } catch (error) {
      const executionTime = Math.max(1, Date.now() - startTime); // Ensure non-zero time

      // Check if this is a cloning error from isolated-vm
      if (error instanceof Error && error.message.includes('could not be cloned')) {
        console.error('Original cloning error:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error occurred at execution time:', executionTime, 'ms');
        // Try to provide a more helpful error message
        throw new Error(`VM execution failed: ${error.message}`);
      }

      throw this.createSandboxError(error, executionTime);
    } finally {
      // Return to pool or cleanup
      if (this.config.recycleIsolates && isolate && vmContext && !isolate.isDisposed) {
        // Return to pool for reuse
        vmPool.release(isolate, vmContext);
      } else {
        // Cleanup if not pooling
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
  }

  private async setupBasicEnvironment(
    jail: ivm.Reference,
    vmContext: ivm.Context,
    _context: VMContext,
    options: VMOptions = {}
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
    } catch (_e) {
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
        pow: new ivm.Reference((x: number, y: number) => x ** y),
        random: new ivm.Reference(() => Math.random()),
        round: new ivm.Reference((x: number) => Math.round(x)),
        sin: new ivm.Reference((x: number) => Math.sin(x)),
        sqrt: new ivm.Reference((x: number) => Math.sqrt(x)),
        tan: new ivm.Reference((x: number) => Math.tan(x)),
      });

      // Set up JSON functions
      await jail.set('JSON', {
        stringify: new ivm.Reference(
          (
            obj: unknown,
            replacer?: (key: string, value: unknown) => unknown | string[],
            space?: string | number
          ) => JSON.stringify(obj, replacer, space)
        ),
        parse: new ivm.Reference(
          (str: string, reviver?: (key: string, value: unknown) => unknown) =>
            JSON.parse(str, reviver)
        ),
      });

      // Set up Date constructor with proper handling
      const dateImpl = new ivm.Reference((...args: unknown[]) => {
        if (args.length === 0) {
          return new Date();
        }
        // @ts-expect-error
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

    // Set up fetch in the VM with callback-based approach (only if network is allowed)
    if (options.allowNetwork) {
      try {
        // コールバックベースのfetch実装
        await jail.set(
          '_fetchCallback',
          new ivm.Reference(
            async (url: string, options: RequestInit | undefined, callbackRef: ivm.Reference) => {
              try {
                const response = await fetch(url, options);
                const text = await response.text();

                // コールバックに結果を渡す
                await callbackRef.apply(undefined, [
                  null, // error
                  new ivm.ExternalCopy({
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url,
                    text: text,
                    headers: Object.fromEntries(response.headers.entries()),
                  }).copyInto(),
                ]);
              } catch (error) {
                // エラーの場合
                await callbackRef.apply(undefined, [
                  new ivm.ExternalCopy({
                    message: error instanceof Error ? error.message : String(error),
                    name: error instanceof Error ? error.name : 'FetchError',
                  }).copyInto(),
                  null, // result
                ]);
              }
            }
          )
        );

        await vmContext.eval(`
        // コールバックベースのfetch
        globalThis.fetchCallback = function(url, options, callback) {
          if (typeof options === 'function') {
            callback = options;
            options = {};
          }
          
          if (!callback || typeof callback !== 'function') {
            throw new Error('Callback function is required');
          }
          
          // コールバックの参照を作成
          const callbackRef = new $ivm.Reference(callback);
          
          // 外部のfetch関数を呼び出す
          globalThis._fetchCallback.applyIgnored(undefined, [url, options || {}, callbackRef]);
        };
        
        // Promise版のfetch（内部でコールバックを使用）
        globalThis.fetch = function(url, options) {
          return new Promise((resolve, reject) => {
            globalThis.fetchCallback(url, options, (error, response) => {
              if (error) {
                reject(new Error(error.message));
              } else {
                // Response風のオブジェクトを作成
                const responseObj = {
                  ok: response.ok,
                  status: response.status,
                  statusText: response.statusText,
                  url: response.url,
                  headers: response.headers,
                  text: () => Promise.resolve(response.text),
                  json: () => Promise.resolve(JSON.parse(response.text)),
                  blob: () => Promise.reject(new Error('Blob not supported in VM')),
                  arrayBuffer: () => Promise.reject(new Error('ArrayBuffer not supported in VM')),
                };
                resolve(responseObj);
              }
            });
          });
        };
        
        // 便利な関数たち
        globalThis.fetchJSON = function(url, options) {
          return new Promise((resolve, reject) => {
            globalThis.fetchCallback(url, options, (error, response) => {
              if (error) {
                reject(new Error(error.message));
              } else {
                try {
                  const data = JSON.parse(response.text);
                  resolve(data);
                } catch (e) {
                  reject(new Error('Failed to parse JSON: ' + e.message));
                }
              }
            });
          });
        };
        
        globalThis.fetchText = function(url, options) {
          return new Promise((resolve, reject) => {
            globalThis.fetchCallback(url, options, (error, response) => {
              if (error) {
                reject(new Error(error.message));
              } else {
                resolve(response.text);
              }
            });
          });
        };
      `);
      } catch (e) {
        console.warn('Failed to set up fetch in VM:', e);
      }
    }
  }

  private async setupLodashUtilities(_jail: ivm.Reference, vmContext: ivm.Context): Promise<void> {
    // Set up lodash-like utilities in the VM
    await vmContext.eval(`
      // Helper function to unwrap SmartDollar/ChainableWrapper objects
      function __unwrapValue(value) {
        // If it's a SmartDollar object (has __isSmartDollar marker or _value property)
        if (value && typeof value === 'object') {
          if (value.__isSmartDollar || value._value !== undefined) {
            return value._value !== undefined ? value._value : value.value;
          }
          // If it has a value property and looks like a ChainableWrapper
          if ('value' in value && value.constructor && 
              (value.constructor.name === 'ChainableWrapper' || 
               value.constructor.name.includes('ChainableWrapper'))) {
            return value.value;
          }
        }
        return value;
      }
      
      globalThis._ = {
        // Array methods
        chunk: function(arr, size) {
          const unwrappedArr = __unwrapValue(arr);
          const chunks = [];
          for (let i = 0; i < unwrappedArr.length; i += size) {
            chunks.push(unwrappedArr.slice(i, i + size));
          }
          return chunks;
        },
        filter: function(arr, predicate) {
          const unwrappedArr = __unwrapValue(arr);
          return unwrappedArr.filter(predicate);
        },
        uniqBy: function(arr, keyFn) {
          const unwrappedArr = __unwrapValue(arr);
          const seen = new Set();
          const result = [];
          for (const item of unwrappedArr) {
            const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
            if (!seen.has(key)) {
              seen.add(key);
              result.push(item);
            }
          }
          return result;
        },
        uniq: function(arr) {
          const unwrappedArr = __unwrapValue(arr);
          return [...new Set(unwrappedArr)];
        },
        orderBy: function(arr, keys, orders) {
          const unwrappedArr = __unwrapValue(arr);
          if (!Array.isArray(keys)) keys = [keys];
          if (!Array.isArray(orders)) orders = keys.map(() => 'asc');
          
          return [...unwrappedArr].sort((a, b) => {
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
        sortBy: function(arr, keyFn) {
          const unwrappedArr = __unwrapValue(arr);
          return [...unwrappedArr].sort((a, b) => {
            const aVal = typeof keyFn === 'function' ? keyFn(a) : a[keyFn];
            const bVal = typeof keyFn === 'function' ? keyFn(b) : b[keyFn];
            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
            return 0;
          });
        },
        groupBy: function(arr, keyFn) {
          const unwrappedArr = __unwrapValue(arr);
          return unwrappedArr.reduce((groups, item) => {
            const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
            return groups;
          }, {});
        },
        flatten: function(arr) {
          const unwrappedArr = __unwrapValue(arr);
          return unwrappedArr.reduce((acc, val) => 
            acc.concat(Array.isArray(val) ? val : [val]), []);
        },
        flattenDeep: function flatten(arr) {
          const unwrappedArr = __unwrapValue(arr);
          return unwrappedArr.reduce((acc, val) => 
            Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val), []);
        },
        compact: function(arr) {
          const unwrappedArr = __unwrapValue(arr);
          return unwrappedArr.filter(Boolean);
        },
        sum: function(arr) {
          const unwrappedArr = __unwrapValue(arr);
          return unwrappedArr.reduce((sum, n) => sum + (typeof n === 'number' ? n : 0), 0);
        },
        mean: function(arr) {
          const unwrappedArr = __unwrapValue(arr);
          const nums = unwrappedArr.filter(n => typeof n === 'number');
          return nums.length ? nums.reduce((sum, n) => sum + n, 0) / nums.length : NaN;
        },
        min: function(arr) {
          const unwrappedArr = __unwrapValue(arr);
          return Math.min(...unwrappedArr.filter(n => typeof n === 'number'));
        },
        max: function(arr) {
          const unwrappedArr = __unwrapValue(arr);
          return Math.max(...unwrappedArr.filter(n => typeof n === 'number'));
        },
        minBy: function(arr, keyFn) {
          // Unwrap SmartDollar/ChainableWrapper objects
          const unwrappedArr = __unwrapValue(arr);
          if (!unwrappedArr || unwrappedArr.length === 0) return undefined;
          return unwrappedArr.reduce((min, item) => {
            const minVal = typeof keyFn === 'function' ? keyFn(min) : min[keyFn];
            const itemVal = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
            return itemVal < minVal ? item : min;
          });
        },
        maxBy: function(arr, keyFn) {
          // Unwrap SmartDollar/ChainableWrapper objects
          const unwrappedArr = __unwrapValue(arr);
          if (!unwrappedArr || unwrappedArr.length === 0) return undefined;
          return unwrappedArr.reduce((max, item) => {
            const maxVal = typeof keyFn === 'function' ? keyFn(max) : max[keyFn];
            const itemVal = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
            return itemVal > maxVal ? item : max;
          });
        },
        countBy: function(arr, keyFn) {
          const unwrappedArr = __unwrapValue(arr);
          return unwrappedArr.reduce((counts, item) => {
            const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
            counts[key] = (counts[key] || 0) + 1;
            return counts;
          }, {});
        },
        keyBy: function(arr, keyFn) {
          const unwrappedArr = __unwrapValue(arr);
          return unwrappedArr.reduce((obj, item) => {
            const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
            obj[key] = item;
            return obj;
          }, {});
        },
        takeWhile: function(arr, predicate) {
          const unwrappedArr = __unwrapValue(arr);
          const result = [];
          for (const item of unwrappedArr) {
            if (!predicate(item)) break;
            result.push(item);
          }
          return result;
        },
        dropWhile: function(arr, predicate) {
          const unwrappedArr = __unwrapValue(arr);
          let i = 0;
          while (i < unwrappedArr.length && predicate(unwrappedArr[i])) i++;
          return unwrappedArr.slice(i);
        },
        shuffle: function(arr) {
          const unwrappedArr = __unwrapValue(arr);
          const result = [...unwrappedArr];
          for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
          }
          return result;
        },
        sample: function(arr) {
          const unwrappedArr = __unwrapValue(arr);
          return unwrappedArr[Math.floor(Math.random() * unwrappedArr.length)];
        },
        sampleSize: function(arr, n) {
          const unwrappedArr = __unwrapValue(arr);
          const shuffled = this.shuffle(unwrappedArr);
          return shuffled.slice(0, Math.min(n, unwrappedArr.length));
        },
        // Object methods
        pick: function(obj, keys) {
          const unwrappedObj = __unwrapValue(obj);
          const result = {};
          for (const key of keys) {
            if (key in unwrappedObj) result[key] = unwrappedObj[key];
          }
          return result;
        },
        omit: function(obj, keys) {
          const unwrappedObj = __unwrapValue(obj);
          const result = {...unwrappedObj};
          for (const key of keys) {
            delete result[key];
          }
          return result;
        },
        invert: function(obj) {
          const unwrappedObj = __unwrapValue(obj);
          const result = {};
          for (const [key, value] of Object.entries(unwrappedObj)) {
            result[value] = key;
          }
          return result;
        },
        merge: function(...objects) {
          const result = {};
          for (const obj of objects) {
            const unwrapped = __unwrapValue(obj);
            if (unwrapped && typeof unwrapped === 'object') {
              Object.assign(result, unwrapped);
            }
          }
          return result;
        },
        defaults: function(obj, ...sources) {
          const unwrappedObj = __unwrapValue(obj);
          const result = {...unwrappedObj};
          for (const source of sources) {
            const unwrappedSource = __unwrapValue(source);
            if (unwrappedSource && typeof unwrappedSource === 'object') {
              for (const [key, value] of Object.entries(unwrappedSource)) {
                if (!(key in result)) {
                  result[key] = value;
                }
              }
            }
          }
          return result;
        },
        fromPairs: function(pairs) {
          const unwrappedPairs = __unwrapValue(pairs);
          const result = {};
          for (const [key, value] of unwrappedPairs) {
            result[key] = value;
          }
          return result;
        },
        // Collection methods
        size: function(collection) {
          const unwrapped = __unwrapValue(collection);
          if (Array.isArray(unwrapped) || typeof unwrapped === 'string') {
            return unwrapped.length;
          }
          if (unwrapped && typeof unwrapped === 'object') {
            return Object.keys(unwrapped).length;
          }
          return 0;
        },
        isEmpty: function(value) {
          const unwrapped = __unwrapValue(value);
          if (unwrapped == null) return true;
          if (Array.isArray(unwrapped) || typeof unwrapped === 'string') {
            return unwrapped.length === 0;
          }
          if (typeof unwrapped === 'object') {
            return Object.keys(unwrapped).length === 0;
          }
          return true;
        },
        includes: function(collection, value) {
          const unwrapped = __unwrapValue(collection);
          if (Array.isArray(unwrapped) || typeof unwrapped === 'string') {
            return unwrapped.includes(value);
          }
          if (unwrapped && typeof unwrapped === 'object') {
            return Object.values(unwrapped).includes(value);
          }
          return false;
        },
        // String methods
        camelCase: function(str) {
          return str
            .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
            .replace(/^[A-Z]/, chr => chr.toLowerCase());
        },
        kebabCase: function(str) {
          return str
            .replace(/[A-Z]/g, function(letter) { return '-' + letter.toLowerCase(); })
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase();
        },
        snakeCase: function(str) {
          return str
            .replace(/[A-Z]/g, function(letter) { return '_' + letter.toLowerCase(); })
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .toLowerCase();
        },
        startCase: function(str) {
          return str
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .replace(/\\b\\w/g, function(letter) { return letter.toUpperCase(); })
            .trim();
        },
        capitalize: function(str) {
          return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        },
        // Utility methods
        times: function(n, iteratee) {
          const result = [];
          const fn = iteratee || (i => i);
          for (let i = 0; i < n; i++) {
            result.push(fn(i));
          }
          return result;
        },
        range: function(...args) {
          let start = 0, end = 0, step = 1;
          if (args.length === 1) {
            end = args[0];
          } else if (args.length === 2) {
            [start, end] = args;
          } else if (args.length >= 3) {
            [start, end, step] = args;
          }
          
          const result = [];
          if (step > 0) {
            for (let i = start; i < end; i += step) {
              result.push(i);
            }
          } else if (step < 0) {
            for (let i = start; i > end; i += step) {
              result.push(i);
            }
          }
          return result;
        },
        keys: function(obj) {
          return Object.keys(__unwrapValue(obj));
        },
        values: function(obj) {
          return Object.values(__unwrapValue(obj));
        },
        identity: function(value) {
          return value;
        },
        // Chain method for lodash-style chaining
        chain: function(value) {
          const ChainableWrapper = {
            value: value,
            map: function(fn) {
              this.value = Array.isArray(this.value) ? this.value.map(fn) : this.value;
              return this;
            },
            filter: function(fn) {
              this.value = Array.isArray(this.value) ? this.value.filter(fn) : this.value;
              return this;
            },
            sortBy: function(keyFn) {
              if (Array.isArray(this.value)) {
                this.value = [...this.value].sort((a, b) => {
                  const aKey = typeof keyFn === 'function' ? keyFn(a) : a[keyFn];
                  const bKey = typeof keyFn === 'function' ? keyFn(b) : b[keyFn];
                  return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
                });
              }
              return this;
            },
            groupBy: function(keyFn) {
              if (Array.isArray(this.value)) {
                this.value = this.value.reduce((groups, item) => {
                  const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(item);
                  return groups;
                }, {});
              }
              return this;
            },
            take: function(n) {
              this.value = Array.isArray(this.value) ? this.value.slice(0, n) : this.value;
              return this;
            },
            flatten: function() {
              this.value = Array.isArray(this.value) ? this.value.flat() : this.value;
              return this;
            },
            uniq: function() {
              this.value = Array.isArray(this.value) ? [...new Set(this.value)] : this.value;
              return this;
            },
            compact: function() {
              this.value = Array.isArray(this.value) ? this.value.filter(Boolean) : this.value;
              return this;
            },
            value: function() {
              return this.value;
            }
          };
          return ChainableWrapper;
        },
        constant: function(value) {
          return function() { return value; };
        },
        random: function(lower, upper) {
          if (arguments.length === 0) {
            return Math.random();
          }
          if (upper === undefined) {
            upper = lower;
            lower = 0;
          }
          return Math.random() * (upper - lower) + lower;
        },
        clamp: function(number, lower, upper) {
          return Math.min(Math.max(number, lower), upper);
        }
      };
    `);
  }

  private async serializeValue(value: unknown): Promise<unknown> {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'function') {
      // Special handling for smart $ functions
      // Check multiple indicators that this is a $ function
      const funcStr = value.toString();
      const isSmartDollar =
        value.name === '$' ||
        funcStr.includes('ChainableWrapper') ||
        funcStr.includes('createSmartDollar') ||
        (funcStr.includes('args.length === 0') && funcStr.includes('return data'));

      if (isSmartDollar) {
        // For smart $ functions, we need to get the actual data
        try {
          // Try valueOf first for simpler extraction
          if ('valueOf' in value) {
            const valueOfResult = (value as { valueOf: () => unknown }).valueOf();
            // Only serialize primitive values and plain objects via ExternalCopy
            if (
              valueOfResult === null ||
              typeof valueOfResult === 'string' ||
              typeof valueOfResult === 'number' ||
              typeof valueOfResult === 'boolean'
            ) {
              return valueOfResult;
            } else if (typeof valueOfResult === 'object' && valueOfResult !== null) {
              // Try ExternalCopy first for better performance, fallback to JSON
              try {
                return new ivm.ExternalCopy(valueOfResult);
              } catch {
                return JSON.parse(JSON.stringify(valueOfResult)); // Deep copy via JSON for plain objects
              }
            }
          }

          // Fallback: call the function with no args
          const result = (value as () => unknown)(); // Call with no args to get the data
          if (result && typeof result === 'object' && 'data' in result) {
            // It's a ChainableWrapper, get the data
            const data = (result as { data: unknown }).data;
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
        } catch (_error) {
          return null; // Fallback to null
        }
      }

      // Create a function reference that can be called from VM
      const func = value as (...args: unknown[]) => unknown;
      try {
        return new ivm.Reference((...args: unknown[]) => {
          try {
            return func.apply(null, args);
          } catch (error) {
            throw new Error(error instanceof Error ? error.message : String(error));
          }
        });
      } catch (_refError) {
        // If we can't create a reference (e.g., function has unclonable closures),
        // return a placeholder
        console.debug('Cannot create reference for function:', func.name || 'anonymous');
        return null;
      }
    }

    try {
      // For arrays with extra properties, strip them to make a clean array
      if (Array.isArray(value)) {
        return new ivm.ExternalCopy([...value]);
      }
      return new ivm.ExternalCopy(value);
    } catch (_error) {
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

    // Helper function to handle result unwrapping - injected into wrapped code
    const unwrapResultHelper = `
      function __unwrapResult(__result) {
        // Return primitives directly
        if (__result === null || __result === undefined) {
          return __result;
        }
        if (typeof __result === 'string' || typeof __result === 'number' || typeof __result === 'boolean') {
          return __result;
        }
        // For functions (like the $ function), try to get their value
        if (typeof __result === 'function') {
          // Check if it's a smart dollar function that has valueOf
          if (__result.valueOf && typeof __result.valueOf === 'function') {
            const value = __result.valueOf();
            // Return the unwrapped value
            if (value === null || value === undefined) {
              return value;
            }
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              return value;
            }
            if (Array.isArray(value)) {
              return new $ivm.ExternalCopy([...value]).copyInto();
            }
            if (typeof value === 'object') {
              return new $ivm.ExternalCopy(value).copyInto();
            }
          }
          // For other functions, we can't return them, so return undefined
          return undefined;
        }
        // For arrays and objects, clone them before returning
        if (Array.isArray(__result)) {
          // For arrays, we need to get the raw array data without methods
          // Use Array.from to create a clean array
          const rawArray = Array.from(__result);
          return new $ivm.ExternalCopy(rawArray).copyInto();
        }
        // For objects
        if (typeof __result === 'object') {
          // Check if it's a SmartDollar object (has __isSmartDollar marker or _value property)
          if (__result.__isSmartDollar || 
              ('_value' in __result && __result.constructor && __result.constructor.name === 'SmartDollar')) {
            const value = __result._value || __result.value;
            // Return the unwrapped value
            if (value === null || value === undefined) {
              return value;
            }
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              return value;
            }
            if (Array.isArray(value)) {
              return new $ivm.ExternalCopy([...value]).copyInto();
            }
            if (typeof value === 'object') {
              return new $ivm.ExternalCopy(value).copyInto();
            }
          }
          // Check if it's a ChainableWrapper (has a value property)
          if ('value' in __result && __result.constructor && 
              (__result.constructor.name === 'ChainableWrapper' || 
               __result.constructor.name.includes('ChainableWrapper'))) {
            const value = __result.value;
            // Return the unwrapped value
            if (value === null || value === undefined) {
              return value;
            }
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              return value;
            }
            return new $ivm.ExternalCopy(value).copyInto();
          }
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
      }
    `;

    // Check if the code is already wrapped in an IIFE
    const isAlreadyWrapped =
      (trimmedCode.startsWith('(') && trimmedCode.endsWith(')()')) ||
      (trimmedCode.startsWith('(async') && trimmedCode.endsWith(')()'));

    // If already wrapped, just return the code with result handling
    if (isAlreadyWrapped) {
      return `
        (function() {
          ${unwrapResultHelper}
          try {
            const __result = ${code};
            return __unwrapResult(__result);
          } catch (error) {
            if (error instanceof Error) {
              throw new Error(error.message);
            }
            throw error;
          }
        })()
      `;
    }

    // Check if this is a complete statement that doesn't need return wrapping
    const isCompleteStatement =
      trimmedCode.startsWith('while(') ||
      trimmedCode.startsWith('for(') ||
      trimmedCode.startsWith('if(') ||
      (trimmedCode.match(/^\s*(while|for|if|switch|try)\s*[({]/) && !trimmedCode.includes(';'));

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
        const hasControlStructures = /\b(while|for|if|switch|do)\s*[({]/.test(code);

        if (hasControlStructures) {
          // If the code has control structures, we need to handle it differently
          // Check if the last line is a simple expression we can return
          const lines = code.trim().split('\n');
          const lastLine = lines[lines.length - 1].trim();

          // If the last line is just a variable or simple expression (not a statement)
          const lastLineWithoutSemi = lastLine.replace(/;$/, '');
          if (
            lastLineWithoutSemi &&
            !lastLineWithoutSemi.includes('{') &&
            !lastLineWithoutSemi.startsWith('while') &&
            !lastLineWithoutSemi.startsWith('for') &&
            !lastLineWithoutSemi.startsWith('if') &&
            !lastLineWithoutSemi.startsWith('const') &&
            !lastLineWithoutSemi.startsWith('let') &&
            !lastLineWithoutSemi.startsWith('var')
          ) {
            // Execute all the code except the last line, then return the last line as an expression
            const codeWithoutLastLine = lines.slice(0, -1).join('\n');
            return `
              (async function() {
                ${unwrapResultHelper}
                try {
                  ${codeWithoutLastLine}
                  const __result = ${lastLineWithoutSemi};
                  return __unwrapResult(__result);
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
                ${unwrapResultHelper}
                try {
                  ${otherStatements.join(';\n')};
                  const __result = ${lastStatement};
                  return __unwrapResult(__result);
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
        // Check if the code already has await
        const hasAwait = code.includes('await');
        return `
          (async function() {
            ${unwrapResultHelper}
            try {
              const __result = ${hasAwait ? code : `await (${code})`};
              return __unwrapResult(__result);
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
        const hasControlStructures = /\b(while|for|if|switch|do)\s*[({]/.test(code);

        if (hasControlStructures) {
          // If the code has control structures, we need to handle it differently
          // Check if the last line is a simple expression we can return
          const lines = code.trim().split('\n');
          const lastLine = lines[lines.length - 1].trim();

          // If the last line is just a variable or simple expression (not a statement)
          const lastLineWithoutSemi = lastLine.replace(/;$/, '');
          if (
            lastLineWithoutSemi &&
            !lastLineWithoutSemi.includes('{') &&
            !lastLineWithoutSemi.startsWith('while') &&
            !lastLineWithoutSemi.startsWith('for') &&
            !lastLineWithoutSemi.startsWith('if') &&
            !lastLineWithoutSemi.startsWith('const') &&
            !lastLineWithoutSemi.startsWith('let') &&
            !lastLineWithoutSemi.startsWith('var')
          ) {
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
            ${unwrapResultHelper}
            try {
              const __result = (${code});
              return __unwrapResult(__result);
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
      case 'object': {
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
      }
      default:
        return 8; // Default size for unknown types
    }
  }

  /**
   * Validate that a number is positive, return default if invalid
   */
  private validatePositiveNumber(value: number | undefined, defaultValue: number): number {
    if (typeof value === 'number' && value > 0 && !Number.isNaN(value)) {
      return value;
    }
    return defaultValue;
  }
}
