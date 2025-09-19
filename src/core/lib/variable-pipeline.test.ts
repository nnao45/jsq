import { describe, expect, it } from 'vitest';
import type { JsqOptions } from '../../types/cli';
import { type ApplicationContext, createApplicationContext } from '../application-context';
import { ExpressionEvaluator } from './evaluator';
import { ExpressionTransformer } from './expression-transformer';

describe('Variable Pipeline Declaration', () => {
  const appContext = createApplicationContext();
  describe('hasVariablePipelineDeclaration', () => {
    it('should detect const variable pipeline', () => {
      const expr = "const a = 'hello' | a.toUpperCase()";
      expect(ExpressionTransformer.hasVariablePipelineDeclaration(expr)).toBe(true);
    });

    it('should detect let variable pipeline', () => {
      const expr = 'let b = [1,2,3] | b.length';
      expect(ExpressionTransformer.hasVariablePipelineDeclaration(expr)).toBe(true);
    });

    it('should not detect regular variable declaration', () => {
      const expr = "const a = 'hello'";
      expect(ExpressionTransformer.hasVariablePipelineDeclaration(expr)).toBe(false);
    });

    it('should not detect regular expression', () => {
      const expr = '$.users.map(u => u.name)';
      expect(ExpressionTransformer.hasVariablePipelineDeclaration(expr)).toBe(false);
    });

    it('should handle complex initial values', () => {
      const expr = 'const data = $.users.filter(u => u.active) | data.length';
      expect(ExpressionTransformer.hasVariablePipelineDeclaration(expr)).toBe(true);
    });
  });

  describe('transformVariablePipelineDeclaration', () => {
    it('should transform const variable pipeline to IIFE', () => {
      const expr = "const a = 'hello' | a.toUpperCase()";
      const result = ExpressionTransformer.transformVariablePipelineDeclaration(expr);

      expect(result).toContain('(() => {');
      expect(result).toContain("let a = 'hello';");
      expect(result).toContain('return a.toUpperCase();');
      expect(result).toContain('})()');
    });

    it('should transform let variable pipeline to IIFE', () => {
      const expr = 'let nums = [1,2,3] | nums.filter(x => x > 1)';
      const result = ExpressionTransformer.transformVariablePipelineDeclaration(expr);

      expect(result).toContain('(() => {');
      expect(result).toContain('let nums = [1,2,3];');
      expect(result).toContain('return nums.filter(x => x > 1);');
      expect(result).toContain('})()');
    });

    it('should include ChainableWrapper unwrapping logic', () => {
      const expr = 'const data = $.users | data.length';
      const result = ExpressionTransformer.transformVariablePipelineDeclaration(expr);

      expect(result).toContain("if (data && typeof data === 'object'");
      expect(result).toContain('data.value !== undefined');
      expect(result).toContain('data.valueOf()');
    });

    it('should handle complex pipeline expressions', () => {
      const expr = "const result = $.users.map(u => u.name) | result.join(', ')";
      const result = ExpressionTransformer.transformVariablePipelineDeclaration(expr);

      expect(result).toContain('let result = $.users.map(u => u.name);');
      expect(result).toContain("return result.join(', ');");
    });
  });

  describe('transformExpression integration', () => {
    it('should transform variable pipeline through main transform function', () => {
      const expr = "const x = 'test' | x.length";
      const result = ExpressionTransformer.transform(expr, appContext.expressionCache);

      expect(result).toContain('(() => {');
      expect(result).toContain("let x = 'test';");
      expect(result).toContain('return x.length;');
    });

    it('should not interfere with regular expressions', () => {
      const expr = '$.users.map(u => u.name)';
      const result = ExpressionTransformer.transform(expr, appContext.expressionCache);

      expect(result).toBe(expr);
    });

    it('should not interfere with regular pipe expressions', () => {
      const expr = '$.users | $.map(u => u.name)';
      const result = ExpressionTransformer.transform(expr, appContext.expressionCache);

      // Should be transformed by regular pipe logic, not variable pipeline
      expect(result).not.toContain('(() => {');
    });

    it('should handle variable declaration with method chain followed by pipe', () => {
      const expr = 'const ages = $.users.pluck("age") | ages.sum()';
      const result = ExpressionTransformer.transform(expr, appContext.expressionCache);

      expect(result).toContain('(() => {');
      expect(result).toContain('let ages = $.users.pluck("age");');
      expect(result).toContain('return ages.sum();');
    });

    it('should handle multiple method chains in variable pipeline', () => {
      const expr =
        'const filtered = $.users.filter(u => u.active).map(u => u.name) | filtered.join(", ")';
      const result = ExpressionTransformer.transform(expr, appContext.expressionCache);

      expect(result).toContain('(() => {');
      expect(result).toContain('let filtered = $.users.filter(u => u.active).map(u => u.name);');
      expect(result).toContain('return filtered.join(", ");');
    });

    it('should handle variable pipeline with newline', () => {
      const expr = 'const ages = $.users.pluck("age") |\nages.sum()';
      const result = ExpressionTransformer.transform(expr, appContext.expressionCache);

      expect(result).toContain('(() => {');
      expect(result).toContain('let ages = $.users.pluck("age");');
      expect(result).toContain('return ages.sum();');
    });
  });
});

describe('Variable Pipeline with SmartDollar Integration', () => {
  let evaluator: ExpressionEvaluator;
  let appContext: ApplicationContext;

  beforeEach(() => {
    const options: JsqOptions = {
      verbose: false,
      stream: false,
    };
    appContext = createApplicationContext();
    evaluator = new ExpressionEvaluator(options, appContext);
  });

  afterEach(async () => {
    await evaluator.dispose();
    await appContext.dispose();
  });

  it('should execute variable pipeline with pluck and sum correctly', async () => {
    const data = { users: [{ age: 25 }, { age: 30 }] };
    const result = await evaluator.evaluate('const ages = $.users.pluck("age") | ages.sum()', data);

    expect(result).toBe(55);
  });

  it('should execute variable pipeline with filter, pluck, and sum correctly', async () => {
    const data = {
      users: [
        { name: 'Alice', age: 25, active: true },
        { name: 'Bob', age: 30, active: false },
        { name: 'Charlie', age: 35, active: true },
      ],
    };
    const result = await evaluator.evaluate(
      'const activeAges = $.users.filter(u => u.active).pluck("age") | activeAges.sum()',
      data
    );

    expect(result).toBe(60); // 25 + 35
  });

  it('should execute variable pipeline with multiple operations', async () => {
    const data = {
      orders: [
        { product: 'A', quantity: 2, price: 10 },
        { product: 'B', quantity: 1, price: 20 },
        { product: 'C', quantity: 3, price: 5 },
      ],
    };
    const result = await evaluator.evaluate(
      'const totals = $.orders.map(o => o.quantity * o.price) | totals.sum()',
      data
    );

    expect(result).toBe(55); // 20 + 20 + 15
  });

  it('should execute variable pipeline with newline correctly', async () => {
    const data = { users: [{ age: 25 }, { age: 30 }] };
    const result = await evaluator.evaluate(
      'const ages = $.users.pluck("age") |\nages.sum()',
      data
    );

    expect(result).toBe(55);
  });

  it('should execute variable pipeline with newline and indentation correctly', async () => {
    const data = { users: [{ age: 25 }, { age: 30 }] };
    const result = await evaluator.evaluate(
      'const ages = $.users.pluck("age") |\n  ages.sum()',
      data
    );

    expect(result).toBe(55);
  });
});
