import type { Worker } from 'node:worker_threads';

export interface FileSystemProvider {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

export interface WorkerProvider {
  createWorker(scriptPath: string, options?: any): Worker;
}

export interface PromptsProvider {
  prompt(config: any): Promise<any>;
}

export interface ConsoleProvider {
  log(...args: any[]): void;
  error(...args: any[]): void;
  clear(): void;
}

export interface ErrorHandler {
  handleError(error: unknown): void;
  formatError(error: unknown): string;
}
