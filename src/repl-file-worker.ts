#!/usr/bin/env node

import { unwatchFile, watchFile } from 'node:fs';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { JsqProcessor } from '@/core/lib/processor';
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

const workerId = process.argv[2];
if (!workerId) {
  console.error('Worker ID required');
  process.exit(1);
}

const inputFile = `/tmp/jsq-repl-input-${workerId}.json`;
const outputFile = `/tmp/jsq-repl-output-${workerId}.json`;

console.error(`[WORKER DEBUG] Started with ID: ${workerId}`);
console.error(`[WORKER DEBUG] Input file: ${inputFile}`);
console.error(`[WORKER DEBUG] Output file: ${outputFile}`);

async function processRequest(request: ReplRequest): Promise<ReplResponse> {
  const processor = new JsqProcessor(request.options);

  try {
    const dataStr = typeof request.data === 'string' ? request.data : JSON.stringify(request.data);

    const result = await processor.process(request.expression, dataStr);

    return {
      result: result.data,
      requestId: request.requestId,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      requestId: request.requestId,
    };
  } finally {
    await processor.dispose();
  }
}

async function handleFileChange() {
  try {
    console.error('[WORKER DEBUG] File change detected, reading input...');
    const content = await readFile(inputFile, 'utf-8');
    console.error('[WORKER DEBUG] Read content:', content.substring(0, 200));

    const request: ReplRequest = JSON.parse(content);
    console.error('[WORKER DEBUG] Processing request:', request.expression);
    console.error('[WORKER DEBUG] Request data type:', typeof request.data);
    console.error('[WORKER DEBUG] Request data:', JSON.stringify(request.data).substring(0, 100));

    const response = await processRequest(request);
    console.error('[WORKER DEBUG] Response:', JSON.stringify(response).substring(0, 200));

    console.error('[WORKER DEBUG] Writing response to output file');
    await writeFile(outputFile, JSON.stringify(response));
    console.error('[WORKER DEBUG] Response written successfully');
  } catch (error) {
    console.error('[WORKER DEBUG] Error in handleFileChange:', error);
    // ファイル読み込みエラーは無視（ファイルが書き込み中の可能性）
  }
}

// 初期クリーンアップ
async function cleanup() {
  try {
    await unlink(inputFile);
  } catch {}
  try {
    await unlink(outputFile);
  } catch {}
}

async function main() {
  console.error('[WORKER DEBUG] Starting main function');
  await cleanup();

  // ファイル監視を開始（ファイルがまだ存在しなくても監視可能）
  console.error('[WORKER DEBUG] Starting file watcher');
  let isProcessing = false;

  watchFile(inputFile, { interval: 100 }, async (curr, prev) => {
    console.error(
      `[WORKER DEBUG] File stats changed: size ${prev.size} -> ${curr.size}, exists: ${curr.size > 0 || curr.mtime.getTime() > 0}`
    );

    // ファイルが存在して、サイズが0より大きく、処理中でない場合
    if (curr.size > 0 && !isProcessing) {
      isProcessing = true;
      await handleFileChange();
      isProcessing = false;
    }
  });

  // 空のファイルを作成して監視可能にする
  console.error('[WORKER DEBUG] Creating input file');
  await writeFile(inputFile, '');

  // プロセス終了時のクリーンアップ
  process.on('SIGINT', async () => {
    unwatchFile(inputFile);
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    unwatchFile(inputFile);
    await cleanup();
    process.exit(0);
  });

  // Keep the process running
  console.error('[WORKER DEBUG] Worker ready and waiting for requests...');
  process.stdin.resume();
}

main().catch(console.error);
