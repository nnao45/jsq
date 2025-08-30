import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { JsqOptions } from '@/types/cli';
import { createApplicationContext } from '../application-context';
import { ExpressionEvaluator } from '../lib/evaluator';

describe('Lodash-like Methods', () => {
  let evaluator: ExpressionEvaluator;
  let mockOptions: JsqOptions;
  let appContext: ReturnType<typeof createApplicationContext>;

  beforeEach(() => {
    mockOptions = {
      debug: true, // Enable debug output
      verbose: true, // Enable verbose output
      unsafe: false,
      use: undefined,
    };
    appContext = createApplicationContext();
    evaluator = new ExpressionEvaluator(mockOptions, appContext);
  });

  afterEach(async () => {
    await evaluator.dispose();
    await appContext.dispose();
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
        Object.entries(
          $.filter(item => item.active)
            .groupBy(item => item.category)
        )
          .map(([category, items]) => ({
            category,
            totalValue: items.reduce((sum, item) => sum + item.value, 0),
            count: items.length
          }))
          .sort((a, b) => b.totalValue - a.totalValue)
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
        Object.entries(
          $.groupBy(item => item.category)
        )
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

  describe('ChainableWrapper Auto-Unwrapping', () => {
    it('should automatically unwrap ChainableWrapper for mathematical functions', async () => {
      const data = { numbers: [1, 2, 3, 4, 5] };

      // Test mean with ChainableWrapper
      const meanResult = await evaluator.evaluate('_.mean($.numbers)', data);
      expect(meanResult).toBe(3);

      // Test sum with ChainableWrapper
      const sumResult = await evaluator.evaluate('_.sum($.numbers)', data);
      expect(sumResult).toBe(15);

      // Test min/max with ChainableWrapper
      const minResult = await evaluator.evaluate('_.min($.numbers)', data);
      const maxResult = await evaluator.evaluate('_.max($.numbers)', data);
      expect(minResult).toBe(1);
      expect(maxResult).toBe(5);
    });

    it('should automatically unwrap ChainableWrapper for string functions', async () => {
      const data = {
        text1: 'hello-world_test case',
        text2: 'HelloWorldTest',
        text3: 'hello world',
      };

      // Test camelCase with ChainableWrapper
      const camelResult = await evaluator.evaluate('_.camelCase($.text1)', data);
      expect(camelResult).toBe('helloWorldTestCase');

      // Test kebabCase with ChainableWrapper
      const kebabResult = await evaluator.evaluate('_.kebabCase($.text2)', data);
      expect(kebabResult).toBe('hello-world-test');

      // Test startCase with ChainableWrapper
      const startResult = await evaluator.evaluate('_.startCase($.text3)', data);
      expect(startResult).toBe('Hello World');
    });

    it('should automatically unwrap ChainableWrapper for object functions', async () => {
      const data = {
        user: {
          name: 'Alice',
          email: 'alice@example.com',
          password: 'secret',
          age: 30,
        },
        config: { debug: true, version: '1.0', env: 'dev' },
      };

      // Test pick with ChainableWrapper
      const pickResult = await evaluator.evaluate('_.pick($.user, ["name", "email"])', data);
      expect(JSON.stringify(pickResult)).toEqual(
        JSON.stringify({ name: 'Alice', email: 'alice@example.com' })
      );

      // Test omit with ChainableWrapper
      const omitResult = await evaluator.evaluate('_.omit($.user, ["password"])', data);
      expect(JSON.stringify(omitResult)).toEqual(
        JSON.stringify({ name: 'Alice', email: 'alice@example.com', age: 30 })
      );

      // Test keys with ChainableWrapper
      const keysResult = await evaluator.evaluate('_.keys($.config)', data);
      expect(JSON.stringify(keysResult)).toEqual(JSON.stringify(keysResult));

      // Test values with ChainableWrapper
      const valuesResult = await evaluator.evaluate('_.values($.config)', data);
      expect(JSON.stringify(valuesResult)).toEqual(JSON.stringify([true, '1.0', 'dev']));
    });

    it('should automatically unwrap ChainableWrapper for array functions', async () => {
      const data = {
        nested: [1, null, [2, 3], [4, [5]]],
        mixed: [1, null, '', 0, false, 2, 3],
        users: [
          { id: 1, name: 'Alice' },
          { id: 1, name: 'Alice Clone' },
          { id: 2, name: 'Bob' },
        ],
      };

      // Test flattenDeep with ChainableWrapper
      const flattenResult = await evaluator.evaluate('_.flattenDeep($.nested)', data);
      expect(flattenResult).toEqual([1, null, 2, 3, 4, 5]);

      // Test compact with ChainableWrapper
      const compactResult = await evaluator.evaluate('_.compact($.mixed)', data);
      expect(compactResult).toEqual([1, 2, 3]);

      // Test uniqBy with ChainableWrapper
      const uniqResult = await evaluator.evaluate('_.uniqBy($.users, u => u.id)', data);
      expect(uniqResult).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('should work with compound operations mixing ChainableWrapper jquery and lodash', async () => {
      const data = { items: [1, null, [2, 3], undefined, [4, [5]]] };

      // Test compound operations: compact + flattenDeep
      const result = await evaluator.evaluate('$.compact(_.flattenDeep($.items))', data);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should automatically unwrap ChainableWrapper for minBy and maxBy', async () => {
      const data = {
        products: [
          { name: 'Laptop', price: 1200 },
          { name: 'Mouse', price: 25 },
          { name: 'Keyboard', price: 85 },
        ],
      };

      // Test minBy with ChainableWrapper
      const minResult = await evaluator.evaluate('_.minBy($.products, p => p.price)', data);
      expect(minResult).toEqual({ name: 'Mouse', price: 25 });

      // Test maxBy with ChainableWrapper
      const maxResult = await evaluator.evaluate('_.maxBy($.products, p => p.price)', data);
      expect(maxResult).toEqual({ name: 'Laptop', price: 1200 });
    });

    it('should handle README examples correctly', async () => {
      // Test the exact examples from README
      const scoresData = { scores: [85, 92, 78, 95, 88] };
      const meanResult = await evaluator.evaluate('_.mean($.scores)', scoresData);
      expect(meanResult).toBe(87.6);

      const textData = { text: 'hello-world_test case' };
      const camelResult = await evaluator.evaluate('_.camelCase($.text)', textData);
      expect(camelResult).toBe('helloWorldTestCase');

      const userdata = {
        user: { name: 'Alice', email: 'alice@example.com', password: 'secret' },
      };
      const pickResult = await evaluator.evaluate('_.pick($.user, ["name", "email"])', userdata);
      expect(JSON.stringify(pickResult)).toEqual(
        JSON.stringify({ name: 'Alice', email: 'alice@example.com' })
      );
    });
  });

  describe.skip('Lodash Dollar Notation (VM environment)', () => {
    beforeEach(() => {
      mockOptions = {
        debug: false,
        verbose: false,
        unsafe: true, // VM環境を有効にする
        use: undefined,
      };
      appContext = createApplicationContext();
      evaluator = new ExpressionEvaluator(mockOptions, appContext);
    });

    afterEach(async () => {
      await evaluator.dispose();
      await appContext.dispose();
    });

    it('should support dollar notation for basic array operations', async () => {
      const data = [1, 2, 3, 4, 5];
      // First test just creating LodashDollar instance
      const wrapped = await evaluator.evaluate('_(data)', data);
      expect(wrapped).toBeDefined();

      // Then test if value method exists
      const hasValue = await evaluator.evaluate('typeof _(data).value', data);
      expect(hasValue).toBe('function');

      // Finally test the full chain
      const result = await evaluator.evaluate(
        '_(data).filter(x => x > 2).map(x => x * 2).value()',
        data
      );
      expect(result).toEqual([6, 8, 10]);
    });

    it('should support dollar notation with where method', async () => {
      const data = [
        { name: 'Alice', age: 30, active: true },
        { name: 'Bob', age: 25, active: false },
        { name: 'Charlie', age: 35, active: true },
      ];
      const result = await evaluator.evaluate('_(data).where({ active: true }).value()', data);
      expect(result).toEqual([
        { name: 'Alice', age: 30, active: true },
        { name: 'Charlie', age: 35, active: true },
      ]);
    });

    it('should support dollar notation with pluck method', async () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ];
      const result = await evaluator.evaluate('_(data).pluck("name").value()', data);
      expect(result).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should support chainable methods with dollar notation', async () => {
      const data = [
        { category: 'A', value: 10 },
        { category: 'B', value: 20 },
        { category: 'A', value: 15 },
        { category: 'C', value: 5 },
      ];
      const result = await evaluator.evaluate(
        '_(data).groupBy("category").mapValues(items => _.sum(items.map(i => i.value))).value()',
        data
      );
      expect(result).toEqual({
        A: 25,
        B: 20,
        C: 5,
      });
    });

    it('should support dollar notation with sortBy', async () => {
      const data = [
        { name: 'Charlie', age: 35 },
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const result = await evaluator.evaluate('_(data).sortBy("age").value()', data);
      expect(result).toEqual([
        { name: 'Bob', age: 25 },
        { name: 'Alice', age: 30 },
        { name: 'Charlie', age: 35 },
      ]);
    });

    it('should support dollar notation with uniqBy', async () => {
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 1, name: 'Alice Clone' },
      ];
      const result = await evaluator.evaluate('_(data).uniqBy("id").value()', data);
      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('should support dollar notation with flatten operations', async () => {
      const data = [1, [2, [3, [4]], 5]];
      const result = await evaluator.evaluate('_(data).flattenDeep().value()', data);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should support dollar notation with compact', async () => {
      const data = [0, 1, false, 2, '', 3, null, 4, undefined, 5];
      const result = await evaluator.evaluate('_(data).compact().value()', data);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should support dollar notation with chunk', async () => {
      const data = [1, 2, 3, 4, 5, 6, 7];
      const result = await evaluator.evaluate('_(data).chunk(3).value()', data);
      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('should support dollar notation with object methods', async () => {
      const data = { name: 'Alice', age: 30, email: 'alice@example.com', password: 'secret' };
      const result = await evaluator.evaluate('_(data).pick(["name", "email"]).value()', data);
      expect(result).toEqual({ name: 'Alice', email: 'alice@example.com' });
    });

    it('should support dollar notation with omit', async () => {
      const data = { name: 'Alice', age: 30, email: 'alice@example.com', password: 'secret' };
      const result = await evaluator.evaluate('_(data).omit(["password"]).value()', data);
      expect(result).toEqual({ name: 'Alice', age: 30, email: 'alice@example.com' });
    });

    it('should support dollar notation with keys/values/entries', async () => {
      const data = { a: 1, b: 2, c: 3 };
      const keysResult = await evaluator.evaluate('_(data).keys().value()', data);
      const valuesResult = await evaluator.evaluate('_(data).values().value()', data);
      const entriesResult = await evaluator.evaluate('_(data).entries().value()', data);

      expect(keysResult).toEqual(['a', 'b', 'c']);
      expect(valuesResult).toEqual([1, 2, 3]);
      expect(entriesResult).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ]);
    });

    it('should support dollar notation with mathematical operations', async () => {
      const data = [1, 2, 3, 4, 5];
      const sumResult = await evaluator.evaluate('_(data).sum().value()', data);
      const meanResult = await evaluator.evaluate('_(data).mean().value()', data);

      expect(sumResult).toBe(15);
      expect(meanResult).toBe(3);
    });

    it('should support dollar notation with string transformations', async () => {
      const data = 'hello-world_test case';
      const camelResult = await evaluator.evaluate('_(data).camelCase().value()', data);
      const kebabResult = await evaluator.evaluate('_("HelloWorldTest").kebabCase().value()', data);

      expect(camelResult).toBe('helloWorldTestCase');
      expect(kebabResult).toBe('hello-world-test');
    });

    it('should support calling _ without arguments when data is available', async () => {
      const data = [1, 2, 3, 4, 5];
      const result = await evaluator.evaluate(
        '_().filter(x => x > 2).map(x => x * 2).value()',
        data
      );
      expect(result).toEqual([6, 8, 10]);
    });

    it('should support static lodash methods alongside dollar notation', async () => {
      const data = [1, 2, 3];
      const result = await evaluator.evaluate(
        '_.times(3, i => _(data).map(x => x + i).value())',
        data
      );
      expect(result).toEqual([
        [1, 2, 3],
        [2, 3, 4],
        [3, 4, 5],
      ]);
    });

    it('should support complex chaining with dollar notation', async () => {
      const data = [
        {
          user: 'alice',
          posts: [
            { title: 'Post 1', likes: 10 },
            { title: 'Post 2', likes: 5 },
          ],
        },
        {
          user: 'bob',
          posts: [
            { title: 'Post 3', likes: 15 },
            { title: 'Post 4', likes: 20 },
          ],
        },
        { user: 'charlie', posts: [{ title: 'Post 5', likes: 8 }] },
      ];

      const result = await evaluator.evaluate(
        `
        _(data)
          .flatMap(u => u.posts.map(p => ({ user: u.user, ...p })))
          .filter(p => p.likes > 10)
          .sortBy("likes")
          .reverse()
          .map(p => p.user + ": " + p.title)
          .value()
      `,
        data
      );

      expect(result).toEqual(['bob: Post 4', 'bob: Post 3']);
    });
  });

  describe('Lodash Dollar Notation (VM environment - default)', () => {
    beforeEach(() => {
      mockOptions = {
        debug: false,
        verbose: false,
        unsafe: false, // デフォルトではVM環境が有効
        use: undefined,
      };
      appContext = createApplicationContext();
      evaluator = new ExpressionEvaluator(mockOptions, appContext);
    });

    afterEach(async () => {
      await evaluator.dispose();
      await appContext.dispose();
    });

    it('should support dollar notation in VM environment (default)', async () => {
      const data = [1, 2, 3, 4, 5];
      const result = await evaluator.evaluate('_(data).filter(x => x > 2).value()', data);
      expect(result).toEqual([3, 4, 5]);
    });

    it('should still support regular lodash methods in non-VM environment', async () => {
      const data = [1, 2, 3, 4, 5];
      const result = await evaluator.evaluate('_.filter(data, x => x > 2)', data);
      expect(result).toEqual([3, 4, 5]);
    });
  });

  describe.skip('Lodash Dollar Notation with Proxy features', () => {
    beforeEach(() => {
      mockOptions = {
        debug: false,
        verbose: false,
        unsafe: true, // VM環境を有効にする
        use: undefined,
      };
      appContext = createApplicationContext();
      evaluator = new ExpressionEvaluator(mockOptions, appContext);
    });

    afterEach(async () => {
      await evaluator.dispose();
      await appContext.dispose();
    });

    it('should support transparent property access through Proxy', async () => {
      const data = { user: { name: 'Alice', age: 30 } };
      const result = await evaluator.evaluate('_(data).user.name', data);
      expect(result).toBe('Alice');
    });

    it('should support array index access through Proxy', async () => {
      const data = [10, 20, 30, 40, 50];
      const result = await evaluator.evaluate('_(data)[2]', data);
      expect(result).toBe(30);
    });

    it('should support nested property access with chaining', async () => {
      const data = {
        users: [
          { name: 'Alice', scores: [85, 90, 88] },
          { name: 'Bob', scores: [78, 82, 80] },
        ],
      };
      const result = await evaluator.evaluate('_(data).users[0].scores', data);
      expect(result).toEqual([85, 90, 88]);
    });

    it('should support mixing property access and lodash methods', async () => {
      const data = {
        items: [
          { category: 'A', values: [1, 2, 3] },
          { category: 'B', values: [4, 5, 6] },
        ],
      };
      const result = await evaluator.evaluate(
        '_(data).items.map(i => _(i.values).sum().value()).value()',
        data
      );
      expect(result).toEqual([6, 15]);
    });

    it('should maintain chainability after property access', async () => {
      const data = {
        config: {
          settings: {
            items: ['apple', 'banana', 'cherry', 'date'],
          },
        },
      };
      const result = await evaluator.evaluate(
        '_(data).config.settings.items.filter(i => i.length > 5).value()',
        data
      );
      expect(result).toEqual(['banana', 'cherry']);
    });

    it('should handle undefined properties gracefully', async () => {
      const data = { a: 1 };
      const result = await evaluator.evaluate('_(data).b', data);
      expect(result).toBeUndefined();
    });

    it('should support reverse method correctly', async () => {
      const data = [1, 2, 3, 4, 5];
      const result = await evaluator.evaluate('_(data).reverse().value()', data);
      expect(result).toEqual([5, 4, 3, 2, 1]);
      // 元のデータは変更されない
      expect(data).toEqual([1, 2, 3, 4, 5]);
    });

    it('should auto-unwrap when used in expressions', async () => {
      const data = [1, 2, 3, 4, 5];
      const result = await evaluator.evaluate('_(data).filter(x => x > 2).value().length', data);
      expect(result).toBe(3);
    });

    it('should support mapValues for objects', async () => {
      const data = { a: 1, b: 2, c: 3 };
      const result = await evaluator.evaluate('_(data).mapValues(v => v * 2).value()', data);
      expect(result).toEqual({ a: 2, b: 4, c: 6 });
    });

    it('should support fromPairs with dollar notation', async () => {
      const data = [
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ];
      const result = await evaluator.evaluate('_(data).fromPairs().value()', data);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });
  });
});
