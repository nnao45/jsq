import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { JsqOptions } from '@/types/cli';
import { ExpressionEvaluator } from './evaluator';

describe('ExpressionEvaluator', () => {
  let evaluator: ExpressionEvaluator;
  let mockOptions: JsqOptions;

  beforeEach(() => {
    mockOptions = {
      debug: false,
      verbose: false,
      unsafe: false,
      use: undefined,
    };
    evaluator = new ExpressionEvaluator(mockOptions);
  });

  describe('Basic expression evaluation', () => {
    it('should evaluate simple expressions with $ syntax', async () => {
      const data = { name: 'Alice', age: 30 };
      const result = await evaluator.evaluate('$.name', data);
      expect(result).toBe('Alice');
    });

    it('should evaluate expressions using data variable for backward compatibility', async () => {
      const data = { name: 'Alice', age: 30 };
      const result = await evaluator.evaluate('data.name', data);
      expect(result).toBe('Alice');
    });

    it('should handle array data with $ syntax', async () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const result = await evaluator.evaluate('$.filter(u => u.age > 27).length', data);
      expect(result).toBe(1);
    });

    it('should handle complex chaining operations', async () => {
      const data = {
        users: [
          { name: 'Alice', age: 30, department: 'engineering' },
          { name: 'Bob', age: 25, department: 'design' },
          { name: 'Charlie', age: 35, department: 'engineering' },
        ],
      };

      const result = await evaluator.evaluate(
        `
        $.users
          .filter(u => u.department === 'engineering')
          .sortBy('age')
          .pluck('name')
      `,
        data
      );

      expect(result).toEqual(['Alice', 'Charlie']);
    });
  });

  describe('Built-in utilities', () => {
    it('should provide lodash-like utilities via _', async () => {
      const data = [1, 2, 3, 2, 4, 3, 1];
      const result = await evaluator.evaluate('_.uniq(data)', data);
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it('should provide groupBy utility', async () => {
      const data = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
      ];

      const result = await evaluator.evaluate('_.groupBy(data, item => item.category)', data);
      expect(result).toEqual({
        A: [
          { category: 'A', value: 1 },
          { category: 'A', value: 3 },
        ],
        B: [{ category: 'B', value: 2 }],
      });
    });

    it('should provide sortBy utility', async () => {
      const data = [
        { name: 'Charlie', age: 35 },
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];

      const result = await evaluator.evaluate('_.sortBy(data, u => u.age)', data);
      expect(result).toEqual([
        { name: 'Bob', age: 25 },
        { name: 'Alice', age: 30 },
        { name: 'Charlie', age: 35 },
      ]);
    });

    it('should provide chunk utility', async () => {
      const data = [1, 2, 3, 4, 5, 6, 7];
      const result = await evaluator.evaluate('_.chunk(data, 3)', data);
      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });
  });

  describe('Error handling', () => {
    it('should handle syntax errors gracefully', async () => {
      const data = { value: 42 };

      await expect(evaluator.evaluate('invalid syntax +++', data)).rejects.toThrow(
        'Expression evaluation failed'
      );
    });

    it('should handle runtime errors', async () => {
      const data = { value: 42 };

      await expect(evaluator.evaluate('$.nonexistent.property.access', data)).rejects.toThrow(
        'Expression evaluation failed'
      );
    });

    it('should provide meaningful error messages', async () => {
      const data = { value: 42 };

      try {
        await evaluator.evaluate('throw new Error("Custom error")', data);
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('Expression evaluation failed');
      }
    });
  });

  describe('ChainableWrapper integration', () => {
    it('should automatically unwrap ChainableWrapper results', async () => {
      const data = { numbers: [1, 2, 3, 4, 5] };

      // This returns a ChainableWrapper internally, but should be unwrapped
      const result = await evaluator.evaluate('$.numbers.filter(n => n > 3)', data);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([4, 5]);
    });

    it('should handle nested chainable operations', async () => {
      const data = {
        departments: [
          {
            name: 'Engineering',
            employees: [
              { name: 'Alice', salary: 70000 },
              { name: 'Bob', salary: 80000 },
            ],
          },
          {
            name: 'Design',
            employees: [
              { name: 'Charlie', salary: 60000 },
              { name: 'David', salary: 65000 },
            ],
          },
        ],
      };

      const result = await evaluator.evaluate(
        `
        $.departments
          .map(dept => dept.employees.map(emp => emp.salary))
          .map(salaries => salaries.reduce((sum, sal) => sum + sal, 0))
      `,
        data
      );

      expect(result).toEqual([150000, 125000]); // Sum of salaries per department
    });
  });

  describe('Context variables', () => {
    it('should provide standard JavaScript globals', async () => {
      const data = { date: '2023-01-01T00:00:00Z' };

      const result = await evaluator.evaluate('new Date($.date).getFullYear()', data);
      expect(result).toBe(2023);
    });

    it('should provide JSON utilities', async () => {
      const data = { obj: { name: 'Alice', age: 30 } };

      const result = await evaluator.evaluate('JSON.stringify($.obj)', data);
      expect(result).toBe('{"name":"Alice","age":30}');
    });

    it('should provide Math utilities', async () => {
      const data = { numbers: [1, 5, 3, 9, 2] };

      const result = await evaluator.evaluate('Math.max(...$.numbers)', data);
      expect(result).toBe(9);
    });
  });

  describe('Console handling', () => {
    it('should always allow console.log', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const data = { value: 42 };
      await evaluator.evaluate('console.log("test"); $.value', data);

      expect(consoleSpy).toHaveBeenCalledWith('test');

      consoleSpy.mockRestore();
    });

    it('should return correct value with console.log', async () => {
      const verboseEvaluator = new ExpressionEvaluator({ ...mockOptions, verbose: true });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const data = { value: 42 };
      const result = await verboseEvaluator.evaluate('console.log("test"); $.value', data);

      expect(result).toBe(42);
      expect(consoleSpy).toHaveBeenCalledWith('test');

      consoleSpy.mockRestore();
    });
  });

  describe('Complex real-world scenarios', () => {
    it('should handle log processing scenario', async () => {
      const data = {
        logs: [
          { timestamp: '2023-01-01T10:00:00Z', level: 'info', message: 'Server started' },
          {
            timestamp: '2023-01-01T10:05:00Z',
            level: 'error',
            message: 'Database connection failed',
          },
          { timestamp: '2023-01-01T10:10:00Z', level: 'warn', message: 'High memory usage' },
          { timestamp: '2023-01-01T10:15:00Z', level: 'error', message: 'Request timeout' },
          { timestamp: '2023-01-01T10:20:00Z', level: 'info', message: 'Database reconnected' },
        ],
      };

      const result = await evaluator.evaluate(
        `
        $.logs.filter(log => log.level === 'error')
      `,
        data
      );

      expect(result).toHaveLength(2);
      expect(result[0].message).toBe('Database connection failed');
    });

    it('should handle data transformation scenario', async () => {
      const data = {
        sales: [
          { product: 'laptop', quantity: 2, price: 999.99, date: '2023-01-15' },
          { product: 'mouse', quantity: 5, price: 29.99, date: '2023-01-15' },
          { product: 'laptop', quantity: 1, price: 999.99, date: '2023-01-16' },
          { product: 'keyboard', quantity: 3, price: 79.99, date: '2023-01-16' },
        ],
      };

      const result = await evaluator.evaluate(
        `
        _.sortBy(
          Object.entries(
            _.groupBy($.sales, sale => sale.product)
          ).map(([product, sales]) => ({
            product,
            totalQuantity: sales.reduce((sum, sale) => sum + sale.quantity, 0),
            totalRevenue: sales.reduce((sum, sale) => sum + (sale.quantity * sale.price), 0)
          })),
          item => -item.totalRevenue
        )
      `,
        data
      );

      expect(result[0].product).toBe('laptop');
      expect(result[0].totalQuantity).toBe(3);
      expect(result[0].totalRevenue).toBeCloseTo(2999.97);
    });

    it.skip('should handle nested object navigation', async () => {
      const data = {
        company: {
          departments: {
            engineering: {
              teams: {
                frontend: {
                  members: [
                    { name: 'Alice', skills: ['react', 'typescript'] },
                    { name: 'Bob', skills: ['vue', 'javascript'] },
                  ],
                },
                backend: {
                  members: [
                    { name: 'Charlie', skills: ['node', 'python'] },
                    { name: 'David', skills: ['java', 'spring'] },
                  ],
                },
              },
            },
          },
        },
      };

      const result = await evaluator.evaluate(
        `
        [$.company.departments.engineering.teams.frontend, $.company.departments.engineering.teams.backend]
          .map(team => team.members)
          .map(members => members.map(member => member.name))
      `,
        data
      );

      expect(result).toEqual([
        ['Alice', 'Bob'],
        ['Charlie', 'David'],
      ]);
    });
  });
});
