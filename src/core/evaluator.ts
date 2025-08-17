import { JsqOptions, VMExecutionContext } from '@/types/cli';
import { ChainableWrapper } from './chainable';
import { VMChainableWrapper } from './vm-chainable';
import { LibraryManager } from './library-manager';
import { VMExecutor } from './vm-executor';
import { createSmartDollar } from './jquery-wrapper';

export class ExpressionEvaluator {
  private options: JsqOptions;
  private libraryManager: LibraryManager;
  private vmExecutor?: VMExecutor;

  constructor(options: JsqOptions) {
    this.options = options;
    this.libraryManager = new LibraryManager(options);
    
    // VM is enabled by default, disabled only with --unsafe flag
    if (!options.unsafe) {
      this.vmExecutor = new VMExecutor({
        unsafe: false,
        timeout: 10000, // 10 second timeout
        memoryLimit: 256, // 256MB memory limit
      });
    }
  }

  async evaluate(expression: string, data: unknown): Promise<unknown> {
    try {
      // Load external libraries if specified
      const loadedLibraries = this.options.use 
        ? await this.libraryManager.loadLibraries(this.options.use)
        : {};

      // Create the smart $ that acts as both data container and constructor
      let $: any;
      
      if (this.options.unsafe) {
        // In unsafe mode, use the full smart dollar implementation
        $ = createSmartDollar(data);
      } else {
        // In VM mode, create a simple object that doesn't rely on Proxy
        // but still supports direct property access like $.property
        $ = function(input?: unknown) {
          if (arguments.length === 0) {
            return new VMChainableWrapper(data);
          } else {
            return new VMChainableWrapper(input);
          }
        };
        
        // For VM compatibility, make $ behave like the data object itself
        // by copying all properties as chainable wrappers
        if (typeof data === 'object' && data !== null) {
          if (!Array.isArray(data)) {
            // For objects, add each property as a chainable wrapper
            const obj = data as Record<string, unknown>;
            for (const [key, value] of Object.entries(obj)) {
              if (key !== 'name' && key !== 'length' && key !== 'prototype' && 
                  key !== 'valueOf' && key !== 'toString') {
                try {
                  Object.defineProperty($, key, {
                    value: new VMChainableWrapper(value),
                    enumerable: true,
                    configurable: true,
                    writable: false
                  });
                } catch (error) {
                  // Fallback if defineProperty fails
                  ($  as any)[key] = new VMChainableWrapper(value);
                }
              }
            }
          } else {
            // For arrays, make $ behave like the array itself
            // by copying the array data and providing direct access
            const arrayWrapper = new VMChainableWrapper(data);
            
            // Add each array element as an indexed property
            for (let i = 0; i < (data as unknown[]).length; i++) {
              try {
                Object.defineProperty($, i.toString(), {
                  value: new VMChainableWrapper((data as unknown[])[i]),
                  enumerable: true,
                  configurable: true,
                  writable: false
                });
              } catch (error) {
                ($  as any)[i] = new VMChainableWrapper((data as unknown[])[i]);
              }
            }
            
            // Add array methods without conflict with Function properties
            const arrayMethods = ['filter', 'map', 'find', 'where', 'pluck', 'sortBy', 'take', 'skip', 'sum'];
            
            for (const method of arrayMethods) {
              if (typeof (arrayWrapper as any)[method] === 'function') {
                try {
                  Object.defineProperty($, method, {
                    value: (arrayWrapper as any)[method].bind(arrayWrapper),
                    enumerable: false, // Don't make methods enumerable
                    configurable: true,
                    writable: false
                  });
                } catch (error) {
                  // Skip methods that conflict with function properties
                  console.warn(`Warning: Could not add array method ${method} to $ function`);
                }
              }
            }
            
            // Add length as 'len' to avoid conflict
            try {
              Object.defineProperty($, 'len', {
                value: arrayWrapper.length.bind(arrayWrapper),
                enumerable: false,
                configurable: true,
                writable: false
              });
            } catch (error) {
              ($  as any).len = arrayWrapper.length.bind(arrayWrapper);
            }
          }
        }
        
        // Ensure valueOf and toString work correctly
        try {
          Object.defineProperty($, 'valueOf', {
            value: () => data,
            enumerable: false,
            configurable: true,
            writable: false
          });
          Object.defineProperty($, 'toString', {
            value: () => JSON.stringify(data),
            enumerable: false,
            configurable: true,
            writable: false
          });
        } catch (error) {
          $.valueOf = () => data;
          $.toString = () => JSON.stringify(data);
        }
      }

      // Create evaluation context
      const context = {
        // jQuery-like $ that contains the data and can create wrappers
        $,
        // Add common utilities
        console: this.options.verbose ? console : { log: () => {}, error: () => {}, warn: () => {} },
        JSON,
        Math,
        Date,
        Array,
        Object,
        String,
        Number,
        Boolean,
        // Add lodash-like utilities (built-in)
        _: await this.loadUtilities(),
        // Add loaded libraries
        ...loadedLibraries,
        // Keep 'data' for backward compatibility
        data,
      };

      // Special handling for common libraries with conventional aliases
      if (loadedLibraries.lodash) {
        context._ = loadedLibraries.lodash; // Override built-in _ with lodash
      }
      if (loadedLibraries.moment) {
        context.moment = loadedLibraries.moment;
      }
      if (loadedLibraries.dayjs) {
        context.dayjs = loadedLibraries.dayjs;
      }

      let result: unknown;

      // Choose execution method based on safety requirements
      if (this.vmExecutor && !this.options.unsafe) {
        if (this.options.verbose) {
          console.error('🔒 Running in secure VM mode');
        }
        result = await this.vmExecutor.executeExpression(expression, context);
      } else {
        if (this.options.verbose) {
          if (this.options.unsafe) {
            console.error('⚡ Running in unsafe mode (VM disabled)');
          } else {
            console.error('⚠️  VM not available, falling back to unsafe execution');
          }
        }
        result = this.safeEval(expression, context);
      }
      
      // If the result is a ChainableWrapper or VMChainableWrapper, unwrap it
      if (result && typeof result === 'object' && 'value' in result) {
        const wrapped = result as ChainableWrapper | VMChainableWrapper;
        return wrapped.value;
      }
      
      // Also check if it's a plain object that looks like a wrapped result
      if (result && typeof result === 'object' && 'data' in result && Object.keys(result).length === 1) {
        return (result as any).data;
      }
      
      return result;
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private safeEval(expression: string, context: Record<string, unknown>): unknown {
    // Create a safe evaluation environment
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);
    
    try {
      // Use Function constructor for safer evaluation than eval()
      const func = new Function(...contextKeys, `
        "use strict";
        return (${expression});
      `);
      
      return func(...contextValues);
    } catch (error) {
      throw new Error(`Invalid expression: ${error instanceof Error ? error.message : 'Syntax error'}`);
    }
  }

  private async loadUtilities(): Promise<Record<string, unknown>> {
    // Load utility functions similar to lodash
    return {
      map: <T, U>(arr: T[], fn: (item: T, index: number) => U): U[] => arr.map(fn),
      filter: <T>(arr: T[], predicate: (item: T, index: number) => boolean): T[] => arr.filter(predicate),
      find: <T>(arr: T[], predicate: (item: T, index: number) => boolean): T | undefined => arr.find(predicate),
      reduce: <T, U>(arr: T[], fn: (acc: U, item: T, index: number) => U, initial: U): U => arr.reduce(fn, initial),
      groupBy: <T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> => {
        return arr.reduce((groups, item) => {
          const key = keyFn(item);
          if (!groups[key]) groups[key] = [];
          groups[key]!.push(item);
          return groups;
        }, {} as Record<string, T[]>);
      },
      sortBy: <T>(arr: T[], keyFn: (item: T) => number | string): T[] => {
        return [...arr].sort((a, b) => {
          const aKey = keyFn(a);
          const bKey = keyFn(b);
          return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
        });
      },
      uniq: <T>(arr: T[]): T[] => [...new Set(arr)],
      flatten: <T>(arr: (T | T[])[]): T[] => arr.flat() as T[],
      chunk: <T>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      },
    };
  }
}