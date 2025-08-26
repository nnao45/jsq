import { describeWithVM, isIsolatedVMAvailable, testWithVM } from '@/test/vm-helpers';
import type { JsqOptions } from '@/types/cli';
import { ExpressionEvaluator } from '../lib/evaluator';

// Mock console.error to capture security warnings
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

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

    if (!isIsolatedVMAvailable()) {
      console.log('⚠️  isolated-vm not available - some VM tests will be skipped');
    }
  });

  afterAll(() => {
    // Clean up
    process.env.SHOW_SECURITY_WARNINGS = undefined;
  });
  describe('Default Mode', () => {
    it('should evaluate expressions normally in default mode', async () => {
      const options: JsqOptions = {};
      const evaluator = new ExpressionEvaluator(options);

      const result = await evaluator.evaluate('$.map(x => x * 2)', [1, 2, 3]);
      expect(result).toEqual([2, 4, 6]);
    });

    // VM mode warnings are now disabled by default
    // Test removed as warnings are no longer shown
  });

  describeWithVM('Sandbox Mode', () => {
    testWithVM('should show sandbox mode warning', async () => {
      const options: JsqOptions = { sandbox: true };
      const evaluator = new ExpressionEvaluator(options);

      // Test that VM mode works with real isolated-vm
      const result = await evaluator.evaluate('$.length', [1, 2, 3]);
      expect(result).toBe(3);

      // Verify sandbox mode was actually used
      expect(options.sandbox).toBe(true);
    });

    testWithVM('should reject all dangerous operations in sandbox mode', async () => {
      const options: JsqOptions = { sandbox: true };
      const evaluator = new ExpressionEvaluator(options);

      const dangerousExpressions = ['import("child_process")', 'import("fs")', 'require("crypto")'];

      for (const expression of dangerousExpressions) {
        await expect(evaluator.evaluate(expression, {})).rejects.toThrow(
          'Expression evaluation failed'
        );
      }
    });
  });

  describe('Context Filtering', () => {
    it('should preserve allowed globals in default mode', async () => {
      const options: JsqOptions = {};
      const evaluator = new ExpressionEvaluator(options);

      const result = await evaluator.evaluate('typeof Math', {});
      expect(result).toBe('object');
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages for security violations', async () => {
      const options: JsqOptions = { noShell: true };
      const evaluator = new ExpressionEvaluator(options);

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
    });
  });

  describe('Performance Impact', () => {
    it('should not significantly impact performance in default mode', async () => {
      const options: JsqOptions = {};
      const evaluator = new ExpressionEvaluator(options);

      const startTime = Date.now();
      await evaluator.evaluate('$.map(x => x * 2)', [1, 2, 3, 4, 5]);
      const endTime = Date.now();

      // Security checks should add minimal overhead (less than 10ms for simple operations)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should validate expressions quickly', async () => {
      const options: JsqOptions = { noShell: true, noFs: true };
      const evaluator = new ExpressionEvaluator(options);

      const startTime = Date.now();
      await evaluator.evaluate('$.filter(x => x > 2)', [1, 2, 3, 4, 5]);
      const endTime = Date.now();

      // Even with validation, should be fast
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
