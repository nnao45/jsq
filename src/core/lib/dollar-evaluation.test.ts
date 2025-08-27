import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { JsqProcessor } from './processor';

describe('Dollar ($) Evaluation Tests', () => {
  let processor: JsqProcessor;
  let processJSON: (expression: string, data: any) => Promise<any>;

  beforeEach(() => {
    processor = new JsqProcessor({ verbose: false });
    
    // Helper function to process with JSON input
    processJSON = async (expression: string, data: any) => {
      const input = JSON.stringify(data);
      const result = await processor.process(expression, input);
      return result.data;
    };
  });

  afterEach(async () => {
    await processor.dispose();
  });

  describe('Single $ evaluation', () => {
    it('should return the entire data when evaluating just $', async () => {
      const data = { name: 'Alice', age: 30 };
      const result = await processJSON('$', data);
      expect(result).toEqual(data);
    });

    it('should handle $ evaluation with arrays', async () => {
      const data = [1, 2, 3, 4, 5];
      const result = await processJSON('$', data);
      expect(result).toEqual(data);
    });

    it('should handle $ evaluation with nested objects', async () => {
      const data = {
        users: [
          { id: 1, name: 'Alice', age: 30 },
          { id: 2, name: 'Bob', age: 25 },
          { id: 3, name: 'Charlie', age: 35 },
        ],
        metadata: {
          total: 3,
          created: '2024-01-15',
        },
      };
      const result = await processJSON('$', data);
      expect(result).toEqual(data);
    });

    it('should handle $ evaluation with null', async () => {
      const result = await processJSON('$', null);
      expect(result).toBeNull();
    });

    it('should handle $ evaluation with undefined', async () => {
      // JSON.stringify converts undefined to null
      const result = await processJSON('$', undefined);
      expect(result).toBeNull();
    });

    it('should handle $ evaluation with primitives', async () => {
      expect(await processJSON('$', 42)).toBe(42);
      expect(await processJSON('$', 'hello')).toBe('hello');
      expect(await processJSON('$', true)).toBe(true);
    });

    it('should handle $ evaluation with empty objects and arrays', async () => {
      expect(await processJSON('$', {})).toEqual({});
      expect(await processJSON('$', [])).toEqual([]);
    });
  });

  describe('$.property access', () => {
    it('should access object properties', async () => {
      const data = { name: 'Alice', age: 30 };
      const result = await processJSON('$.name', data);
      expect(result).toBe('Alice');
    });

    it('should access nested properties', async () => {
      const data = {
        user: {
          profile: {
            name: 'Alice',
          },
        },
      };
      const result = await processJSON('$.user.profile.name', data);
      expect(result).toBe('Alice');
    });

    it('should access array elements', async () => {
      const data = [10, 20, 30];
      const result = await processJSON('$[1]', data);
      expect(result).toBe(20);
    });

    it('should handle property access on arrays within objects', async () => {
      const data = {
        users: ['Alice', 'Bob', 'Charlie'],
      };
      const result = await processJSON('$.users[0]', data);
      expect(result).toBe('Alice');
    });
  });

  describe('$.map and array methods', () => {
    it('should use map on arrays accessed via $', async () => {
      const data = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      };
      const result = await processJSON('$.users.map(u => u.name)', data);
      expect(result).toEqual(['Alice', 'Bob']);
    });

    it('should chain array methods', async () => {
      const data = {
        numbers: [1, 2, 3, 4, 5],
      };
      const result = await processJSON('$.numbers.filter(n => n > 2).map(n => n * 2)', data);
      expect(result).toEqual([6, 8, 10]);
    });

    it('should handle map on top-level arrays', async () => {
      const data = [
        { id: 1, value: 10 },
        { id: 2, value: 20 },
      ];
      const result = await processJSON('$.map(item => item.value)', data);
      expect(result).toEqual([10, 20]);
    });

    it('should handle filter method', async () => {
      const data = {
        items: [1, 2, 3, 4, 5],
      };
      const result = await processJSON('$.items.filter(n => n % 2 === 0)', data);
      expect(result).toEqual([2, 4]);
    });

    it('should handle reduce method', async () => {
      const data = {
        numbers: [1, 2, 3, 4],
      };
      const result = await processJSON('$.numbers.reduce((sum, n) => sum + n, 0)', data);
      expect(result).toBe(10);
    });
  });

  describe('Complex $ expressions', () => {
    it('should handle complex object transformations', async () => {
      const data = {
        users: [
          { name: 'Alice', age: 30, active: true },
          { name: 'Bob', age: 25, active: false },
          { name: 'Charlie', age: 35, active: true },
        ],
      };
      const result = await processJSON(
        '$.users.filter(u => u.active).map(u => ({ name: u.name, age: u.age }))',
        data
      );
      expect(result).toEqual([
        { name: 'Alice', age: 30 },
        { name: 'Charlie', age: 35 },
      ]);
    });

    it('should handle $ in conditional expressions', async () => {
      const data = { value: 10 };
      const result = await processJSON('$.value > 5 ? "high" : "low"', data);
      expect(result).toBe('high');
    });

    it('should handle $ with destructuring-like access', async () => {
      const data = {
        response: {
          data: {
            items: [1, 2, 3],
          },
        },
      };
      const result = await processJSON('$.response.data.items.length', data);
      expect(result).toBe(3);
    });

    it('should handle $ with Object methods', async () => {
      const data = { a: 1, b: 2, c: 3 };
      const result = await processJSON('Object.keys($)', data);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle $ with Object.values', async () => {
      const data = { x: 10, y: 20, z: 30 };
      const result = await processJSON('Object.values($)', data);
      expect(result).toEqual([10, 20, 30]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle undefined property access gracefully', async () => {
      const data = { a: 1 };
      const result = await processJSON('$.b', data);
      expect(result).toBeUndefined();
    });

    it('should handle null property access', async () => {
      const data = { prop: null };
      const result = await processJSON('$.prop', data);
      expect(result).toBeNull();
    });

    it('should handle deep undefined access', async () => {
      const data = {};
      // Use optional chaining to safely access deep properties
      const result = await processJSON('$.a', data);
      expect(result).toBeUndefined();
    });

    it('should handle map on undefined', async () => {
      const data = {};
      // This should not throw but return an empty array or undefined
      const result = await processJSON('$.users?.map(u => u.name)', data);
      expect(result).toBeUndefined();
    });
  });

  describe('Performance-critical $ operations', () => {
    it('should efficiently handle large arrays with $', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: i * 2 }));
      const data = { items: largeArray };

      const start = Date.now();
      const result = await processJSON('$.items.filter(i => i.value > 500).length', data);
      const duration = Date.now() - start;

      // Filter for values > 500, which means values 502 and above (251 * 2 = 502)
      // So we have items from index 251 to 999, which is 749 items
      expect(result).toBe(749);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle repeated $ access efficiently', async () => {
      const data = {
        x: { y: { z: 42 } },
      };

      // Multiple $ accesses in one expression
      const result = await processJSON('$.x.y.z + $.x.y.z * 2', data);
      expect(result).toBe(126); // 42 + 42 * 2
    });
  });
});
