import { exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';
import * as pty from 'node-pty';

const exec = promisify(execCallback);

export interface ReplTestOptions {
  command: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface ReplTestResult {
  output: string;
  exitCode: number | null;
}

export class ReplTester {
  private pty: pty.IPty | null = null;
  private output: string = '';
  private exitCode: number | null = null;
  private outputPromise: Promise<void>;
  private outputResolve!: () => void;

  constructor(private options: ReplTestOptions) {
    this.outputPromise = new Promise<void>(resolve => {
      this.outputResolve = resolve;
    });
  }

  async start(): Promise<void> {
    const [command, ...args] = this.options.command.split(' ');

    this.pty = pty.spawn(command, args, {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: { ...process.env, ...this.options.env },
    });

    this.pty.onData(data => {
      this.output += data;
    });

    this.pty.onExit(event => {
      this.exitCode = event.exitCode;
      this.outputResolve();
    });
  }

  send(input: string): void {
    if (!this.pty) {
      throw new Error('REPL not started');
    }
    this.pty.write(input);
  }

  sendLine(input: string): void {
    this.send(`${input}\r`);
  }

  sendCtrlC(): void {
    this.send('\x03');
  }

  sendCtrlD(): void {
    this.send('\x04');
  }

  async waitForOutput(pattern: string | RegExp, timeout?: number): Promise<boolean> {
    const startTime = Date.now();
    const maxTimeout = timeout ?? this.options.timeout ?? 5000;

    while (Date.now() - startTime < maxTimeout) {
      if (typeof pattern === 'string') {
        if (this.output.includes(pattern)) {
          return true;
        }
      } else {
        if (pattern.test(this.output)) {
          return true;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Timeout waiting for pattern: ${pattern}`);
    console.log(`Current output: ${this.output}`);
    return false;
  }

  async close(): Promise<ReplTestResult> {
    if (this.pty) {
      this.pty.kill();
      await this.outputPromise;
    }

    return {
      output: this.output,
      exitCode: this.exitCode,
    };
  }

  getOutput(): string {
    return this.output;
  }

  clearOutput(): void {
    this.output = '';
  }
}

export async function buildJsq(): Promise<void> {
  try {
    await exec('npm run build');
    console.log('Build completed successfully');
  } catch (error) {
    throw new Error(`Build failed: ${error}`);
  }
}
