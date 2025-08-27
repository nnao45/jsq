import type {
  SandboxError,
  VMContext,
  VMOptions,
  VMResult,
  VMSandboxConfig,
} from '@/types/sandbox';
import type { VMEngine, VMExecutionContext } from './interfaces/VMEngine';
import { VMEngineFactory } from './VMEngineFactory';

/**
 * QuickJS-based VM Sandbox implementation
 * Uses quickjs-emscripten as the underlying engine
 */
export class VMSandboxQuickJS {
  private config: VMSandboxConfig;
  // private engine: VMEngine | null = null;

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

    try {
      // QuickJSでは毎回新しいエンジンを作成する（メモリリークを防ぐため）
      const factory = new VMEngineFactory();
      engine = factory.create('quickjs');
      await engine.initialize(this.config);

      // Create a new execution context
      execContext = await engine.createContext();

      // Set up console first (QuickJS needs this for debugging)
      // We need to create console inside the QuickJS context
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
      let needsLodash = false;
      for (const [key, value] of Object.entries(context)) {
        // Skip built-in globals that are already set up, except console which we want to override
        if (
          ['JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean'].includes(key)
        ) {
          continue;
        }

        // Handle $ specially
        if (key === '$') {
          await this.setupSmartDollar(execContext, value);
        } else if (key === '_' && value === null) {
          // This is a marker to set up lodash utilities
          needsLodash = true;
        } else {
          await execContext.setGlobal(key, value);
        }
      }

      // Setup lodash if needed
      if (needsLodash) {
        // Load lodash code
        const { createVMLodashCode } = await import('../lodash/lodash-vm');
        await execContext.eval(createVMLodashCode());
        // Note: createVMLodashCode already sets up globalThis._ correctly
        // No need to override it here
      }

      // Store the host console reference for later use
      const hostConsole = {
        log: (...args: unknown[]) => console.log(...args),
        error: (...args: unknown[]) => console.error(...args),
        warn: (...args: unknown[]) => console.warn(...args),
        info: (...args: unknown[]) => console.info(...args),
        debug: (...args: unknown[]) => console.debug(...args),
      };

      // Execute the code using the engine
      // Note: We've already set up the context variables, so pass empty bindings
      const wrappedCode = this.wrapCode(code);

      const result = await engine.execute(
        execContext,
        wrappedCode,
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
        } catch (e) {
          // If unwrapping fails, use original value
          console.error('Failed to unwrap SmartDollar:', e);
        }
      }

      // const executionTime = Math.max(1, Date.now() - startTime);

      // Don't release context here - it will be released with engine disposal

      return {
        value: finalValue as T,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed || 0, // QuickJS may return undefined
      };
    } catch (error) {
      // const executionTime = Math.max(1, Date.now() - startTime);

      // Debug: Log the original error only in verbose mode
      if (process.env.NODE_ENV !== 'test' && process.env.DEBUG) {
        console.error('VMSandboxQuickJS execute error:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
      }

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
      // エンジンも破棄する（QuickJSのメモリリーク防止）
      if (engine) {
        try {
          await engine.dispose();
        } catch {
          // Ignore dispose errors
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

    // Set up the data
    await context.setGlobal('$_data', dataToSerialize);

    // Load and evaluate the smart dollar code
    const { createVMSmartDollarCode } = await import('../smart-dollar/smart-dollar-vm');
    const smartDollarCode = createVMSmartDollarCode();
    await context.eval(smartDollarCode);

    // Load and evaluate the lodash code
    const { createVMLodashCode } = await import('../lodash/lodash-vm');
    const lodashCode = createVMLodashCode();
    await context.eval(lodashCode);

    // Create $ with createSmartDollar
    const setupCode = `
      if (globalThis.$_data === null || globalThis.$_data === undefined) {
        globalThis.$ = globalThis.$_data;
      } else {
        globalThis.$ = createSmartDollar(globalThis.$_data);
      }
      delete globalThis.$_data;
    `;
    await context.eval(setupCode);
  }

  private hasTopLevelSemicolon(expression: string): boolean {
    let inString = false;
    let stringChar: string | undefined;
    let parenDepth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;

    for (let i = 0; i < expression.length; i++) {
      const char = expression.charAt(i);
      const prevChar = i > 0 ? expression.charAt(i - 1) : '';

      // Handle string state
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
        continue;
      }

      if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = undefined;
        continue;
      }

      if (inString) continue;

      // Handle bracket depth
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
      if (char === '[') bracketDepth++;
      if (char === ']') bracketDepth--;

      // Check for semicolon at top level
      if (char === ';' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
        return true;
      }
    }
    return false;
  }

  private splitBySemicolon(expression: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inString = false;
    let stringChar: string | undefined;
    let parenDepth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;

    for (let i = 0; i < expression.length; i++) {
      const char = expression.charAt(i);
      const prevChar = i > 0 ? expression.charAt(i - 1) : '';

      // Handle string state
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
        current += char;
        continue;
      }

      if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = undefined;
        current += char;
        continue;
      }

      current += char;
      if (inString) continue;

      // Handle bracket depth
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
      if (char === '[') bracketDepth++;
      if (char === ']') bracketDepth--;

      // Split at semicolon if at top level
      if (char === ';' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
        current = current.slice(0, -1); // Remove the semicolon
        if (current.trim()) {
          parts.push(current.trim());
        }
        current = '';
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  private wrapCode(code: string): string {
    // const trimmedCode = code.trim();
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
      // Check if this is a simple expression or statement
      // Need to check for semicolons not inside strings
      const hasTopLevelSemicolon = this.hasTopLevelSemicolon(code);
      const isExpression =
        !hasTopLevelSemicolon &&
        !code.includes('\n') &&
        !code.startsWith('if') &&
        !code.startsWith('for') &&
        !code.startsWith('while') &&
        !code.startsWith('function');

      if (isExpression) {
        return `(() => {
          try {
            return ${code};
          } catch (error) {
            if (error instanceof Error) {
              throw new Error(error.message);
            }
            throw error;
          }
        })()`;
      } else {
        // For statements, we need to capture the last expression
        const statements = this.splitBySemicolon(code)
          .map(s => s.trim())
          .filter(s => s);
        if (statements.length > 1) {
          const lastStatement = statements[statements.length - 1];
          if (!lastStatement) {
            return code; // 安全のためそのまま返す
          }
          const otherStatements = statements.slice(0, -1);

          // Build the code with proper handling of each statement
          const statementsCode = otherStatements
            .map(stmt => {
              return `${stmt};`;
            })
            .join('\n              ');

          // Check if last statement is an expression or statement
          const isLastStatementExpression =
            !lastStatement.trim().startsWith('if') &&
            !lastStatement.trim().startsWith('for') &&
            !lastStatement.trim().startsWith('while') &&
            !lastStatement.trim().startsWith('function') &&
            !lastStatement.trim().startsWith('let') &&
            !lastStatement.trim().startsWith('const') &&
            !lastStatement.trim().startsWith('var') &&
            !lastStatement.trim().includes('\n{');

          if (isLastStatementExpression) {
            return `(() => {
              try {
                ${statementsCode}
                return ${lastStatement};
              } catch (error) {
                if (error instanceof Error) {
                  throw new Error(error.message);
                }
                throw error;
              }
            })()`;
          } else {
            return `(() => {
              try {
                ${statementsCode}
                ${lastStatement};
                return undefined;
              } catch (error) {
                if (error instanceof Error) {
                  throw new Error(error.message);
                }
                throw error;
              }
            })()`;
          }
        } else if (statements.length === 1) {
          // Single statement - just wrap it
          return `(() => {
            try {
              return ${statements[0]};
            } catch (error) {
              if (error instanceof Error) {
                throw new Error(error.message);
              }
              throw error;
            }
          })()`;
        } else {
          // Empty code
          return `(() => {
            try {
              return undefined;
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
    // QuickJSでは毎回新しいエンジンを作成しているので、
    // ここでは特にdisposeする必要はない
    // this.engine = null;
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
