import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { Worker, type WorkerOptions } from 'node:worker_threads';
import prompts, { type PromptObject } from 'prompts';
import type {
  ConsoleProvider,
  ErrorHandler,
  FileSystemProvider,
  PromptsProvider,
  WorkerProvider,
} from '../types/dependency-interfaces';

export class DefaultFileSystemProvider implements FileSystemProvider {
  async readFile(path: string): Promise<string> {
    return fs.readFile(path, 'utf-8');
  }

  async writeFile(path: string, content: string): Promise<void> {
    await fs.writeFile(path, content, 'utf-8');
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}

export class DefaultWorkerProvider implements WorkerProvider {
  constructor(private basePath: string = __dirname) {}

  createWorker(scriptName: string, options?: WorkerOptions): Worker {
    const scriptPath = join(this.basePath, scriptName);
    return new Worker(scriptPath, options);
  }
}

export class DefaultPromptsProvider implements PromptsProvider {
  async prompt(config: unknown): Promise<unknown> {
    return prompts(config as PromptObject | PromptObject[]);
  }
}

export class DefaultConsoleProvider implements ConsoleProvider {
  log(...args: unknown[]): void {
    console.log(...args);
  }

  error(...args: unknown[]): void {
    console.error(...args);
  }

  clear(): void {
    console.clear();
  }
}

export class DefaultErrorHandler implements ErrorHandler {
  constructor(private console: ConsoleProvider = new DefaultConsoleProvider()) {}

  handleError(error: unknown): void {
    this.console.error('[Error]', this.formatError(error));
  }

  formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
