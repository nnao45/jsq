import type { Worker } from 'node:worker_threads';
import type {
  ConsoleProvider,
  ErrorHandler,
  FileSystemProvider,
  PromptsProvider,
  WorkerProvider,
} from '../types/dependency-interfaces';

export class MockFileSystemProvider implements FileSystemProvider {
  private files = new Map<string, string>();

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (!content) {
      const error = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  // Test helpers
  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  clear(): void {
    this.files.clear();
  }
}

export class MockWorkerProvider implements WorkerProvider {
  public createdWorkers: Array<{ scriptPath: string; options?: unknown }> = [];

  createWorker(scriptPath: string, options?: unknown): Worker {
    this.createdWorkers.push({ scriptPath, options });
    // Return a mock worker for testing
    return {} as Worker;
  }
}

export class MockPromptsProvider implements PromptsProvider {
  private responses: unknown[] = [];
  private currentIndex = 0;
  public promptCalls: unknown[] = [];

  setResponses(...responses: unknown[]): void {
    this.responses = responses;
    this.currentIndex = 0;
  }

  async prompt(config: unknown): Promise<unknown> {
    this.promptCalls.push(config);
    if (this.currentIndex < this.responses.length) {
      return this.responses[this.currentIndex++];
    }
    return null;
  }

  reset(): void {
    this.responses = [];
    this.currentIndex = 0;
    this.promptCalls = [];
  }
}

export class MockConsoleProvider implements ConsoleProvider {
  public logs: unknown[][] = [];
  public errors: unknown[][] = [];
  public clearCalls = 0;

  log(...args: unknown[]): void {
    this.logs.push(args);
  }

  error(...args: unknown[]): void {
    this.errors.push(args);
  }

  clear(): void {
    this.clearCalls++;
  }

  reset(): void {
    this.logs = [];
    this.errors = [];
    this.clearCalls = 0;
  }
}

export class MockErrorHandler implements ErrorHandler {
  public handledErrors: unknown[] = [];
  public formattedErrors: string[] = [];

  handleError(error: unknown): void {
    this.handledErrors.push(error);
  }

  formatError(error: unknown): string {
    const formatted = error instanceof Error ? error.message : String(error);
    this.formattedErrors.push(formatted);
    return formatted;
  }

  reset(): void {
    this.handledErrors = [];
    this.formattedErrors = [];
  }
}

export class MockInputProvider {
  private events: Map<string, Array<(...args: unknown[]) => void>> = new Map();
  public isPaused = false;

  on(event: string, callback: (...args: unknown[]) => void): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(callback);
    return this;
  }

  off(event: string, callback: (...args: unknown[]) => void): this {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        cb(...args);
      });
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  get isTTY(): boolean {
    return true;
  }

  setRawMode(_mode: boolean): this {
    return this;
  }
}

export class MockOutputProvider {
  public output: string[] = [];

  write(data: string): void {
    this.output.push(data);
  }

  clearLine(_direction: -1 | 0 | 1): void {
    // Mock implementation
  }

  cursorTo(_x: number): void {
    // Mock implementation
  }

  clear(): void {
    this.output = [];
  }

  getOutput(): string {
    return this.output.join('');
  }
}
