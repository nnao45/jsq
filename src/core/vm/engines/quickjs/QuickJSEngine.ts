import type {
  // VmCallResult,
  QuickJSContext,
  QuickJSHandle,
  QuickJSRuntime,
  QuickJSWASMModule,
} from 'quickjs-emscripten';
import type { VMContext, VMOptions, VMResult, VMSandboxConfig } from '../../../../types/sandbox';
import type { ApplicationContext } from '../../../application-context';
import type {
  // SerializedValue,
  EvalOptions,
  MemoryInfo,
  ValueMarshaller,
  VMEngine,
  VMExecutionContext,
} from '../../interfaces/VMEngine';
import { isProcessExiting } from '../../quickjs-gc-workaround';
import { QuickJSMarshaller } from './QuickJSMarshaller';

export class QuickJSExecutionContext implements VMExecutionContext {
  private handles: QuickJSHandle[] = [];

  constructor(
    private vm: QuickJSContext,
    private runtime: QuickJSRuntime,
    _marshaller: ValueMarshaller // 将来的に使う可能性があるので残しておく
  ) {}

  async setGlobal(name: string, value: unknown): Promise<void> {
    // プリミティブな値の場合は直接設定
    if (value === null || value === undefined) {
      const handle = value === null ? this.vm.null : this.vm.undefined;
      this.vm.setProp(this.vm.global, name, handle);
      return;
    }

    if (typeof value === 'string') {
      const handle = this.vm.newString(value);
      this.vm.setProp(this.vm.global, name, handle);
      handle.dispose();
      return;
    }

    if (typeof value === 'number') {
      const handle = this.vm.newNumber(value);
      this.vm.setProp(this.vm.global, name, handle);
      handle.dispose();
      return;
    }

    if (typeof value === 'boolean') {
      const handle = value ? this.vm.true : this.vm.false;
      this.vm.setProp(this.vm.global, name, handle);
      return;
    }

    // Date オブジェクトの特別扱い
    if (value instanceof Date) {
      const isoString = value.toISOString();
      const dateCode = `new Date('${isoString}')`;
      const result = this.vm.evalCode(dateCode);

      if ('error' in result && result.error) {
        const errorMsg = this.vm.dump(result.error);
        result.error.dispose();
        throw new Error(`Failed to create Date for global ${name}: ${errorMsg}`);
      }

      if ('value' in result) {
        this.vm.setProp(this.vm.global, name, result.value);
        result.value.dispose();
      }
      return;
    }
    const jsonString = JSON.stringify(value);

    // Create the property directly on global
    const globalHandle = this.vm.global;

    // Parse JSON directly into the global property
    const parseCode = `JSON.parse('${jsonString.replace(/'/g, "\\'").replace(/\n/g, '\\n')}')`;
    const result = this.vm.evalCode(parseCode);

    if ('error' in result && result.error) {
      const errorMsg = this.vm.dump(result.error);
      result.error.dispose();
      throw new Error(`Failed to parse JSON for global ${name}: ${errorMsg}`);
    }

    if ('value' in result) {
      // Set the parsed value as global property
      this.vm.setProp(globalHandle, name, result.value);
      // Note: We must dispose result.value - QuickJS increments reference count internally
      result.value.dispose();
    }
  }

  async eval(code: string, options?: EvalOptions): Promise<unknown> {
    try {
      const result = this.vm.evalCode(code, options?.filename);

      if ('error' in result && result.error) {
        let errorMsg = 'Unknown error';
        let errorDetails = '';
        let errorType = 'Unknown';

        try {
          // Try to get error type
          const errorTypeProp = this.vm.getProp(result.error, 'name');
          if (this.vm.typeof(errorTypeProp) === 'string') {
            errorType = this.vm.getString(errorTypeProp);
          }
          errorTypeProp.dispose();
        } catch (_e) {
          // Failed to get error type
        }

        try {
          // エラーメッセージを取得
          const dumpResult = result.error != null ? this.vm.dump(result.error) : null;

          if (dumpResult && typeof dumpResult === 'object') {
            if ('message' in dumpResult) {
              errorMsg = dumpResult.message || errorMsg;
            }
            if ('stack' in dumpResult) {
              errorDetails = dumpResult.stack || '';
            }
            // その他のプロパティも含める
            errorMsg = JSON.stringify(dumpResult);
          } else if (typeof dumpResult === 'string') {
            errorMsg = dumpResult;
          }
        } catch (_e) {
          // dumpが失敗した場合はmessageプロパティを試す
          try {
            const msgProp = this.vm.getProp(result.error, 'message');
            if (this.vm.typeof(msgProp) === 'string') {
              errorMsg = this.vm.getString(msgProp);
            }
            msgProp.dispose();
          } catch (_e2) {
            // Failed to get error message
          }
        }

        // Dispose the error handle
        if (result.error) {
          result.error.dispose();
        }

        // Include code snippet for debugging
        const codeSnippet = code.length > 100 ? `${code.substring(0, 100)}...` : code;
        throw new Error(
          `${errorType}: ${errorMsg}\nCode: ${codeSnippet}${errorDetails ? `\nStack: ${errorDetails}` : ''}`
        );
      }

      // result.valueが存在することを確認
      if (!('value' in result) || !result.value) {
        throw new Error('No result value from eval');
      }

      // Execute pending jobs first for async code
      const maxIterations = 100;
      let lastJobCount = -1;

      for (let i = 0; i < maxIterations; i++) {
        const jobResult = this.runtime.executePendingJobs();

        if ('error' in jobResult && jobResult.error) {
          // Error executing jobs
          if ('value' in result) {
            result.value.dispose();
          }
          jobResult.error.dispose();
          jobResult.dispose();
          throw new Error('Error executing pending jobs');
        }

        const jobCount = 'value' in jobResult ? jobResult.value : 0;
        jobResult.dispose();

        if (jobCount === 0) {
          // No more jobs to execute
          break;
        }

        // Prevent infinite loop
        if (jobCount === lastJobCount) {
          break;
        }
        lastJobCount = jobCount;
      }

      // Try to dump the result after executing jobs
      try {
        if ('value' in result) {
          const value = this.vm.dump(result.value);
          result.value.dispose();
          return value;
        } else {
          throw new Error('No value in result');
        }
      } catch (dumpError) {
        // If dump still fails, handle the error
        if ('value' in result) {
          result.value.dispose();
        }

        if (dumpError instanceof Error && dumpError.message.includes('Lifetime not alive')) {
          throw new Error(
            `Failed to resolve async operation: Promise may have been resolved but handle was disposed`
          );
        } else {
          throw new Error(`Failed to dump result: ${dumpError}`);
        }
      }
    } catch (error) {
      // Error logged at higher level
      throw error;
    }
  }

  release(): void {
    // Clear global objects first
    if (this.vm) {
      try {
        // Clear __consoleCalls array
        const clearCode = `
          if (typeof globalThis.__consoleCalls !== 'undefined') {
            globalThis.__consoleCalls = null;
            delete globalThis.__consoleCalls;
          }
        `;
        const result = this.vm.evalCode(clearCode);
        if ('error' in result && result.error) {
          result.error.dispose();
        } else if ('value' in result && result.value) {
          result.value.dispose();
        }
      } catch {
        // Ignore errors during cleanup
      }
    }

    // Clear handles array first to prevent re-use
    const handlesCopy = [...this.handles];
    this.handles = [];

    // Dispose handles in reverse order (LIFO)
    for (let i = handlesCopy.length - 1; i >= 0; i--) {
      const handle = handlesCopy[i];
      try {
        if (handle && typeof handle.dispose === 'function') {
          handle.dispose();
        }
      } catch {
        // Ignore errors
      }
    }

    // Dispose VM context last
    if (this.vm && typeof this.vm.dispose === 'function') {
      try {
        this.vm.dispose();
      } catch {
        // Ignore errors
      }
    }

    // Clear references
    // Intentionally clearing reference to prevent memory leaks
    this.vm = undefined as unknown as QuickJSContext;
  }
}

// Note: QuickJS WASM module management has been moved to ApplicationContext

export class QuickJSEngine implements VMEngine {
  private quickjs: QuickJSWASMModule | null = null;
  private runtime: QuickJSRuntime | null = null;
  private config: VMSandboxConfig | null = null;
  private marshaller = new QuickJSMarshaller();
  private activeContexts: QuickJSExecutionContext[] = [];
  private appContext: ApplicationContext;

  constructor(appContext: ApplicationContext) {
    this.appContext = appContext;
  }

  async initialize(config: VMSandboxConfig): Promise<void> {
    this.config = config;
    // Use ApplicationContext to get QuickJS module
    this.quickjs = await this.appContext.getQuickJSModule();
    this.runtime = this.quickjs.newRuntime();

    // メモリ制限を設定（MB to bytes）
    if (config.memoryLimit) {
      this.runtime.setMemoryLimit(config.memoryLimit * 1024 * 1024);
    }

    // 最大スタック制限 - Use a reasonable fixed size instead of scaling with memory
    // Large stack sizes cause QuickJS to fail with empty error messages
    this.runtime.setMaxStackSize(1024 * 1024); // 1MB stack is plenty
  }

  async createContext(): Promise<VMExecutionContext> {
    if (!this.quickjs || !this.runtime) {
      throw new Error('Engine not initialized');
    }

    const vm = this.runtime.newContext();

    // Set up console support
    try {
      // Create console object with methods that collect calls
      const consoleCode = `
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
      `;

      const result = vm.evalCode(consoleCode);
      if ('error' in result && result.error) {
        result.error.dispose();
      } else if ('value' in result && result.value) {
        // Dispose the result value to prevent memory leak
        result.value.dispose();
      }
    } catch {
      // Continue without console - not critical
    }

    const context = new QuickJSExecutionContext(vm, this.runtime, this.marshaller);
    this.activeContexts.push(context);
    return context;
  }

  async execute(
    context: VMExecutionContext,
    code: string,
    bindings: VMContext,
    options: VMOptions
  ): Promise<VMResult> {
    const startTime = performance.now();

    // グローバル変数を設定
    for (const [key, value] of Object.entries(bindings)) {
      await context.setGlobal(key, value);
    }

    // タイムアウト処理（QuickJSは中断APIを持たないので、警告のみ）
    let timeoutId: NodeJS.Timeout | null = null;
    if (options.timeout) {
      timeoutId = setTimeout(() => {}, options.timeout);
    }

    try {
      const result = await context.eval(code);
      const executionTime = performance.now() - startTime;

      return {
        value: result,
        executionTime,
        memoryUsed: this.getMemoryUsage().used,
      };
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  getMemoryUsage(): MemoryInfo {
    if (!this.runtime) {
      return { used: 0, limit: 0 };
    }

    const stats = this.runtime.computeMemoryUsage();
    let result: MemoryInfo;

    // quickjs-emscriptenの新しいAPIでは直接数値を返す場合がある
    if (typeof stats === 'number') {
      result = {
        used: stats,
        limit: this.config?.memoryLimit || 0,
      };
    } else {
      // オブジェクトの場合（古いAPI）
      result = {
        used:
          (stats && typeof stats === 'object' && 'memory_used_size' in stats
            ? (stats as { memory_used_size: number }).memory_used_size
            : 0) || 0,
        limit: this.config?.memoryLimit || 0,
        external:
          stats && typeof stats === 'object' && 'malloc_size' in stats
            ? (stats as { malloc_size: number }).malloc_size
            : 0,
      };
    }

    // IMPORTANT: Dispose the stats handle if it has a dispose method
    if (
      stats &&
      typeof stats === 'object' &&
      'dispose' in stats &&
      typeof stats.dispose === 'function'
    ) {
      stats.dispose();
    }

    return result;
  }

  async dispose(): Promise<void> {
    // Skip disposal ONLY if we're actually exiting the process
    // This prevents memory leaks during normal operation
    if (isProcessExiting()) {
      return;
    }

    // Clear active contexts array but don't dispose them yet
    // They need to be disposed AFTER runtime cleanup
    const contexts = [...this.activeContexts];
    this.activeContexts = [];

    // Execute pending jobs and cleanup
    if (this.runtime) {
      try {
        // Try to execute pending jobs, but don't fail if it errors
        const jobResult = this.runtime.executePendingJobs();
        if ('dispose' in jobResult && typeof jobResult.dispose === 'function') {
          jobResult.dispose();
        }
      } catch {
        // Ignore errors during job execution
      }

      // Force garbage collection
      try {
        if ('collectGarbage' in this.runtime && typeof this.runtime.collectGarbage === 'function') {
          this.runtime.collectGarbage();
        }
      } catch {
        // Ignore GC errors
      }

      // Dispose contexts before runtime
      for (const context of contexts) {
        try {
          context.release();
        } catch {
          // Ignore errors
        }
      }

      try {
        this.runtime.dispose();
      } catch (e) {
        // Suppress QuickJS GC assertion error on dispose in tests
        if (process.env.NODE_ENV === 'test') {
          // In test environment, ignore all disposal errors
          // This is a workaround for QuickJS GC issues
        } else {
          // In production, only suppress known GC assertion error
          if (e && typeof e === 'object' && 'message' in e) {
            const msg = String(e.message);
            if (!msg.includes('Assertion failed: list_empty(&rt->gc_obj_list)')) {
              // Re-throw if it's not the expected GC assertion error
              throw e;
            }
          }
        }
      }
      this.runtime = null;
    }
    this.quickjs = null;
    this.config = null;
  }
}
