export interface JsqOptions {
  debug?: boolean;
  watch?: string;
  stream?: boolean;
  batch?: string;
  use?: string | string[];
  types?: string;
  schema?: string;
  output?: string;
  format?: 'json' | 'pretty' | 'csv' | 'yaml';
  verbose?: boolean;
  unsafe?: boolean;
}

export interface JsqConfig {
  expression?: string;
  options: JsqOptions;
  input?: string;
}

export type OutputFormat = 'json' | 'pretty' | 'csv' | 'yaml';

export interface ProcessingResult {
  data: unknown;
  metadata?: {
    processingTime: number;
    inputSize: number;
    outputSize: number;
    steps?: string[];
  };
}

export interface LibraryConfig {
  name: string;
  version?: string;
  exports?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
    value?: unknown;
  }>;
}

export interface LibraryInfo {
  name: string;
  version: string;
  path: string;
  exports: Record<string, unknown>;
  cached: boolean;
  installedAt: Date;
}

export interface LibraryCache {
  libraries: Map<string, LibraryInfo>;
  cacheDir: string;
}

export interface VMExecutionContext {
  unsafe: boolean;
  timeout?: number;
  memoryLimit?: number;
}