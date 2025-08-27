import type {
  SandboxError,
  VMContext,
  VMOptions,
  VMResult,
  VMSandboxConfig,
} from '@/types/sandbox';
import { VMEngineFactory } from './VMEngineFactory';
import type { VMEngine } from './interfaces/VMEngine';

/**
 * QuickJS-based VM Sandbox implementation
 * Uses quickjs-emscripten as the underlying engine
 */
export class VMSandboxQuickJS {
  private config: VMSandboxConfig;
  private engine: VMEngine | null = null;

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

  private async getEngine(): Promise<VMEngine> {
    if (!this.engine) {
      const factory = new VMEngineFactory();
      this.engine = factory.create('quickjs');
      await this.engine.initialize({
        memoryLimit: this.config.memoryLimit * 1024 * 1024, // Convert MB to bytes
      });
    }
    return this.engine;
  }

  async execute<T = unknown>(
    code: string,
    context: VMContext = {},
    options: VMOptions = {}
  ): Promise<VMResult<T>> {
    
    const startTime = Date.now();
    let execContext: any = null;
    let engine: VMEngine | null = null;

    try {
      // QuickJSでは毎回新しいエンジンを作成する（メモリリークを防ぐため）
      const factory = new VMEngineFactory();
      engine = factory.create('quickjs');
      await engine.initialize({
        memoryLimit: this.config.memoryLimit * 1024 * 1024, // Convert MB to bytes
      });
      
      // Create a new execution context
      execContext = await engine.createContext();

      // Set up console first (QuickJS needs this for debugging)
      // We need to create console inside the QuickJS context
      try {
        await execContext.eval('globalThis.console = {}');
        await execContext.eval('globalThis.console.log = function() {}');
        await execContext.eval('globalThis.console.error = function() {}');
        await execContext.eval('globalThis.console.warn = function() {}');
        await execContext.eval('globalThis.console.info = function() {}');
        await execContext.eval('globalThis.console.debug = function() {}');
      } catch (err) {
        // Continue without console - not critical
      }

      // Set up context variables
      let needsLodash = false;
      for (const [key, value] of Object.entries(context)) {
        // Skip built-in globals that are already set up
        if (['console', 'JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean'].includes(key)) {
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
        await execContext.eval(`
          globalThis._ = createLodash();
        `);
      }

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

      const executionTime = Math.max(1, Date.now() - startTime);

      // Release the execution context after successful execution
      if (execContext) {
        try {
          execContext.release();
        } catch {
          // Ignore release errors
        }
      }

      return {
        value: result.value as T,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed || 0, // QuickJS may return undefined
      };
    } catch (error) {
      const executionTime = Math.max(1, Date.now() - startTime);
      
      // Debug: Log the original error
      console.error('VMSandboxQuickJS execute error:', error);
      console.error('Error type:', typeof error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      console.error('Code being executed:', code);
      
      // Make sure to release context on error too
      if (execContext) {
        try {
          execContext.release();
        } catch {
          // Ignore release errors
        }
      }
      
      // Check for specific initialization errors
      if (error instanceof Error) {
        if (error.message.includes('dynamic import callback') || 
            error.message.includes('experimental-vm-modules') ||
            error.message.includes('ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG')) {
          const initError = new Error(
            'QuickJS initialization failed: Dynamic imports are not supported in the current Jest environment. ' +
            'QuickJS requires --experimental-vm-modules flag which may not be compatible with your Node.js version. ' +
            'Consider using JSQ_VM_ENGINE=isolated-vm for tests or running tests with NODE_OPTIONS=--experimental-vm-modules.'
          );
          throw this.createSandboxError(initError, executionTime);
        }
      }
      
      throw this.createSandboxError(error, executionTime);
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


  private async setupSmartDollar(context: any, value: unknown): Promise<void> {
    
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

  private wrapCode(code: string): string {
    const trimmedCode = code.trim();
    const needsAsync = code.includes('await') || code.includes('async') || code.includes('Promise.');

    // For QuickJS, we need simpler wrapping since it handles JavaScript more directly
    if (needsAsync) {
      return `(async () => {
        try {
          return await (async () => { ${code} })();
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(error.message);
          }
          throw error;
        }
      })()`;
    } else {
      // Check if this is a simple expression or statement
      const isExpression = !code.includes(';') && !code.includes('\n') && 
                          !code.startsWith('if') && !code.startsWith('for') && 
                          !code.startsWith('while') && !code.startsWith('function');
      
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
        const statements = code.split(';').map(s => s.trim()).filter(s => s);
        if (statements.length > 1) {
          const lastStatement = statements[statements.length - 1];
          const otherStatements = statements.slice(0, -1);
          
          // Build the code with proper handling of each statement
          const statementsCode = otherStatements.map((stmt, idx) => {
            return `${stmt};`;
          }).join('\n              ');
          
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
    this.engine = null;
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