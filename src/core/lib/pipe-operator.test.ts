import { describe, expect, it } from 'vitest';
import type { JsqOptions } from '../../types/cli';
import { ExpressionEvaluator } from './evaluator';
import { ExpressionTransformer } from './expression-transformer';

describe('Pipe Operator Support', () => {
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    const options: JsqOptions = {
      safe: false,
      verbose: false,
      debug: false,
      stream: false,
      jsonLines: false,
    };
    evaluator = new ExpressionEvaluator(options);
  });

  afterEach(async () => {
    await evaluator.dispose();
  });

  describe('ExpressionTransformer.transformPipeExpression', () => {
    it('should handle simple pipe to $', () => {
      const expression = '$.users | $';
      const transformed = ExpressionTransformer.transform(expression);
      expect(transformed).toBe('($.users)');
    });

    it('should handle pipe to method call', () => {
      const expression = '$.users | $.filter(u => u.age > 25)';
      const transformed = ExpressionTransformer.transform(expression);
      expect(transformed).toBe('($.users).filter(u => u.age > 25)');
    });

    it('should handle multiple pipe operations', () => {
      const expression = '$.data | $.filter(n => n > 3) | $.map(n => n * 2)';
      const transformed = ExpressionTransformer.transform(expression);
      expect(transformed).toBe('(($.data).filter(n => n > 3)).map(n => n * 2)');
    });

    it('should handle pipe to property access', () => {
      const expression = '$.users | $.length';
      const transformed = ExpressionTransformer.transform(expression);
      expect(transformed).toBe('($.users).length');
    });

    it('should handle complex pipe with nested expressions', () => {
      const expression = '$.products | $.filter(p => p.price > 100) | $.sortBy("name") | $.take(5)';
      const transformed = ExpressionTransformer.transform(expression);
      expect(transformed).toBe(
        '((($.products).filter(p => p.price > 100)).sortBy("name")).take(5)'
      );
    });
  });

  describe('Pipe operator integration tests', () => {
    it('should execute simple pipe to $ correctly', async () => {
      const data = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
      const result = await evaluator.evaluate('$.users | $', data);

      expect(result).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
    });

    it('should execute pipe with filter correctly', async () => {
      const data = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
          { name: 'Charlie', age: 35 },
        ],
      };
      const result = await evaluator.evaluate('$.users | $.filter(u => u.age > 25)', data);

      expect(result).toEqual([
        { name: 'Alice', age: 30 },
        { name: 'Charlie', age: 35 },
      ]);
    });

    it('should execute pipe with pluck correctly', async () => {
      const data = {
        users: [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Bob', email: 'bob@example.com' },
        ],
      };
      const result = await evaluator.evaluate('$.users | $.pluck("name")', data);

      expect(result).toEqual(['Alice', 'Bob']);
    });

    it('should execute multiple pipe operations correctly', async () => {
      const data = { data: [1, 2, 3, 4, 5, 6] };
      const result = await evaluator.evaluate(
        '$.data | $.filter(n => n > 3) | $.map(n => n * 2)',
        data
      );

      expect(result).toEqual([8, 10, 12]);
    });

    it('should execute complex chained pipe operations', async () => {
      const data = {
        products: [
          { name: 'Laptop', price: 1200, category: 'electronics' },
          { name: 'Mouse', price: 25, category: 'electronics' },
          { name: 'Book', price: 15, category: 'books' },
          { name: 'Phone', price: 800, category: 'electronics' },
        ],
      };

      const result = await evaluator.evaluate(
        '$.products | $.filter(p => p.category === "electronics") | $.filter(p => p.price > 100) | $.pluck("name")',
        data
      );

      expect(result).toEqual(['Laptop', 'Phone']);
    });

    it('should handle pipe with aggregation operations', async () => {
      const data = {
        orders: [{ amount: 100 }, { amount: 250 }, { amount: 75 }],
      };
      const result = await evaluator.evaluate('$.orders | $.sum("amount")', data);

      expect(result).toBe(425);
    });

    it('should handle pipe with sortBy and take', async () => {
      const data = {
        scores: [
          { player: 'Alice', score: 95 },
          { player: 'Bob', score: 87 },
          { player: 'Charlie', score: 92 },
          { player: 'David', score: 89 },
        ],
      };

      const result = await evaluator.evaluate(
        '$.scores | $.sortBy("score") | $.take(2) | $.pluck("player")',
        data
      );

      expect(result).toEqual(['Bob', 'David']);
    });

    it('should handle pipe with where clause', async () => {
      const data = {
        items: [
          { id: 1, status: 'active', type: 'A' },
          { id: 2, status: 'inactive', type: 'B' },
          { id: 3, status: 'active', type: 'A' },
          { id: 4, status: 'active', type: 'B' },
        ],
      };

      const result = await evaluator.evaluate(
        '$.items | $.where("status", "active") | $.where("type", "A") | $.pluck("id")',
        data
      );

      expect(result).toEqual([1, 3]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty arrays in pipe operations', async () => {
      const data = { users: [] };
      const result = await evaluator.evaluate('$.users | $.filter(u => u.age > 25)', data);

      expect(result).toEqual([]);
    });

    it('should handle null data in pipe operations', async () => {
      const data = { users: null };

      // This should handle gracefully and return undefined or null
      const result = await evaluator.evaluate('$.users | $', data);
      expect(result).toBeNull();
    });

    it('should handle pipe operations on primitive values', async () => {
      const data = { count: 42 };
      const result = await evaluator.evaluate('$.count | $', data);

      expect(result).toBe(42);
    });

    it('should handle deeply nested pipe operations', async () => {
      const data = {
        departments: [
          {
            name: 'Engineering',
            employees: [
              { name: 'Alice', projects: [{ name: 'Project A', status: 'active' }] },
              { name: 'Bob', projects: [{ name: 'Project B', status: 'completed' }] },
            ],
          },
        ],
      };

      // Test nested property access with pipe
      const result = await evaluator.evaluate('$.departments | $.pluck("employees")', data);

      expect(result).toEqual([
        [
          { name: 'Alice', projects: [{ name: 'Project A', status: 'active' }] },
          { name: 'Bob', projects: [{ name: 'Project B', status: 'completed' }] },
        ],
      ]);
    });
  });

  describe('Pipe operator parsing', () => {
    it('should correctly split pipe expressions', () => {
      const parts = ExpressionTransformer.splitByPipe(
        '$.users | $.filter(u => u.name.includes("A")) | $.length'
      );
      expect(parts).toEqual(['$.users', '$.filter(u => u.name.includes("A"))', '$.length']);
    });

    it('should handle pipes inside strings correctly', () => {
      const parts = ExpressionTransformer.splitByPipe('$.users | $.filter(u => u.name === "A|B")');
      expect(parts).toEqual(['$.users', '$.filter(u => u.name === "A|B")']);
    });

    it('should handle pipes inside parentheses correctly', () => {
      const parts = ExpressionTransformer.splitByPipe('$.users | $.filter(u => (u.age | 0) > 25)');
      expect(parts).toEqual(['$.users', '$.filter(u => (u.age | 0) > 25)']);
    });
  });

  describe('Utility function pipe transformations', () => {
    it('should transform pipe to utility function correctly', () => {
      const expression = '$ | _.range(5)';
      const transformed = ExpressionTransformer.transform(expression);
      expect(transformed).toBe('_.range(5)');
    });

    it('should transform pipe to lodash function correctly', () => {
      const expression = '$ | lodash.range(5)';
      const transformed = ExpressionTransformer.transform(expression);
      expect(transformed).toBe('lodash.range(5)');
    });

    it('should transform pipe to function call correctly', () => {
      const expression = '$ | Math.max(1, 2, 3)';
      const transformed = ExpressionTransformer.transform(expression);
      expect(transformed).toBe('Math.max(1, 2, 3)');
    });

    it('should handle complex utility function pipes', () => {
      const expression = '$ | _.range(10) | $.filter(x => x % 2 === 0)';
      const transformed = ExpressionTransformer.transform(expression);
      expect(transformed).toBe('(_.range(10)).filter(x => x % 2 === 0)');
    });

    it('should differentiate between utility functions and method calls', () => {
      const expression = '$.data | someMethod()';
      const transformed = ExpressionTransformer.transform(expression);
      expect(transformed).toBe('($.data).someMethod()');
    });
  });

  describe('Pipe operator integration with utility functions', () => {
    it('should execute pipe to utility function with null input', async () => {
      const result = await evaluator.evaluate('$ | _.range(5)', null);
      expect(result).toEqual([0, 1, 2, 3, 4]);
    });

    it('should execute complex pipe with utility function', async () => {
      const result = await evaluator.evaluate('$ | _.range(1, 6) | $.map(x => x * x)', null);
      expect(result).toEqual([1, 4, 9, 16, 25]);
    });

    it('should handle mixed pipes with utility functions and data methods', async () => {
      const data = { multiplier: 2 };
      const result = await evaluator.evaluate(
        '$ | _.range(3) | $.map(x => x * $.multiplier)',
        data
      );
      expect(result).toEqual([0, 2, 4]);
    });

    it('should execute utility function without dependency on input data', async () => {
      const result = await evaluator.evaluate('$ | _.times(3, i => i + 1)', null);
      expect(result).toEqual([1, 2, 3]);
    });
  });
});
