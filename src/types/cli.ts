export interface JsqOptions {
  watch?: boolean;
  stream?: boolean;
  batch?: string | number;
  parallel?: boolean | string | number;
  types?: string;
  schema?: string;
  output?: string;
  format?: 'json' | 'pretty' | 'csv' | 'yaml';
  verbose?: boolean;
  unsafe?: boolean;
  file?: string;
  fileFormat?: 'json' | 'jsonl' | 'csv' | 'tsv' | 'parquet' | 'auto';
  memoryLimit?: string | number;
  cpuLimit?: string | number;
  oneline?: boolean;
  noColor?: boolean;
  indent?: string | number;
  compact?: boolean;
  stdinData?: string;
  replFileMode?: boolean;
  readline?: boolean;
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

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
    value?: unknown;
  }>;
}
