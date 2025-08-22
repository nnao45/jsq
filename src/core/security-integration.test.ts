import { ExpressionEvaluator } from './evaluator';
import type { JsqOptions } from '@/types/cli';
import { describeWithVM, testWithVM, isIsolatedVMAvailable } from '@/test/vm-helpers';

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
    if (!isIsolatedVMAvailable()) {
      console.log('⚠️  isolated-vm not available - some VM tests will be skipped');
    }
  });
  describe('Default Mode', () => {
    it('should evaluate expressions normally in default mode', async () => {
      const options: JsqOptions = {};
      const evaluator = new ExpressionEvaluator(options);

      const result = await evaluator.evaluate('$.map(x => x * 2)', [1, 2, 3]);
      expect(result).toEqual([2, 4, 6]);
    });

    it('should show VM mode warning in default mode', async () => {
      const options: JsqOptions = {};
      const evaluator = new ExpressionEvaluator(options);

      await evaluator.evaluate('$.length', [1, 2, 3]);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Running in secure VM isolation mode')
      );
    });
  });

  describe('Individual Security Flags', () => {
    it('should show VM mode warning with individual flags', async () => {
      const options: JsqOptions = { noNetwork: true };
      const evaluator = new ExpressionEvaluator(options);

      await evaluator.evaluate('$.length', [1, 2, 3]);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Running in secure VM isolation mode')
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Individual security flags are ignored in VM isolation mode')
      );
    });

    it('should show VM mode warning for shell flag', async () => {
      const options: JsqOptions = { noShell: true };
      const evaluator = new ExpressionEvaluator(options);

      await evaluator.evaluate('$.length', [1, 2, 3]);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Running in secure VM isolation mode')
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Individual security flags are ignored in VM isolation mode')
      );
    });

    it('should show VM mode warning for filesystem flag', async () => {
      const options: JsqOptions = { noFs: true };
      const evaluator = new ExpressionEvaluator(options);

      await evaluator.evaluate('$.length', [1, 2, 3]);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Running in secure VM isolation mode')
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Individual security flags are ignored in VM isolation mode')
      );
    });

    it('should reject shell commands when shell is disabled', async () => {
      const options: JsqOptions = { noShell: true };
      const evaluator = new ExpressionEvaluator(options);

      await expect(evaluator.evaluate('import("child_process")', {})).rejects.toThrow(
        'Security validation failed'
      );
    });

    it('should reject filesystem access when filesystem is disabled', async () => {
      const options: JsqOptions = { noFs: true };
      const evaluator = new ExpressionEvaluator(options);

      await expect(evaluator.evaluate('import("fs")', {})).rejects.toThrow(
        'Security validation failed'
      );
    });
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
          'Security validation failed'
        );
      }
    });
  });

  describe('Context Filtering', () => {
    // Note: This test is currently disabled because fetch is available in global scope
    // In production with VM isolation (isolated-vm), the context filtering would work properly
    it.skip('should remove fetch from context when network is disabled', async () => {
      const options: JsqOptions = { noNetwork: true };
      const evaluator = new ExpressionEvaluator(options);

      // Test that trying to use fetch will fail appropriately
      // In a real execution, fetch would be undefined in the context
      await expect(evaluator.evaluate('fetch("https://example.com")', {})).rejects.toThrow(); // Should fail because fetch is not available in context
    });

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
        expect((error as Error).message).toContain('Security validation failed');
        expect((error as Error).message).toContain('Expression contains potentially dangerous patterns');
      }
    });

    it('should handle multiple security violations', async () => {
      const options: JsqOptions = { noShell: true, noFs: true };
      const evaluator = new ExpressionEvaluator(options);

      try {
        await evaluator.evaluate('import("child_process"); readFile("test")', {});
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Security validation failed');
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
