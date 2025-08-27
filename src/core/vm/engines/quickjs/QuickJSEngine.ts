import { 
  type QuickJSContext, 
  QuickJSHandle, 
  type QuickJSRuntime, 
  type QuickJSWASMModule,
  // VmCallResult,
  getQuickJS,
  getQuickJSSync
} from 'quickjs-emscripten';
import type {
  VMEngine,
  VMExecutionContext,
  MemoryInfo,
  ValueMarshaller,
  // SerializedValue,
  EvalOptions
} from '../../interfaces/VMEngine';
import type { VMContext, VMOptions, VMResult, VMSandboxConfig } from '../../../../types/sandbox';
import { QuickJSMarshaller } from './QuickJSMarshaller';

export class QuickJSExecutionContext implements VMExecutionContext {
  private handles: QuickJSHandle[] = [];
  
  constructor(
    private vm: QuickJSContext,
    private runtime: QuickJSRuntime,
    _marshaller: ValueMarshaller // 将来的に使う可能性があるので残しておく
  ) {}
  
  // private addHandle(_handle: QuickJSHandle): void {
  //   this.handles.push(_handle);
  // }

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
      
      this.vm.setProp(this.vm.global, name, result.value);
      result.value.dispose();
      return;
    }
    
    // オブジェクトや配列の場合はJSONを使う
    try {
      const jsonString = JSON.stringify(value);
      const jsonHandle = this.vm.newString(jsonString);
      
      // Create the property directly on global
      const globalHandle = this.vm.global;
      const nameHandle = this.vm.newString(name);
      
      // Parse JSON directly into the global property
      const parseCode = `JSON.parse('${jsonString.replace(/'/g, "\\'").replace(/\n/g, "\\n")}')`;
      const result = this.vm.evalCode(parseCode);
      
      if ('error' in result && result.error) {
        const errorMsg = this.vm.dump(result.error);
        result.error.dispose();
        jsonHandle.dispose();
        nameHandle.dispose();
        throw new Error(`Failed to parse JSON for global ${name}: ${errorMsg}`);
      }
      
      // Set the parsed value as global property
      this.vm.setProp(globalHandle, name, result.value);
      
      // Clean up handles immediately after setting property
      result.value.dispose();
      jsonHandle.dispose();
      nameHandle.dispose();
    } catch (error) {
      throw error;
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
        } catch (e) {
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
        } catch (e) {
          // dumpが失敗した場合はmessageプロパティを試す
          try {
            const msgProp = this.vm.getProp(result.error!, 'message');
            if (this.vm.typeof(msgProp) === 'string') {
              errorMsg = this.vm.getString(msgProp);
            }
            msgProp.dispose();
          } catch (e2) {
            // Failed to get error message
          }
        }
        
        // Dispose the error handle
        if (result.error) {
          result.error.dispose();
        }
        
        // Include code snippet for debugging
        const codeSnippet = code.length > 100 ? code.substring(0, 100) + '...' : code;
        throw new Error(`${errorType}: ${errorMsg}\nCode: ${codeSnippet}${errorDetails ? '\nStack: ' + errorDetails : ''}`);
      }
      
      // result.valueが存在することを確認
      if (!result.value) {
        throw new Error('No result value from eval');
      }
      
      // Execute pending jobs first for async code
      const maxIterations = 100;
      let lastJobCount = -1;
      
      for (let i = 0; i < maxIterations; i++) {
        const jobResult = this.runtime.executePendingJobs();
        
        if ('error' in jobResult && jobResult.error) {
          // Error executing jobs
          result.value.dispose();
          jobResult.error.dispose();
          jobResult.dispose();
          throw new Error('Error executing pending jobs');
        }
        
        const jobCount = jobResult.value;
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
        const value = this.vm.dump(result.value);
        result.value.dispose();
        return value;
      } catch (dumpError) {
        // If dump still fails, handle the error
        result.value.dispose();
        
        if (dumpError instanceof Error && dumpError.message.includes('Lifetime not alive')) {
          throw new Error(`Failed to resolve async operation: Promise may have been resolved but handle was disposed`);
        } else {
          throw new Error(`Failed to dump result: ${dumpError}`);
        }
      }
    } catch (error) {
      console.error('QuickJS eval failed with code:', code);
      throw error;
    }
  }

  release(): void {
    // ディスポーズ前に全てのハンドルを解放
    for (const handle of this.handles) {
      try {
        if (handle && typeof handle.dispose === 'function') {
          handle.dispose();
        }
      } catch {
        // エラーは無視
      }
    }
    this.handles = [];
    
    // vmは親のQuickJSEngineで管理されているので、ここではdisposeしない
    // this.vm.dispose(); // これはやらない
  }
}

// Singleton to manage QuickJS WASM module (NOT runtime)
class QuickJSManager {
  private static instance: QuickJSManager | null = null;
  private quickjs: QuickJSWASMModule | null = null;
  private initialized = false;
  private initError: Error | null = null;
  
  static getInstance(): QuickJSManager {
    if (!QuickJSManager.instance) {
      QuickJSManager.instance = new QuickJSManager();
    }
    return QuickJSManager.instance;
  }
  
  async getQuickJS(): Promise<QuickJSWASMModule> {
    if (this.initError) {
      throw this.initError;
    }
    
    if (!this.quickjs || !this.initialized) {
      try {
        // Always initialize async version first
        this.quickjs = await getQuickJS();
        this.initialized = true;
        
        // Try sync version for subsequent calls if available
        if (typeof getQuickJSSync === 'function') {
          try {
            // This should now work after async initialization
            const syncQuickjs = getQuickJSSync();
            if (syncQuickjs) {
              this.quickjs = syncQuickjs;
            }
          } catch {
            // Sync version failed, but we have async version
          }
        }
      } catch (error) {
        // Cache the error so we don't retry
        if (error instanceof Error) {
          if (error.message.includes('dynamic import callback') || 
              error.message.includes('experimental-vm-modules') ||
              (error as any).code === 'ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG') {
            this.initError = new Error(
              'QuickJS cannot be initialized in the current environment. ' +
              'Jest tests require --experimental-vm-modules flag. ' +
              'Run with NODE_OPTIONS=--experimental-vm-modules'
            );
          } else {
            this.initError = error;
          }
        } else {
          this.initError = new Error(String(error));
        }
        throw this.initError;
      }
    }
    return this.quickjs;
  }
}

export class QuickJSEngine implements VMEngine {
  private quickjs: QuickJSWASMModule | null = null;
  private runtime: QuickJSRuntime | null = null;
  private config: VMSandboxConfig | null = null;
  private marshaller = new QuickJSMarshaller();
  private activeContexts: QuickJSExecutionContext[] = [];

  async initialize(config: VMSandboxConfig): Promise<void> {
    this.config = config;
    try {
      // Use shared singleton to avoid dynamic import issues in Jest
      const manager = QuickJSManager.getInstance();
      this.quickjs = await manager.getQuickJS();
      this.runtime = this.quickjs.newRuntime();
      
      // メモリ制限を設定（MB to bytes）
      if (config.memoryLimit) {
        this.runtime.setMemoryLimit(config.memoryLimit * 1024 * 1024);
      }
      
      // 最大スタック制限 - Use a reasonable fixed size instead of scaling with memory
      // Large stack sizes cause QuickJS to fail with empty error messages
      this.runtime.setMaxStackSize(1024 * 1024); // 1MB stack is plenty
    } catch (error) {
      throw error;
    }
  }

  async createContext(): Promise<VMExecutionContext> {
    if (!this.quickjs || !this.runtime) {
      throw new Error('Engine not initialized');
    }
    
    const vm = this.runtime.newContext();
    
    // TODO: コンソールサポートは後で追加
    
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
      timeoutId = setTimeout(() => {
      }, options.timeout);
    }
    
    try {
      const result = await context.eval(code);
      const executionTime = performance.now() - startTime;
      
      return {
        value: result,
        executionTime,
        memoryUsed: this.getMemoryUsage().used
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
    // quickjs-emscriptenの新しいAPIでは直接数値を返す場合がある
    if (typeof stats === 'number') {
      return {
        used: stats,
        limit: this.config?.memoryLimit || 0
      };
    }
    // オブジェクトの場合（古いAPI）
    return {
      used: (stats as any).memory_used_size || 0,
      limit: this.config?.memoryLimit || 0,
      external: (stats as any).malloc_size
    };
  }

  async dispose(): Promise<void> {
    // First dispose all active contexts
    for (const context of this.activeContexts) {
      try {
        context.release();
      } catch {
        // Ignore errors during context disposal
      }
    }
    this.activeContexts = [];
    
    // Execute all pending jobs before disposing runtime
    if (this.runtime) {
      let jobCount = 1; // Initialize to non-zero to enter the loop
      while (jobCount > 0) {
        const jobResult = this.runtime.executePendingJobs();
        if ('error' in jobResult && jobResult.error) {
          jobResult.error.dispose();
          jobResult.dispose();
          break; // Exit on error
        }
        jobCount = jobResult.value;
        jobResult.dispose();
      }
      
      // Force garbage collection before disposing if available
      // QuickJSRuntimeではcollectGarbageメソッドを使う
      if ('collectGarbage' in this.runtime && typeof (this.runtime as any).collectGarbage === 'function') {
        (this.runtime as any).collectGarbage();
      }
      
      this.runtime.dispose();
      this.runtime = null;
    }
    this.quickjs = null;
    this.config = null;
  }
}