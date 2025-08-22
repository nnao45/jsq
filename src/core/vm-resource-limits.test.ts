import { describe, expect, it } from '@jest/globals';
import { VMSandbox } from './vm-sandbox';
import { VMSandboxSimple } from './vm-sandbox-simple';
import { describeWithVM, testWithVM } from '@/test/vm-helpers';

describeWithVM('VM Resource Limits', () => {
  describe('Memory Limits', () => {
    testWithVM('should respect memory limit in VMSandbox', async () => {
      const sandbox = new VMSandbox({
        memoryLimit: 10, // 10MB limit
        timeout: 5000,
      });

      // Try to allocate more than 10MB
      const code = `
        const bigArray = [];
        for (let i = 0; i < 10000000; i++) {
          bigArray.push(new Array(100).fill('x'));
        }
        bigArray.length;
      `;

      await expect(sandbox.execute(code)).rejects.toThrow(/memory/i);
      await sandbox.dispose();
    });

    testWithVM('should respect memory limit in VMSandboxSimple', async () => {
      const sandbox = new VMSandboxSimple({
        memoryLimit: 10, // 10MB limit
        timeout: 5000,
      });

      // Try to allocate more than 10MB
      const code = `
        const bigArray = [];
        for (let i = 0; i < 10000000; i++) {
          bigArray.push(new Array(100).fill('x'));
        }
        bigArray.length;
      `;

      await expect(sandbox.execute(code)).rejects.toThrow(/memory/i);
      await sandbox.dispose();
    });

    testWithVM('should allow normal operations within memory limit', async () => {
      const sandbox = new VMSandbox({
        memoryLimit: 128, // 128MB limit
        timeout: 5000,
      });

      const code = `
        const array = new Array(1000).fill(0);
        array.map(x => x + 1).length;
      `;

      const result = await sandbox.execute(code);
      expect(result.value).toBe(1000);
      await sandbox.dispose();
    });
  });

  describe('CPU Time Limits', () => {
    testWithVM('should respect CPU time limit', async () => {
      const sandbox = new VMSandbox({
        memoryLimit: 128,
        timeout: 100, // 100ms timeout
        cpuLimit: 100, // 100ms CPU limit
      });

      // Infinite loop
      const code = `
        let count = 0;
        while (true) {
          count++;
        }
      `;

      await expect(sandbox.execute(code)).rejects.toThrow(/timeout|time limit/i);
      await sandbox.dispose();
    });

    testWithVM('should allow normal operations within CPU limit', async () => {
      const sandbox = new VMSandbox({
        memoryLimit: 128,
        timeout: 5000,
        cpuLimit: 5000,
      });

      const code = `
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        sum;
      `;

      const result = await sandbox.execute(code);
      expect(result.value).toBe(499500);
      await sandbox.dispose();
    });
  });

  describe('Combined Resource Limits', () => {
    testWithVM('should handle both memory and CPU limits', async () => {
      const sandbox = new VMSandbox({
        memoryLimit: 50, // 50MB
        timeout: 2000, // 2s
        cpuLimit: 2000, // 2s CPU
      });

      // Normal operation that respects both limits
      const code = `
        const data = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: Math.random()
        }));
        
        const sorted = data.sort((a, b) => a.value - b.value);
        sorted.length;
      `;

      const result = await sandbox.execute(code);
      expect(result.value).toBe(1000);
      await sandbox.dispose();
    });

    testWithVM('should fail on memory limit before CPU limit', async () => {
      const sandbox = new VMSandbox({
        memoryLimit: 5, // 5MB - very low
        timeout: 10000, // 10s - high
        cpuLimit: 10000, // 10s CPU - high
      });

      // Memory intensive operation
      const code = `
        const arrays = [];
        for (let i = 0; i < 1000; i++) {
          arrays.push(new Array(10000).fill(Math.random()));
        }
        arrays.length;
      `;

      await expect(sandbox.execute(code)).rejects.toThrow(/memory/i);
      await sandbox.dispose();
    });

    testWithVM('should fail on CPU limit before memory limit', async () => {
      const sandbox = new VMSandbox({
        memoryLimit: 128, // 128MB - high
        timeout: 50, // 50ms - very low
        cpuLimit: 50, // 50ms CPU - very low
      });

      // CPU intensive operation
      const code = `
        let result = 0;
        for (let i = 0; i < 1000000000; i++) {
          result = Math.sqrt(i);
        }
        result;
      `;

      await expect(sandbox.execute(code)).rejects.toThrow(/timeout|time limit/i);
      await sandbox.dispose();
    });
  });

  describe('Resource Monitoring', () => {
    testWithVM('should provide memory usage metrics', async () => {
      const sandbox = new VMSandbox({
        memoryLimit: 128,
        timeout: 5000,
      });

      const code = `
        const data = new Array(1000).fill(0).map((_, i) => ({ index: i }));
        data.length;
      `;

      const result = await sandbox.execute(code);
      expect(result.value).toBe(1000);
      expect(result.memoryUsed).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
      await sandbox.dispose();
    });

    testWithVM('should track execution time', async () => {
      const sandbox = new VMSandbox({
        memoryLimit: 128,
        timeout: 5000,
      });

      const code = `
        const start = Date.now();
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
          sum += i;
        }
        sum;
      `;

      const result = await sandbox.execute(code);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(5000);
      await sandbox.dispose();
    });
  });
});
