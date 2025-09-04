export class StringBuffer {
  private buffer: string[];

  constructor(initial: string = '') {
    this.buffer = initial.split('');
  }

  insert(position: number, text: string): void {
    const chars = text.split('');
    this.buffer.splice(position, 0, ...chars);
  }

  delete(position: number, length: number = 1): void {
    this.buffer.splice(position, length);
  }

  toString(): string {
    return this.buffer.join('');
  }

  length(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
  }

  set(value: string): void {
    this.buffer = value.split('');
  }

  substring(start: number, end?: number): string {
    return this.buffer.slice(start, end).join('');
  }
}
