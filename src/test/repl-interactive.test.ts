import { exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildJsq } from './helpers/repl-test-utils';

const exec = promisify(execCallback);

describe('REPL Interactive Tests (from expect scripts)', () => {
  beforeAll(async () => {
    await buildJsq();
  }, 30000);

  it('should return undefined for non-existent properties (test-repl.exp)', async () => {
    const { stdout, stderr } = await exec(
      `echo '{"test": "data"}' | node dist/index.js '$.aaaaaaaaaaa'`
    );

    expect(stdout.trim()).toBe('undefined');
    expect(stdout).not.toMatch(/\{.*"test".*:.*"data".*\}/);
    expect(stderr).toBe('');
  });

  it('should return correct value for existing properties', async () => {
    const { stdout } = await exec(`echo '{"test": "data"}' | node dist/index.js '$.test'`);

    expect(stdout.trim()).toBe('"data"');
  });

  it('should handle array input with non-existent property (debug-repl.exp)', async () => {
    const { stdout, stderr } = await exec(
      `echo '[1,2,3,4]' | node dist/index.js --verbose '$.aaaa'`
    );

    expect(stdout.trim()).toBe('undefined');
    expect(stderr).toContain('Running');
  });

  it('should handle the bug from test-repl-bug.sh', async () => {
    const { stdout } = await exec(
      `echo '{"test": "data"}' | timeout 2s node dist/index.js '$.aaaaaaaaaaaa' 2>&1 || true`
    );

    expect(stdout.trim()).toBe('undefined');
    expect(stdout.trim()).not.toMatch(/\{.*"test".*:.*"data".*\}/);
  });
});
