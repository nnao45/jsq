import { openSync } from 'node:fs';
import { ReadStream } from 'node:tty';
import { createBunTTYStream } from './bun-tty-handler';
import { detectRuntime } from './runtime';

/**
 * TTYデバイスへの安全なアクセスを提供するヘルパー関数
 * bunとNode.jsの互換性の問題を回避します
 */
export async function createTTYInputStream(verbose?: boolean): Promise<NodeJS.ReadStream | null> {
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
      // bunの場合、process.binding('tty_wrap')を使用してTTYを作成
      const bunTTYStream = createBunTTYStream(verbose);
      if (bunTTYStream) {
        return bunTTYStream;
      }

      // フォールバック: process.stdinのTTYモードを有効にする試み
      if (process.stdin && typeof process.stdin.setRawMode === 'function') {
        return process.stdin;
      }

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
  } catch (_error) {
    // verboseオプションは呼び出し元から渡されるので、ここではログを出さない
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
      // bunでもTTYを開く試み
      const ttyStream = await createTTYInputStream(verbose);
      if (ttyStream) {
        if (verbose) {
          console.error('[Bun] Successfully opened TTY device using tty_wrap');
        }

        // TTYストリームが正常に開かれた場合、process.stdinをpauseする
        process.stdin.pause();

        return ttyStream;
      }

      // TTYが開けなかった場合のフォールバック
      if (verbose) {
        console.error('[Bun] Failed to open TTY, using standard input');
      }
      return process.stdin;
    }

    // Node.js/Denoの場合、TTYを開く試み
    const ttyStream = await createTTYInputStream(verbose);
    if (ttyStream) {
      if (verbose) {
        console.error(`[${runtime}] Successfully opened TTY device`);
      }

      // TTYストリームが正常に開かれた場合、process.stdinをpauseする
      // これにより、既存のstdinデータがREPLに流れ込むのを防ぐ
      process.stdin.pause();

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
