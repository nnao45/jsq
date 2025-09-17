import * as readline from 'node:readline';
import type { InputProvider } from '@/types/repl';

type TTYStream = NodeJS.ReadStream & {
  isRaw?: boolean;
  setRawMode?: (mode: boolean) => void;
};

export class Pager {
  private lines: string[];
  private coloredLines: string[];
  private currentLine: number = 0;
  private terminalRows: number;
  private terminalCols: number;
  private inputStream: InputProvider | TTYStream;

  // 検索モード関連
  private isSearchMode: boolean = false;
  private searchQuery: string = '';
  private searchResults: Array<{ line: number; column: number }> = [];
  private currentSearchIndex: number = 0;

  constructor(content: string, inputStream?: InputProvider | NodeJS.ReadStream) {
    this.terminalRows = process.stdout.rows || 24;
    this.terminalCols = process.stdout.columns || 80;
    this.inputStream = inputStream || process.stdin;

    // コンテンツを行に分割して、長い行は折り返す
    const rawLines = content.split('\n');
    this.lines = [];
    this.coloredLines = [];

    for (const line of rawLines) {
      // プレーンテキスト版（エスケープコードを削除）
      const plainLine = line.replace(new RegExp(`${String.fromCharCode(0x1b)}\\[[^m]*m`, 'g'), '');

      if (plainLine.length <= this.terminalCols) {
        this.lines.push(plainLine);
        this.coloredLines.push(line);
      } else {
        // 長い行を複数行に分割（プレーンテキストベースで計算）
        let plainIndex = 0;
        let coloredIndex = 0;

        while (plainIndex < plainLine.length) {
          const plainChunk = plainLine.substring(plainIndex, plainIndex + this.terminalCols);
          this.lines.push(plainChunk);

          // 対応する色付きチャンクを見つける
          const coloredChunk = this.extractColoredChunk(line, coloredIndex, plainChunk.length);
          this.coloredLines.push(coloredChunk.text);
          coloredIndex = coloredChunk.endIndex;

          plainIndex += this.terminalCols;
        }
      }
    }
  }

  private clearScreen() {
    process.stdout.write('\x1b[2J\x1b[H'); // 画面クリアして先頭に移動
  }

  private drawContent() {
    this.clearScreen();

    // 表示可能な行数（最後の1行はステータス用）
    const displayRows = this.terminalRows - 1;

    // 表示する行を取得
    const endLine = Math.min(this.currentLine + displayRows, this.lines.length);
    const displayLines = this.lines.slice(this.currentLine, endLine);

    // コンテンツを表示
    displayLines.forEach((line, index) => {
      const actualLineNumber = this.currentLine + index;
      const coloredLine = this.coloredLines[actualLineNumber] || line;

      // この行に検索結果があるかチェック
      if (this.searchResults.length > 0 && this.searchQuery.length > 0) {
        const resultsInLine = this.searchResults.filter(r => r.line === actualLineNumber);

        if (resultsInLine.length > 0) {
          // ハイライト付きで表示
          let highlightedLine = '';
          let lastIndex = 0;
          let coloredLastIndex = 0;

          resultsInLine.forEach(result => {
            // プレーンテキストの位置から、色付きテキスト内の対応する位置を見つける
            const beforeMatch = line.substring(lastIndex, result.column);
            const coloredBeforeMatch = this.extractColoredSubstring(
              coloredLine,
              coloredLastIndex,
              beforeMatch.length
            );
            highlightedLine += coloredBeforeMatch.text;
            coloredLastIndex = coloredBeforeMatch.endIndex;

            // 現在フォーカスしてる検索結果かチェック
            const isCurrentResult =
              this.searchResults[this.currentSearchIndex].line === actualLineNumber &&
              this.searchResults[this.currentSearchIndex].column === result.column;

            if (isCurrentResult) {
              // 現在フォーカス中: オレンジ背景、白文字
              highlightedLine += '\x1b[43m\x1b[37m';
            } else {
              // 他の検索結果: オレンジ背景、黒文字
              highlightedLine += '\x1b[43m\x1b[30m';
            }

            const matchText = line.substring(
              result.column,
              result.column + this.searchQuery.length
            );
            const coloredMatch = this.extractColoredSubstring(
              coloredLine,
              coloredLastIndex,
              matchText.length
            );

            // マッチ部分のテキストを抽出（エスケープコードは除く）
            const plainMatch = coloredMatch.text.replace(
              new RegExp(`${String.fromCharCode(0x1b)}\\[[^m]*m`, 'g'),
              ''
            );
            highlightedLine += plainMatch;
            highlightedLine += '\x1b[0m'; // リセット

            coloredLastIndex = coloredMatch.endIndex;
            lastIndex = result.column + this.searchQuery.length;
          });

          // 残りの部分
          const remaining = line.substring(lastIndex);
          if (remaining) {
            const coloredRemaining = this.extractColoredSubstring(
              coloredLine,
              coloredLastIndex,
              remaining.length
            );
            highlightedLine += coloredRemaining.text;
          }
          console.log(highlightedLine);
        } else {
          console.log(coloredLine);
        }
      } else {
        console.log(coloredLine);
      }
    });

    // 空行で埋める
    const emptyLines = displayRows - displayLines.length;
    for (let i = 0; i < emptyLines; i++) {
      console.log('~');
    }

    // ステータス行を表示
    if (this.isSearchMode) {
      // 検索モード時の表示
      process.stdout.write(`\x1b[7m/${this.searchQuery}\x1b[0m`);
    } else {
      // 通常モード時の表示
      const percent =
        this.lines.length > 0
          ? Math.round(((this.currentLine + displayRows) / this.lines.length) * 100)
          : 100;
      const status = this.currentLine + displayRows >= this.lines.length ? '(END)' : `${percent}%`;

      // 検索結果情報
      let searchInfo = '';
      if (this.searchResults.length > 0 && this.searchQuery.length > 0) {
        searchInfo = ` [${this.currentSearchIndex + 1}/${this.searchResults.length}]`;
      }

      process.stdout.write(
        `\x1b[7m-- ${status}${searchInfo} -- (q to quit, j/k or arrows to scroll, / to search, n/N for next/prev)\x1b[0m`
      );
    }
  }

  private scrollUp(lines: number = 1) {
    this.currentLine = Math.max(0, this.currentLine - lines);
    this.drawContent();
  }

  private scrollDown(lines: number = 1) {
    const maxLine = Math.max(0, this.lines.length - (this.terminalRows - 1));
    this.currentLine = Math.min(maxLine, this.currentLine + lines);
    this.drawContent();
  }

  private pageUp() {
    this.scrollUp(this.terminalRows - 2);
  }

  private pageDown() {
    this.scrollDown(this.terminalRows - 2);
  }

  private performSearch() {
    this.searchResults = [];
    this.currentSearchIndex = 0;
    if (this.searchQuery.length === 0) return;

    // 全ての行を検索
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      let index = 0;
      while (true) {
        index = line.indexOf(this.searchQuery, index);
        if (index === -1) break;
        this.searchResults.push({ line: i, column: index });
        index += this.searchQuery.length;
      }
    }

    // 最初の検索結果にジャンプ
    if (this.searchResults.length > 0) {
      this.jumpToSearchResult(0);
    }
  }

  private jumpToSearchResult(index: number) {
    if (index >= 0 && index < this.searchResults.length) {
      this.currentSearchIndex = index;
      const result = this.searchResults[index];
      this.currentLine = Math.max(0, result.line - Math.floor((this.terminalRows - 1) / 2));
      this.drawContent();
    }
  }

  private nextSearchResult() {
    if (this.searchResults.length > 0) {
      const nextIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
      this.jumpToSearchResult(nextIndex);
    }
  }

  private previousSearchResult() {
    if (this.searchResults.length > 0) {
      const prevIndex =
        (this.currentSearchIndex - 1 + this.searchResults.length) % this.searchResults.length;
      this.jumpToSearchResult(prevIndex);
    }
  }

  private extractColoredSubstring(
    coloredText: string,
    startIndex: number,
    plainLength: number
  ): { text: string; endIndex: number } {
    let result = '';
    let currentIndex = startIndex;
    let plainCount = 0;

    while (currentIndex < coloredText.length && plainCount < plainLength) {
      if (coloredText[currentIndex] === '\x1b' && coloredText[currentIndex + 1] === '[') {
        // エスケープシーケンスを探す
        const endMatch = coloredText.indexOf('m', currentIndex);
        if (endMatch !== -1) {
          result += coloredText.substring(currentIndex, endMatch + 1);
          currentIndex = endMatch + 1;
          continue;
        }
      }

      result += coloredText[currentIndex];
      plainCount++;
      currentIndex++;
    }

    return { text: result, endIndex: currentIndex };
  }

  private extractColoredChunk(
    coloredText: string,
    startIndex: number,
    plainLength: number
  ): { text: string; endIndex: number } {
    let result = '';
    let currentIndex = startIndex;
    let plainCount = 0;
    let currentEscapeSequence = '';

    while (currentIndex < coloredText.length && plainCount < plainLength) {
      if (coloredText[currentIndex] === '\x1b' && coloredText[currentIndex + 1] === '[') {
        // エスケープシーケンスを探す
        const endMatch = coloredText.indexOf('m', currentIndex);
        if (endMatch !== -1) {
          currentEscapeSequence = coloredText.substring(currentIndex, endMatch + 1);
          result += currentEscapeSequence;
          currentIndex = endMatch + 1;
          continue;
        }
      }

      result += coloredText[currentIndex];
      plainCount++;
      currentIndex++;
    }

    return { text: result, endIndex: currentIndex };
  }

  async show(): Promise<void> {
    // Store the current raw mode state
    let wasRawMode = false;
    if (this.inputStream.isTTY && 'isRaw' in this.inputStream) {
      wasRawMode = (this.inputStream as TTYStream).isRaw ?? false;
    }

    // Raw modeを有効化
    if (
      this.inputStream.isTTY &&
      'setRawMode' in this.inputStream &&
      typeof this.inputStream.setRawMode === 'function'
    ) {
      (this.inputStream as TTYStream).setRawMode?.(true);
    }

    // Clear any existing keypress listeners before setting up our own
    let existingListeners: unknown[] = [];
    if ('listeners' in this.inputStream) {
      existingListeners = this.inputStream.listeners('keypress');
      this.inputStream.removeAllListeners('keypress');
    }

    // Only emit keypress events for NodeJS.ReadStream
    if ('read' in this.inputStream) {
      readline.emitKeypressEvents(this.inputStream as NodeJS.ReadStream);
    }

    // 初期描画
    this.drawContent();

    return new Promise(resolve => {
      const cleanup = () => {
        // Remove our handler
        if ('removeListener' in this.inputStream) {
          this.inputStream.removeListener('keypress', keyHandler);
        } else if ('off' in this.inputStream) {
          (this.inputStream as InputProvider).off('keypress', keyHandler);
        }

        // Restore existing listeners
        if ('on' in this.inputStream) {
          existingListeners.forEach(listener => {
            this.inputStream.on('keypress', listener as (str: string, key: readline.Key) => void);
          });
        }
      };

      const keyHandler = (str: string, key: readline.Key) => {
        if (this.isSearchMode) {
          // 検索モード中のキーハンドリング
          if (!key) return;

          switch (key.name) {
            case 'escape':
              // 検索モードを終了
              this.isSearchMode = false;
              this.searchQuery = '';
              this.searchResults = [];
              this.currentSearchIndex = 0;
              this.drawContent();
              break;

            case 'return':
            case 'enter':
              // 検索を実行して検索モードを終了
              this.performSearch();
              this.isSearchMode = false;
              break;

            case 'backspace':
              // 一文字削除
              if (this.searchQuery.length > 0) {
                this.searchQuery = this.searchQuery.slice(0, -1);
                this.drawContent();
              }
              break;

            default:
              // 通常の文字入力
              if (str && str.length === 1 && !key.ctrl && !key.meta) {
                this.searchQuery += str;
                this.drawContent();
              }
              break;
          }
          return;
        }

        // 通常モード中のキーハンドリング
        if (!key) return;

        switch (key.name) {
          case 'q':
          case 'escape':
            // raw modeを先に戻す
            if (
              this.inputStream.isTTY &&
              'setRawMode' in this.inputStream &&
              typeof this.inputStream.setRawMode === 'function'
            ) {
              (this.inputStream as TTYStream).setRawMode?.(wasRawMode);
            }

            this.clearScreen();

            // クリーンアップして終了
            cleanup();

            resolve();
            break;

          case 'j':
          case 'down':
            this.scrollDown();
            break;

          case 'k':
          case 'up':
            this.scrollUp();
            break;

          case 'space':
          case 'pagedown':
            this.pageDown();
            break;

          case 'b':
          case 'pageup':
            this.pageUp();
            break;

          case 'g':
            if (key.shift) {
              // G - 最後に移動
              const maxLine = Math.max(0, this.lines.length - (this.terminalRows - 1));
              this.currentLine = maxLine;
              this.drawContent();
            } else {
              // g - 最初に移動
              this.currentLine = 0;
              this.drawContent();
            }
            break;

          case 'n':
            // nキー: 次の検索結果へ、Shift+n: 前の検索結果へ
            if (this.searchResults.length > 0) {
              if (key.shift) {
                this.previousSearchResult();
              } else {
                this.nextSearchResult();
              }
            }
            break;

          default:
            // / キーで検索モードに入る（常に新しい検索）
            if (str === '/') {
              this.isSearchMode = true;
              this.searchQuery = '';
              this.drawContent();
            }
            break;
        }
      };

      this.inputStream.on('keypress', keyHandler);
    });
  }
}
