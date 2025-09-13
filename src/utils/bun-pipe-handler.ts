import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdtemp, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import chalk from 'chalk';
import type { JsqOptions } from '@/types/cli';
import { OutputFormatter } from './output-formatter';
import { detectRuntime } from './runtime';

/**
 * Bun専用のパイプ後REPL処理
 * BunのWorker APIとFIFOを使って、パイプ後でもインタラクティブな入力を可能にする
 */
export class BunPipeHandler {
  private fifoPath?: string;
  private cleanupCallbacks: (() => Promise<void>)[] = [];

  /**
   * Bun環境でパイプ後のインタラクティブ入力ストリームを作成
   */
  async createInteractiveStream(): Promise<NodeJS.ReadStream | null> {
    const runtime = detectRuntime();
    if (runtime !== 'bun') {
      return null;
    }

    try {
      // 方法1: Node.jsのttyモジュールを使ってTTYを直接開く
      const { openSync } = await import('node:fs');
      const { ReadStream } = await import('node:tty');

      try {
        const ttyFd = openSync('/dev/tty', 'r+');
        const stream = new ReadStream(ttyFd) as NodeJS.ReadStream & { isTTY?: boolean };
        stream.isTTY = true;

        // クリーンアップを登録
        this.cleanupCallbacks.push(async () => {
          stream.destroy();
        });

        return stream;
      } catch (_error) {
        // /dev/ttyが開けない場合は次の方法を試す
      }
    } catch (_error) {
      // 方法1が失敗した場合、方法2を試す
    }

    try {
      // 方法2: FIFOを使用してインタラクティブ入力を実現
      const tmpDir = await mkdtemp(join(tmpdir(), 'jsq-bun-'));
      this.fifoPath = join(tmpDir, 'input.fifo');

      // FIFOを作成（名前付きパイプ）
      const mkfifoProcess = spawn('mkfifo', [this.fifoPath]);
      await new Promise((resolve, reject) => {
        mkfifoProcess.on('exit', code => {
          if (code === 0) resolve(undefined);
          else reject(new Error('Failed to create FIFO'));
        });
      });

      // FIFOから読み込むストリームを作成
      const readStream = createReadStream(this.fifoPath) as unknown as NodeJS.ReadStream & {
        isTTY?: boolean;
      };
      // Bunのために明示的にisTTYを設定
      readStream.isTTY = true;

      // バックグラウンドで/dev/ttyからFIFOに書き込むプロセスを起動
      const ttyToFifoProcess = spawn('sh', ['-c', `exec < /dev/tty; cat > ${this.fifoPath}`], {
        detached: true,
        stdio: 'ignore',
      });
      ttyToFifoProcess.unref();

      // クリーンアップを登録
      this.cleanupCallbacks.push(async () => {
        ttyToFifoProcess.kill();
        if (this.fifoPath) {
          await unlink(this.fifoPath).catch(() => {});
        }
      });

      return readStream;
    } catch (_error) {
      // 両方の方法が失敗した場合
      return null;
    }
  }

  /**
   * BunのWorker APIを使用してREPLワーカーを作成
   */
  async createBunReplWorker(stdinData: string, options: JsqOptions): Promise<boolean> {
    try {
      // パイプデータを一時ファイルに保存
      const { writeFileSync, unlinkSync } = await import('node:fs');
      const tmpFile = join(tmpdir(), `jsq-data-${Date.now()}.json`);
      writeFileSync(tmpFile, stdinData);

      // クリーンアップを登録
      this.cleanupCallbacks.push(async () => {
        try {
          unlinkSync(tmpFile);
        } catch {}
      });

      // Bunの子プロセスでREPLを起動
      const bunExecutable = process.execPath || 'bun';
      const scriptPath = process.argv[1];

      // 環境変数でパイプデータを渡す
      const env = {
        ...process.env,
        JSQ_TEMP_DATA_FILE: tmpFile,
        JSQ_BUN_REPL_MODE: 'true',
        JSQ_NO_STDIN: 'true', // stdinの自動読み込みを防ぐ
      };

      // REPLプロセスの引数を構築
      const args = [scriptPath];
      if (options.verbose) {
        args.push('--verbose');
      }

      // REPLプロセスを起動
      // 新しいTTYセッションで起動するために、script/ptyコマンドを使う
      const isLinux = process.platform === 'linux';
      const isMac = process.platform === 'darwin';

      let replProcess: ReturnType<typeof spawn>;

      // 新しいターミナルで起動する試み
      if (process.env.TERM_PROGRAM || process.env.TERMINAL_EMULATOR) {
        // 既存のターミナル内で実行されている場合は、通常の方法を使う
        replProcess = spawn(bunExecutable, args, {
          env,
          stdio: 'inherit',
        });
      } else if (isLinux) {
        // Linuxではx-terminal-emulatorを試す
        try {
          replProcess = spawn('x-terminal-emulator', ['-e', bunExecutable, ...args], {
            env,
            stdio: 'ignore',
            detached: true,
          });
        } catch {
          // フォールバック
          replProcess = spawn(bunExecutable, args, {
            env,
            stdio: 'inherit',
          });
        }
      } else if (isMac) {
        // macOSではosascriptを使ってTerminal.appで起動
        const command = `${bunExecutable} ${args.join(' ')}`;
        replProcess = spawn(
          'osascript',
          ['-e', `tell application "Terminal"`, '-e', `do script "${command}"`, '-e', `end tell`],
          {
            env,
            stdio: 'ignore',
          }
        );
      } else {
        // Windowsや他のプラットフォームでは通常の方法
        replProcess = spawn(bunExecutable, args, {
          env,
          stdio: 'inherit',
        });
      }

      // プロセスの終了を待つ
      await new Promise<void>((resolve, reject) => {
        replProcess.on('exit', (code, signal) => {
          console.error(`[DEBUG] Child process exited with code: ${code}, signal: ${signal}`);
          if (code !== 0) {
            reject(new Error(`Child process exited with code ${code}`));
          } else {
            resolve();
          }
        });

        replProcess.on('error', err => {
          console.error(`[DEBUG] Child process error:`, err);
          reject(err);
        });
      });

      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * リソースのクリーンアップ
   */
  async cleanup(): Promise<void> {
    for (const callback of this.cleanupCallbacks) {
      await callback().catch(() => {});
    }
    this.cleanupCallbacks = [];
  }
}

/**
 * Bunでパイプ後のREPLを処理するヘルパー関数
 */
export async function handleBunPipeRepl(options: JsqOptions): Promise<boolean> {
  const runtime = detectRuntime();
  if (runtime !== 'bun' || !options.stdinData || process.stdin.isTTY) {
    return false;
  }

  // パイプ入力があった場合、データを表示してREPLの使い方を案内
  console.log(chalk.cyan('Welcome to jsq REPL (Pipe Mode) 🚀'));
  console.log(chalk.gray('Piped data has been loaded:'));
  console.log();

  try {
    const data = JSON.parse(options.stdinData);
    console.log(OutputFormatter.format(data, { indent: 2 }));
  } catch {
    console.log(options.stdinData);
  }

  console.log();
  console.log(chalk.yellow('ℹ️  To start interactive REPL with this data:'));
  console.log(chalk.gray('   Save the data to a file and run:'));
  console.log(chalk.green('   jsq --file data.json'));
  console.log();
  console.log(chalk.gray('Or evaluate expressions directly:'));
  console.log(chalk.green(`   echo '${options.stdinData}' | jsq '$.name'`));

  return true; // 処理完了
}
