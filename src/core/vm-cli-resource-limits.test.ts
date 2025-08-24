import { describe, expect } from '@jest/globals';
import { describeWithVM, testWithVM } from '@/test/vm-helpers';
import type { JsqOptions } from '@/types/cli';
import { ExpressionEvaluator } from './evaluator';

describeWithVM('VM CLI Resource Limits', () => {
  describe('Memory Limits via CLI options', () => {
    testWithVM('should pass memory limit from CLI options to VM', async () => {
      const options: JsqOptions = {
        sandbox: true,
        memoryLimit: 5, // 5MB limit - smaller for more reliable test
      };

      const evaluator = new ExpressionEvaluator(options);

      // Try to allocate more than 5MB - create a very large string
      const code = `
        // Create a huge string to exceed memory limit
        let bigString = '';
        for (let i = 0; i < 10000000; i++) {
          bigString += 'Memory test string that will consume lots of memory! ';
        }
        bigString.length;
      `;

      // This should fail due to memory limit
      await expect(evaluator.evaluate(code, null)).rejects.toThrow();
      await evaluator.dispose();
    });

    testWithVM('should work with default memory limit', async () => {
      const options: JsqOptions = {
        sandbox: true,
        // No memoryLimit specified, should use default 128MB
      };

      const evaluator = new ExpressionEvaluator(options);

      const code = `
        const arr = [1, 2, 3, 4, 5];
        arr.reduce((sum, n) => sum + n, 0);
      `;

      const result = await evaluator.evaluate(code, null);
      expect(result).toBe(15);
      await evaluator.dispose();
    });
  });

  describe('CPU Time Limits via CLI options', () => {
    testWithVM('should pass CPU limit from CLI options to VM', async () => {
      const options: JsqOptions = {
        sandbox: true,
        cpuLimit: 100, // 100ms limit
      };

      const evaluator = new ExpressionEvaluator(options);

      // Create a long-running computation
      const code = `
        let count = 0;
        const start = Date.now();
        while (Date.now() - start < 500) { // Try to run for 500ms
          count++;
        }
        count;
      `;

      // This should fail due to CPU time limit
      await expect(evaluator.evaluate(code, null)).rejects.toThrow(/timeout|timed/i);
      await evaluator.dispose();
    });

    testWithVM('should work with default CPU limit', async () => {
      const options: JsqOptions = {
        sandbox: true,
        // No cpuLimit specified, should use default 30000ms
      };

      const evaluator = new ExpressionEvaluator(options);

      const code = `
        let sum = 0;
        for (let i = 0; i < 100; i++) {
          sum += i;
        }
        sum;
      `;

      const result = await evaluator.evaluate(code, null);
      expect(result).toBe(4950);
      await evaluator.dispose();
    });
  });

  describe('Combined limits', () => {
    testWithVM('should handle both memory and CPU limits from CLI', async () => {
      const options: JsqOptions = {
        sandbox: true,
        memoryLimit: 50, // 50MB
        cpuLimit: 2000, // 2s
      };

      const evaluator = new ExpressionEvaluator(options);

      // Normal operation that respects both limits
      const code = `
        const nums = Array.from({ length: 100 }, (_, i) => i);
        const doubled = nums.map(n => n * 2);
        doubled.reduce((sum, n) => sum + n, 0);
      `;

      const result = await evaluator.evaluate(code, null);
      expect(result).toBe(9900); // 2 * (0 + 1 + ... + 99)
      await evaluator.dispose();
    });
  });
});
