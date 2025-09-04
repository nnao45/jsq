import { type ChildProcess, spawn } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { JsqOptions } from '@/types/cli';

interface ReplRequest {
  expression: string;
  data: unknown;
  options: JsqOptions;
  requestId: string;
}

interface ReplResponse {
  result?: unknown;
  error?: string;
  requestId: string;
}

export class ReplFileCommunicator {
  private workerId: string;
  private inputFile: string;
  private outputFile: string;
  private workerProcess?: ChildProcess;
  private pendingRequests: Map<string, (response: ReplResponse) => void> = new Map();
  private requestCounter = 0;

  constructor() {
    this.workerId = `${process.pid}-${Date.now()}`;
    this.inputFile = join(tmpdir(), `jsq-repl-input-${this.workerId}.json`);
    this.outputFile = join(tmpdir(), `jsq-repl-output-${this.workerId}.json`);
  }

  async start(): Promise<void> {
    // ワーカープロセスを起動
    // process.cwd()を使って確実にプロジェクトルートから相対的にパスを構築
    const workerPath = join(process.cwd(), 'dist', 'repl-file-worker.js');

    console.error(`[DEBUG] Spawning worker: ${workerPath} with ID: ${this.workerId}`);

    this.workerProcess = spawn('node', [workerPath, this.workerId], {
      stdio: ['ignore', 'inherit', 'inherit'],
      detached: false,
    });

    this.workerProcess.on('error', err => {
      console.error('[DEBUG] Worker process error:', err);
    });

    this.workerProcess.on('exit', (code, signal) => {
      console.error(`[DEBUG] Worker process exited with code ${code} and signal ${signal}`);
    });

    // ワーカーの起動を待つ（もう少し長く）
    await new Promise(resolve => setTimeout(resolve, 500));

    // 空の出力ファイルを作成（監視可能にするため）
    const { writeFile } = await import('node:fs/promises');
    console.error(`[DEBUG] Creating output file: ${this.outputFile}`);
    await writeFile(this.outputFile, '');

    // 出力ファイルの監視を開始（watchFileを使用）
    console.error(`[DEBUG] Starting file watcher for: ${this.outputFile}`);
    const { watchFile } = await import('node:fs');
    watchFile(this.outputFile, { interval: 100 }, async (curr, prev) => {
      console.error(`[DEBUG] Output file changed: size ${prev.size} -> ${curr.size}`);
      if (curr.size > prev.size) {
        await this.handleOutputChange();
      }
    });
  }

  private async handleOutputChange(): Promise<void> {
    console.error('[DEBUG] handleOutputChange() called');
    try {
      const content = await readFile(this.outputFile, 'utf-8');
      console.error(`[DEBUG] Output file content length: ${content.length}`);
      console.error(`[DEBUG] Output file content: ${content.substring(0, 200)}`);

      if (!content || content.trim() === '') {
        console.error('[DEBUG] Empty output file, ignoring');
        return;
      }

      const response: ReplResponse = JSON.parse(content);

      const callback = this.pendingRequests.get(response.requestId);
      if (callback) {
        console.error(`[DEBUG] Found callback for request: ${response.requestId}`);
        callback(response);
        this.pendingRequests.delete(response.requestId);
      } else {
        console.error(`[DEBUG] No callback found for request: ${response.requestId}`);
      }
    } catch (error) {
      // ファイル読み込みエラーは無視
      console.error(`[DEBUG] Error reading output file: ${error}`);
    }
  }

  async evaluate(expression: string, data: unknown, options: JsqOptions): Promise<ReplResponse> {
    console.error(`[DEBUG] evaluate() called with expression: ${expression}`);
    const requestId = `req-${this.requestCounter++}`;
    const request: ReplRequest = {
      expression,
      data,
      options,
      requestId,
    };

    // リクエストをファイルに書き込み
    console.error(`[DEBUG] Writing request to: ${this.inputFile}`);
    console.error(`[DEBUG] Request content: ${JSON.stringify(request).substring(0, 200)}...`);
    await writeFile(this.inputFile, JSON.stringify(request));

    // ファイルが書き込まれたことを確認
    const writtenContent = await readFile(this.inputFile, 'utf-8');
    console.error(`[DEBUG] Verified written content length: ${writtenContent.length}`);

    // レスポンスを待つ
    return new Promise(resolve => {
      this.pendingRequests.set(requestId, resolve);

      // タイムアウト設定（30秒）
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          resolve({
            error: 'Evaluation timeout',
            requestId,
          });
        }
      }, 30000);
    });
  }

  async dispose(): Promise<void> {
    // 監視を停止
    const { unwatchFile } = await import('node:fs');
    unwatchFile(this.outputFile);

    // ワーカープロセスを終了
    if (this.workerProcess) {
      this.workerProcess.kill('SIGTERM');

      // 終了を待つ
      await new Promise<void>(resolve => {
        if (this.workerProcess) {
          this.workerProcess.on('exit', () => resolve());
          setTimeout(() => {
            // 強制終了
            if (this.workerProcess && !this.workerProcess.killed) {
              this.workerProcess.kill('SIGKILL');
            }
            resolve();
          }, 1000);
        } else {
          resolve();
        }
      });
    }

    // ファイルをクリーンアップ
    try {
      await unlink(this.inputFile);
    } catch {}
    try {
      await unlink(this.outputFile);
    } catch {}
  }
}
