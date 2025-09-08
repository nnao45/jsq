import type { OutputProvider } from '@/types/repl';

export class MockOutputProvider implements OutputProvider {
  private output: string[] = [];
  private currentLine = '';
  private cursorX = 0;
  private methodCalls: Map<string, unknown[][]> = new Map();

  write(data: string): void {
    const lines = data.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (i === 0) {
        this.currentLine =
          this.currentLine.slice(0, this.cursorX) +
          lines[i] +
          this.currentLine.slice(this.cursorX + lines[i].length);
        this.cursorX += lines[i].length;
      } else {
        this.output.push(this.currentLine);
        this.currentLine = lines[i];
        this.cursorX = lines[i].length;
      }
    }
  }

  clearLine(_direction: -1 | 0 | 1): void {
    this.currentLine = '';
    this.cursorX = 0;
  }

  cursorTo(x: number): void {
    this.cursorX = Math.max(0, Math.min(x, this.currentLine.length));
  }

  getOutput(): string[] {
    return [...this.output];
  }

  getCurrentLine(): string {
    return this.currentLine;
  }

  getCursorPosition(): number {
    return this.cursorX;
  }

  getAllOutput(): string {
    const allLines = [...this.output];
    if (this.currentLine) {
      allLines.push(this.currentLine);
    }
    return allLines.join('\n');
  }

  clear(): void {
    this.recordMethodCall('clear', []);
    this.output = [];
    this.currentLine = '';
    this.cursorX = 0;
  }

  getMethodCalls(methodName: string): unknown[][] {
    return this.methodCalls.get(methodName) || [];
  }

  getHistory(): string[] {
    return this.getAllOutput().split('\n').filter(line => line.trim() !== '');
  }

  private recordMethodCall(methodName: string, args: unknown[]): void {
    if (!this.methodCalls.has(methodName)) {
      this.methodCalls.set(methodName, []);
    }
    this.methodCalls.get(methodName)?.push(args);
  }
}
