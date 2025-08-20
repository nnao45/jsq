import { describe, expect, it } from '@jest/globals';
import type { JsqOptions } from '@/types/cli';
import { ExpressionEvaluator } from './evaluator';

describe('Lodash-like Methods', () => {
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

  describe('Array manipulation methods', () => {
    it('should support uniqBy for unique values by key', async () => {
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 1, name: 'Alice Clone' },
        { id: 3, name: 'Charlie' },
      ];
      const result = await evaluator.evaluate('_.uniqBy(data, item => item.id)', data);
      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]);
    });

    it('should support flattenDeep for nested arrays', async () => {
      const data = [1, [2, [3, [4]], 5]];
      const result = await evaluator.evaluate('_.flattenDeep(data)', data);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should support compact to remove falsy values', async () => {
      const data = [0, 1, false, 2, '', 3, null, 4, undefined, 5];
      const result = await evaluator.evaluate('_.compact(data)', data);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should support takeWhile', async () => {
      const data = [1, 2, 3, 4, 5, 6];
      const result = await evaluator.evaluate('_.takeWhile(data, x => x < 4)', data);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should support dropWhile', async () => {
      const data = [1, 2, 3, 4, 5, 6];
      const result = await evaluator.evaluate('_.dropWhile(data, x => x < 4)', data);
      expect(result).toEqual([4, 5, 6]);
    });

    it('should support shuffle (test that it returns same length)', async () => {
      const data = [1, 2, 3, 4, 5];
      const result = (await evaluator.evaluate('_.shuffle(data)', data)) as number[];
      expect(result).toHaveLength(5);
      expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should support sample', async () => {
      const data = [1, 2, 3, 4, 5];
      const result = await evaluator.evaluate('_.sample(data)', data);
      expect(data).toContain(result);
    });

    it('should support sampleSize', async () => {
      const data = [1, 2, 3, 4, 5];
      const result = (await evaluator.evaluate('_.sampleSize(data, 3)', data)) as number[];
      expect(result).toHaveLength(3);
      for (const item of result) {
        expect(data).toContain(item);
      }
    });

    it('should support orderBy with multiple keys', async () => {
      const data = [
        { name: 'Alice', age: 30, score: 95 },
        { name: 'Bob', age: 25, score: 85 },
        { name: 'Charlie', age: 30, score: 90 },
      ];
      const result = await evaluator.evaluate(
        "_.orderBy(data, ['age', 'score'], ['desc', 'asc'])",
        data
      );
      expect(result).toEqual([
        { name: 'Charlie', age: 30, score: 90 },
        { name: 'Alice', age: 30, score: 95 },
        { name: 'Bob', age: 25, score: 85 },
      ]);
    });

    it('should support countBy', async () => {
      const data = ['apple', 'banana', 'apple', 'cherry', 'banana', 'apple'];
      const result = await evaluator.evaluate('_.countBy(data, item => item)', data);
      expect(result).toEqual({
        apple: 3,
        banana: 2,
        cherry: 1,
      });
    });

    it('should support keyBy', async () => {
      const data = [
        { id: 'a', name: 'Alice' },
        { id: 'b', name: 'Bob' },
        { id: 'c', name: 'Charlie' },
      ];
      const result = await evaluator.evaluate('_.keyBy(data, item => item.id)', data);
      expect(result).toEqual({
        a: { id: 'a', name: 'Alice' },
        b: { id: 'b', name: 'Bob' },
        c: { id: 'c', name: 'Charlie' },
      });
    });
  });

  describe('Object manipulation methods', () => {
    it('should support pick to select specific keys', async () => {
      const data = { name: 'Alice', age: 30, email: 'alice@example.com', password: 'secret' };
      const result = await evaluator.evaluate("_.pick(data, ['name', 'email'])", data);
      expect(result).toEqual({ name: 'Alice', email: 'alice@example.com' });
    });

    it('should support omit to exclude specific keys', async () => {
      const data = { name: 'Alice', age: 30, email: 'alice@example.com', password: 'secret' };
      const result = await evaluator.evaluate("_.omit(data, ['password'])", data);
      expect(result).toEqual({ name: 'Alice', age: 30, email: 'alice@example.com' });
    });

    it('should support invert to swap keys and values', async () => {
      const data = { a: 1, b: 2, c: 3 };
      const result = await evaluator.evaluate('_.invert(data)', data);
      expect(result).toEqual({ '1': 'a', '2': 'b', '3': 'c' });
    });

    it('should support merge to combine objects', async () => {
      const data = { a: 1, b: 2 };
      const result = await evaluator.evaluate('_.merge(data, { b: 3, c: 4 }, { d: 5 })', data);
      expect(result).toEqual({ a: 1, b: 3, c: 4, d: 5 });
    });

    it('should support defaults for default values', async () => {
      const data = { a: 1 };
      const result = await evaluator.evaluate(
        '_.defaults(data, { a: 2, b: 2 }, { b: 3, c: 3 })',
        data
      );
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should support fromPairs', async () => {
      const data = [
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ];
      const result = await evaluator.evaluate('_.fromPairs(data)', data);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('Collection methods', () => {
    it('should support size for arrays and objects', async () => {
      const arrayData = [1, 2, 3, 4, 5];
      const arrayResult = await evaluator.evaluate('_.size(data)', arrayData);
      expect(arrayResult).toBe(5);

      const objectData = { a: 1, b: 2, c: 3 };
      const objectResult = await evaluator.evaluate('_.size(data)', objectData);
      expect(objectResult).toBe(3);
    });

    it('should support isEmpty', async () => {
      const emptyArray = [];
      const emptyResult = await evaluator.evaluate('_.isEmpty(data)', emptyArray);
      expect(emptyResult).toBe(true);

      const nonEmptyArray = [1, 2, 3];
      const nonEmptyResult = await evaluator.evaluate('_.isEmpty(data)', nonEmptyArray);
      expect(nonEmptyResult).toBe(false);

      const emptyObject = {};
      const emptyObjResult = await evaluator.evaluate('_.isEmpty(data)', emptyObject);
      expect(emptyObjResult).toBe(true);
    });

    it('should support includes for arrays and objects', async () => {
      const arrayData = [1, 2, 3, 4, 5];
      const arrayResult = await evaluator.evaluate('_.includes(data, 3)', arrayData);
      expect(arrayResult).toBe(true);

      const objectData = { a: 1, b: 2, c: 3 };
      const objectResult = await evaluator.evaluate('_.includes(data, 2)', objectData);
      expect(objectResult).toBe(true);
    });
  });

  describe('Mathematical methods', () => {
    it('should support mean for average calculation', async () => {
      const data = [1, 2, 3, 4, 5];
      const result = await evaluator.evaluate('_.mean(data)', data);
      expect(result).toBe(3);
    });

    it('should support min and max', async () => {
      const data = [3, 1, 4, 1, 5, 9, 2, 6];
      const minResult = await evaluator.evaluate('_.min(data)', data);
      const maxResult = await evaluator.evaluate('_.max(data)', data);
      expect(minResult).toBe(1);
      expect(maxResult).toBe(9);
    });

    it('should support minBy and maxBy', async () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ];
      const minResult = await evaluator.evaluate('_.minBy(data, item => item.age)', data);
      const maxResult = await evaluator.evaluate('_.maxBy(data, item => item.age)', data);
      expect(minResult).toEqual({ name: 'Bob', age: 25 });
      expect(maxResult).toEqual({ name: 'Charlie', age: 35 });
    });

    it('should support clamp', async () => {
      const data = 15;
      const result1 = await evaluator.evaluate('_.clamp(data, 5, 10)', data);
      const result2 = await evaluator.evaluate('_.clamp(3, 5, 10)', data);
      const result3 = await evaluator.evaluate('_.clamp(7, 5, 10)', data);
      expect(result1).toBe(10); // clamped to max
      expect(result2).toBe(5); // clamped to min
      expect(result3).toBe(7); // within range
    });
  });

  describe('String manipulation methods', () => {
    it('should support camelCase', async () => {
      const data = 'hello-world_test case';
      const result = await evaluator.evaluate('_.camelCase(data)', data);
      expect(result).toBe('helloWorldTestCase');
    });

    it('should support kebabCase', async () => {
      const data = 'HelloWorldTest';
      const result = await evaluator.evaluate('_.kebabCase(data)', data);
      expect(result).toBe('hello-world-test');
    });

    it('should support snakeCase', async () => {
      const data = 'HelloWorldTest';
      const result = await evaluator.evaluate('_.snakeCase(data)', data);
      expect(result).toBe('hello_world_test');
    });

    it('should support startCase', async () => {
      const data = 'hello-world_test';
      const result = await evaluator.evaluate('_.startCase(data)', data);
      expect(result).toBe('Hello World Test');
    });

    it('should support capitalize', async () => {
      const data = 'hello WORLD';
      const result = await evaluator.evaluate('_.capitalize(data)', data);
      expect(result).toBe('Hello world');
    });
  });

  describe('Utility methods', () => {
    it('should support times', async () => {
      const data = 3;
      const result = await evaluator.evaluate('_.times(data, i => i * 2)', data);
      expect(result).toEqual([0, 2, 4]);
    });

    it('should support range', async () => {
      const result1 = await evaluator.evaluate('_.range(5)', {});
      const result2 = await evaluator.evaluate('_.range(1, 5)', {});
      const result3 = await evaluator.evaluate('_.range(0, 10, 2)', {});
      expect(result1).toEqual([0, 1, 2, 3, 4]);
      expect(result2).toEqual([1, 2, 3, 4]);
      expect(result3).toEqual([0, 2, 4, 6, 8]);
    });

    it('should support identity', async () => {
      const data = { name: 'Alice', age: 30 };
      const result = await evaluator.evaluate('_.identity(data)', data);
      expect(result).toEqual(data);
    });

    it('should support constant', async () => {
      const data = 'test';
      const result = await evaluator.evaluate('_.constant(42)()', data);
      expect(result).toBe(42);
    });

    it('should support random (test that it returns a number in range)', async () => {
      const data = {};
      const result1 = (await evaluator.evaluate('_.random()', data)) as number;
      const result2 = (await evaluator.evaluate('_.random(10, 20)', data)) as number;
      expect(result1).toBeGreaterThanOrEqual(0);
      expect(result1).toBeLessThanOrEqual(1);
      expect(result2).toBeGreaterThanOrEqual(10);
      expect(result2).toBeLessThanOrEqual(20);
    });
  });

  describe('Chainable wrapper integration', () => {
    it('should support chaining new lodash methods', async () => {
      const data = [
        { category: 'A', value: 10, active: true },
        { category: 'B', value: 20, active: false },
        { category: 'A', value: 15, active: true },
        { category: 'C', value: 5, active: true },
        { category: 'B', value: 25, active: true },
      ];

      // Complex chaining with new methods
      const result = await evaluator.evaluate(
        `
        $.filter(item => item.active)
          .groupBy(item => item.category)
          .entries()
          .map(([category, items]) => ({
            category,
            totalValue: items.reduce((sum, item) => sum + item.value, 0),
            count: items.length
          }))
          .orderBy(['totalValue'], ['desc'])
      `,
        data
      );

      expect(result).toEqual([
        { category: 'A', totalValue: 25, count: 2 },
        { category: 'B', totalValue: 25, count: 1 },
        { category: 'C', totalValue: 5, count: 1 },
      ]);
    });

    it('should support chainable compact and flatten', async () => {
      const data = [1, null, [2, 3], undefined, [4, [5, 6]], 0];
      const result = await evaluator.evaluate(
        `
        $.compact().flattenDeep()
      `,
        data
      );
      expect(result).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should support chainable statistical operations', async () => {
      const data = [
        { score: 85, category: 'A' },
        { score: 92, category: 'B' },
        { score: 78, category: 'A' },
        { score: 95, category: 'B' },
        { score: 88, category: 'A' },
      ];

      const result = await evaluator.evaluate(
        `
        $.groupBy(item => item.category)
          .entries()
          .map(([category, items]) => ({
            category,
            avgScore: items.reduce((sum, item) => sum + item.score, 0) / items.length,
            minScore: items.reduce((min, item) => item.score < min ? item.score : min, Infinity),
            maxScore: items.reduce((max, item) => item.score > max ? item.score : max, -Infinity)
          }))
      `,
        data
      );

      expect(result).toEqual([
        { category: 'A', avgScore: 83.66666666666667, minScore: 78, maxScore: 88 },
        { category: 'B', avgScore: 93.5, minScore: 92, maxScore: 95 },
      ]);
    });
  });
});
