import { promises as fs } from 'fs';
import { Worker } from 'worker_threads';
import { join } from 'path';
import prompts from 'prompts';
import { 
  FileSystemProvider, 
  WorkerProvider, 
  PromptsProvider, 
  ConsoleProvider,
  ErrorHandler 
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

  createWorker(scriptName: string, options?: any): Worker {
    const scriptPath = join(this.basePath, scriptName);
    return new Worker(scriptPath, options);
  }
}

export class DefaultPromptsProvider implements PromptsProvider {
  async prompt(config: any): Promise<any> {
    return prompts(config);
  }
}

export class DefaultConsoleProvider implements ConsoleProvider {
  log(...args: any[]): void {
    console.log(...args);
  }

  error(...args: any[]): void {
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