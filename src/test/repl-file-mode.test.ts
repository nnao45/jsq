import { describe, it, expect, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

describe('REPL File Mode', () => {
  let replProcess: ChildProcess;

  afterEach(async () => {
    if (replProcess && !replProcess.killed) {
      replProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });

  it('should start REPL in file mode and evaluate expressions', async () => {
    // REPLプロセスを起動
    replProcess = spawn('node', ['dist/index.js', '--repl-file-mode'], {
      env: { ...process.env, JSQ_NO_STDIN: 'true' },
    });

    // 起動を待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // プロセスが起動しているか確認
    expect(replProcess.killed).toBe(false);

    // ワーカーファイルが作成されているか確認（実際のファイル名はプロセスIDに依存）
    const tmpFiles = await readdir('/tmp');
    const inputFiles = tmpFiles.filter(f => f.startsWith('jsq-repl-input-'));
    expect(inputFiles.length).toBeGreaterThan(0);

    // プロセスを終了
    replProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 500));

    // ファイルがクリーンアップされているか確認
    const tmpFilesAfter = await readdir('/tmp');
    const inputFilesAfter = tmpFilesAfter.filter(f => f.startsWith('jsq-repl-input-'));
    expect(inputFilesAfter.length).toBe(0);
  });

  it('should evaluate expressions through file communication', async () => {
    const testExpression = '$.foo';
    const testData = { foo: 'bar' };

    // REPLプロセスを起動（stdin経由でデータを渡す）
    replProcess = spawn('node', ['dist/index.js', '--repl-file-mode'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // データを標準入力に送信
    replProcess.stdin?.write(JSON.stringify(testData));
    replProcess.stdin?.end();

    // 起動を待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 式を入力（シミュレート）
    replProcess.stdin?.write(testExpression + '\n');

    // 結果を待つ
    await new Promise(resolve => setTimeout(resolve, 500));

    // 標準出力から結果を読み取る
    const output = await new Promise<string>((resolve) => {
      let data = '';
      replProcess.stdout?.on('data', (chunk) => {
        data += chunk.toString();
      });
      setTimeout(() => resolve(data), 1000);
    });

    // 結果に'bar'が含まれているか確認
    expect(output).toContain('bar');
  });
});

// readdir helper
async function readdir(path: string): Promise<string[]> {
  const { readdir: fsReaddir } = await import('node:fs/promises');
  try {
    return await fsReaddir(path);
  } catch {
    return [];
  }
}