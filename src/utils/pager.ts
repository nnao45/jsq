import * as readline from 'node:readline';

export class Pager {
  private lines: string[];
  private currentLine: number = 0;
  private terminalRows: number;
  private terminalCols: number;

  constructor(content: string) {
    this.terminalRows = process.stdout.rows || 24;
    this.terminalCols = process.stdout.columns || 80;

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
    displayLines.forEach(line => {
      console.log(line);
    });

    // 空行で埋める
    const emptyLines = displayRows - displayLines.length;
    for (let i = 0; i < emptyLines; i++) {
      console.log('~');
    }

    // ステータス行を表示
    const percent =
      this.lines.length > 0
        ? Math.round(((this.currentLine + displayRows) / this.lines.length) * 100)
        : 100;
    const status = this.currentLine + displayRows >= this.lines.length ? '(END)' : `${percent}%`;

    process.stdout.write(`\x1b[7m-- ${status} -- (q to quit, j/k or arrows to scroll)\x1b[0m`);
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

  async show(): Promise<void> {
    // Raw modeを有効化
    if (process.stdin.isTTY && process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }

    readline.emitKeypressEvents(process.stdin);

    // 初期描画
    this.drawContent();

    return new Promise(resolve => {
      const keyHandler = (_str: string, key: readline.Key) => {
        if (!key) return;

        switch (key.name) {
          case 'q':
          case 'escape':
            // クリーンアップして終了
            process.stdin.removeListener('keypress', keyHandler);
            if (process.stdin.isTTY && process.stdin.setRawMode) {
              process.stdin.setRawMode(false);
            }
            this.clearScreen();
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
        }
      };

      process.stdin.on('keypress', keyHandler);
    });
  }
}
