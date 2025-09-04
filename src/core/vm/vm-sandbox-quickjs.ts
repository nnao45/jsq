// Browser-compatible CPU count detection
const getCpuCount = (): number => {
  // In browser, use navigator.hardwareConcurrency or default to 4
  if (typeof globalThis !== 'undefined' && globalThis.navigator?.hardwareConcurrency) {
    return globalThis.navigator.hardwareConcurrency;
  }
  // Default fallback for all environments
  return 4;
};

import type {
  SandboxError,
  VMContext,
  VMOptions,
  VMResult,
  VMSandboxConfig,
} from '@/types/sandbox';
import type { ApplicationContext } from '../application-context';
import type { VMEngine, VMExecutionContext } from './interfaces/VMEngine';
import { QuickJSVMPool } from './quickjs-vm-pool';
import { VMEngineFactory } from './VMEngineFactory';

/**
 * QuickJS-based VM Sandbox implementation
 * Uses quickjs-emscripten as the underlying engine
 */
export class VMSandboxQuickJS {
  private config: VMSandboxConfig;
  private appContext: ApplicationContext;
  // private engine: VMEngine | null = null;
  private static vmPool: QuickJSVMPool | null = null;
  private useVMPool: boolean;

  constructor(appContext: ApplicationContext, options: Partial<VMSandboxConfig> = {}) {
    this.appContext = appContext;
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

    // Enable VM pooling by default (can be disabled for testing)
    // Disable VM pool in test environment to avoid context reuse issues
    this.useVMPool = process.env.DISABLE_VM_POOL !== 'true' && process.env.NODE_ENV !== 'test';

    // Initialize the shared VM pool if enabled and not already created
    if (this.useVMPool && !VMSandboxQuickJS.vmPool) {
      // Use CPU count for pool size, with a reasonable max limit
      const cpuCount = getCpuCount();
      const poolSize = Math.min(Math.floor(cpuCount / 2), 8); // CPU数の半分、最大8
      // Remove console.error in non-production environments to avoid interfering with output
      VMSandboxQuickJS.vmPool = new QuickJSVMPool(appContext, this.config, poolSize, 100); // Optimized pool size
    }
  }

  // private async getEngine(): Promise<VMEngine> {
  //   if (!this.engine) {
  //     const factory = new VMEngineFactory();
  //     this.engine = factory.create('quickjs');
  //     await this.engine.initialize(this.config);
  //   }
  //   return this.engine;
  // }

  async execute<T = unknown>(
    code: string,
    context: VMContext = {},
    options: VMOptions = {}
  ): Promise<VMResult<T>> {
    // const startTime = Date.now();
    let execContext: VMExecutionContext | null = null;
    let engine: VMEngine | null = null;

    // Disable debug output during normal execution to avoid interfering with JSON output
    const shouldDebug = process.env.DEBUG && process.env.NODE_ENV !== 'production';
    if (shouldDebug) {
      // Debug logs removed
    }

    try {
      // Use VM pool if enabled, otherwise create new engine
      if (this.useVMPool && VMSandboxQuickJS.vmPool) {
        const pooled = await VMSandboxQuickJS.vmPool.acquire();
        engine = pooled.engine;
        execContext = pooled.execContext;
      } else {
        // QuickJSでは毎回新しいエンジンを作成する（メモリリークを防ぐため）
        const factory = new VMEngineFactory(this.appContext);
        engine = factory.create('quickjs');
        await engine.initialize(this.config);

        // Create a new execution context
        execContext = await engine.createContext();
      }

      // Set up console - always set it up when console is passed in context
      // This ensures console.log works properly in jsq
      const needsConsole = context.console || options.enableConsole;

      // Store the host console reference for later use
      const hostConsole = context.console || {
        log: (...args: unknown[]) => console.log(...args),
        error: (...args: unknown[]) => console.error(...args),
        warn: (...args: unknown[]) => console.warn(...args),
        info: (...args: unknown[]) => console.info(...args),
        debug: (...args: unknown[]) => console.debug(...args),
      };

      // Set up console first if needed
      if (needsConsole) {
        try {
          // Set up console in VM with proper function handling
          await execContext.eval(`
            globalThis.console = {
              log: function(...args) {
                // Convert args to a format that can be passed back to host
                const serializedArgs = args.map(arg => {
                  if (typeof arg === 'object' && arg !== null) {
                    try { return JSON.stringify(arg); } catch { return String(arg); }
                  }
                  return String(arg);
                });
                // Store for later processing
                if (!globalThis.__consoleCalls) globalThis.__consoleCalls = [];
                globalThis.__consoleCalls.push({ method: 'log', args: serializedArgs });
                return undefined;
              },
              error: function(...args) {
                const serializedArgs = args.map(arg => {
                  if (typeof arg === 'object' && arg !== null) {
                    try { return JSON.stringify(arg); } catch { return String(arg); }
                  }
                  return String(arg);
                });
                if (!globalThis.__consoleCalls) globalThis.__consoleCalls = [];
                globalThis.__consoleCalls.push({ method: 'error', args: serializedArgs });
                return undefined;
              },
              warn: function(...args) {
                const serializedArgs = args.map(arg => {
                  if (typeof arg === 'object' && arg !== null) {
                    try { return JSON.stringify(arg); } catch { return String(arg); }
                  }
                  return String(arg);
                });
                if (!globalThis.__consoleCalls) globalThis.__consoleCalls = [];
                globalThis.__consoleCalls.push({ method: 'warn', args: serializedArgs });
                return undefined;
              },
              info: function(...args) {
                const serializedArgs = args.map(arg => {
                  if (typeof arg === 'object' && arg !== null) {
                    try { return JSON.stringify(arg); } catch { return String(arg); }
                  }
                  return String(arg);
                });
                if (!globalThis.__consoleCalls) globalThis.__consoleCalls = [];
                globalThis.__consoleCalls.push({ method: 'info', args: serializedArgs });
                return undefined;
              },
              debug: function(...args) {
                const serializedArgs = args.map(arg => {
                  if (typeof arg === 'object' && arg !== null) {
                    try { return JSON.stringify(arg); } catch { return String(arg); }
                  }
                  return String(arg);
                });
                if (!globalThis.__consoleCalls) globalThis.__consoleCalls = [];
                globalThis.__consoleCalls.push({ method: 'debug', args: serializedArgs });
                return undefined;
              }
            };
          `);
        } catch (_err) {
          // Continue without console - not critical
        }
      }

      // Set up context variables
      let needsLodash = false;
      if (shouldDebug) {
        // Debug logs removed
      }
      for (const [key, value] of Object.entries(context)) {
        // Skip built-in globals that are already set up, and skip console since we set it up above
        if (
          [
            'JSON',
            'Math',
            'Date',
            'Array',
            'Object',
            'String',
            'Number',
            'Boolean',
            'console',
          ].includes(key)
        ) {
          continue;
        }

        // Handle $ specially
        if (key === '$') {
          await this.setupSmartDollar(execContext, value);
        } else if (key === '_') {
          // Always set up lodash for _ key (can be null or function)
          needsLodash = true;
          if (shouldDebug) {
            // Debug log removed
          }
        } else {
          await execContext.setGlobal(key, value);
        }
      }

      // Setup lodash if needed
      if (needsLodash) {
        if (shouldDebug) {
          // Debug log removed
        }
        // Use the full lodash VM implementation
        const { createVMLodashCode } = await import('../lodash/lodash-vm');
        const lodashCode = createVMLodashCode();
        await execContext.eval(lodashCode);

        // Verify lodash was set up
        if (shouldDebug) {
          await execContext.eval('typeof globalThis._');
          // Debug log removed
        }
      }

      // No console override needed

      // Execute the code using the engine
      // Note: We've already set up the context variables, so pass empty bindings
      const wrappedCode = this.wrapCode(code);

      if (shouldDebug) {
        // Debug log removed
      }

      const result = await engine.execute(
        execContext,
        wrappedCode,
        {}, // Empty bindings since we already set them up
        {
          ...options,
          timeout: options.timeout ?? this.config.timeout,
        }
      );

      // Process console calls after execution (only if console was enabled)
      if (needsConsole) {
        try {
          const consoleCalls = await execContext.eval('globalThis.__consoleCalls');
          if (Array.isArray(consoleCalls)) {
            for (const call of consoleCalls) {
              if (call && typeof call === 'object' && 'method' in call && 'args' in call) {
                const consoleCall = call as { method: string; args: unknown[] };
                const method = consoleCall.method;
                if (
                  method === 'log' ||
                  method === 'error' ||
                  method === 'warn' ||
                  method === 'info' ||
                  method === 'debug'
                ) {
                  if (Array.isArray(consoleCall.args)) {
                    // Call the host console method with the serialized args
                    (hostConsole[method] as (...args: unknown[]) => void)(...consoleCall.args);
                  }
                }
              }
            }
          }
        } catch (_e) {
          // Ignore console processing errors
        }
      }

      // Unwrap SmartDollar objects in the VM context
      let finalValue = result.value;

      if (finalValue !== null && finalValue !== undefined && typeof finalValue === 'object') {
        // Check if it's a SmartDollar object by evaluating in the VM
        try {
          const unwrapCode = `
            (function(obj) {
              if (obj && obj.__isSmartDollar) {
                return obj._value || obj.value;
              }
              return obj;
            })(globalThis.__result__)
          `;

          // Store result temporarily
          await execContext.setGlobal('__result__', finalValue);

          // Unwrap if it's a SmartDollar
          const unwrappedResult = await execContext.eval(unwrapCode);
          finalValue = unwrappedResult;

          // Clean up
          await execContext.eval('delete globalThis.__result__');
        } catch (_e) {
          // If unwrapping fails, use original value
          // Silently ignore unwrap failures
        }
      }

      // const executionTime = Math.max(1, Date.now() - startTime);

      // Skip aggressive cleanup - it may cause GC issues
      // Just clean up known temporary variables
      try {
        await execContext.eval(`
          delete globalThis.__result__;
          delete globalThis.__consoleCalls;
        `);
      } catch (_e) {
        // Ignore cleanup errors
      }

      // Don't release context here - it will be released with engine disposal

      return {
        value: finalValue as T,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed || 0, // QuickJS may return undefined
      };
    } catch (error) {
      // const executionTime = Math.max(1, Date.now() - startTime);

      // Debug: Log the original error only in verbose mode
      // Error details are handled at higher level

      // Don't release context here - it will be released with engine disposal

      // Check for specific initialization errors
      if (error instanceof Error) {
        if (
          error.message.includes('dynamic import callback') ||
          error.message.includes('experimental-vm-modules') ||
          error.message.includes('ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG')
        ) {
          const initError = new Error(
            'QuickJS initialization failed: Dynamic imports are not supported in the current Jest environment. ' +
              'QuickJS requires --experimental-vm-modules flag which may not be compatible with your Node.js version. ' +
              'Run tests with NODE_OPTIONS=--experimental-vm-modules.'
          );
          throw this.createSandboxError(initError, 0);
        }
      }

      throw this.createSandboxError(error, 0);
    } finally {
      // Release VM back to pool or dispose if not pooled
      if (engine) {
        if (this.useVMPool && VMSandboxQuickJS.vmPool) {
          // Release back to pool
          VMSandboxQuickJS.vmPool.release(engine);
        } else {
          // エンジンも破棄する（QuickJSのメモリリーク防止）
          try {
            // In test environment, skip disposal to avoid GC assertion
            if (process.env.NODE_ENV !== 'test') {
              await engine.dispose();
            }
          } catch {
            // Ignore dispose errors
          }
        }
      }
    }
  }

  private async setupSmartDollar(context: VMExecutionContext, value: unknown): Promise<void> {
    // Get the actual data from the $ value
    let dataToSerialize: unknown;
    if (Array.isArray(value)) {
      dataToSerialize = [...value];
    } else if (typeof value === 'function') {
      const actualData = (value as { valueOf?: () => unknown }).valueOf
        ? (value as { valueOf: () => unknown }).valueOf()
        : (value as () => unknown)();
      dataToSerialize = actualData;
    } else {
      dataToSerialize = value;
    }

    // Load SmartDollar without globals
    const { createVMSmartDollarCodeV2 } = await import('../smart-dollar/smart-dollar-vm-v2');
    const smartDollarCode = createVMSmartDollarCodeV2();

    // Create $ as a local variable that will be captured in closures
    const setupCode = `
      // Check if smartDollarModule already exists to avoid redefinition
      if (typeof globalThis.smartDollarModule === 'undefined') {
        globalThis.smartDollarModule = ${smartDollarCode};
      }
      
      // Use existing module or extract from newly created one
      // Use IIFE to avoid const redeclaration issues
      (function() {
        const { createSmartDollar, SmartDollar } = globalThis.smartDollarModule;
        const $_data = ${JSON.stringify(dataToSerialize)};
        
        // Store SmartDollar class and creator globally for cleanup and method access
        if (typeof globalThis.SmartDollar === 'undefined') {
          globalThis.SmartDollar = SmartDollar;
        }
        if (typeof globalThis.createSmartDollar === 'undefined') {
          globalThis.createSmartDollar = createSmartDollar;
        }
      
        // Only override Object methods if not already overridden
        if (!globalThis.__objectMethodsOverridden) {
          // Save original methods
          Object.__originalKeys = Object.keys;
          Object.__originalValues = Object.values;
          Object.__originalEntries = Object.entries;
          
          // Override Object.keys to handle SmartDollar objects
          Object.keys = function(obj) {
            if (obj && obj.__isSmartDollar && obj._value !== null && obj._value !== undefined) {
              return Object.__originalKeys(obj._value);
            }
            return Object.__originalKeys(obj);
          };
          
          // Override Object.values to handle SmartDollar objects
          Object.values = function(obj) {
            if (obj && obj.__isSmartDollar && obj._value !== null && obj._value !== undefined) {
              return Object.__originalValues(obj._value);
            }
            return Object.__originalValues(obj);
          };
          
          // Override Object.entries to handle SmartDollar objects
          Object.entries = function(obj) {
            if (obj && obj.__isSmartDollar && obj._value !== null && obj._value !== undefined) {
              return Object.__originalEntries(obj._value);
            }
            return Object.__originalEntries(obj);
          };
          
          globalThis.__objectMethodsOverridden = true;
        }
        
        // Create SmartDollar instance
        if ($_data === null || $_data === undefined) {
          globalThis.$ = $_data;
        } else {
          // Always use Proxy-based SmartDollar for consistent behavior
          globalThis.$ = createSmartDollar($_data);
        }
      })();
    `;

    await context.eval(setupCode);
  }

  private wrapCode(code: string): string {
    const trimmedCode = code.trim();
    const needsAsync =
      code.includes('await') || code.includes('async') || code.includes('Promise.');

    // For QuickJS, we need simpler wrapping since it handles JavaScript more directly
    if (needsAsync) {
      // Directly execute the async code without double wrapping
      return `(async () => {
        try {
          const result = ${code};
          // Unwrap SmartDollar if needed
          if (result && result.__isSmartDollar) {
            return result._value || result.value;
          }
          return result;
        } catch (e) {
          throw e;
        }
      })()`;
    } else {
      // For non-async code, check if it looks like it needs a return statement
      // Be very conservative - only treat as statements if we're sure
      const definitelyHasStatements =
        /^\s*(const|let|var|function|class|if|for|while|do|switch)\s+/.test(trimmedCode) ||
        /;\s*$/.test(trimmedCode); // ends with semicolon

      if (definitelyHasStatements) {
        // It has statements, need to handle it differently
        // Split code into statements and handle the last one specially
        const statements: string[] = [];
        let current = '';
        let inString = false;
        let stringChar: string | null = null;
        let depth = 0;

        for (let i = 0; i < trimmedCode.length; i++) {
          const char = trimmedCode[i];
          const prevChar = i > 0 ? trimmedCode[i - 1] : '';

          // Handle strings
          if (!inString && (char === '"' || char === "'" || char === '`')) {
            inString = true;
            stringChar = char;
          } else if (inString && char === stringChar && prevChar !== '\\') {
            inString = false;
          }

          if (!inString) {
            // Track depth
            if (char === '(' || char === '{' || char === '[') depth++;
            if (char === ')' || char === '}' || char === ']') depth--;

            // Check for statement end
            if (char === ';' && depth === 0) {
              statements.push(current.trim());
              current = '';
              continue;
            }
          }

          current += char;
        }

        // Add the last statement/expression if any
        if (current.trim()) {
          statements.push(current.trim());
        }

        // If we have multiple statements or the last one is not just an expression
        if (statements.length > 1) {
          const lastStatement = statements[statements.length - 1];
          const lastIsExpression =
            lastStatement &&
            !lastStatement.startsWith('const ') &&
            !lastStatement.startsWith('let ') &&
            !lastStatement.startsWith('var ') &&
            !lastStatement.startsWith('function ') &&
            !lastStatement.startsWith('class ') &&
            !lastStatement.startsWith('if ') &&
            !lastStatement.startsWith('for ') &&
            !lastStatement.startsWith('while ') &&
            !lastStatement.startsWith('return ');

          if (lastIsExpression) {
            const allButLast = statements.slice(0, -1).join(';\n');
            return `(() => {
              try {
                ${allButLast};
                return (${lastStatement});
              } catch (error) {
                if (error instanceof Error) {
                  throw new Error(error.message);
                }
                throw error;
              }
            })()`;
          }
        }

        // Fall through to default handling
        // All lines are statements, no automatic return
        return `(() => {
          try {
            ${code}
          } catch (error) {
            if (error instanceof Error) {
              throw new Error(error.message);
            }
            throw error;
          }
        })()`;
      } else {
        // Assume it's an expression that should return a value
        // This includes multi-line method chains, object literals, etc.
        return `(() => {
          try {
            return (${code});
          } catch (error) {
            if (error instanceof Error) {
              throw new Error(error.message);
            }
            throw error;
          }
        })()`;
      }
    }
  }

  private createSandboxError(error: unknown, executionTime: number): SandboxError {
    let code: SandboxError['code'] = 'EXECUTION_ERROR';
    let message = 'Unknown error';

    if (error instanceof Error) {
      message = error.message;
      if (error.name === 'TimeoutError') {
        code = 'TIMEOUT';
      }
    } else if (typeof error === 'string') {
      message = error;
    }

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      code = 'TIMEOUT';
    } else if (lowerMessage.includes('memory')) {
      code = 'MEMORY_LIMIT';
    } else if (lowerMessage.includes('syntax')) {
      code = 'SYNTAX_ERROR';
    } else if (lowerMessage.includes('reference') || lowerMessage.includes('is not defined')) {
      code = 'REFERENCE_ERROR';
    } else if (lowerMessage.includes('type')) {
      code = 'TYPE_ERROR';
    }

    const sandboxError = new Error(message) as SandboxError;
    sandboxError.code = code;
    sandboxError.details = { executionTime };
    sandboxError.name = 'SandboxError';

    return sandboxError;
  }

  async dispose(): Promise<void> {
    // Dispose the VM pool when the sandbox is disposed
    if (this.useVMPool && VMSandboxQuickJS.vmPool) {
      await VMSandboxQuickJS.vmPool.dispose();
      VMSandboxQuickJS.vmPool = null;
    }
  }

  getConfig(): VMSandboxConfig {
    return { ...this.config };
  }

  getCapabilities() {
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
      buffer: false,
      crypto: false,
      timers: false, // QuickJS doesn't support timers in the same way
      weakmap: true,
      intl: false,
      number: true,
    };
  }

  getPoolStatus() {
    return {
      size: 0,
      maxSize: 0,
      available: 0,
      busy: 0,
    };
  }

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

  private estimateValueSize(value: unknown, visited = new Set<unknown>()): number {
    if (value === null || value === undefined) {
      return 8;
    }

    if (typeof value === 'object' && value !== null && visited.has(value)) {
      return 8;
    }

    switch (typeof value) {
      case 'boolean':
        return 4;
      case 'number':
        return 8;
      case 'string':
        return value.length * 2;
      case 'bigint':
        return value.toString().length * 2;
      case 'function':
        return value.toString().length * 2;
      case 'object': {
        if (visited.has(value)) return 8;
        visited.add(value);

        let size = 16;

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
          for (const [key, val] of Object.entries(value)) {
            size += key.length * 2;
            size += this.estimateValueSize(val, visited);
          }
        }

        visited.delete(value);
        return size;
      }
      default:
        return 8;
    }
  }

  private validatePositiveNumber(value: number | undefined, defaultValue: number): number {
    if (typeof value === 'number' && value > 0 && !Number.isNaN(value)) {
      return value;
    }
    return defaultValue;
  }
}
