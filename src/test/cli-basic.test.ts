import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const runCLI = (
  args: string[],
  input?: string
): Promise<{ stdout: string; stderr: string; code: number | null }> => {
  return new Promise(resolve => {
    const jsqPath = join(process.cwd(), 'dist', 'index.js');
    const child = spawn('node', [jsqPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.on('close', code => {
      resolve({ stdout, stderr, code });
    });
  });
};

describe('jsq CLI basic tests', () => {
  it('should display help with --help flag', async () => {
    const { stdout, stderr, code } = await runCLI(['--help']);

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('jsq');
    expect(stdout).toContain('Options:');
  });

  it('should display version with --version flag', async () => {
    const { stdout, stderr, code } = await runCLI(['--version']);

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should process simple JSON input', async () => {
    const input = '{"hello": "world"}';
    const { stdout, stderr, code } = await runCLI(['$.hello'], input);

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout.trim()).toBe('"world"');
  });

  it('should handle array input with map', async () => {
    const input = '[1, 2, 3]';
    const { stdout, stderr, code } = await runCLI(['$.map(x => x * 2)'], input);

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(JSON.parse(stdout)).toEqual([2, 4, 6]);
  });

  it('should handle JSONL input with --stream flag', async () => {
    const input = '{"value": 1}\n{"value": 2}\n{"value": 3}';
    const { stdout, stderr, code } = await runCLI(['--stream', '$.value * 10'], input);

    expect(code).toBe(0);
    expect(stderr).toBe('');
    const lines = stdout.trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('10');
    expect(lines[1]).toBe('20');
    expect(lines[2]).toBe('30');
  });

  it('should handle invalid JSON input gracefully', async () => {
    const input = 'not valid json';
    const { stderr, code } = await runCLI(['$'], input);

    expect(code).not.toBe(0);
    expect(stderr.toLowerCase()).toContain('error');
  });

  it('should support compact output with --compact flag', async () => {
    const input = '{"name": "test", "values": [1, 2, 3]}';
    const { stdout, stderr, code } = await runCLI(['--compact', '$'], input);

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout.trim()).toBe('{"name":"test","values":[1,2,3]}');
  });
});
