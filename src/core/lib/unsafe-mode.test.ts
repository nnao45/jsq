import { beforeEach, describe, expect, it } from 'vitest';
import type { JsqOptions } from '@/types/cli';
import { createApplicationContext } from '../application-context';
import { SecurityManager } from '../security/security-manager';
import { ExpressionEvaluator } from './evaluator';

describe.skip('Unsafe Mode', () => {
  let evaluator: ExpressionEvaluator;
  let unsafeOptions: JsqOptions;
  let safeOptions: JsqOptions;

  beforeEach(() => {
    unsafeOptions = {
      debug: false,
      verbose: false,
      unsafe: true,
    };
    safeOptions = {
      debug: false,
      verbose: false,
      unsafe: false,
    };
  });

  describe('Security Manager Configuration', () => {
    it('should disable VM in unsafe mode', () => {
      const manager = new SecurityManager(unsafeOptions);
      expect(manager.shouldUseVM()).toBe(false);
    });

    it('should enable VM in safe mode', () => {
      const manager = new SecurityManager(safeOptions);
      expect(manager.shouldUseVM()).toBe(true);
    });

    it('should allow all operations in unsafe mode', () => {
      const manager = new SecurityManager(unsafeOptions);
      const context = manager.getSecurityContext();

      expect(context.level.allowNetwork).toBe(true);
      expect(context.level.allowShell).toBe(true);
      expect(context.level.allowFileSystem).toBe(true);
      expect(context.level.allowDynamicImports).toBe(true);
      expect(context.level.timeout).toBeUndefined();
    });

    it('should restrict operations in safe mode', () => {
      const manager = new SecurityManager(safeOptions);
      const context = manager.getSecurityContext();

      expect(context.level.allowNetwork).toBe(false);
      expect(context.level.allowShell).toBe(false);
      expect(context.level.allowFileSystem).toBe(false);
      expect(context.level.allowDynamicImports).toBe(false);
      expect(context.level.timeout).toBe(30000);
    });
  });

  describe('Expression Validation', () => {
    it('should skip validation in unsafe mode', () => {
      const manager = new SecurityManager(unsafeOptions);
      const result = manager.validateExpression('eval("dangerous code")');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate expressions in safe mode', () => {
      const manager = new SecurityManager(safeOptions);
      const result = manager.validateExpression('eval("dangerous code")');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Expression Execution', () => {
    it('should execute without VM in unsafe mode', async () => {
      const appContext = createApplicationContext();
      evaluator = new ExpressionEvaluator(unsafeOptions, appContext);
      const data = { value: 42 };

      // Test that we can access native functions directly
      const result = await evaluator.evaluate('Math.max($.value, 100)', data);
      expect(result).toBe(100);
      await appContext.dispose();
    });

    it('should handle async expressions in unsafe mode', async () => {
      const appContext = createApplicationContext();
      evaluator = new ExpressionEvaluator(unsafeOptions, appContext);
      const data = { numbers: [1, 2, 3] };

      const result = await evaluator.evaluate(
        'await Promise.resolve($.numbers.map(n => n * 2))',
        data
      );
      expect(result).toEqual([2, 4, 6]);
      await appContext.dispose();
    });

    it('should access all global objects in unsafe mode', async () => {
      const appContext = createApplicationContext();
      evaluator = new ExpressionEvaluator(unsafeOptions, appContext);
      const data = {};

      // Test access to various global objects
      const result = await evaluator.evaluate(
        `{
          hasDate: typeof Date !== 'undefined',
          hasMath: typeof Math !== 'undefined',
          hasArray: typeof Array !== 'undefined',
          hasObject: typeof Object !== 'undefined',
          hasJSON: typeof JSON !== 'undefined',
          hasConsole: typeof console !== 'undefined'
        }`,
        data
      );

      expect(result).toEqual({
        hasDate: true,
        hasMath: true,
        hasArray: true,
        hasObject: true,
        hasJSON: true,
        hasConsole: true,
      });
      await appContext.dispose();
    });

    it('should have no timeout in unsafe mode', async () => {
      const appContext = createApplicationContext();
      evaluator = new ExpressionEvaluator(unsafeOptions, appContext);
      const data = { count: 5 };

      // This would timeout in safe mode but should work in unsafe mode
      const result = await evaluator.evaluate(
        `(() => {
          let sum = 0;
          for (let i = 0; i < $.count * 1000; i++) {
            sum += i;
          }
          return sum;
        })()`,
        data
      );

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
      await appContext.dispose();
    });
  });

  describe('Lodash utilities in unsafe mode', () => {
    it('should provide lodash utilities in unsafe mode', async () => {
      const appContext = createApplicationContext();
      evaluator = new ExpressionEvaluator(unsafeOptions, appContext);
      const data = [3, 1, 4, 1, 5, 9, 2, 6];

      const result = await evaluator.evaluate('_.sortBy(data, n => n)', data);
      expect(result).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);
      await appContext.dispose();
    });

    it('should perform complex array operations in unsafe mode', async () => {
      const appContext = createApplicationContext();
      evaluator = new ExpressionEvaluator(unsafeOptions, appContext);
      const data = [5, 1, 3, 2, 4];

      const result = await evaluator.evaluate(`_.take(_.sortBy($, n => n), 3)`, data);

      expect(result).toEqual([1, 2, 3]);
      await appContext.dispose();
    });
  });

  describe('Error handling', () => {
    it('should handle syntax errors in unsafe mode', async () => {
      const appContext = createApplicationContext();
      evaluator = new ExpressionEvaluator(unsafeOptions, appContext);
      const data = {};

      await expect(evaluator.evaluate('$.invalid syntax', data)).rejects.toThrow();
      await appContext.dispose();
    });

    it('should return undefined for null property access in unsafe mode', async () => {
      const appContext = createApplicationContext();
      evaluator = new ExpressionEvaluator(unsafeOptions, appContext);
      const data = { value: null };

      const result = await evaluator.evaluate('$.value?.nonexistent?.property', data);
      expect(result).toBeUndefined();
      await appContext.dispose();
    });
  });

  describe('Memory cleanup', () => {
    it('should properly dispose evaluator in unsafe mode', async () => {
      const appContext = createApplicationContext();
      evaluator = new ExpressionEvaluator(unsafeOptions, appContext);
      await evaluator.dispose();
      await appContext.dispose();

      // Should not throw when disposing
      expect(true).toBe(true);
    });
  });
});
