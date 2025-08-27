import type { VMContext, VMOptions, VMResult, VMSandboxConfig } from '../../../types/sandbox';

export interface MemoryInfo {
  used: number;
  limit: number;
  external?: number;
}

export interface EvalOptions {
  filename?: string;
  timeout?: number;
}

export interface SerializedValue {
  type: 'primitive' | 'object' | 'array' | 'function' | 'undefined' | 'null';
  value: unknown;
  metadata?: Record<string, unknown>;
}

export interface VMExecutionContext {
  setGlobal(name: string, value: unknown): Promise<void>;
  eval(code: string, options?: EvalOptions): Promise<unknown>;
  release(): void;
}

export interface ValueMarshaller {
  serialize(value: unknown): SerializedValue;
  deserialize(value: SerializedValue): unknown;
}

export interface VMEngine {
  initialize(config: VMSandboxConfig): Promise<void>;
  createContext(): Promise<VMExecutionContext>;
  execute(
    context: VMExecutionContext,
    code: string,
    bindings: VMContext,
    options: VMOptions
  ): Promise<VMResult>;
  getMemoryUsage(): MemoryInfo;
  dispose(): Promise<void>;
}

export interface VMEngineFactory {
  create(type: 'quickjs'): VMEngine;
}