import { VMSandboxSimple } from './vm-sandbox-simple';
import { VMSandbox } from './vm-sandbox';
import { VMResourceManager } from './vm-resource-manager';
import type { VMSandboxConfig, VMOptions, VMContext } from '@/types/sandbox';
import { describeWithVM, testWithVM, isIsolatedVMAvailable } from '@/test/vm-helpers';

describeWithVM('VM Core Functionality Tests', () => {
  beforeAll(() => {
    if (!isIsolatedVMAvailable()) {
      console.log('⚠️  isolated-vm not available - VM tests will be skipped');
    }
  });

  describe('VMSandboxSimple Basic Operations', () => {
    let sandbox: VMSandboxSimple;

    beforeEach(() => {
      sandbox = new VMSandboxSimple();
    });

    afterEach(async () => {
      await sandbox.dispose();
    });

    it('should create VM sandbox with default configuration', () => {
      const config = sandbox.getConfig();
      expect(config.memoryLimit).toBe(128);
      expect(config.timeout).toBe(30000);
      expect(config.enableAsync).toBe(true);
      expect(config.recycleIsolates).toBe(false);
    });

    testWithVM('should execute simple expressions', async () => {
      const result = await sandbox.execute('1 + 1');
      expect(result.value).toBe(2);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    testWithVM('should execute with custom timeout', async () => {
      const options: VMOptions = { timeout: 5000 };
      const result = await sandbox.execute('Math.PI', {}, options);

      expect(result.value).toBe(Math.PI);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    testWithVM('should execute with custom memory limit', async () => {
      const options: VMOptions = { memoryLimit: 256 };
      const result = await sandbox.execute('new Array(10).fill(1).length', {}, options);

      expect(result.value).toBe(10);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    testWithVM('should handle context variables', async () => {
      const context: VMContext = {
        x: 10,
        y: 20,
        data: { value: 'test' },
      };

      const result = await sandbox.execute('x + y', context);
      expect(result.value).toBe(30);
    });

    testWithVM('should handle different data types in context', async () => {
      const context: VMContext = {
        str: 'hello',
        num: 42,
        bool: true,
        arr: [1, 2, 3],
        obj: { nested: { value: 'deep' } },
        nil: null,
        undef: undefined,
      };

      const result = await sandbox.execute('typeof str + "-" + typeof num', context);
      expect(result.value).toBe('string-number');
    });
  });

  describe('VM Error Handling', () => {
    let sandbox: VMSandboxSimple;

    beforeEach(() => {
      sandbox = new VMSandboxSimple();
    });

    afterEach(async () => {
      await sandbox.dispose();
    });

    testWithVM('should handle syntax errors', async () => {
      await expect(sandbox.execute('invalid syntax {')).rejects.toMatchObject({
        name: 'SandboxError',
        code: 'SYNTAX_ERROR',
      });
    });

    testWithVM('should handle reference errors', async () => {
      await expect(sandbox.execute('undefined_var + 1')).rejects.toMatchObject({
        name: 'SandboxError',
        code: 'REFERENCE_ERROR',
      });
    });

    testWithVM(
      'should handle timeout errors',
      async () => {
        const options: VMOptions = { timeout: 50 }; // Very short timeout
        await expect(
          sandbox.execute('while(true) { /* infinite loop */ }', {}, options)
        ).rejects.toMatchObject({
          name: 'SandboxError',
          code: 'TIMEOUT',
        });
      },
      5000
    );

    testWithVM('should create appropriate SandboxError types', async () => {
      try {
        await sandbox.execute('invalid syntax {');
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.name).toBe('SandboxError');
        expect(error.code).toBeDefined();
        expect(error.details).toBeDefined();
        expect(error.details.executionTime).toBeGreaterThan(0);
      }
    });
  });

  describe('VM Advanced Features', () => {
    let sandbox: VMSandboxSimple;

    beforeEach(() => {
      sandbox = new VMSandboxSimple();
    });

    afterEach(async () => {
      await sandbox.dispose();
    });

    testWithVM('should support async/await operations', async () => {
      const result = await sandbox.execute(`
        async function test() {
          return 'async-result';
        }
        await test();
      `);

      expect(result.value).toBe('async-result');
    });

    testWithVM('should support Promise operations', async () => {
      const result = await sandbox.execute(`
        Promise.resolve('promise-result')
      `);

      expect(result.value).toBe('promise-result');
    });

    testWithVM('should support JSON operations', async () => {
      const result = await sandbox.execute(`
        JSON.parse('{"parsed": true}')
      `);

      expect(result.value).toEqual({ parsed: true });
    });

    testWithVM('should support Math operations', async () => {
      const result = await sandbox.execute('Math.PI');
      expect(result.value).toBe(Math.PI);
    });

    testWithVM('should support Array operations', async () => {
      const result = await sandbox.execute(`
        [1, 2, 3].map(x => x * 2)
      `);

      expect(result.value).toEqual([2, 4, 6]);
    });

    testWithVM('should support Object operations', async () => {
      const result = await sandbox.execute(`
        Object.keys({a: 1, b: 2, c: 3})
      `);

      expect(result.value).toEqual(['a', 'b', 'c']);
    });

    testWithVM('should support String operations', async () => {
      const result = await sandbox.execute(`
        'hello'.toUpperCase()
      `);

      expect(result.value).toBe('HELLO');
    });

    testWithVM('should support Date operations', async () => {
      const result = await sandbox.execute(`
        new Date('2024-01-01').getFullYear()
      `);

      expect(result.value).toBe(2024);
    });

    testWithVM('should support Error handling', async () => {
      const result = await sandbox.execute(`
        try {
          throw new Error('test');
        } catch (e) {
          'error-caught';
        }
      `);

      expect(result.value).toBe('error-caught');
    });
  });

  describe('VM Context Management', () => {
    let sandbox: VMSandboxSimple;

    beforeEach(() => {
      sandbox = new VMSandboxSimple();
    });

    afterEach(async () => {
      await sandbox.dispose();
    });

    testWithVM('should isolate contexts between executions', async () => {
      const result1 = await sandbox.execute('var x = "first"; x');
      const result2 = await sandbox.execute('var x = "second"; x');

      expect(result1.value).toBe('first');
      expect(result2.value).toBe('second');
    });

    testWithVM('should handle nested context objects', async () => {
      const context: VMContext = {
        level1: {
          level2: {
            level3: {
              value: 'nested-value',
            },
          },
        },
      };

      const result = await sandbox.execute('level1.level2.level3.value', context);
      expect(result.value).toBe('nested-value');
    });

    testWithVM('should handle function contexts', async () => {
      const context: VMContext = {
        add: (a: number, b: number) => a + b,
      };

      const result = await sandbox.execute('add(10, 32)', context);
      expect(result.value).toBe(42);
    });
  });

  describe('VM Configuration Tests', () => {
    it('should create VM with custom configuration', () => {
      const config: Partial<VMSandboxConfig> = {
        memoryLimit: 256,
        timeout: 60000,
        enableAsync: false,
        enableGenerators: true,
        maxContextSize: 1024 * 1024,
      };

      const sandbox = new VMSandboxSimple(config);
      const actualConfig = sandbox.getConfig();

      expect(actualConfig.memoryLimit).toBe(256);
      expect(actualConfig.timeout).toBe(60000);
      expect(actualConfig.enableAsync).toBe(false);
      expect(actualConfig.enableGenerators).toBe(true);
      expect(actualConfig.maxContextSize).toBe(1024 * 1024);

      sandbox.dispose();
    });

    it('should use default values for missing configuration', () => {
      const sandbox = new VMSandboxSimple({});
      const config = sandbox.getConfig();

      expect(config.memoryLimit).toBe(128);
      expect(config.timeout).toBe(30000);
      expect(config.enableAsync).toBe(true);
      expect(config.recycleIsolates).toBe(false);

      sandbox.dispose();
    });

    it('should validate configuration limits', () => {
      const config: Partial<VMSandboxConfig> = {
        memoryLimit: 0, // Invalid
        timeout: -1000, // Invalid
      };

      const sandbox = new VMSandboxSimple(config);
      const actualConfig = sandbox.getConfig();

      // Should use defaults for invalid values
      expect(actualConfig.memoryLimit).toBeGreaterThan(0);
      expect(actualConfig.timeout).toBeGreaterThan(0);

      sandbox.dispose();
    });
  });

  describe('VM Resource Manager Tests', () => {
    let resourceManager: VMResourceManager;

    beforeEach(() => {
      resourceManager = new VMResourceManager();
    });

    it('should validate value sizes', () => {
      const smallValue = 'small';
      const validation1 = resourceManager.validateValueSize(smallValue);
      expect(validation1.valid).toBe(true);

      const largeValue = 'x'.repeat(2000000); // 2MB string
      const validation2 = resourceManager.validateValueSize(largeValue);
      expect(validation2.valid).toBe(false);
      expect(validation2.error).toContain('too long');
    });

    it('should validate array lengths', () => {
      const smallArray = new Array(100).fill(1);
      const validation1 = resourceManager.validateValueSize(smallArray);
      expect(validation1.valid).toBe(true);

      const largeArray = new Array(200000).fill(1);
      const validation2 = resourceManager.validateValueSize(largeArray);
      expect(validation2.valid).toBe(false);
      expect(validation2.error).toContain('too large');
    });

    it('should track execution statistics', () => {
      const stats = resourceManager.getStatistics();
      expect(stats.activeExecutions).toBe(0);
      expect(stats.totalMemoryUsed).toBe(0);
      expect(stats.averageWallTime).toBe(0);
      expect(stats.longestRunning).toBe(0);
    });

    it('should create resource-limited wrappers', () => {
      const longString = 'x'.repeat(2000000);
      const wrapped = resourceManager.createResourceLimitedWrapper(longString);

      expect(typeof wrapped).toBe('string');
      expect((wrapped as string).length).toBeLessThan(longString.length);
      expect((wrapped as string).endsWith('...')).toBe(true);
    });
  });
});
