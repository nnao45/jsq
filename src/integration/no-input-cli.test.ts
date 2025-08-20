import { describe, expect, it } from '@jest/globals';
import { spawn } from 'child_process';
import { join } from 'path';

describe('No Input CLI Integration Tests', () => {
  const binPath = join(__dirname, '../../bin/jsq');

  const runJsq = (
    expression: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    return new Promise(resolve => {
      const child = spawn('node', [binPath, expression], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', data => {
        stdout += data.toString();
      });

      child.stderr?.on('data', data => {
        stderr += data.toString();
      });

      child.on('close', code => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        });
      });

      // Close stdin immediately to simulate no input
      child.stdin?.end();
    });
  };

  describe('Basic utility functions', () => {
    it('should execute _.range(5) without input', async () => {
      const result = await runJsq('_.range(5)');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([0, 1, 2, 3, 4]);
    });

    it('should execute _.range(2, 8) without input', async () => {
      const result = await runJsq('_.range(2, 8)');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([2, 3, 4, 5, 6, 7]);
    });

    it('should execute _.times(4, i => i * i) without input', async () => {
      const result = await runJsq('_.times(4, i => i * i)');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([0, 1, 4, 9]);
    });
  });

  describe('Mathematical expressions', () => {
    it('should execute Math.PI without input', async () => {
      const result = await runJsq('Math.PI');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(Math.PI);
    });

    it('should execute simple array operations without input', async () => {
      const result = await runJsq('[1, 2, 3, 4].filter(x => x % 2 === 0)');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([2, 4]);
    });
  });

  describe('Complex operations', () => {
    it('should execute nested lodash operations without input', async () => {
      const result = await runJsq('_.chunk(_.range(8), 2)');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([
        [0, 1],
        [2, 3],
        [4, 5],
        [6, 7],
      ]);
    });

    it('should execute string operations without input', async () => {
      const result = await runJsq('_.capitalize("hello world")');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('Hello world');
    });
  });

  describe('Date and time operations', () => {
    it('should execute date operations without input', async () => {
      const result = await runJsq('new Date(2023, 11, 25).getMonth()');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(11); // December is 11
    });
  });

  describe('Pipeline operations with no input', () => {
    it('should execute $ | utility function without input', async () => {
      const result = await runJsq('$ | _.range(5)');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([0, 1, 2, 3, 4]);
    });

    it('should execute complex pipeline without input', async () => {
      const result = await runJsq('$ | _.range(1, 6) | $.map(x => x * x)');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([1, 4, 9, 16, 25]);
    });

    it('should handle $ as null in conditional expressions', async () => {
      // Note: $ is a function object, so use explicit null check
      const result = await runJsq('$.valueOf() === null ? "default" : "not null"');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('default');
    });

    it('should execute $ in isolation', async () => {
      const result = await runJsq('$');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBeNull();
    });

    it('should handle mixed pipeline with utility and data methods', async () => {
      const result = await runJsq('$ | _.times(3, i => i + 1) | $.filter(x => x % 2 === 1)');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([1, 3]);
    });
  });

  describe('Object creation', () => {
    it('should create objects without input', async () => {
      const result = await runJsq('({ name: "test", value: 42 })');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ name: 'test', value: 42 });
    });

    it('should execute _.merge operations without input', async () => {
      const result = await runJsq('_.merge({ a: 1 }, { b: 2 }, { c: 3 })');
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ a: 1, b: 2, c: 3 });
    });
  });
});
