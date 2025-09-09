import type { Key } from 'node:readline';

export interface KeypressEvent {
  str: string | undefined;
  key: Key | undefined;
}

export interface InputProvider {
  on(event: 'keypress', listener: (str: string | undefined, key: Key | undefined) => void): void;
  off(event: 'keypress', listener: (str: string | undefined, key: Key | undefined) => void): void;
  setRawMode?(enabled: boolean): void;
  isTTY?: boolean;
}

export interface OutputProvider {
  write(data: string): void;
  clearLine(direction: -1 | 0 | 1): void;
  cursorTo(x: number): void;
}

export interface ReplIO {
  input: InputProvider;
  output: OutputProvider;
}

export interface ReplOptions {
  prompt?: string;
  realTimeEvaluation?: boolean;
  io?: ReplIO;
  exitOnDoubleCtrlC?: boolean;
  keypressDebounceDelay?: number;
}
