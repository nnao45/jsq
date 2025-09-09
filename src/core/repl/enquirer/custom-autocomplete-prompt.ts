import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AutoComplete, type Choice } from 'enquirer';
import type {
  AutocompleteEngine,
  CompletionContext,
  CompletionResult,
} from '../autocomplete-engine.js';

// Enquirer's ArrayPrompt base class has focused getter but it's not in the type definitions
interface AutoCompleteWithFocused extends AutoComplete {
  focused?: Choice;
}

export interface CustomAutocompleteOptions {
  name?: string;
  message: string;
  limit?: number;
  initial?: string;
  suggest?: (input: string) => Promise<string[]>;
  historyFile?: string;
  maxHistory?: number;
  autocompleteEngine?: AutocompleteEngine;
  currentData?: unknown;
}

/**
 * Enquirerを拡張したカスタムオートコンプリートプロンプト
 * 履歴機能、マルチライン対応などを追加
 */
export class CustomAutocompletePrompt extends AutoComplete implements AutoCompleteWithFocused {
  // focused property is inherited from ArrayPrompt base class
  declare focused?: Choice;
  private history: string[] = [];
  private historyIndex: number = -1;
  private historyFile?: string;
  private maxHistory: number;
  private originalInput: string = '';
  private isNavigatingHistory: boolean = false;
  private isMultiline: boolean = false;
  private autocompleteEngine?: AutocompleteEngine;
  private currentData?: unknown;
  private isShowingCompletions: boolean = false;
  private completionResult?: CompletionResult;

  constructor(options: CustomAutocompleteOptions) {
    super({
      name: options.name || 'input',
      message: options.message,
      limit: options.limit || 10,
      initial: options.initial || '',
      choices: [],
      suggest: undefined, // 手動でタブキー処理を行うため、自動補完は無効化
    });

    this.maxHistory = options.maxHistory || 1000;
    this.autocompleteEngine = options.autocompleteEngine;
    this.currentData = options.currentData;

    if (options.historyFile) {
      this.historyFile = options.historyFile;
      // 履歴ファイルを非同期で読み込む
      this.loadHistory().catch(() => {
        // エラーは無視（ファイルがない場合など）
      });
    }
  }

  /**
   * 履歴をファイルから読み込み
   */
  private async loadHistory(): Promise<void> {
    if (!this.historyFile) return;

    try {
      const historyPath = path.resolve(os.homedir(), this.historyFile);
      const content = await fs.readFile(historyPath, 'utf-8');
      this.history = content
        .split('\n')
        .filter(line => line.trim())
        .slice(-this.maxHistory); // 最大履歴数を保つ
    } catch (_error) {
      // ファイルが存在しない場合は無視
    }
  }

  /**
   * 履歴をファイルに保存
   */
  private async saveHistory(): Promise<void> {
    if (!this.historyFile) return;

    try {
      const historyPath = path.resolve(os.homedir(), this.historyFile);
      const dir = path.dirname(historyPath);

      // ディレクトリが存在しない場合は作成
      await fs.mkdir(dir, { recursive: true });

      // 履歴を保存（最大履歴数を保つ）
      const historyToSave = this.history.slice(-this.maxHistory);
      await fs.writeFile(historyPath, `${historyToSave.join('\n')}\n`);
    } catch (_error) {
      // エラーは無視（書き込み権限がない場合など）
    }
  }

  /**
   * 入力を履歴に追加
   */
  addToHistory(input: string): void {
    // 空文字や重複は追加しない
    if (!input.trim() || this.history[this.history.length - 1] === input) {
      return;
    }

    this.history.push(input);

    // 最大履歴数を超えたら古いものを削除
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    // 非同期で保存
    this.saveHistory().catch(() => {
      // エラーは無視
    });
  }

  /**
   * インデントレベルを計算
   */
  private calculateIndent(line: string): number {
    // 開き括弧の数をカウント
    const openBrackets = (line.match(/[{[(]/g) || []).length;
    const closeBrackets = (line.match(/[}\])]/g) || []).length;
    return Math.max(0, openBrackets - closeBrackets);
  }

  /**
   * マルチライン入力かどうかを判定
   */
  private shouldContinueMultiline(input: string): boolean {
    const trimmed = input.trim();

    // 未完了の括弧があるか確認
    const openParens = (input.match(/\(/g) || []).length;
    const closeParens = (input.match(/\)/g) || []).length;
    const openBrackets = (input.match(/\[/g) || []).length;
    const closeBrackets = (input.match(/\]/g) || []).length;
    const openBraces = (input.match(/\{/g) || []).length;
    const closeBraces = (input.match(/\}/g) || []).length;

    const hasUnclosedBrackets =
      openParens > closeParens || openBrackets > closeBrackets || openBraces > closeBraces;

    // 行末が特定の文字で終わっているか
    const endsWithContinuation = /[,\\+\-*/=&|]$/.test(trimmed);

    return hasUnclosedBrackets || endsWithContinuation;
  }

  /**
   * キー入力のハンドリングをオーバーライド
   */
  override async keypress(input: string, key: any = {}): Promise<void> {
    // Tab: 補完を表示/選択
    if (key.name === 'tab') {
      
      // 補完候補が表示されている場合
      if (this.isShowingCompletions) {
        // 選択された候補を適用
        if (this.focused) {
          this.applyCompletion(this.focused.value);
          this.isShowingCompletions = false;
          this.choices = [];
          this.completionResult = undefined; // 使用後はクリア
          await this.render();
        }
        return; // デフォルト処理を防ぐ
      }
      
      // 補完候補を新たに取得
      if (this.autocompleteEngine && this.input.trim()) {
        const suggestions = await this.getAutocompleteSuggestions(this.input);

        if (suggestions.length > 0) {
          // 補完候補が1つしかない場合は直接適用
          if (suggestions.length === 1) {
            this.applyCompletion(suggestions[0]);
            await this.render();
          } else {
            // 複数候補がある場合は選択モードに入る
            this.isShowingCompletions = true;
            this.choices = suggestions.map(s => ({ name: s, value: s }));
            await this.render();
          }
        } else {
          // 補完候補がない場合は、前回の補完結果をクリア
          this.completionResult = undefined;
        }
      } else {
        this.completionResult = undefined; // エンジンがない場合もクリア
      }
      return; // Tabキーのデフォルト処理を防ぐために必ずreturn
    }

    // Escape: 補完候補を閉じる
    if (key.name === 'escape' && this.isShowingCompletions) {
      this.isShowingCompletions = false;
      this.choices = [];
      await this.render();
      return;
    }
    // Shift+Enter: 改行を挿入
    if (key.name === 'return' && key.shift) {
      const beforeCursor = this.input.substring(0, this.cursor);
      const afterCursor = this.input.substring(this.cursor);

      // 現在の行のインデントレベルを計算
      const currentLine = beforeCursor.split('\n').pop() || '';
      const baseIndent = currentLine.match(/^(\s*)/)?.[1]?.length || 0;
      const additionalIndent = this.calculateIndent(currentLine) * 2; // 2スペースインデント
      const totalIndent = baseIndent + additionalIndent;

      // 改行とインデントを挿入
      const newLineWithIndent = `\n${' '.repeat(totalIndent)}`;
      this.input = beforeCursor + newLineWithIndent + afterCursor;
      this.cursor = beforeCursor.length + newLineWithIndent.length;

      this.isMultiline = true;
      await this.render();
      return;
    }

    // Enter: 通常の実行（マルチライン判定あり）
    if (key.name === 'return' && !key.shift) {
      // 補完候補表示中は選択を適用
      if (this.isShowingCompletions && this.focused) {
        this.applyCompletion(this.focused.value);
        this.isShowingCompletions = false;
        this.choices = [];
        await this.render();
        return;
      }
      
      // マルチラインモードで、まだ継続すべき場合
      if (this.shouldContinueMultiline(this.input)) {
        // Shift+Enterと同じ処理
        const beforeCursor = this.input.substring(0, this.cursor);
        const afterCursor = this.input.substring(this.cursor);

        const currentLine = beforeCursor.split('\n').pop() || '';
        const baseIndent = currentLine.match(/^(\s*)/)?.[1]?.length || 0;
        const additionalIndent = this.calculateIndent(currentLine) * 2;
        const totalIndent = baseIndent + additionalIndent;

        const newLineWithIndent = `\n${' '.repeat(totalIndent)}`;
        this.input = beforeCursor + newLineWithIndent + afterCursor;
        this.cursor = beforeCursor.length + newLineWithIndent.length;

        this.isMultiline = true;
        await this.render();
        return;
      }

      // 通常の実行処理は親クラスに委譲
      await super.keypress(input, key);
      return;
    }
    // 上キー: 履歴を遡る or 補完候補の選択
    if (key.name === 'up') {
      // 補完候補表示中は候補の選択
      if (this.isShowingCompletions) {
        await super.keypress(input, key);
        return;
      }
      
      if (!this.isNavigatingHistory) {
        // 初めて上キーを押した時、現在の入力を保存
        this.originalInput = this.input;
        this.historyIndex = this.history.length;
        this.isNavigatingHistory = true;
      }

      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.input = this.history[this.historyIndex];
        this.cursor = this.input.length;
        await this.render();
      }
      return;
    }

    // 下キー: 履歴を進める or 補完候補の選択
    if (key.name === 'down') {
      // 補完候補表示中は候補の選択
      if (this.isShowingCompletions) {
        await super.keypress(input, key);
        return;
      }
      
      if (this.isNavigatingHistory) {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.input = this.history[this.historyIndex];
          this.cursor = this.input.length;
        } else {
          // 最新まで来たら元の入力に戻る
          this.input = this.originalInput;
          this.cursor = this.input.length;
          this.isNavigatingHistory = false;
          this.historyIndex = -1;
        }
        await this.render();
      }
      return;
    }

    // その他のキーが押されたら履歴ナビゲーションを終了
    if (this.isNavigatingHistory && key.name !== 'up' && key.name !== 'down') {
      this.isNavigatingHistory = false;
      this.historyIndex = -1;
    }

    // 補完候補表示中に文字キーが入力されたら補完を閉じる
    if (this.isShowingCompletions && input && !['up', 'down', 'tab', 'return', 'escape'].includes(key.name)) {
      this.isShowingCompletions = false;
      this.choices = [];
    }

    // デフォルトのキー処理
    await super.keypress(input, key);
  }

  /**
   * 実行結果を返す前に履歴に追加
   */
  override async submit(): Promise<void> {
    const result = this.value;

    // 履歴に追加
    if (typeof result === 'string') {
      this.addToHistory(result);
    }

    await super.submit();
  }

  /**
   * プロンプトのフォーマットをカスタマイズ
   */
  format(value: string = this.value): string {
    // 履歴ナビゲーション中は特別な表示
    if (this.isNavigatingHistory) {
      const historyIndicator = `[history ${this.historyIndex + 1}/${this.history.length}]`;
      return `${historyIndicator} ${value}`;
    }

    // マルチラインモードの表示
    if (this.isMultiline && value.includes('\n')) {
      const lines = value.split('\n');
      return lines
        .map((line, index) => {
          if (index === 0) return line;
          // ... の後ろのスペースは元の行のインデントをそのまま保持
          return `...${line}`;
        })
        .join('\n');
    }

    return value;
  }


  /**
   * 現在のデータを更新
   */
  updateCurrentData(data: unknown): void {
    this.currentData = data;
  }

  /**
   * オートコンプリート候補を取得
   */
  private async getAutocompleteSuggestions(input: string): Promise<string[]> {
    if (!this.autocompleteEngine || !input.trim()) {
      return [];
    }

    try {
      const context: CompletionContext = {
        input,
        cursorPosition: this.cursor,
        currentData: this.currentData,
      };

      this.completionResult = this.autocompleteEngine.getSuggestions(context);
      return this.completionResult.completions;
    } catch (_error) {
      // エラーが発生した場合は空の配列を返す
      return [];
    }
  }

  /**
   * 補完を適用
   */
  private applyCompletion(completion: string): void {
    if (!this.completionResult) return;

    const { replaceStart, replaceEnd } = this.completionResult;
    const beforeReplace = this.input.substring(0, replaceStart);
    const afterReplace = this.input.substring(replaceEnd);


    this.input = beforeReplace + completion + afterReplace;
    this.cursor = beforeReplace.length + completion.length;
    
    // 補完を適用したら結果をクリア
    this.completionResult = undefined;
  }
}
