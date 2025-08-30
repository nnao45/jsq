// QuickJS types
// type Isolate = {
//   createContext(): Promise<Context>;
//   dispose(): void;
//   getHeapStatistics(): { totalHeapSize: number; usedHeapSize: number };
//   compileScript(code: string): Promise<Script>;
//   isDisposed?: boolean;
// };

// type Script = {
//   run(context: Context, options?: { timeout?: number; copy?: boolean }): Promise<unknown>;
// };

// type Context = {
//   global: Reference;
//   release(): void;
//   eval(code: string, options?: { timeout?: number; copy?: boolean }): Promise<unknown>;
// };

// type Reference = {
//   set(
//     key: string,
//     value: unknown,
//     options?: { copy?: boolean; reference?: boolean }
//   ): Promise<void>;
//   get(key: string, options?: { reference?: boolean }): Promise<unknown>;
//   getSync(key: string, options?: { reference?: boolean }): unknown;
//   apply(thisArg: unknown, args: unknown[]): Promise<unknown>;
// };

// type ExternalCopy = {
//   copy(): unknown;
//   copySync(): unknown;
//   copyInto(options?: { release?: boolean }): unknown;
// };

import type {
  SandboxError,
  VMContext,
  VMOptions,
  VMResult,
  VMSandboxConfig,
} from '@/types/sandbox';
import type { ApplicationContext } from '../application-context';
import type { VMEngine, VMExecutionContext } from './interfaces/VMEngine';
import { VMEngineFactory } from './VMEngineFactory';

/**
 * VM Sandbox implementation using QuickJS
 * This version focuses on core functionality without advanced features
 */
export class VMSandboxSimple {
  private config: VMSandboxConfig;
  private appContext: ApplicationContext;

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

    // Pre-warm the pool if recycling is enabled
    if (this.config.recycleIsolates && this.config.isolatePoolSize > 0) {
      this.appContext.vmPool.prewarm(Math.min(2, this.config.isolatePoolSize)).catch(err => {
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
    let execContext: VMExecutionContext | null = null;
    let engine: VMEngine | null = null;

    try {
      // Create a new QuickJS engine for each execution (to prevent memory leaks)
      const factory = new VMEngineFactory(this.appContext);
      engine = factory.create('quickjs');
      await engine.initialize(this.config);

      // Create a new execution context
      execContext = await engine.createContext();

      // Set up console
      try {
        // Set up a way to collect console calls
        await execContext.eval(`
          globalThis.__consoleCalls = [];
          globalThis.console = {
            log: function(...args) {
              globalThis.__consoleCalls.push({ method: 'log', args: args });
            },
            error: function(...args) {
              globalThis.__consoleCalls.push({ method: 'error', args: args });
            },
            warn: function(...args) {
              globalThis.__consoleCalls.push({ method: 'warn', args: args });
            },
            info: function(...args) {
              globalThis.__consoleCalls.push({ method: 'info', args: args });
            },
            debug: function(...args) {
              globalThis.__consoleCalls.push({ method: 'debug', args: args });
            }
          };
        `);
      } catch (_err) {
        // Continue without console - not critical
      }

      // Set up context variables
      for (const [key, value] of Object.entries(context)) {
        // Skip built-in globals
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
          ].includes(key)
        ) {
          continue;
        }
        await execContext.setGlobal(key, value);
      }

      // Store the host console reference for later use
      const hostConsole = {
        log: (...args: unknown[]) => console.log(...args),
        error: (...args: unknown[]) => console.error(...args),
        warn: (...args: unknown[]) => console.warn(...args),
        info: (...args: unknown[]) => console.info(...args),
        debug: (...args: unknown[]) => console.debug(...args),
      };

      // Execute the code
      const result = await engine.execute(
        execContext,
        code,
        {}, // Empty bindings since we already set them up
        {
          ...options,
          timeout: options.timeout ?? this.config.timeout,
        }
      );

      // Process console calls after execution
      try {
        const consoleCalls = await execContext.eval('globalThis.__consoleCalls');
        if (Array.isArray(consoleCalls)) {
          for (const call of consoleCalls) {
            if (call && typeof call === 'object' && 'method' in call && 'args' in call) {
              const method = call.method as keyof typeof hostConsole;
              if (method in hostConsole && Array.isArray(call.args)) {
                hostConsole[method](...call.args);
              }
            }
          }
        }
      } catch (_e) {
        // Ignore console processing errors
      }

      const executionTime = Math.max(1, Date.now() - startTime);

      return {
        value: result.value as T,
        executionTime,
        memoryUsed: 0, // QuickJS doesn't provide memory usage info easily
      };
    } catch (error) {
      const executionTime = Math.max(1, Date.now() - startTime);
      throw this.createSandboxError(error, executionTime);
    } finally {
      // Clean up
      if (execContext) {
        try {
          execContext.release();
        } catch (_e) {
          // Ignore disposal errors
        }
      }
      if (engine) {
        try {
          await engine.dispose();
        } catch (_e) {
          // Ignore disposal errors
        }
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

    // Check for timeout with more patterns
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
    // The global vmPool's cleanup interval is unref'd to allow process exit
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
