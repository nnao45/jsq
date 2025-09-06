import type { QuickJSContext, QuickJSRuntime } from 'quickjs-emscripten';
import type { VMSandboxConfig } from '@/types/sandbox.js';
import type { ApplicationContext } from '../application-context.js';
import { QuickJSEngine } from './engines/quickjs/QuickJSEngine';
import type { VMEngine, VMExecutionContext } from './interfaces/VMEngine.js';

interface PooledVM {
  engine: QuickJSEngine;
  runtime: QuickJSRuntime;
  context: QuickJSContext;
  execContext: VMExecutionContext;
  inUse: boolean;
  lastUsed: number;
  useCount: number;
}

export class QuickJSVMPool {
  private pool: PooledVM[] = [];
  private maxPoolSize: number;
  private maxUseCount: number;
  private appContext: ApplicationContext;
  private config: VMSandboxConfig;

  constructor(
    appContext: ApplicationContext,
    config: VMSandboxConfig,
    maxPoolSize = 4,
    maxUseCount = 100
  ) {
    this.appContext = appContext;
    this.config = config;
    this.maxPoolSize = maxPoolSize;
    this.maxUseCount = maxUseCount;
  }

  async acquire(): Promise<{ engine: VMEngine; execContext: VMExecutionContext }> {
    // Try to find an available VM in the pool
    const available = this.pool.find(vm => !vm.inUse && vm.useCount < this.maxUseCount);

    if (available) {
      available.inUse = true;
      available.lastUsed = Date.now();
      available.useCount++;

      // Reset the context before returning
      await this.resetContext(available.context);

      return { engine: available.engine, execContext: available.execContext };
    }

    // If no available VM and pool is not full, create a new one
    if (this.pool.length < this.maxPoolSize) {
      const vm = await this.createNewVM();
      this.pool.push(vm);
      return { engine: vm.engine, execContext: vm.execContext };
    }

    // If pool is full, create a temporary VM that won't be pooled
    const engine = new QuickJSEngine(this.appContext);
    await engine.initialize(this.config);
    const execContext = await engine.createContext();

    return { engine, execContext };
  }

  release(engine: VMEngine): void {
    const pooledVM = this.pool.find(vm => vm.engine === engine);

    if (pooledVM) {
      pooledVM.inUse = false;
      pooledVM.lastUsed = Date.now();

      // If VM has been used too many times, dispose and remove from pool
      if (pooledVM.useCount >= this.maxUseCount) {
        this.disposeVM(pooledVM);
        this.pool = this.pool.filter(vm => vm !== pooledVM);
      }
    } else {
      // This was a temporary VM, dispose it immediately
      engine.dispose();
    }
  }

  private async createNewVM(): Promise<PooledVM> {
    const engine = new QuickJSEngine(this.appContext);
    await engine.initialize(this.config);
    const execContext = await engine.createContext();

    // Get the internal QuickJS runtime and context from the engine
    // We need to access private properties, so we'll use type assertion
    // biome-ignore lint/suspicious/noExplicitAny: Need to access internal QuickJS properties
    const engineInternal = engine as any;
    const runtime = engineInternal.runtime;
    // biome-ignore lint/suspicious/noExplicitAny: Need to access internal QuickJS properties
    const contextInternal = execContext as any;
    const context = contextInternal.vm;

    return {
      engine,
      runtime,
      context,
      execContext,
      inUse: true,
      lastUsed: Date.now(),
      useCount: 1,
    };
  }

  private async resetContext(context: QuickJSContext): Promise<void> {
    // Clear console calls and reset SmartDollar state
    try {
      const clearCode = `
        // Clear console calls
        if (typeof globalThis.__consoleCalls !== 'undefined') {
          globalThis.__consoleCalls = [];
        }
        
        // Clear SmartDollar-related globals explicitly
        // Use a more thorough cleanup approach
        const smartDollarGlobals = [
          'smartDollarModule',
          'createSmartDollar', 
          'SmartDollar',
          '$',
          '_',
          '__objectMethodsOverridden',
          '__result__',
          'smartDollarMethods'
        ];
        
        smartDollarGlobals.forEach(key => {
          try {
            if (typeof globalThis[key] !== 'undefined') {
              delete globalThis[key];
            }
          } catch (e) {
            // Some properties might be non-configurable
            try {
              globalThis[key] = undefined;
            } catch {}
          }
        });
        
        // Reset Object method overrides
        if (typeof Object.__originalKeys !== 'undefined') {
          Object.keys = Object.__originalKeys;
          delete Object.__originalKeys;
        }
        if (typeof Object.__originalValues !== 'undefined') {
          Object.values = Object.__originalValues;
          delete Object.__originalValues;
        }
        if (typeof Object.__originalEntries !== 'undefined') {
          Object.entries = Object.__originalEntries;
          delete Object.__originalEntries;
        }
        
        // Clear any user-defined globals
        const userGlobals = Object.keys(globalThis).filter(key => {
          const builtins = ['Object', 'Function', 'Array', 'String', 'Boolean', 'Number',
            'Date', 'RegExp', 'Error', 'Math', 'JSON', 'Promise', 'Symbol', 'Map', 'Set',
            'WeakMap', 'WeakSet', 'ArrayBuffer', 'DataView', 'Int8Array', 'Uint8Array',
            'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array',
            'Float32Array', 'Float64Array', 'undefined', 'null', 'Infinity', 'NaN',
            'console', 'globalThis', 'eval', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
            'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent'];
          return !builtins.includes(key);
        });
        
        userGlobals.forEach(key => {
          try { 
            delete globalThis[key]; 
          } catch {
            try {
              globalThis[key] = undefined;
            } catch {}
          }
        });
      `;
      const result = context.evalCode(clearCode);
      if ('error' in result && result.error) {
        result.error.dispose();
      } else if ('value' in result && result.value) {
        result.value.dispose();
      }
    } catch {
      // Ignore errors during cleanup
    }

    // Force garbage collection
    try {
      context.runtime.executePendingJobs();
    } catch {
      // Ignore errors
    }
  }

  private disposeVM(vm: PooledVM): void {
    try {
      vm.engine.dispose();
    } catch {
      // Ignore dispose errors
    }
  }

  async dispose(): Promise<void> {
    for (const vm of this.pool) {
      this.disposeVM(vm);
    }
    this.pool = [];
  }

  getPoolStats(): { totalVMs: number; availableVMs: number; inUseVMs: number } {
    const availableVMs = this.pool.filter(vm => !vm.inUse).length;
    const inUseVMs = this.pool.filter(vm => vm.inUse).length;

    return {
      totalVMs: this.pool.length,
      availableVMs,
      inUseVMs,
    };
  }
}
