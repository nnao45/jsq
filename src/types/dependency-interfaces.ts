import type { Worker, WorkerOptions } from 'node:worker_threads';

export interface FileSystemProvider {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

export interface WorkerProvider {
  createWorker(scriptPath: string, options?: WorkerOptions): Worker;
}

export interface PromptsProvider {
  prompt(config: unknown): Promise<unknown>;
}

export interface ConsoleProvider {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  clear(): void;
}

export interface ErrorHandler {
  handleError(error: unknown): void;
  formatError(error: unknown): string;
}
