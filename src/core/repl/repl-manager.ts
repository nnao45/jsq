import type { Key } from 'node:readline';
import type { JsqOptions } from '@/types/cli';
import type { ReplIO, ReplOptions } from '@/types/repl';
import { StringBuffer } from './string-buffer';

export interface ReplState {
  data: unknown;
  history: string[];
  historyIndex: number;
  currentInput: StringBuffer;
  cursorPosition: number;
  options: JsqOptions;
  lastDisplayedInput: string;
  lastDisplayedCursorPosition: number;
  lastResult?: unknown;
  hasPreviewLine: boolean;
}

export interface EvaluationResult {
  result?: unknown;
  error?: string;
}

export type EvaluationHandler = (
  expression: string,
  data: unknown,
  options: JsqOptions,
  lastResult?: unknown
) => Promise<EvaluationResult>;

export class ReplManager {
  private state: ReplState;
  private io: ReplIO;
  private evaluationHandler: EvaluationHandler;
  private prompt: string;
  private realTimeEvaluation: boolean;
  private isProcessingInput = false;
  private evaluationDebounceTimer: NodeJS.Timeout | null = null;
  private evaluationDebounceDelay = 300;
  private boundHandleKeypress: (str: string | undefined, key: Key | undefined) => Promise<void>;
  private maxHistorySize = 1000;

  constructor(
    initialData: unknown,
    options: JsqOptions,
    evaluationHandler: EvaluationHandler,
    replOptions?: ReplOptions
  ) {
    this.state = {
      data: initialData,
      history: [],
      historyIndex: 0,
      currentInput: new StringBuffer(),
      cursorPosition: 0,
      options,
      lastDisplayedInput: '',
      lastDisplayedCursorPosition: 0,
      lastResult: undefined,
      hasPreviewLine: false,
    };

    this.evaluationHandler = evaluationHandler;
    this.prompt = replOptions?.prompt || '> ';
    this.realTimeEvaluation = replOptions?.realTimeEvaluation ?? false;
    this.boundHandleKeypress = this.handleKeypress.bind(this);

    if (replOptions?.io) {
      this.io = replOptions.io;
    } else {
      this.io = this.createDefaultIO();
    }
  }

  private createDefaultIO(): ReplIO {
    const readline = require('node:readline');
    return {
      input: process.stdin,
      output: {
        write: (data: string) => process.stdout.write(data),
        clearLine: (direction: -1 | 0 | 1) => readline.clearLine(process.stdout, direction),
        cursorTo: (x: number) => readline.cursorTo(process.stdout, x),
      },
    };
  }

  start(): void {
    this.setupKeypressHandler();
    this.displayWelcomeMessage();
  }

  stop(): void {
    this.io.input.off('keypress', this.boundHandleKeypress);
    if (this.evaluationDebounceTimer) {
      clearTimeout(this.evaluationDebounceTimer);
    }
  }

  private displayWelcomeMessage(): void {
    this.io.output.write(`jsq REPL - Interactive JSON Query Tool\n`);
    this.io.output.write(`Type expressions to query the data. Press Ctrl+C to exit.\n`);
    this.io.output.write(`\n${this.prompt}`);
    this.state.lastDisplayedInput = '';
    this.state.lastDisplayedCursorPosition = 0;
  }

  private setupKeypressHandler(): void {
    this.io.input.on('keypress', this.boundHandleKeypress);
  }

  private async handleKeypress(str: string | undefined, key: Key | undefined): Promise<void> {
    if (this.isProcessingInput) return;

    this.isProcessingInput = true;
    try {
      if (key?.ctrl) {
        await this.handleControlKey(key);
      } else if (key) {
        await this.handleSpecialKey(key);
      } else if (str) {
        await this.handleCharacterInput(str);
      }
    } finally {
      this.isProcessingInput = false;
    }
  }

  private async handleControlKey(key: Key): Promise<void> {
    switch (key.name) {
      case 'c':
        this.handleCtrlC();
        break;
      case 'd':
        this.handleCtrlD();
        break;
      case 'l':
        this.handleCtrlL();
        break;
      case 'a':
        this.moveCursorToStart();
        break;
      case 'e':
        this.moveCursorToEnd();
        break;
      case 'k':
        this.deleteToEnd();
        break;
      case 'u':
        this.deleteToStart();
        break;
      case 'w':
        this.deleteWord();
        break;
    }
  }

  private async handleSpecialKey(key: Key): Promise<void> {
    switch (key.name) {
      case 'return':
        await this.handleEnter();
        break;
      case 'backspace':
        this.handleBackspace();
        break;
      case 'delete':
        this.handleDelete();
        break;
      case 'left':
        this.moveCursorLeft();
        break;
      case 'right':
        this.moveCursorRight();
        break;
      case 'up':
        this.navigateHistoryUp();
        break;
      case 'down':
        this.navigateHistoryDown();
        break;
      case 'home':
        this.moveCursorToStart();
        break;
      case 'end':
        this.moveCursorToEnd();
        break;
    }
  }

  private async handleCharacterInput(char: string): Promise<void> {
    this.state.currentInput.insert(this.state.cursorPosition, char);
    this.state.cursorPosition += char.length;
    this.updateDisplay();

    if (this.realTimeEvaluation && this.state.currentInput.toString().trim()) {
      this.scheduleRealTimeEvaluation();
    }
  }

  private handleCtrlC(): void {
    // プレビューをクリア
    this.clearPreviewLine();

    this.io.output.write('\n');
    if (this.state.currentInput.length() > 0) {
      this.state.currentInput.clear();
      this.state.cursorPosition = 0;
      this.io.output.write(this.prompt);
      this.state.lastDisplayedInput = '';
      this.state.lastDisplayedCursorPosition = 0;
    } else {
      throw new Error('SIGINT');
    }
  }

  private handleCtrlD(): void {
    if (this.state.currentInput.length() === 0) {
      this.io.output.write('\n');
      throw new Error('EOF');
    }
  }

  private handleCtrlL(): void {
    this.io.output.write('\x1bc');
    this.state.lastDisplayedInput = '';
    this.state.lastDisplayedCursorPosition = -1;
    this.state.hasPreviewLine = false; // プレビューフラグもリセット
    this.updateDisplay();
  }

  private async handleEnter(): Promise<void> {
    // プレビューをクリア
    this.clearPreviewLine();

    const input = this.state.currentInput.toString().trim();
    if (!input) {
      this.io.output.write(`\n${this.prompt}`);
      this.state.lastDisplayedInput = '';
      this.state.lastDisplayedCursorPosition = 0;
      return;
    }

    this.addToHistory(this.state.currentInput.toString());

    const result = await this.evaluationHandler(
      input,
      this.state.data,
      this.state.options,
      this.state.lastResult
    );

    this.io.output.clearLine(0);
    this.io.output.cursorTo(0);
    this.io.output.write(`${this.prompt + this.state.currentInput.toString()}\n`);

    if (result.error) {
      this.io.output.write(`Error: ${result.error}\n`);
      this.state.lastResult = undefined;
    } else {
      const output =
        result.result === undefined ? 'undefined' : JSON.stringify(result.result, null);
      this.io.output.write(`${output}\n`);
      this.state.lastResult = result.result;
    }

    this.state.currentInput.clear();
    this.state.cursorPosition = 0;
    this.state.lastDisplayedInput = '';
    this.state.lastDisplayedCursorPosition = 0;
    this.io.output.write(this.prompt);
  }

  private addToHistory(input: string): void {
    this.state.history.push(input);

    if (this.state.history.length > this.maxHistorySize) {
      this.state.history = this.state.history.slice(-this.maxHistorySize);
    }

    this.state.historyIndex = this.state.history.length;
  }

  private handleBackspace(): void {
    if (this.state.cursorPosition > 0) {
      this.state.currentInput.delete(this.state.cursorPosition - 1);
      this.state.cursorPosition--;
      this.updateDisplay();

      // 入力が空になった場合、リアルタイム評価を再実行
      if (this.realTimeEvaluation && this.state.currentInput.toString().trim() === '') {
        this.scheduleRealTimeEvaluation();
      }
    }
  }

  private handleDelete(): void {
    if (this.state.cursorPosition < this.state.currentInput.length()) {
      this.state.currentInput.delete(this.state.cursorPosition);
      this.updateDisplay();

      // 入力が空になった場合、リアルタイム評価を再実行
      if (this.realTimeEvaluation && this.state.currentInput.toString().trim() === '') {
        this.scheduleRealTimeEvaluation();
      }
    }
  }

  private moveCursorLeft(): void {
    if (this.state.cursorPosition > 0) {
      this.state.cursorPosition--;
      this.updateDisplay();
    }
  }

  private moveCursorRight(): void {
    if (this.state.cursorPosition < this.state.currentInput.length()) {
      this.state.cursorPosition++;
      this.updateDisplay();
    }
  }

  private moveCursorToStart(): void {
    this.state.cursorPosition = 0;
    this.updateDisplay();
  }

  private moveCursorToEnd(): void {
    this.state.cursorPosition = this.state.currentInput.length();
    this.updateDisplay();
  }

  private deleteToEnd(): void {
    const currentLength = this.state.currentInput.length();
    if (this.state.cursorPosition < currentLength) {
      this.state.currentInput.delete(
        this.state.cursorPosition,
        currentLength - this.state.cursorPosition
      );
      this.updateDisplay();
    }
  }

  private deleteToStart(): void {
    if (this.state.cursorPosition > 0) {
      const afterCursor = this.state.currentInput.substring(this.state.cursorPosition);
      this.state.currentInput.clear();
      this.state.currentInput.insert(0, afterCursor);
      this.state.cursorPosition = 0;
      this.updateDisplay();

      // 入力が空になった場合、リアルタイム評価を再実行
      if (this.realTimeEvaluation && this.state.currentInput.toString().trim() === '') {
        this.scheduleRealTimeEvaluation();
      }
    }
  }

  private deleteWord(): void {
    const currentText = this.state.currentInput.toString();
    const beforeCursor = currentText.substring(0, this.state.cursorPosition);
    const afterCursor = currentText.substring(this.state.cursorPosition);
    const trimmedBeforeCursor = beforeCursor.trimEnd();
    const lastSpaceIndex = trimmedBeforeCursor.lastIndexOf(' ');

    if (lastSpaceIndex >= 0) {
      const newText = beforeCursor.substring(0, lastSpaceIndex + 1) + afterCursor;
      this.state.currentInput.set(newText);
      this.state.cursorPosition = lastSpaceIndex + 1;
    } else {
      this.state.currentInput.set(afterCursor);
      this.state.cursorPosition = 0;
    }
    this.updateDisplay();

    // 入力が空になった場合、リアルタイム評価を再実行
    if (this.realTimeEvaluation && this.state.currentInput.toString().trim() === '') {
      this.scheduleRealTimeEvaluation();
    }
  }

  private navigateHistoryUp(): void {
    if (this.state.historyIndex > 0) {
      // プレビューをクリア
      this.clearPreviewLine();

      this.state.historyIndex--;
      this.state.currentInput.set(this.state.history[this.state.historyIndex] || '');
      this.state.cursorPosition = this.state.currentInput.length();
      this.updateDisplay();

      // 新しい入力でリアルタイム評価を実行
      if (this.realTimeEvaluation && this.state.currentInput.toString().trim()) {
        this.scheduleRealTimeEvaluation();
      }
    }
  }

  private navigateHistoryDown(): void {
    if (this.state.historyIndex < this.state.history.length - 1) {
      // プレビューをクリア
      this.clearPreviewLine();

      this.state.historyIndex++;
      this.state.currentInput.set(this.state.history[this.state.historyIndex] || '');
      this.state.cursorPosition = this.state.currentInput.length();
      this.updateDisplay();

      // 新しい入力でリアルタイム評価を実行
      if (this.realTimeEvaluation && this.state.currentInput.toString().trim()) {
        this.scheduleRealTimeEvaluation();
      }
    } else if (this.state.historyIndex === this.state.history.length - 1) {
      // プレビューをクリア
      this.clearPreviewLine();

      this.state.historyIndex = this.state.history.length;
      this.state.currentInput.clear();
      this.state.cursorPosition = 0;
      this.updateDisplay();
    }
  }

  private updateDisplay(): void {
    const currentText = this.state.currentInput.toString();
    const needsFullRedraw = currentText !== this.state.lastDisplayedInput;

    if (needsFullRedraw) {
      this.io.output.clearLine(0);
      this.io.output.cursorTo(0);
      this.io.output.write(this.prompt + currentText);
      this.state.lastDisplayedInput = currentText;
    }

    if (this.state.cursorPosition !== this.state.lastDisplayedCursorPosition || needsFullRedraw) {
      this.io.output.cursorTo(this.prompt.length + this.state.cursorPosition);
      this.state.lastDisplayedCursorPosition = this.state.cursorPosition;
    }
  }

  private clearPreviewLine(): void {
    if (this.state.hasPreviewLine) {
      const savedPosition = this.state.cursorPosition;
      // 下の行に移動
      this.io.output.write('\n');
      // その行をクリア
      this.io.output.clearLine(0);
      this.io.output.cursorTo(0);
      // 元の行に戻る
      this.io.output.write('\x1b[A');
      // カーソル位置を復元
      this.io.output.cursorTo(this.prompt.length + savedPosition);
      this.state.hasPreviewLine = false;
    }
  }

  private scheduleRealTimeEvaluation(): void {
    if (this.evaluationDebounceTimer) {
      clearTimeout(this.evaluationDebounceTimer);
    }

    this.evaluationDebounceTimer = setTimeout(() => {
      this.evaluateInRealTime();
    }, this.evaluationDebounceDelay);
  }

  private async evaluateInRealTime(): Promise<void> {
    const currentText = this.state.currentInput.toString().trim();

    // 既存のプレビューをクリア
    this.clearPreviewLine();

    // 入力が空の場合は何も表示しない
    if (!currentText) {
      return;
    }

    const result = await this.evaluationHandler(
      currentText,
      this.state.data,
      this.state.options,
      this.state.lastResult
    );

    if (!result.error && result.result !== undefined) {
      const preview = JSON.stringify(result.result);
      const maxLength = 50;
      const truncated =
        preview.length > maxLength ? `${preview.substring(0, maxLength)}...` : preview;

      const savedPosition = this.state.cursorPosition;
      this.io.output.write('\n');
      this.io.output.clearLine(0);
      this.io.output.write(`Preview: ${truncated}`);
      this.io.output.cursorTo(0);
      this.io.output.write('\x1b[A');
      this.io.output.cursorTo(this.prompt.length + savedPosition);
      this.state.hasPreviewLine = true;
    }
  }

  getCurrentInput(): string {
    return this.state.currentInput.toString();
  }

  getCursorPosition(): number {
    return this.state.cursorPosition;
  }

  getHistory(): string[] {
    return [...this.state.history];
  }
}
