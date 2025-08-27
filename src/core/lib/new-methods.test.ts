import { describe, expect, it } from 'vitest';
import { ChainableWrapper } from '../chainable/chainable';
import { ExpressionEvaluator } from './evaluator';
import { createSmartDollar } from './jquery-wrapper';

describe('Newly Added Array Methods', () => {
  describe('chunk method', () => {
    it('should split array into chunks with $', () => {
      const data = [1, 2, 3, 4, 5, 6, 7];
      const $ = createSmartDollar(data) as unknown[] & Record<string, unknown>;
      const result = $.chunk(3) as { value: unknown };
      expect(result.value).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('should split array into chunks with ChainableWrapper', () => {
      const wrapper = new ChainableWrapper([1, 2, 3, 4, 5]);
      const result = wrapper.chunk(2);
      expect(result.value).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle chunk size larger than array', () => {
      const wrapper = new ChainableWrapper([1, 2, 3]);
      const result = wrapper.chunk(10);
      expect(result.value).toEqual([[1, 2, 3]]);
    });

    it('should handle empty array', () => {
      const wrapper = new ChainableWrapper([]);
      const result = wrapper.chunk(2);
      expect(result.value).toEqual([]);
    });
  });

  describe('orderBy method', () => {
    const users = [
      { name: 'Charlie', age: 30, dept: 'Sales' },
      { name: 'Alice', age: 25, dept: 'Engineering' },
      { name: 'Bob', age: 30, dept: 'Engineering' },
      { name: 'David', age: 25, dept: 'Sales' },
    ];

    it('should sort by multiple keys with $', () => {
      const $ = createSmartDollar({ users }) as Record<string, unknown>;
      const result = $.users.orderBy(['age', 'name'], ['asc', 'desc']) as { value: unknown };
      const sorted = result.value as Array<{ name: string; age: number }>;
      expect(sorted[0].name).toBe('David');
      expect(sorted[1].name).toBe('Alice');
      expect(sorted[2].name).toBe('Charlie');
      expect(sorted[3].name).toBe('Bob');
    });

    it('should sort by multiple keys with ChainableWrapper', () => {
      const wrapper = new ChainableWrapper(users);
      const result = wrapper.orderBy(['dept', 'age'], ['asc', 'asc']);
      const sorted = result.value as Array<{ name: string; dept: string; age: number }>;
      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('David');
      expect(sorted[3].name).toBe('Charlie');
    });

    it('should default to ascending when orders not specified', () => {
      const wrapper = new ChainableWrapper(users);
      const result = wrapper.orderBy(['age', 'name']);
      const sorted = result.value as Array<{ name: string; age: number }>;
      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('David');
    });
  });

  describe('uniqBy method', () => {
    it('should remove duplicates by key function', () => {
      const items = [
        { id: 1, value: 'a' },
        { id: 2, value: 'b' },
        { id: 1, value: 'c' },
        { id: 3, value: 'd' },
      ];
      const wrapper = new ChainableWrapper(items);
      const result = wrapper.uniqBy((item: { id: number }) => item.id);
      expect(result.value).toEqual([
        { id: 1, value: 'a' },
        { id: 2, value: 'b' },
        { id: 3, value: 'd' },
      ]);
    });

    it('should work with primitive values', () => {
      const wrapper = new ChainableWrapper([1.1, 1.2, 2.3, 2.4, 3.5]);
      const result = wrapper.uniqBy(Math.floor);
      expect(result.value).toEqual([1.1, 2.3, 3.5]);
    });
  });

  describe('takeWhile and dropWhile methods', () => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8];

    it('should take elements while condition is true', () => {
      const wrapper = new ChainableWrapper(numbers);
      const result = wrapper.takeWhile((n: number) => n < 5);
      expect(result.value).toEqual([1, 2, 3, 4]);
    });

    it('should drop elements while condition is true', () => {
      const wrapper = new ChainableWrapper(numbers);
      const result = wrapper.dropWhile((n: number) => n < 5);
      expect(result.value).toEqual([5, 6, 7, 8]);
    });

    it('should handle takeWhile with no matching elements', () => {
      const wrapper = new ChainableWrapper(numbers);
      const result = wrapper.takeWhile((n: number) => n < 0);
      expect(result.value).toEqual([]);
    });

    it('should handle dropWhile with all matching elements', () => {
      const wrapper = new ChainableWrapper(numbers);
      const result = wrapper.dropWhile((n: number) => n < 10);
      expect(result.value).toEqual([]);
    });
  });

  describe('flattenDeep method', () => {
    it('should flatten deeply nested arrays', () => {
      const nested = [1, [2, [3, [4, [5]]]]];
      const wrapper = new ChainableWrapper(nested);
      const result = wrapper.flattenDeep();
      expect(result.value).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle mixed nested structures', () => {
      const mixed = [1, [2, 3], [[4]], [[[5, 6]]], 7];
      const wrapper = new ChainableWrapper(mixed);
      const result = wrapper.flattenDeep();
      expect(result.value).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe('reverse method', () => {
    it('should reverse an array', () => {
      const wrapper = new ChainableWrapper([1, 2, 3, 4, 5]);
      const result = wrapper.reverse();
      expect(result.value).toEqual([5, 4, 3, 2, 1]);
    });

    it('should handle empty array', () => {
      const wrapper = new ChainableWrapper([]);
      const result = wrapper.reverse();
      expect(result.value).toEqual([]);
    });

    it('should handle single element', () => {
      const wrapper = new ChainableWrapper([42]);
      const result = wrapper.reverse();
      expect(result.value).toEqual([42]);
    });
  });

  describe('skip method', () => {
    it('should skip first n elements', () => {
      const wrapper = new ChainableWrapper([1, 2, 3, 4, 5]);
      const result = wrapper.skip(2);
      expect(result.value).toEqual([3, 4, 5]);
    });

    it('should return empty array when skipping more than length', () => {
      const wrapper = new ChainableWrapper([1, 2, 3]);
      const result = wrapper.skip(10);
      expect(result.value).toEqual([]);
    });

    it('should return original array when skipping 0', () => {
      const wrapper = new ChainableWrapper([1, 2, 3]);
      const result = wrapper.skip(0);
      expect(result.value).toEqual([1, 2, 3]);
    });
  });

  describe('sampleSize method', () => {
    it('should return n random elements', () => {
      const wrapper = new ChainableWrapper([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const result = wrapper.sampleSize(3);
      const samples = result.value as number[];

      expect(samples).toHaveLength(3);
      // All samples should be from original array
      samples.forEach(sample => {
        expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).toContain(sample);
      });
      // Samples should be unique
      expect(new Set(samples).size).toBe(3);
    });

    it('should return all elements when size exceeds array length', () => {
      const wrapper = new ChainableWrapper([1, 2, 3]);
      const result = wrapper.sampleSize(10);
      const samples = result.value as number[];

      expect(samples).toHaveLength(3);
      expect(new Set(samples)).toEqual(new Set([1, 2, 3]));
    });

    it('should return empty array for size 0', () => {
      const wrapper = new ChainableWrapper([1, 2, 3]);
      const result = wrapper.sampleSize(0);
      expect(result.value).toEqual([]);
    });
  });

  describe('includes method', () => {
    it('should check if array includes a value', () => {
      const wrapper = new ChainableWrapper([1, 2, 3, 4, 5]);
      expect(wrapper.includes(3).value).toBe(true);
      expect(wrapper.includes(10).value).toBe(false);
    });

    it('should work with objects', () => {
      const obj = { x: 1 };
      const wrapper = new ChainableWrapper([obj, { y: 2 }]);
      expect(wrapper.includes(obj).value).toBe(true);
      expect(wrapper.includes({ x: 1 }).value).toBe(false); // Different reference
    });

    it('should work with strings', () => {
      const wrapper = new ChainableWrapper(['hello', 'world']);
      expect(wrapper.includes('hello').value).toBe(true);
      expect(wrapper.includes('foo').value).toBe(false);
    });
  });

  describe('invert method', () => {
    it('should invert object keys and values', () => {
      const wrapper = new ChainableWrapper({ a: 1, b: 2, c: 3 });
      const result = wrapper.invert();
      expect(result.value).toEqual({ '1': 'a', '2': 'b', '3': 'c' });
    });

    it('should handle duplicate values by keeping last key', () => {
      const wrapper = new ChainableWrapper({ a: 1, b: 2, c: 1 });
      const result = wrapper.invert();
      expect(result.value).toEqual({ '1': 'c', '2': 'b' });
    });

    it('should return empty object for non-objects', () => {
      const wrapper = new ChainableWrapper([1, 2, 3]);
      const result = wrapper.invert();
      expect(result.value).toEqual({});
    });
  });

  describe('minBy and maxBy methods', () => {
    const items = [
      { name: 'apple', price: 1.5 },
      { name: 'banana', price: 0.8 },
      { name: 'cherry', price: 2.0 },
      { name: 'date', price: 1.2 },
    ];

    it('should find minimum by key function', () => {
      const wrapper = new ChainableWrapper(items);
      const result = wrapper.minBy((item: { price: number }) => item.price);
      expect(result.value).toEqual({ name: 'banana', price: 0.8 });
    });

    it('should find maximum by key function', () => {
      const wrapper = new ChainableWrapper(items);
      const result = wrapper.maxBy((item: { price: number }) => item.price);
      expect(result.value).toEqual({ name: 'cherry', price: 2.0 });
    });

    it('should handle empty arrays', () => {
      const wrapper = new ChainableWrapper([]);
      expect(wrapper.minBy((x: number) => x).value).toBeUndefined();
      expect(wrapper.maxBy((x: number) => x).value).toBeUndefined();
    });
  });

  describe('countBy method', () => {
    it('should count occurrences by key function', () => {
      const items = [
        { type: 'fruit', name: 'apple' },
        { type: 'vegetable', name: 'carrot' },
        { type: 'fruit', name: 'banana' },
        { type: 'fruit', name: 'orange' },
        { type: 'vegetable', name: 'lettuce' },
      ];
      const wrapper = new ChainableWrapper(items);
      const result = wrapper.countBy((item: { type: string }) => item.type);
      expect(result.value).toEqual({ fruit: 3, vegetable: 2 });
    });

    it('should work with primitive values', () => {
      const wrapper = new ChainableWrapper([1.1, 1.2, 2.3, 2.4, 3.5]);
      const result = wrapper.countBy(Math.floor);
      expect(result.value).toEqual({ '1': 2, '2': 2, '3': 1 });
    });
  });

  describe('keyBy method', () => {
    it('should create object keyed by function result', () => {
      const items = [
        { id: 'a1', name: 'Alice' },
        { id: 'b2', name: 'Bob' },
        { id: 'c3', name: 'Charlie' },
      ];
      const wrapper = new ChainableWrapper(items);
      const result = wrapper.keyBy((item: { id: string }) => item.id);
      expect(result.value).toEqual({
        a1: { id: 'a1', name: 'Alice' },
        b2: { id: 'b2', name: 'Bob' },
        c3: { id: 'c3', name: 'Charlie' },
      });
    });

    it('should overwrite duplicates with last value', () => {
      const items = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
      ];
      const wrapper = new ChainableWrapper(items);
      const result = wrapper.keyBy((item: { category: string }) => item.category);
      expect(result.value).toEqual({
        A: { category: 'A', value: 3 },
        B: { category: 'B', value: 2 },
      });
    });
  });
});

describe('Built-in _ utilities vs $ methods parity', () => {
  const evaluator = new ExpressionEvaluator({ verbose: false });

  it('should have same chunk behavior', async () => {
    const data = [1, 2, 3, 4, 5];

    // Test with _
    const underscoreResult = await evaluator.evaluate('_.chunk(data, 2)', data);
    expect(underscoreResult).toEqual([[1, 2], [3, 4], [5]]);

    // Test with $ (via ChainableWrapper)
    const wrapper = new ChainableWrapper(data);
    const dollarResult = wrapper.chunk(2);
    expect(dollarResult.value).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should have same uniqBy behavior', async () => {
    const data = [1.1, 1.2, 2.3, 2.4, 3.5];

    // Test with _
    const underscoreResult = await evaluator.evaluate('_.uniqBy(data, Math.floor)', data);
    expect(underscoreResult).toEqual([1.1, 2.3, 3.5]);

    // Test with $ (via ChainableWrapper)
    const wrapper = new ChainableWrapper(data);
    const dollarResult = wrapper.uniqBy(Math.floor);
    expect(dollarResult.value).toEqual([1.1, 2.3, 3.5]);
  });

  it('should have same orderBy behavior', async () => {
    const data = [
      { name: 'Charlie', age: 30 },
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 },
    ];

    // Test with _
    const underscoreResult = await evaluator.evaluate(
      '_.orderBy(data, ["age", "name"], ["asc", "desc"])',
      data
    );
    const underscoreNames = (underscoreResult as Array<{ name: string }>).map(u => u.name);
    expect(underscoreNames).toEqual(['Alice', 'Charlie', 'Bob']);

    // Test with $ (via ChainableWrapper)
    const wrapper = new ChainableWrapper(data);
    const dollarResult = wrapper.orderBy(['age', 'name'], ['asc', 'desc']);
    const dollarNames = (dollarResult.value as Array<{ name: string }>).map(u => u.name);
    expect(dollarNames).toEqual(['Alice', 'Charlie', 'Bob']);
  });

  it('should have same groupBy behavior', async () => {
    const data = [
      { name: 'Alice', dept: 'Eng' },
      { name: 'Bob', dept: 'Sales' },
      { name: 'Carol', dept: 'Eng' },
    ];

    // Test with _
    const underscoreResult = await evaluator.evaluate('_.groupBy(data, item => item.dept)', data);
    expect(underscoreResult).toHaveProperty('Eng');
    expect(underscoreResult).toHaveProperty('Sales');
    expect((underscoreResult as Record<string, unknown[]>).Eng).toHaveLength(2);

    // Test with $ (via ChainableWrapper)
    const wrapper = new ChainableWrapper(data);
    const dollarResult = wrapper.groupBy((item: { dept: string }) => item.dept);
    expect(dollarResult.value).toHaveProperty('Eng');
    expect(dollarResult.value).toHaveProperty('Sales');
    expect((dollarResult.value as Record<string, unknown[]>).Eng).toHaveLength(2);
  });

  it('should have same flatten behavior', async () => {
    const data = [1, [2, 3], [[4]], 5];

    // Test with _
    const underscoreResult = await evaluator.evaluate('_.flatten(data)', data);
    expect(underscoreResult).toEqual([1, 2, 3, [4], 5]);

    // Test with $ (via ChainableWrapper)
    const wrapper = new ChainableWrapper(data);
    const dollarResult = wrapper.flatten();
    expect(dollarResult.value).toEqual([1, 2, 3, [4], 5]);
  });

  it('should have same compact behavior', async () => {
    const data = [0, 1, false, 2, '', 3, null, undefined, 4];

    // Test with _
    const underscoreResult = await evaluator.evaluate('_.compact(data)', data);
    expect(underscoreResult).toEqual([1, 2, 3, 4]);

    // Test with $ (via ChainableWrapper)
    const wrapper = new ChainableWrapper(data);
    const dollarResult = wrapper.compact();
    expect(dollarResult.value).toEqual([1, 2, 3, 4]);
  });
});
