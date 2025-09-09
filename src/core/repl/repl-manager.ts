import type { Key } from 'node:readline';
import type { JsqOptions } from '@/types/cli';
import type { ReplIO, ReplOptions } from '@/types/repl';
import { OutputFormatter } from '@/utils/output-formatter';
import { debounce, type DebouncedFunction } from '@/utils/debounce';
import { AutocompleteEngine, type CompletionContext } from './autocomplete-engine';
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
  completions: string[];
  completionIndex: number;
  isCompleting: boolean;
  completionStart: number;
  completionEnd: number;
  originalInput?: string;
  originalCursorPosition: number;
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
  private exitOnDoubleCtrlC: boolean;
  private isProcessingInput = false;
  private boundHandleKeypress: (str: string | undefined, key: Key | undefined) => Promise<void>;
  private debouncedHandleKeypress: DebouncedFunction<() => Promise<void>>;
  private keypressQueue: Array<{ str: string | undefined; key: Key | undefined }> = [];
  private maxHistorySize = 1000;
  private realTimeEvalTimer?: NodeJS.Timeout;
  private isEvaluating = false;
  private autocompleteEngine: AutocompleteEngine;
  private keypressDebounceDelay: number;

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
      completions: [],
      completionIndex: 0,
      isCompleting: false,
      completionStart: 0,
      completionEnd: 0,
      originalInput: undefined,
      originalCursorPosition: 0,
    };

    this.evaluationHandler = evaluationHandler;
    this.prompt = replOptions?.prompt || '> ';
    this.realTimeEvaluation = replOptions?.realTimeEvaluation ?? false;
    this.exitOnDoubleCtrlC = replOptions?.exitOnDoubleCtrlC ?? true;
    this.keypressDebounceDelay = replOptions?.keypressDebounceDelay ?? 10;
    this.boundHandleKeypress = this.handleKeypress.bind(this);
    this.debouncedHandleKeypress = debounce(
      this.processKeypressQueue.bind(this),
      this.keypressDebounceDelay
    );
    this.autocompleteEngine = new AutocompleteEngine();

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
    if (this.realTimeEvalTimer) {
      clearTimeout(this.realTimeEvalTimer);
    }
    this.debouncedHandleKeypress.cancel();
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
    // デバウンスが無効（0ms）の場合は即座に処理
    if (this.keypressDebounceDelay === 0) {
      await this.handleKeypressDebounced(str, key);
      return;
    }
    
    // 特定のキー（Enter、Ctrl+Cなど）は即座に処理
    const immediateKeys = ['return', 'escape'];
    const isImmediate = key?.ctrl || (key?.name && immediateKeys.includes(key.name));
    
    if (isImmediate) {
      // 即座に処理するキーの場合、キューを処理してから実行
      this.debouncedHandleKeypress.cancel();
      await this.processKeypressQueue();
      await this.handleKeypressDebounced(str, key);
    } else {
      // キューに追加してデバウンス処理
      this.keypressQueue.push({ str, key });
      this.debouncedHandleKeypress();
    }
  }

  private async processKeypressQueue(): Promise<void> {
    const queue = [...this.keypressQueue];
    this.keypressQueue = [];
    
    for (const { str, key } of queue) {
      await this.handleKeypressDebounced(str, key);
    }
  }

  private async handleKeypressDebounced(str: string | undefined, key: Key | undefined): Promise<void> {
    if (this.isProcessingInput) return;

    this.isProcessingInput = true;
    try {
      if (key?.ctrl) {
        await this.handleControlKey(key);
      } else if (
        key?.name &&
        [
          'return',
          'backspace',
          'delete',
          'left',
          'right',
          'up',
          'down',
          'home',
          'end',
          'tab',
          'escape',
        ].includes(key.name)
      ) {
        await this.handleSpecialKey(key);
      } else if (str) {
        // Check for newline characters
        if (str === '\r' || str === '\n') {
          await this.handleEnter();
        } else {
          // Normal character input
          await this.handleCharacterInput(str);
        }
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
      case 'tab':
        this.handleTab()
        break;
      case 'escape':
        this.cancelCompletion();
        break;
    }
  }

  private async handleCharacterInput(char: string): Promise<void> {
    // 文字入力時は補完をキャンセル
    if (this.state.isCompleting) {
      this.cancelCompletion();
    }

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
      // グレースフルに終了
      this.stop();
      if (this.exitOnDoubleCtrlC) {
        process.exit(0);
      }
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

    let result: EvaluationResult;
    try {
      result = await this.evaluationHandler(
        input,
        this.state.data,
        this.state.options,
        this.state.lastResult
      );
    } catch (error) {
      result = { error: error instanceof Error ? error.message : String(error) };
    }

    this.io.output.clearLine(0);
    this.io.output.cursorTo(0);
    this.io.output.write(`${this.prompt + this.state.currentInput.toString()}\n`);

    if (result.error) {
      this.io.output.write(`Error: ${result.error}\n`);
      this.state.lastResult = undefined;
    } else {
      const output = OutputFormatter.format(result.result, {
        ...this.state.options,
        isReplMode: true,
        oneline: true,
      });
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

      // リアルタイム評価を実行
      if (this.realTimeEvaluation) {
        this.scheduleRealTimeEvaluation();
      }
    }
  }

  private handleDelete(): void {
    if (this.state.cursorPosition < this.state.currentInput.length()) {
      this.state.currentInput.delete(this.state.cursorPosition);
      this.updateDisplay();

      // リアルタイム評価を実行
      if (this.realTimeEvaluation) {
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

      // リアルタイム評価を実行
      if (this.realTimeEvaluation) {
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

  private scheduleRealTimeEvaluation(): void {
    // Cancel any pending evaluation
    if (this.realTimeEvalTimer) {
      clearTimeout(this.realTimeEvalTimer);
    }

    // Schedule new evaluation with debouncing
    this.realTimeEvalTimer = setTimeout(() => {
      this.evaluateInRealTime();
    }, 100); // 100ms debounce
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

  private async evaluateInRealTime(): Promise<void> {
    // Prevent concurrent evaluations
    if (this.isEvaluating) {
      return;
    }

    const currentText = this.state.currentInput.toString().trim();

    // 既存のプレビューをクリア
    this.clearPreviewLine();

    if (!currentText) {
      return;
    }

    this.isEvaluating = true;
    try {
      const result = await this.evaluationHandler(
        currentText,
        this.state.data,
        this.state.options,
        this.state.lastResult
      );

      // 結果を表示（エラーは表示しない）
      if (!result.error && result.result !== undefined) {
        const output = OutputFormatter.format(result.result, {
          ...this.state.options,
          isReplMode: true,
          oneline: true,
        });

        // 現在のカーソル位置を保存
        const savedPosition = this.state.cursorPosition;

        // 次の行に結果を表示
        this.io.output.write('\n');
        this.io.output.clearLine(0);
        this.io.output.write(`→ ${output}`);

        // 元の行に戻る
        this.io.output.write('\x1b[A');
        this.io.output.cursorTo(this.prompt.length + savedPosition);

        this.state.hasPreviewLine = true;
      }
    } finally {
      this.isEvaluating = false;
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

  private handleTab(): void {
    // 補完情報をクリア
    if (this.state.hasPreviewLine) {
      this.clearPreviewLine();
    }

    if (this.state.isCompleting && this.state.completions.length > 0) {
      // 既に補完中なら次の候補に移動
      this.cycleCompletion()
    } else {
      // 新しい補完を開始
      this.startCompletion();
    }
  }

  private startCompletion(): void {
    const input = this.state.currentInput.toString();
    const cursorPos = this.state.cursorPosition;

    const context: CompletionContext = {
      input,
      cursorPosition: cursorPos,
      currentData: this.state.data,
      previousExpression: this.state.lastResult !== undefined ? '$' : undefined,
    };

    const result = this.autocompleteEngine.getSuggestions(context);

    if (result.completions.length === 0) {
      // 補完候補がない場合は何もしない
      return;
    }

    this.state.completions = result.completions;
    this.state.completionIndex = 0;
    this.state.isCompleting = true;
    this.state.completionStart = result.replaceStart;
    this.state.completionEnd = result.replaceEnd;
    this.state.originalInput = undefined; // 新しい補完セッションの開始時にリセット

    // 最初の補完候補を適用
    this.applyCompletion();
  }

  private cycleCompletion(): void {
    if (!this.state.isCompleting || this.state.completions.length === 0) {
      return;
    }

    // 次の補完候補に移動（循環）
    this.state.completionIndex = (this.state.completionIndex + 1) % this.state.completions.length;

    // 初回のTab押下時の状態を保持するため、indexを0にリセットしてからapplyCompletionを呼ぶ
    if (this.state.completionIndex === 0) {
      this.state.originalInput = undefined;
    }

    this.applyCompletion();
  }

  private applyCompletion(): void {
    if (!this.state.isCompleting || this.state.completions.length === 0) {
      return;
    }

    const completion = this.state.completions[this.state.completionIndex];
    const input = this.state.currentInput.toString();

    // 元の入力を保存（初回のTab押下時のみ）
    if (this.state.completionIndex === 0 && !this.state.originalInput) {
      this.state.originalInput = input;
      this.state.originalCursorPosition = this.state.cursorPosition;
    }

    // 元の入力に基づいて補完を適用
    const baseInput = this.state.originalInput || input;
    const beforeCompletion = baseInput.slice(0, this.state.completionStart);
    const afterCompletion = baseInput.slice(this.state.completionEnd);

    // 補完候補を適用して新しい入力を構築
    const newInput = beforeCompletion + completion + afterCompletion;

    // バッファを更新
    this.state.currentInput.clear();
    this.state.currentInput.insert(0, newInput);

    // カーソルを補完後の位置に移動
    this.state.cursorPosition = this.state.completionStart + completion.length;

    // 補完候補の表示を更新
    this.updateDisplay();

    // 複数の候補がある場合は、補完情報を表示
    if (this.state.completions.length > 1) {
      this.displayCompletionInfo();
    }

    // タブ補完後にリアルタイム評価を実行
    if (this.realTimeEvaluation) {
      setTimeout(() => this.scheduleRealTimeEvaluation(), 1000);
    }
  }

  private displayCompletionInfo(): void {
    const current = this.state.completionIndex + 1;
    const total = this.state.completions.length;
    const info = `[${current}/${total}]`;

    // 現在のカーソル位置を保存
    const savedPosition = this.state.cursorPosition;

    // 次の行に補完情報を表示
    this.io.output.write('\n');
    this.io.output.clearLine(0);
    this.io.output.write(`${info} (Tab: next, Esc: cancel)`);

    // 元の行に戻る
    this.io.output.write('\x1b[A');
    this.io.output.cursorTo(this.prompt.length + savedPosition);

    this.state.hasPreviewLine = true;
  }

  private cancelCompletion(): void {
    if (!this.state.isCompleting) {
      return;
    }

    // 補完状態をリセット
    this.state.isCompleting = false;
    this.state.completions = [];
    this.state.completionIndex = 0;
    this.state.originalInput = undefined;
    this.state.originalCursorPosition = 0;

    // 補完情報の表示をクリア
    if (this.state.hasPreviewLine) {
      this.clearPreviewLine();
    }
  }
}
