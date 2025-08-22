export interface VMOptions {
  memoryLimit?: number;
  timeout?: number;
  allowedGlobals?: string[];
  cpuLimit?: number;
  heapSnapshotLimit?: number;
  enableInspector?: boolean;
}

export interface VMContext {
  [key: string]: unknown;
}

export interface VMResult<T = unknown> {
  value: T;
  executionTime: number;
  memoryUsed?: number;
}

export interface SerializedValue {
  type:
    | 'primitive'
    | 'array'
    | 'object'
    | 'function'
    | 'undefined'
    | 'null'
    | 'error'
    | 'date'
    | 'regexp'
    | 'buffer';
  value?: unknown;
  properties?: Record<string, SerializedValue>;
  items?: SerializedValue[];
  functionString?: string;
  errorMessage?: string;
  errorStack?: string;
  date?: string;
  regexp?: { source: string; flags: string };
  buffer?: string;
}

export interface VMSandboxConfig {
  memoryLimit: number;
  timeout: number;
  cpuLimit?: number;
  heapSnapshotLimit?: number;
  enableAsync: boolean;
  enableGenerators: boolean;
  enableProxies: boolean;
  enableSymbols: boolean;
  maxContextSize: number;
  recycleIsolates: boolean;
  isolatePoolSize: number;
}

export interface IsolatePool {
  available: Array<{
    isolate: any;
    lastUsed: number;
    useCount: number;
  }>;
  maxSize: number;
  maxUseCount: number;
  maxAge: number;
}

export interface ExecutionMetrics {
  startTime: number;
  endTime?: number;
  memoryBefore: number;
  memoryAfter?: number;
  cpuTime?: number;
  wallTime?: number;
  success: boolean;
  error?: string;
}

export type TransferableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | TransferableValue[]
  | { [key: string]: TransferableValue }
  | ArrayBuffer
  | Date
  | RegExp;

export interface VMBridge {
  call(name: string, ...args: unknown[]): Promise<unknown>;
  get(name: string): Promise<unknown>;
  set(name: string, value: unknown): Promise<void>;
  has(name: string): Promise<boolean>;
}

export interface SandboxCapabilities {
  console: boolean;
  timers: boolean;
  promises: boolean;
  json: boolean;
  math: boolean;
  date: boolean;
  array: boolean;
  object: boolean;
  string: boolean;
  number: boolean;
  boolean: boolean;
  regexp: boolean;
  error: boolean;
  map: boolean;
  set: boolean;
  weakmap: boolean;
  weakset: boolean;
  proxy: boolean;
  reflect: boolean;
  symbol: boolean;
  bigint: boolean;
  intl: boolean;
  buffer: boolean;
  url: boolean;
  crypto: boolean;
}

export interface SandboxError extends Error {
  code:
    | 'TIMEOUT'
    | 'MEMORY_LIMIT'
    | 'CPU_LIMIT'
    | 'SECURITY_VIOLATION'
    | 'SERIALIZATION_ERROR'
    | 'EXECUTION_ERROR';
  details?: unknown;
}
