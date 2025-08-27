import type { VMEngine, VMExecutionContext, MemoryInfo } from '../../interfaces/VMEngine';
import type { VMContext, VMOptions, VMResult, VMSandboxConfig } from '@/types/sandbox';
import { VMSandboxSimple } from '../../vm-sandbox-simple';

class IsolatedVMContext implements VMExecutionContext {
  constructor(
    private context: any,
    private jail: any,
    private vmSandbox: VMSandboxSimple
  ) {}

  async setGlobal(name: string, value: unknown): Promise<void> {
    await this.jail.set(name, value);
  }

  async eval(code: string, options?: { filename?: string; timeout?: number }): Promise<unknown> {
    return await this.context.eval(code, options);
  }

  release(): void {
    try {
      this.context.release();
    } catch {
      // Context might be already released
    }
  }
}

export class IsolatedVMEngine implements VMEngine {
  private vmSandbox: VMSandboxSimple | null = null;
  private config: VMSandboxConfig | null = null;
  
  async initialize(config: VMSandboxConfig): Promise<void> {
    this.config = config;
    this.vmSandbox = new VMSandboxSimple(config);
  }

  async createContext(): Promise<VMExecutionContext> {
    throw new Error('IsolatedVMEngine does not support separate context creation. Use execute() directly.');
  }

  async execute(
    context: VMExecutionContext | null,
    code: string,
    bindings: VMContext,
    options: VMOptions
  ): Promise<VMResult> {
    if (!this.vmSandbox) {
      throw new Error('VMEngine not initialized');
    }
    
    // IsolatedVMEngine doesn't use separate contexts, so we ignore the context parameter
    return await this.vmSandbox.execute(code, bindings, options);
  }

  getMemoryUsage(): MemoryInfo {
    // VMSandboxSimple doesn't provide detailed memory info
    return {
      used: 0,
      limit: this.config?.memoryLimit ?? 128,
      external: 0
    };
  }

  async dispose(): Promise<void> {
    if (this.vmSandbox) {
      await this.vmSandbox.dispose();
      this.vmSandbox = null;
    }
  }
}