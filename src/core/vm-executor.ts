import vm from 'vm';
import { VMExecutionContext } from '@/types/cli';

export class VMExecutor {
  private context: VMExecutionContext;

  constructor(context: VMExecutionContext) {
    this.context = context;
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
      // Create a safe context using Node.js vm module
      const sandbox = this.createSafeSandbox(contextData);
      
      // Set up timeout and options
      const options: vm.RunningScriptOptions = {
        timeout: this.context.timeout || 5000, // 5 second timeout
        displayErrors: true,
        breakOnSigint: true,
      };

      // Wrap the expression in a function to handle return values properly
      const code = `
        (function() {
          "use strict";
          try {
            return (${expression});
          } catch (error) {
            throw new Error('Expression evaluation failed: ' + error.message + ' | Stack: ' + error.stack);
          }
        })()
      `;

      // Create and run the script in the sandbox
      const script = new vm.Script(code, {
        filename: '<jsq-expression>',
        timeout: options.timeout,
      });

      const result = script.runInNewContext(sandbox, options);
      
      return result;
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

  private createSafeSandbox(contextData: Record<string, unknown>): vm.Context {
    // Create a minimal, safe sandbox environment
    const sandbox: Record<string, unknown> = {
      // Basic globals that are safe to use
      console: {
        log: (...args: unknown[]) => console.log(...args),
        error: (...args: unknown[]) => console.error(...args),
        warn: (...args: unknown[]) => console.warn(...args),
      },
      
      // Safe built-in objects
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      
      // Utility functions
      typeof: (obj: unknown) => typeof obj,
      isArray: Array.isArray,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      
      // Add context data
      ...this.sanitizeContextData(contextData),
    };

    // Explicitly remove dangerous globals
    const dangerousGlobals = [
      'process', 'global', 'Buffer', 'require', 'module', 'exports',
      'setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 
      'clearInterval', 'clearImmediate', '__dirname', '__filename',
      'eval', 'Function', 'GeneratorFunction', 'AsyncFunction',
    ];

    for (const dangerous of dangerousGlobals) {
      sandbox[dangerous] = undefined;
    }

    return vm.createContext(sandbox, {
      name: 'jsq-safe-context',
      codeGeneration: {
        strings: false, // Disable eval-like string compilation
        wasm: false,    // Disable WebAssembly
      },
    });
  }

  private sanitizeContextData(contextData: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(contextData)) {
      try {
        // Check for VMChainableWrapper instances first
        if (value && typeof value === 'object' && 'value' in value && (value as any).__isVMChainableWrapper) {
          // This is a VMChainableWrapper - preserve all its methods
          const wrapped = value as any;
          const transferable: any = {
            data: wrapped.data || wrapped.value,
            __isVMChainableWrapper: true
          };
          
          // Add value as a getter that returns data
          Object.defineProperty(transferable, 'value', {
            get: () => transferable.data,
            enumerable: true,
            configurable: true
          });
          
          // Copy all methods from the wrapper
          const methodNames = ['filter', 'map', 'find', 'where', 'pluck', 'sortBy', 'take', 'skip', 'length', 'sum', 'keys', 'values', 'get'];
          for (const methodName of methodNames) {
            if (typeof wrapped[methodName] === 'function') {
              transferable[methodName] = this.createFunctionProxy(wrapped[methodName].bind(wrapped));
            }
          }
          
          // Also copy any dynamic properties that might have been added
          for (const prop of Object.getOwnPropertyNames(wrapped)) {
            if (!methodNames.includes(prop) && prop !== 'value' && prop !== 'data' && typeof wrapped[prop] === 'function') {
              transferable[prop] = this.createFunctionProxy(wrapped[prop].bind(wrapped));
            }
          }
          
          sanitized[key] = transferable;
        } else if (this.isTransferable(value)) {
          sanitized[key] = this.deepClone(value);
        } else if (typeof value === 'function') {
          // For functions, create a wrapper that executes in the parent context
          const proxiedFunction = this.createFunctionProxy(value as (...args: unknown[]) => unknown);
          
          // Check if this function has properties (like the $ object)
          const propNames = Object.getOwnPropertyNames(value);
          const hasCustomProperties = propNames.some(prop => 
            prop !== 'length' && prop !== 'name' && prop !== 'prototype' &&
            prop !== 'constructor' && prop !== 'caller' && prop !== 'arguments'
          );
          
          if (hasCustomProperties) {
            // This is a function with properties (like our $ object)
            // Copy all transferable properties to the proxied function
            try {
              for (const prop of propNames) {
                if (prop !== 'length' && prop !== 'name' && prop !== 'prototype' &&
                    prop !== 'constructor' && prop !== 'caller' && prop !== 'arguments') {
                  try {
                    const propValue = (value as any)[prop];
                    
                    // Check if property is transferable or needs special handling
                    if (propValue && typeof propValue === 'object' && 'value' in propValue && (propValue as any).__isVMChainableWrapper) {
                      // This is a VMChainableWrapper - preserve all its methods
                      const wrapped = propValue as any;
                      const transferable: any = {
                        data: wrapped.data || wrapped.value,
                        __isVMChainableWrapper: true
                      };
                      
                      // Add value as a getter that returns data
                      Object.defineProperty(transferable, 'value', {
                        get: () => transferable.data,
                        enumerable: true,
                        configurable: true
                      });
                      
                      // Copy all methods from the wrapper
                      const methodNames = ['filter', 'map', 'find', 'where', 'pluck', 'sortBy', 'take', 'skip', 'length', 'sum', 'keys', 'values', 'get'];
                      for (const methodName of methodNames) {
                        if (typeof wrapped[methodName] === 'function') {
                          transferable[methodName] = this.createFunctionProxy(wrapped[methodName].bind(wrapped));
                        }
                      }
                      
                      Object.defineProperty(proxiedFunction, prop, {
                        value: transferable,
                        writable: true,
                        enumerable: true,
                        configurable: true
                      });
                    } else if (this.isTransferable(propValue)) {
                      // Simple transferable value
                      Object.defineProperty(proxiedFunction, prop, {
                        value: this.deepClone(propValue),
                        writable: true,
                        enumerable: true,
                        configurable: true
                      });
                    } else if (typeof propValue === 'object' && propValue !== null) {
                      // Complex object - try to extract properties
                      const extracted = this.extractObjectProperties(propValue);
                      Object.defineProperty(proxiedFunction, prop, {
                        value: extracted,
                        writable: true,
                        enumerable: true,
                        configurable: true
                      });
                    }
                  } catch (propError) {
                    console.warn(`Warning: Could not copy property ${prop}:`, propError);
                  }
                }
              }
            } catch (error) {
              console.warn(`Warning: Could not copy function properties for ${key}:`, error);
            }
          }
          
          sanitized[key] = proxiedFunction;
        } else if (this.isLibraryObject(value)) {
          // For library objects (like lodash), create function proxies for methods
          sanitized[key] = this.createLibraryProxy(value);
        } else {
          // For complex objects, try to serialize/deserialize
          try {
            const serialized = JSON.stringify(value);
            sanitized[key] = JSON.parse(serialized);
          } catch (serializeError) {
            // If serialization fails, try to extract properties
            if (typeof value === 'object' && value !== null) {
              sanitized[key] = this.extractObjectProperties(value);
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not transfer ${key} to safe context:`, error);
        // Skip this value if it can't be safely transferred
      }
    }

    return sanitized;
  }

  private isTransferable(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    
    const type = typeof value;
    if (['string', 'number', 'boolean'].includes(type)) return true;
    
    if (Array.isArray(value)) {
      return value.every(item => this.isTransferable(item));
    }
    
    if (type === 'object') {
      try {
        JSON.stringify(value);
        return true;
      } catch {
        return false;
      }
    }
    
    return false;
  }

  private deepClone(value: unknown): unknown {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this.deepClone(item));
    }
    
    const cloned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      cloned[key] = this.deepClone(val);
    }
    return cloned;
  }

  private createFunctionProxy(fn: (...args: unknown[]) => unknown): (...args: unknown[]) => unknown {
    return (...args: unknown[]) => {
      try {
        // Execute the function in the parent context (outside the VM)
        const result = fn(...args);
        
        // If the result is a VMChainableWrapper, convert it to a transferable format
        if (result && typeof result === 'object' && 'value' in result) {
          // This is likely a VMChainableWrapper or ChainableWrapper
          const wrapped = result as any;
          
          // If it has methods, preserve them by creating a simple object representation
          const transferable: any = {
            value: wrapped.value,
            data: wrapped.data || wrapped.value
          };
          
          // Copy key methods if they exist
          const methodNames = ['filter', 'map', 'find', 'where', 'pluck', 'sortBy', 'take', 'skip', 'length', 'sum', 'keys', 'values'];
          for (const methodName of methodNames) {
            if (typeof wrapped[methodName] === 'function') {
              transferable[methodName] = this.createFunctionProxy(wrapped[methodName].bind(wrapped));
            }
          }
          
          return transferable;
        }
        
        return result;
      } catch (error) {
        throw new Error(`Function execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
  }

  private isLibraryObject(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    
    // Check if this looks like a library object (has many function properties)
    const obj = value as Record<string, unknown>;
    const props = Object.getOwnPropertyNames(obj);
    const functionCount = props.filter(prop => {
      try {
        return typeof obj[prop] === 'function';
      } catch {
        return false;
      }
    }).length;
    
    // If more than 5 functions, likely a library
    return functionCount > 5;
  }

  private createLibraryProxy(library: unknown): Record<string, unknown> {
    if (typeof library !== 'object' || library === null) {
      return {};
    }

    const proxy: Record<string, unknown> = {};
    const obj = library as Record<string, unknown>;
    
    try {
      // Get all enumerable properties
      for (const key of Object.getOwnPropertyNames(obj)) {
        try {
          const value = obj[key];
          if (typeof value === 'function') {
            // Create a proxy function that executes in the parent context
            proxy[key] = this.createFunctionProxy(value as (...args: unknown[]) => unknown);
          } else if (this.isTransferable(value)) {
            proxy[key] = this.deepClone(value);
          }
        } catch (error) {
          // Skip properties that can't be accessed
          if (!this.context.unsafe && console) {
            console.warn(`Warning: Could not proxy library property ${key}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not create library proxy:', error);
    }

    return proxy;
  }

  private extractObjectProperties(obj: unknown): Record<string, unknown> {
    if (typeof obj !== 'object' || obj === null) {
      return {};
    }

    const extracted: Record<string, unknown> = {};
    
    try {
      const target = obj as Record<string, unknown>;
      
      // Check if this is a VMChainableWrapper-like object
      if ('value' in target && typeof target.value !== 'function' && (target as any).__isVMChainableWrapper) {
        // For chainable wrappers, we want to preserve their methods
        for (const key of Object.getOwnPropertyNames(target)) {
          try {
            const value = target[key];
            if (typeof value === 'function') {
              // Create a bound function proxy for methods
              extracted[key] = this.createFunctionProxy(value.bind(target));
            } else if (this.isTransferable(value)) {
              extracted[key] = this.deepClone(value);
            }
          } catch {
            // Skip properties that can't be accessed
          }
        }
        
        // Also check constructor properties  
        try {
          const proto = Object.getPrototypeOf(target);
          if (proto && proto !== Object.prototype) {
            for (const key of Object.getOwnPropertyNames(proto)) {
              if (key !== 'constructor' && typeof proto[key] === 'function') {
                try {
                  extracted[key] = this.createFunctionProxy(proto[key].bind(target));
                } catch {
                  // Skip if can't access
                }
              }
            }
          }
        } catch {
          // Skip prototype processing if it fails
        }
      } else {
        // Regular object handling
        for (const key of Object.getOwnPropertyNames(target)) {
          try {
            const value = target[key];
            if (this.isTransferable(value)) {
              extracted[key] = this.deepClone(value);
            } else if (typeof value === 'function') {
              extracted[key] = this.createFunctionProxy(value as (...args: unknown[]) => unknown);
            }
          } catch {
            // Skip properties that can't be accessed or transferred
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not extract object properties:', error);
    }

    return extracted;
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
      // Test if vm module is available and working
      const sandbox = { test: 1 + 1 };
      const context = vm.createContext(sandbox);
      const script = new vm.Script('test');
      const result = script.runInContext(context, { timeout: 1000 });
      return result === 2;
    } catch {
      return false;
    }
  }
}