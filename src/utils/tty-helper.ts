import { ReadStream } from 'node:tty';
import { openSync } from 'node:fs';
import { detectRuntime } from './runtime';

/**
 * TTYデバイスへの安全なアクセスを提供するヘルパー関数
 * bunとNode.jsの互換性の問題を回避します
 */
export async function createTTYInputStream(): Promise<NodeJS.ReadStream | null> {
  const runtime = detectRuntime();

  // プラットフォーム固有のTTYパスを取得
  const getTTYPath = (): string => {
    if (process.platform === 'win32') {
      return 'CON';
    }
    return '/dev/tty';
  };

  try {
    if (runtime === 'bun') {
      // bunの場合、特別な処理が必要
      // 方法1: process.stdinのTTYモードを有効にする試み
      if (process.stdin && typeof process.stdin.setRawMode === 'function') {
        return process.stdin;
      }

      // 方法2: Bun固有のAPIを使用（将来のバージョンで改善される可能性）
      // 現時点では、bunでの/dev/ttyの直接オープンは避ける
      return null;
    } else {
      // Node.jsとDenoの場合
      const ttyPath = getTTYPath();
      const ttyFd = openSync(ttyPath, 'r+');
      
      // ファイルディスクリプタが妥当な範囲にあることを確認
      if (ttyFd < 0 || ttyFd > 1024) {
        console.warn(`Warning: Unexpected file descriptor value: ${ttyFd}`);
      }

      const stream = new ReadStream(ttyFd) as NodeJS.ReadStream & { isTTY: boolean };
      stream.isTTY = true;
      return stream;
    }
  } catch (error) {
    if (process.env.JSQ_DEBUG || process.env.NODE_ENV === 'development') {
      console.error('TTY creation error:', error);
    }
    return null;
  }
}

/**
 * インタラクティブな入力ストリームを取得
 * TTYが利用できない場合はフォールバックを提供
 */
export async function getInteractiveInputStream(
  stdinData?: string,
  verbose?: boolean
): Promise<NodeJS.ReadStream> {
  // 既にTTYの場合はそのまま使用
  if (process.stdin.isTTY) {
    return process.stdin;
  }

  // パイプ経由でデータを受け取った場合
  if (!process.stdin.isTTY && stdinData) {
    const runtime = detectRuntime();

    if (runtime === 'bun') {
      // bunでは標準入力をそのまま使用
      if (verbose) {
        console.error('[Bun] Using standard input for REPL (TTY emulation)');
      }
      return process.stdin;
    }

    // Node.js/Denoの場合、TTYを開く試み
    const ttyStream = await createTTYInputStream();
    if (ttyStream) {
      if (verbose) {
        console.error(`[${runtime}] Successfully opened TTY device`);
      }
      return ttyStream;
    }

    // TTYが開けなかった場合のフォールバック
    if (verbose) {
      console.error(`[${runtime}] Failed to open TTY, using standard input`);
    }
    return process.stdin;
  }

  // デフォルトは標準入力
  return process.stdin;
}