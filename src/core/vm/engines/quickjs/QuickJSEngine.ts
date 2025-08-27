import { 
  type QuickJSContext, 
  QuickJSHandle, 
  type QuickJSRuntime, 
  type QuickJSWASMModule,
  VmCallResult,
  getQuickJS
} from 'quickjs-emscripten';
import type {
  VMEngine,
  VMExecutionContext,
  MemoryInfo,
  ValueMarshaller,
  SerializedValue,
  EvalOptions
} from '../../interfaces/VMEngine';
import type { VMContext, VMOptions, VMResult, VMSandboxConfig } from '../../../../types/sandbox';
import { QuickJSMarshaller } from './QuickJSMarshaller';

export class QuickJSExecutionContext implements VMExecutionContext {
  private handles: QuickJSHandle[] = [];
  
  constructor(
    private vm: QuickJSContext,
    private marshaller: ValueMarshaller
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
      
      if ('error' in result) {
        const errorMsg = this.vm.dump(result.error);
        result.error.dispose();
        jsonHandle.dispose();
        nameHandle.dispose();
        throw new Error(`Failed to parse JSON for global ${name}: ${errorMsg}`);
      }
      
      // Set the parsed value as global property
      this.vm.setProp(globalHandle, name, result.value);
      
      // Clean up handles
      result.value.dispose();
      jsonHandle.dispose();
      nameHandle.dispose();
    } catch (error) {
      console.error(`Failed to set global ${name}:`, error);
      throw error;
    }
  }

  async eval(code: string, options?: EvalOptions): Promise<unknown> {
    try {
      const result = this.vm.evalCode(code, options?.filename);

      if ('error' in result) {
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
          console.error('Failed to get error type:', e);
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
            const msgProp = this.vm.getProp(result.error, 'message');
            if (this.vm.typeof(msgProp) === 'string') {
              errorMsg = this.vm.getString(msgProp);
            }
            msgProp.dispose();
          } catch (e2) {
            console.error('Failed to get error message:', e2);
          }
        }
        
        // Dispose the error handle
        result.error.dispose();
        
        // Include code snippet for debugging
        const codeSnippet = code.length > 100 ? code.substring(0, 100) + '...' : code;
        throw new Error(`${errorType}: ${errorMsg}\nCode: ${codeSnippet}${errorDetails ? '\nStack: ' + errorDetails : ''}`);
      }
      
      const value = this.vm.dump(result.value);
      result.value.dispose();
      return value;
    } catch (error) {
      console.error('QuickJS eval failed with code:', code);
      throw error;
    }
  }

  release(): void {
    this.vm.dispose();
  }
}

// Singleton to manage QuickJS instances
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
        this.quickjs = await getQuickJS();
        this.initialized = true;
      } catch (error) {
        // Cache the error so we don't retry
        if (error instanceof Error) {
          if (error.message.includes('dynamic import callback') || 
              error.message.includes('experimental-vm-modules') ||
              (error as any).code === 'ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG') {
            this.initError = new Error(
              'QuickJS cannot be initialized in the current environment. ' +
              'Jest tests require --experimental-vm-modules flag. ' +
              'Use JSQ_VM_ENGINE=isolated-vm for tests or run with NODE_OPTIONS=--experimental-vm-modules'
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

  async initialize(config: VMSandboxConfig): Promise<void> {
    this.config = config;
    try {
      // Use shared singleton to avoid dynamic import issues in Jest
      const manager = QuickJSManager.getInstance();
      this.quickjs = await manager.getQuickJS();
      this.runtime = this.quickjs.newRuntime();
      
      // メモリ制限を設定
      if (config.memoryLimit) {
        this.runtime.setMemoryLimit(config.memoryLimit);
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
    
    return new QuickJSExecutionContext(vm, this.marshaller);
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
    return {
      used: stats.memory_used_size,
      limit: this.config?.memoryLimit || 0,
      external: stats.malloc_size
    };
  }

  async dispose(): Promise<void> {
    if (this.runtime) {
      this.runtime.dispose();
      this.runtime = null;
    }
    this.quickjs = null;
    this.config = null;
  }
}