import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApplicationContext } from '../application-context';
import { ChainableWrapper } from '../chainable/chainable';
import { JsqProcessor } from './processor';

describe('Simple integration tests for new methods', () => {
  let processor: JsqProcessor;
  let appContext: ApplicationContext;

  beforeEach(() => {
    appContext = new ApplicationContext();
    processor = new JsqProcessor({ verbose: false }, appContext);
  });

  afterEach(async () => {
    await processor.dispose();
    await appContext.dispose();
  });

  describe('Basic method functionality', () => {
    it('should use chunk method', async () => {
      const data = [1, 2, 3, 4, 5];
      const result = await processor.process('$.chunk(2)', JSON.stringify(data));
      expect(result.data).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should use flatMap method', async () => {
      const data = [[1, 2], [3, 4], [5]];
      const result = await processor.process(
        '$.flatMap(arr => arr.map(x => x * 2))',
        JSON.stringify(data)
      );
      expect(result.data).toEqual([2, 4, 6, 8, 10]);
    });

    it('should use mapValues method with ChainableWrapper', () => {
      const wrapper = new ChainableWrapper({ a: 1, b: 2, c: 3 });
      const result = wrapper.mapValues((x: number) => x * 2);
      expect(result.value).toEqual({ a: 2, b: 4, c: 6 });
    });

    it('should use takeWhile method', async () => {
      const data = [1, 2, 3, 4, 5, 6];
      const result = await processor.process('$.takeWhile(x => x < 4)', JSON.stringify(data));
      expect(result.data).toEqual([1, 2, 3]);
    });

    it('should use dropWhile method', async () => {
      const data = [1, 2, 3, 4, 5, 6];
      const result = await processor.process('$.dropWhile(x => x < 4)', JSON.stringify(data));
      expect(result.data).toEqual([4, 5, 6]);
    });

    it('should use reverse method', async () => {
      const data = [1, 2, 3, 4, 5];
      const result = await processor.process('$.reverse()', JSON.stringify(data));
      expect(result.data).toEqual([5, 4, 3, 2, 1]);
    });

    it('should use uniqBy method', async () => {
      const data = [1.1, 1.2, 2.3, 2.4, 3.5];
      const result = await processor.process('$.uniqBy(Math.floor)', JSON.stringify(data));
      expect(result.data).toEqual([1.1, 2.3, 3.5]);
    });

    it('should use orderBy method', async () => {
      const data = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
      ];
      const result = await processor.process(
        '$.orderBy(["age", "name"], ["asc", "desc"])',
        JSON.stringify(data)
      );
      const names = (result.data as Array<{ name: string }>).map(u => u.name);
      expect(names).toEqual(['Alice', 'Charlie', 'Bob']);
    });

    it('should use includes method', async () => {
      const data = [1, 2, 3, 4, 5];
      const result1 = await processor.process('$.includes(3)', JSON.stringify(data));
      const result2 = await processor.process('$.includes(10)', JSON.stringify(data));
      expect(result1.data).toBe(true);
      expect(result2.data).toBe(false);
    });

    it('should use sampleSize method', async () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = await processor.process('$.sampleSize(3)', JSON.stringify(data));
      const samples = result.data as number[];
      expect(samples).toHaveLength(3);
      // All samples should be from original array
      samples.forEach(sample => {
        expect(data).toContain(sample);
      });
    });
  });

  describe('Method chaining', () => {
    it('should chain multiple methods together', async () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = await processor.process(
        '$.filter(x => x % 2 === 0).chunk(2).reverse()',
        JSON.stringify(data)
      );
      expect(result.data).toEqual([[10], [6, 8], [2, 4]]);
    });

    it('should work with groupBy', async () => {
      const data = [
        { category: 'A', value: 10 },
        { category: 'B', value: 20 },
        { category: 'A', value: 30 },
      ];
      const result = await processor.process(
        '$.groupBy(item => item.category)',
        JSON.stringify(data)
      );
      const grouped = result.data as Record<string, Array<{ value: number }>>;
      expect(grouped.A).toHaveLength(2);
      expect(grouped.B).toHaveLength(1);
      expect(grouped.A[0].value).toBe(10);
      expect(grouped.A[1].value).toBe(30);
    });

    it('should work with flatMap and sortBy', async () => {
      const data = [{ numbers: [3, 1, 4] }, { numbers: [2, 7, 5] }];
      const result = await processor.process(
        '$.flatMap(obj => obj.numbers).sortBy(x => x)',
        JSON.stringify(data)
      );
      expect(result.data).toEqual([1, 2, 3, 4, 5, 7]);
    });
  });

  describe('Statistical and utility methods', () => {
    it('should use minBy and maxBy', async () => {
      const data = [
        { name: 'apple', price: 1.5 },
        { name: 'banana', price: 0.8 },
        { name: 'orange', price: 2.0 },
      ];

      const minResult = await processor.process(
        '$.minBy(item => item.price)',
        JSON.stringify(data)
      );
      const maxResult = await processor.process(
        '$.maxBy(item => item.price)',
        JSON.stringify(data)
      );

      expect((minResult.data as { name: string }).name).toBe('banana');
      expect((maxResult.data as { name: string }).name).toBe('orange');
    });

    it('should use countBy method', async () => {
      const data = ['apple', 'banana', 'apple', 'cherry', 'banana', 'apple'];
      const result = await processor.process('$.countBy(x => x)', JSON.stringify(data));
      expect(result.data).toEqual({ apple: 3, banana: 2, cherry: 1 });
    });

    it('should use keyBy method', async () => {
      const data = [
        { id: 'a', name: 'Alice' },
        { id: 'b', name: 'Bob' },
      ];
      const result = await processor.process('$.keyBy(item => item.id)', JSON.stringify(data));
      expect(result.data).toEqual({
        a: { id: 'a', name: 'Alice' },
        b: { id: 'b', name: 'Bob' },
      });
    });

    it('should use invert method with ChainableWrapper', () => {
      const wrapper = new ChainableWrapper({ a: 1, b: 2, c: 3 });
      const result = wrapper.invert();
      expect(result.value).toEqual({ '1': 'a', '2': 'b', '3': 'c' });
    });
  });
});
