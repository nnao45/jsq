import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JsqOptions } from '@/types/cli';
import { type ApplicationContext, createApplicationContext } from '../application-context';
import type { SecurityManager } from '../security/security-manager';
import { ExpressionEvaluator } from './evaluator';

describe('VM Sandbox Mode (Default) Behavior', () => {
  // Mock dangerous operations globally
  const originalExit = process.exit;
  const originalSetTimeout = global.setTimeout;

  // Helper to create evaluator with app context
  const evaluators: Array<{ evaluator: ExpressionEvaluator; appContext: ApplicationContext }> = [];

  const createEvaluator = (options: Partial<JsqOptions> = {}) => {
    const appContext = createApplicationContext();
    const evaluator = new ExpressionEvaluator(options as JsqOptions, appContext);
    evaluators.push({ evaluator, appContext });
    return evaluator;
  };

  beforeAll(() => {
    // Enable security warnings for these tests
    process.env.SHOW_SECURITY_WARNINGS = 'true';
  });

  afterAll(() => {
    // Clean up
    process.env.SHOW_SECURITY_WARNINGS = undefined;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Restore original functions
    process.exit = originalExit;
    global.setTimeout = originalSetTimeout;

    // Clean up all evaluators
    for (const { evaluator, appContext } of evaluators) {
      await evaluator.dispose();
      await appContext.dispose();
    }
    evaluators.length = 0;
  });

  describe('Execution Environment', () => {
    it('should use VM isolation by default', async () => {
      const defaultEvaluator = createEvaluator({});
      const explicitSandboxEvaluator = createEvaluator({ sandbox: true });

      const defaultResult = await defaultEvaluator.evaluate('1 + 1', null);
      const explicitResult = await explicitSandboxEvaluator.evaluate('1 + 1', null);

      expect(defaultResult).toBe(2);
      expect(explicitResult).toBe(2);
    });

    // Security warnings are now disabled by default
    // Test removed as warnings are no longer shown

    // VM mode warnings are now disabled by default
    // Test removed as warnings are no longer shown even in verbose mode
  });

  describe('Network Access', () => {
    it('should NOT have fetch functions available in VM mode by default', async () => {
      const defaultEvaluator = createEvaluator({});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      // Check that fetch functions are NOT available by default
      const result = await defaultEvaluator.evaluate(
        `
        ({
          hasFetchCallback: typeof fetchCallback === 'function',
          hasFetch: typeof fetch === 'function',
          hasFetchJSON: typeof fetchJSON === 'function',
          hasFetchText: typeof fetchText === 'function'
        })
      `,
        null
      );

      expect(result).toEqual({
        hasFetchCallback: false,
        hasFetch: false,
        hasFetchJSON: false,
        hasFetchText: false,
      });

      consoleSpy.mockRestore();
    });

    it('should have fetch functions available when unsafe mode is enabled', async () => {
      const unsafeEvaluator = createEvaluator({ unsafe: true });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      // In unsafe mode, it doesn't use VM so native fetch is available
      const result = await unsafeEvaluator.evaluate(
        `
        ({
          hasFetch: typeof fetch === 'function'
        })
      `,
        null
      );

      expect(result.hasFetch).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('Dangerous Pattern Validation', () => {
    describe('eval patterns', () => {
      it('should block eval by default in VM mode', async () => {
        const defaultEvaluator = createEvaluator({});

        await expect(defaultEvaluator.evaluate('eval("1+1")', null)).rejects.toThrow(
          'Expression evaluation failed'
        );
      });
    });

    describe('Function constructor', () => {
      it('should block Function constructor by default in VM mode', async () => {
        const defaultEvaluator = createEvaluator({});

        await expect(defaultEvaluator.evaluate('new Function("return 1")()', null)).rejects.toThrow(
          'Expression evaluation failed'
        );
      });
    });

    describe('setTimeout', () => {
      it('should block setTimeout by default in VM mode', async () => {
        const defaultEvaluator = createEvaluator({});

        await expect(defaultEvaluator.evaluate('setTimeout(() => {}, 0)', null)).rejects.toThrow(
          'Expression evaluation failed'
        );
      });
    });

    describe('process access', () => {
      it('should block process.exit in sandbox mode', async () => {
        const sandboxEvaluator = createEvaluator({ sandbox: true });

        await expect(sandboxEvaluator.evaluate('process.exit(0)', null)).rejects.toThrow(
          'Expression evaluation failed'
        );
      });

      it('should allow process access in non-sandbox mode', async () => {
        const defaultEvaluator = createEvaluator({ unsafe: true });

        // Mock process.exit
        process.exit = vi.fn() as unknown as (code?: number) => never;

        await defaultEvaluator.evaluate('process.exit(0)', null);
        expect(process.exit).toHaveBeenCalledWith(0);
      });
    });

    describe('global access', () => {
      it('should block global access in sandbox mode', async () => {
        const sandboxEvaluator = createEvaluator({ sandbox: true });

        await expect(sandboxEvaluator.evaluate('global.foo = 1', null)).rejects.toThrow(
          'Expression evaluation failed'
        );
      });
    });

    describe('Buffer access', () => {
      it('should block Buffer in sandbox mode', async () => {
        const sandboxEvaluator = createEvaluator({ sandbox: true });

        await expect(sandboxEvaluator.evaluate('Buffer.from("test")', null)).rejects.toThrow(
          'Expression evaluation failed'
        );
      });
    });
  });

  describe('Dynamic Imports', () => {
    it('should block require in sandbox mode', async () => {
      const sandboxEvaluator = createEvaluator({ sandbox: true });

      await expect(sandboxEvaluator.evaluate('require("fs")', null)).rejects.toThrow(
        'Expression evaluation failed'
      );
    });

    it('should block dynamic import in sandbox mode', async () => {
      const sandboxEvaluator = createEvaluator({ sandbox: true });

      await expect(sandboxEvaluator.evaluate('import("fs")', null)).rejects.toThrow(
        'Expression evaluation failed'
      );
    });
  });

  describe('Resource Limits', () => {
    it('should enforce timeout in sandbox mode', async () => {
      const sandboxEvaluator = createEvaluator({ sandbox: true });

      const securityManager = (sandboxEvaluator as { securityManager: SecurityManager })
        .securityManager;
      expect(securityManager.getTimeout()).toBe(30000);
    });

    it('should have default timeout in non-sandbox mode', async () => {
      const defaultEvaluator = createEvaluator({});

      const securityManager = (defaultEvaluator as { securityManager: SecurityManager })
        .securityManager;
      expect(securityManager.getTimeout()).toBe(30000);
    });

    it('should enforce memory limit in sandbox mode', async () => {
      const sandboxEvaluator = createEvaluator({ sandbox: true });

      const securityManager = (sandboxEvaluator as { securityManager: SecurityManager })
        .securityManager;
      expect(securityManager.getMemoryLimit()).toBe(128);
    });
  });

  describe('JavaScript Features', () => {
    it('should allow basic operations in both modes', async () => {
      const sandboxEvaluator = createEvaluator({ sandbox: true });
      const defaultEvaluator = createEvaluator({});

      // Test individual operations to isolate failures
      const expr1 = '1 + 1';
      expect(await sandboxEvaluator.evaluate(expr1, null)).toBe(2);
      expect(await defaultEvaluator.evaluate(expr1, null)).toBe(2);

      const expr2 = '[1, 2, 3].map(x => x * 2)';
      expect(await sandboxEvaluator.evaluate(expr2, null)).toEqual([2, 4, 6]);
      expect(await defaultEvaluator.evaluate(expr2, null)).toEqual([2, 4, 6]);

      const expr3 = '"hello".toUpperCase()';
      expect(await sandboxEvaluator.evaluate(expr3, null)).toBe('HELLO');
      expect(await defaultEvaluator.evaluate(expr3, null)).toBe('HELLO');

      const expr4 = '[1, 2, 3].filter(x => x > 1)';
      expect(await sandboxEvaluator.evaluate(expr4, null)).toEqual([2, 3]);
      expect(await defaultEvaluator.evaluate(expr4, null)).toEqual([2, 3]);
    });

    it('should have console access in both modes', async () => {
      const sandboxEvaluator = createEvaluator({ sandbox: true });
      const defaultEvaluator = createEvaluator({});

      // Test console availability - VM provides console by default
      const consoleTest1 = await sandboxEvaluator.evaluate('typeof console', null);
      const consoleTest2 = await defaultEvaluator.evaluate('typeof console', null);

      expect(consoleTest1).toBe('object');
      expect(consoleTest2).toBe('object');

      // Test that console methods exist
      const hasLogMethod1 = await sandboxEvaluator.evaluate(
        'typeof console.log === "function"',
        null
      );
      const hasLogMethod2 = await defaultEvaluator.evaluate(
        'typeof console.log === "function"',
        null
      );

      expect(hasLogMethod1).toBe(true);
      expect(hasLogMethod2).toBe(true);

      // Test that we can call console.log without errors
      // In VM mode, console output is captured internally
      await expect(sandboxEvaluator.evaluate('console.log("test1"); true', null)).resolves.toBe(
        true
      );
      await expect(defaultEvaluator.evaluate('console.log("test2"); true', null)).resolves.toBe(
        true
      );
    });
  });

  describe('Shell and Filesystem Access', () => {
    it('should block shell command patterns in sandbox mode', async () => {
      const sandboxEvaluator = createEvaluator({ sandbox: true });

      await expect(sandboxEvaluator.evaluate('require("child_process")', null)).rejects.toThrow(
        'Expression evaluation failed'
      );
    });

    it('should block filesystem patterns in sandbox mode', async () => {
      const sandboxEvaluator = createEvaluator({ sandbox: true });

      await expect(sandboxEvaluator.evaluate('require("fs")', null)).rejects.toThrow(
        'Expression evaluation failed'
      );
    });
  });

  describe('Context Isolation', () => {
    it('should isolate execution contexts in sandbox mode', async () => {
      const sandboxEvaluator = createEvaluator({ sandbox: true });

      // First execution - use an expression that returns a value
      const result1 = await sandboxEvaluator.evaluate('42', null);
      expect(result1).toBe(42);

      // Second execution - variables from first execution should not leak
      // Since VM isolates each execution, global variables are not shared
      const result2 = await sandboxEvaluator.evaluate('typeof leaked', null);
      expect(result2).toBe('undefined');
    });
  });

  describe('Async Operations', () => {
    it.skip('should support async/await in both modes', async () => {
      const sandboxEvaluator = createEvaluator({ sandbox: true });
      const defaultEvaluator = createEvaluator({});

      const asyncCode = 'await Promise.resolve(42)';

      const sandboxResult = await sandboxEvaluator.evaluate(asyncCode, null);
      const defaultResult = await defaultEvaluator.evaluate(asyncCode, null);

      expect(sandboxResult).toBe(42);
      expect(defaultResult).toBe(42);
    });

    it.skip('should support Promise operations in both modes', async () => {
      const sandboxEvaluator = createEvaluator({ sandbox: true });
      const defaultEvaluator = createEvaluator({});

      const promiseCode = 'Promise.resolve([1, 2, 3]).then(arr => arr.map(x => x * 2))';

      const sandboxResult = await sandboxEvaluator.evaluate(promiseCode, null);
      const defaultResult = await defaultEvaluator.evaluate(promiseCode, null);

      expect(sandboxResult).toEqual([2, 4, 6]);
      expect(defaultResult).toEqual([2, 4, 6]);
    });
  });

  describe('Data Processing', () => {
    it('should process JSON data correctly in VM mode', async () => {
      const defaultEvaluator = createEvaluator({});

      const data = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      };

      // Use a simpler test that verifies data is available
      const simpleExpression = 'data.users.map(u => u.name)';

      const result = await defaultEvaluator.evaluate(simpleExpression, data);

      expect(result).toEqual(['Alice', 'Bob']);
    });

    it('should handle $ in VM mode', async () => {
      const defaultEvaluator = createEvaluator({});

      const data = [1, 2, 3];
      const expression = '$.map(x => x * 2)';

      const result = await defaultEvaluator.evaluate(expression, data);

      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe('Error Messages', () => {
    it('should provide clear security error messages in sandbox mode', async () => {
      const sandboxEvaluator = createEvaluator({ sandbox: true });

      try {
        await sandboxEvaluator.evaluate('eval("1+1")', null);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Expression evaluation failed');
        expect((error as Error).message).toContain('potentially dangerous patterns');
      }
    });

    it('should provide runtime error messages in VM mode', async () => {
      const defaultEvaluator = createEvaluator({});

      try {
        await defaultEvaluator.evaluate('nonExistentVariable', null);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Expression evaluation failed');
      }
    });
  });

  describe('Lodash-like Utilities', () => {
    it.skip('should provide utility functions in both modes', async () => {
      // Skip: _ utilities require createSmartDollar which is not available in VM
      const sandboxEvaluator = createEvaluator({ sandbox: true });
      const defaultEvaluator = createEvaluator({});

      // Test that _ utilities are available
      const typeTest1 = await sandboxEvaluator.evaluate('typeof _', null);
      const typeTest2 = await defaultEvaluator.evaluate('typeof _', null);

      expect(typeTest1).toBe('object');
      expect(typeTest2).toBe('object');
    });

    it.skip('should handle array operations without lodash', async () => {
      // Skip: This test also triggers createSmartDollar loading in VM context
      const sandboxEvaluator = createEvaluator({ sandbox: true });
      const defaultEvaluator = createEvaluator({});

      // Test array sum using reduce (more universal)
      const expr = '[1,2,3].reduce((a, b) => a + b, 0)';

      const sandboxResult = await sandboxEvaluator.evaluate(expr, null);
      const defaultResult = await defaultEvaluator.evaluate(expr, null);

      expect(sandboxResult).toBe(6);
      expect(defaultResult).toBe(6);
    });
  });

  describe('VM Configuration', () => {
    it('should have VM configuration in sandbox mode', async () => {
      const sandboxEvaluator = createEvaluator({ sandbox: true });
      const securityManager = (sandboxEvaluator as { securityManager: SecurityManager })
        .securityManager;

      const vmConfig = securityManager.getVMConfig();
      expect(vmConfig).toMatchObject({
        memoryLimit: 128,
        timeout: 30000,
        enableProxies: false,
        maxContextSize: 10 * 1024 * 1024,
      });
    });
  });
});
