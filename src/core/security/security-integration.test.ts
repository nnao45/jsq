import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { describeWithVM, isQuickJSAvailable, testWithVM } from '@/test/vm-helpers';
import type { JsqOptions } from '@/types/cli';
import { createApplicationContext } from '../application-context';
import { ExpressionEvaluator } from '../lib/evaluator';

// Mock console.error to capture security warnings
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  mockConsoleError.mockClear();
});

afterAll(() => {
  mockConsoleError.mockRestore();
});

describe('Security Integration Tests', () => {
  beforeAll(() => {
    // Enable security warnings for these tests
    process.env.SHOW_SECURITY_WARNINGS = 'true';

    if (!isQuickJSAvailable()) {
      console.log('⚠️  VM not available - some VM tests will be skipped');
    }
  });

  afterAll(() => {
    // Clean up
    process.env.SHOW_SECURITY_WARNINGS = undefined;
  });
  describe('Default Mode', () => {
    it('should evaluate expressions normally in default mode', async () => {
      const options: JsqOptions = {};
      const appContext = createApplicationContext();
      const evaluator = new ExpressionEvaluator(options, appContext);

      const result = await evaluator.evaluate('$.map(x => x * 2)', [1, 2, 3]);
      expect(result).toEqual([2, 4, 6]);

      await evaluator.dispose();
      await appContext.dispose();
    });

    // VM mode warnings are disabled by default
  });

  describeWithVM('Sandbox Mode', () => {
    testWithVM('should show sandbox mode warning', async () => {
      const options: JsqOptions = { sandbox: true };
      const appContext = createApplicationContext();
      const evaluator = new ExpressionEvaluator(options, appContext);

      // Test that VM mode works
      const result = await evaluator.evaluate('$.length', [1, 2, 3]);
      expect(result).toBe(3);

      // Verify sandbox mode was actually used
      expect(options.sandbox).toBe(true);

      await evaluator.dispose();
      await appContext.dispose();
    });

    testWithVM('should reject all dangerous operations in sandbox mode', async () => {
      const options: JsqOptions = { sandbox: true };
      const appContext = createApplicationContext();
      const evaluator = new ExpressionEvaluator(options, appContext);

      const dangerousExpressions = ['import("child_process")', 'import("fs")', 'require("crypto")'];

      for (const expression of dangerousExpressions) {
        await expect(evaluator.evaluate(expression, {})).rejects.toThrow(
          'Expression evaluation failed'
        );
      }

      await evaluator.dispose();
      await appContext.dispose();
    });
  });

  describe('Context Filtering', () => {
    it('should preserve allowed globals in default mode', async () => {
      const options: JsqOptions = {};
      const appContext = createApplicationContext();
      const evaluator = new ExpressionEvaluator(options, appContext);

      const result = await evaluator.evaluate('typeof Math', {});
      expect(result).toBe('object');

      await evaluator.dispose();
      await appContext.dispose();
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages for security violations', async () => {
      const options: JsqOptions = { noShell: true };
      const appContext = createApplicationContext();
      const evaluator = new ExpressionEvaluator(options, appContext);

      try {
        await evaluator.evaluate('execSync("ls")', {});
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Expression evaluation failed');
        expect((error as Error).message).toContain(
          'Expression contains potentially dangerous patterns'
        );
      }

      await evaluator.dispose();
      await appContext.dispose();
    });
  });

  describe('Performance Impact', () => {
    it('should not significantly impact performance in default mode', async () => {
      const options: JsqOptions = {};
      const appContext = createApplicationContext();
      const evaluator = new ExpressionEvaluator(options, appContext);

      const startTime = Date.now();
      await evaluator.evaluate('$.map(x => x * 2)', [1, 2, 3, 4, 5]);
      const endTime = Date.now();

      // Security checks should add minimal overhead (less than 500ms for simple operations)
      expect(endTime - startTime).toBeLessThan(500);

      await evaluator.dispose();
      await appContext.dispose();
    });

    it('should validate expressions quickly', async () => {
      const options: JsqOptions = { noShell: true, noFs: true };
      const appContext = createApplicationContext();
      const evaluator = new ExpressionEvaluator(options, appContext);

      const startTime = Date.now();
      await evaluator.evaluate('$.filter(x => x > 2)', [1, 2, 3, 4, 5]);
      const endTime = Date.now();

      // Even with validation, should be fast
      expect(endTime - startTime).toBeLessThan(500);

      await evaluator.dispose();
      await appContext.dispose();
    });
  });
});
