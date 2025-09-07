import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe.skip('REPL E2E Tests with Expect Scripts', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Helper function to run expect scripts
  const runExpectScript = async (
    scriptName: string
  ): Promise<{ exitCode: number; output: string }> => {
    const scriptPath = path.join(__dirname, scriptName);

    // Check if the expect script exists
    if (!existsSync(scriptPath)) {
      throw new Error(`Expect script not found: ${scriptPath}`);
    }

    return new Promise((resolve, reject) => {
      const expectProcess = spawn('expect', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.resolve(__dirname, '../..'), // プロジェクトルートをcwdに設定
        env: {
          ...process.env,
          JSQ_DISABLE_REALTIME_EVAL: scriptName !== 'repl-realtime-eval.exp' ? '1' : '',
        },
      });

      let output = '';
      let errorOutput = '';

      expectProcess.stdout?.on('data', data => {
        output += data.toString();
      });

      expectProcess.stderr?.on('data', data => {
        errorOutput += data.toString();
      });

      const timeout = setTimeout(() => {
        expectProcess.kill('SIGKILL');
        reject(new Error(`Expect script timed out: ${scriptName}`));
      }, 120000); // 120秒のタイムアウト

      expectProcess.on('close', code => {
        clearTimeout(timeout);
        if (code !== 0) {
          console.error(`Script ${scriptName} failed with code ${code}`);
          console.error('STDOUT:', output);
          console.error('STDERR:', errorOutput);
        }
        resolve({
          exitCode: code || 0,
          output: output + errorOutput,
        });
      });

      expectProcess.on('error', error => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  };

  it('should not show memory leak warning for continuous REPL input', async () => {
    const result = await runExpectScript('repl-memory-leak.exp');

    // Exit code should be 0
    expect(result.exitCode).toBe(0);

    // Output should NOT contain MaxListenersExceededWarning
    expect(result.output).not.toContain('MaxListenersExceededWarning');
  }, 120000); // 120秒のタイムアウト

  it('should handle stress test with many rapid inputs', async () => {
    const result = await runExpectScript('repl-stress-test.exp');

    // Exit code should be 0
    expect(result.exitCode).toBe(0);

    // Output should NOT contain MaxListenersExceededWarning
    expect(result.output).not.toContain('MaxListenersExceededWarning');

    // Should contain the expected output for .test
    expect(result.output).toContain('"data"');
  }, 120000); // 120秒のタイムアウト

  it('should execute simple REPL evaluation', async () => {
    const result = await runExpectScript('repl-e2e-simple.exp');

    // Exit code should be 0
    expect(result.exitCode).toBe(0);

    // Check for expected outputs
    expect(result.output).toContain('jsq REPL');
    expect(result.output).not.toContain('Error');
  }, 120000); // 120秒のタイムアウト

  it('should handle realtime evaluation', async () => {
    const result = await runExpectScript('repl-realtime-eval.exp');

    // Exit code should be 0
    expect(result.exitCode).toBe(0);

    // Should show realtime evaluation results
    expect(result.output).not.toContain('MaxListenersExceededWarning');
  }, 120000); // 120秒のタイムアウト

  it.skip('should run REPL mode with Bun runtime', async () => {
    const result = await runExpectScript('bun-repl.exp');

    // Exit code should be 0
    expect(result.exitCode).toBe(0);

    // Check for successful test outputs
    expect(result.output).toContain('全てのBun REPLテストが成功しました！');
    expect(result.output).not.toContain('✗');
  }, 60000);

  it.skip('should run REPL mode with Deno runtime', async () => {
    const result = await runExpectScript('deno-repl.exp');

    // Exit code should be 0
    expect(result.exitCode).toBe(0);

    // Check for successful test outputs
    expect(result.output).toContain('全てのDeno REPLテストが成功しました！');
    expect(result.output).not.toContain('✗');
  }, 60000);

  it('should handle line control with Ctrl+C and Enter keys', async () => {
    const result = await runExpectScript('repl-line-control.exp');

    // Exit code should be 0
    expect(result.exitCode).toBe(0);

    // Check for successful test outputs
    expect(result.output).toContain('全てのLine Controlテストが成功しました！');
    expect(result.output).not.toContain('✗');

    // Specific checks
    expect(result.output).toContain('Ctrl+C1回で入力がキャンセルされ');
    expect(result.output).toContain('Enter1回で式が実行されました');
  }, 60000);

  it('should exit cleanly with Ctrl+C on empty line', async () => {
    const result = await runExpectScript('repl-empty-line-exit.exp');

    // Exit code should be 0
    expect(result.exitCode).toBe(0);

    // Check for successful test outputs
    expect(result.output).toContain('全ての空行終了テストが成功しました！');
    expect(result.output).not.toContain('✗');

    // Should explicitly mention no errors
    expect(result.output).toContain('エラーなしで正常に終了しました');
  }, 60000);
});
