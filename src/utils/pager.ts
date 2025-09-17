import * as readline from 'node:readline';

type TTYStream = NodeJS.ReadStream & {
  isRaw?: boolean;
  setRawMode?: (mode: boolean) => void;
};

export class Pager {
  private lines: string[];
  private currentLine: number = 0;
  private terminalRows: number;
  private terminalCols: number;
  private inputStream: TTYStream;

  // 検索モード関連
  private isSearchMode: boolean = false;
  private searchQuery: string = '';
  private searchResults: Array<{ line: number; column: number }> = [];

  constructor(content: string, inputStream?: NodeJS.ReadStream) {
    this.terminalRows = process.stdout.rows || 24;
    this.terminalCols = process.stdout.columns || 80;
    this.inputStream = inputStream || process.stdin;

    // コンテンツを行に分割して、長い行は折り返す
    this.lines = this.splitIntoLines(content);
  }

  private splitIntoLines(content: string): string[] {
    const rawLines = content.split('\n');
    const wrappedLines: string[] = [];

    for (const line of rawLines) {
      if (line.length <= this.terminalCols) {
        wrappedLines.push(line);
      } else {
        // 長い行を複数行に分割
        for (let i = 0; i < line.length; i += this.terminalCols) {
          wrappedLines.push(line.substring(i, i + this.terminalCols));
        }
      }
    }

    return wrappedLines;
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

      // この行に検索結果があるかチェック
      if (this.searchResults.length > 0 && this.searchQuery.length > 0) {
        const resultsInLine = this.searchResults.filter(r => r.line === actualLineNumber);

        if (resultsInLine.length > 0) {
          // ハイライト付きで表示
          let highlightedLine = '';
          let lastIndex = 0;

          resultsInLine.forEach(result => {
            highlightedLine += line.substring(lastIndex, result.column);
            highlightedLine += '\x1b[43m\x1b[30m'; // 黄色背景、黒文字
            highlightedLine += line.substring(
              result.column,
              result.column + this.searchQuery.length
            );
            highlightedLine += '\x1b[0m'; // リセット
            lastIndex = result.column + this.searchQuery.length;
          });

          highlightedLine += line.substring(lastIndex);
          console.log(highlightedLine);
        } else {
          console.log(line);
        }
      } else {
        console.log(line);
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

      process.stdout.write(
        `\x1b[7m-- ${status} -- (q to quit, j/k or arrows to scroll, / to search)\x1b[0m`
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
      const result = this.searchResults[index];
      this.currentLine = Math.max(0, result.line - Math.floor((this.terminalRows - 1) / 2));
      this.drawContent();
    }
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
    const existingListeners = this.inputStream.listeners('keypress');
    this.inputStream.removeAllListeners('keypress');

    readline.emitKeypressEvents(this.inputStream);

    // 初期描画
    this.drawContent();

    return new Promise(resolve => {
      const cleanup = () => {
        // Remove our handler
        this.inputStream.removeListener('keypress', keyHandler);

        // Restore existing listeners
        existingListeners.forEach(listener => {
          this.inputStream.on('keypress', listener as (str: string, key: readline.Key) => void);
        });
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

          default:
            // / キーで検索モードに入る
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
