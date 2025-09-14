import { openSync } from 'node:fs';
import { Readable } from 'node:stream';

/**
 * Bun用のTTYハンドラー
 * process.binding('tty_wrap')を使用してTTYストリームを作成
 */
export function createBunTTYStream(verbose?: boolean): NodeJS.ReadStream | null {
  if (verbose) {
    console.error('[Bun] createBunTTYStream called');
  }

  try {
    // process.binding('tty_wrap')を取得
    // biome-ignore lint/suspicious/noExplicitAny: process.binding is a Node.js internal API
    const tty_wrap = (process as any).binding('tty_wrap');

    if (!tty_wrap || !tty_wrap.TTY) {
      if (verbose) {
        console.error('[Bun] tty_wrap not available');
      }
      return null;
    }

    // /dev/ttyを開く - パイプ環境では/dev/ttyが使えない可能性があるのでエラーハンドリング
    let ttyFd: number;
    try {
      ttyFd = openSync('/dev/tty', 'r+');
    } catch (err: unknown) {
      if (verbose) {
        console.error(
          '[Bun] Failed to open /dev/tty:',
          err instanceof Error ? err.message : String(err)
        );
        console.error('[Bun] This is expected when running with piped input');
      }
      // パイプ環境では使えないので、別のアプローチが必要
      return null;
    }

    if (verbose) {
      console.error(`[Bun] TTY file descriptor: ${ttyFd}`);
    }

    // TTYインスタンスを作成
    const TTY = tty_wrap.TTY;
    const ttyInstance = new TTY(ttyFd);

    // TTYインスタンスにisTTYを設定
    ttyInstance.isTTY = true;

    // ReadableストリームとしてラップするためのStreamWrapper
    class TTYStreamWrapper extends Readable {
      // biome-ignore lint/suspicious/noExplicitAny: TTY instance from process.binding
      private tty: any;
      private reading: boolean = false;

      // biome-ignore lint/suspicious/noExplicitAny: TTY instance parameter from process.binding
      constructor(ttyInstance: any) {
        super();
        this.tty = ttyInstance;

        // isTTYプロパティを追加
        // biome-ignore lint/suspicious/noExplicitAny: Adding isTTY property to stream
        (this as any).isTTY = true;

        // setRawModeメソッドを追加（REPLで必要）
        // biome-ignore lint/suspicious/noExplicitAny: Adding setRawMode method to stream
        (this as any).setRawMode = (mode: boolean) => {
          if (this.tty.setRawMode) {
            return this.tty.setRawMode(mode);
          }
          return this;
        };

        // isRawプロパティを追加
        // biome-ignore lint/suspicious/noExplicitAny: Adding isRaw property to stream
        (this as any).isRaw = false;
      }

      override _read(_size: number): void {
        if (this.reading) return;
        this.reading = true;

        // TTYからデータを読み取る
        // bufferは使用されていないのでコメントアウト
        // const buffer = Buffer.alloc(size || 1024);

        try {
          // readStartが必要な場合
          if (this.tty.readStart) {
            this.tty.readStart();
          }

          // onreadコールバックを設定
          this.tty.onread = (nread: number, buf: Buffer) => {
            if (nread > 0) {
              const data = buf.slice(0, nread);
              this.push(data);
            } else if (nread === 0) {
              // No data available right now
            } else {
              // Error or EOF
              this.push(null);
            }
          };
        } catch (err) {
          this.destroy(err as Error);
        }
      }

      override _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
        try {
          if (this.tty.readStop) {
            this.tty.readStop();
          }
          if (this.tty.close) {
            this.tty.close();
          }
        } catch (_err) {
          // Ignore close errors
        }
        callback(error);
      }
    }

    const stream = new TTYStreamWrapper(ttyInstance) as unknown as NodeJS.ReadStream & {
      isTTY: boolean;
    };

    if (verbose) {
      console.error('[Bun] TTY stream created successfully');
    }

    return stream;
  } catch (error) {
    if (verbose) {
      console.error('[Bun] Failed to create TTY stream:', error);
    }
    return null;
  }
}
