import { describe, expect, it } from '@jest/globals';
import { ChainableWrapper } from './chainable';

describe('ChainableWrapper', () => {
  describe('Basic functionality', () => {
    it('should wrap primitive values', () => {
      const wrapper = new ChainableWrapper(42);
      expect(wrapper.value).toBe(42);
    });

    it('should wrap arrays', () => {
      const data = [1, 2, 3];
      const wrapper = new ChainableWrapper(data);
      expect(wrapper.value).toEqual(data);
    });

    it('should wrap objects', () => {
      const data = { name: 'Alice', age: 30 };
      const wrapper = new ChainableWrapper(data);
      expect(wrapper.value).toEqual(data);
    });

    it('should handle null and undefined', () => {
      expect(new ChainableWrapper(null).value).toBe(null);
      expect(new ChainableWrapper(undefined).value).toBe(undefined);
    });
  });

  describe('Proxy property access', () => {
    it('should access object properties directly', () => {
      const data = { user: { name: 'Alice', age: 30 } };
      const wrapper = new ChainableWrapper(data) as ChainableWrapper & Record<string, unknown>;

      expect(wrapper.user.value).toEqual({ name: 'Alice', age: 30 });
      expect(wrapper.user.name.value).toBe('Alice');
      expect(wrapper.user.age.value).toBe(30);
    });

    it('should return wrapped undefined for non-existent properties', () => {
      const data = { name: 'Alice' };
      const wrapper = new ChainableWrapper(data) as ChainableWrapper & Record<string, unknown>;

      expect(wrapper.nonexistent.value).toBe(undefined);
    });

    it('should access nested object properties', () => {
      const data = {
        user: {
          profile: {
            settings: { theme: 'dark' },
          },
        },
      };
      const wrapper = new ChainableWrapper(data) as ChainableWrapper & Record<string, unknown>;

      expect(wrapper.user.profile.settings.theme.value).toBe('dark');
    });
  });

  describe('Array operations', () => {
    const testArray = [
      { name: 'Alice', age: 30, department: 'engineering' },
      { name: 'Bob', age: 25, department: 'design' },
      { name: 'Charlie', age: 35, department: 'engineering' },
    ];

    it('should filter arrays', () => {
      const wrapper = new ChainableWrapper(testArray);
      const result = wrapper.filter(item => ((item as Record<string, unknown>).age as number) > 27);

      expect(result.value).toEqual([
        { name: 'Alice', age: 30, department: 'engineering' },
        { name: 'Charlie', age: 35, department: 'engineering' },
      ]);
    });

    it('should map arrays', () => {
      const wrapper = new ChainableWrapper([1, 2, 3]);
      const result = wrapper.map(x => (x as number) * 2);

      expect(result.value).toEqual([2, 4, 6]);
    });

    it('should find elements', () => {
      const wrapper = new ChainableWrapper(testArray);
      const result = wrapper.find(item => (item as Record<string, unknown>).name === 'Bob');

      expect(result.value).toEqual({ name: 'Bob', age: 25, department: 'design' });
    });

    it('should filter by key-value pairs with where', () => {
      const wrapper = new ChainableWrapper(testArray);
      const result = wrapper.where('department', 'engineering');

      expect(result.value).toEqual([
        { name: 'Alice', age: 30, department: 'engineering' },
        { name: 'Charlie', age: 35, department: 'engineering' },
      ]);
    });

    it('should pluck values by key', () => {
      const wrapper = new ChainableWrapper(testArray);
      const result = wrapper.pluck('name');

      expect(result.value).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should sort by key', () => {
      const wrapper = new ChainableWrapper(testArray);
      const result = wrapper.sortBy('age');

      expect(result.value).toEqual([
        { name: 'Bob', age: 25, department: 'design' },
        { name: 'Alice', age: 30, department: 'engineering' },
        { name: 'Charlie', age: 35, department: 'engineering' },
      ]);
    });

    it('should sort by function', () => {
      const wrapper = new ChainableWrapper(testArray);
      const result = wrapper.sortBy((item: Record<string, unknown>) => item.name);

      expect(result.value).toEqual([
        { name: 'Alice', age: 30, department: 'engineering' },
        { name: 'Bob', age: 25, department: 'design' },
        { name: 'Charlie', age: 35, department: 'engineering' },
      ]);
    });

    it('should take first N elements', () => {
      const wrapper = new ChainableWrapper(testArray);
      const result = wrapper.take(2);

      expect(result.value).toEqual([
        { name: 'Alice', age: 30, department: 'engineering' },
        { name: 'Bob', age: 25, department: 'design' },
      ]);
    });

    it('should skip first N elements', () => {
      const wrapper = new ChainableWrapper(testArray);
      const result = wrapper.skip(1);

      expect(result.value).toEqual([
        { name: 'Bob', age: 25, department: 'design' },
        { name: 'Charlie', age: 35, department: 'engineering' },
      ]);
    });
  });

  describe('Aggregation operations', () => {
    it('should get array length', () => {
      const wrapper = new ChainableWrapper([1, 2, 3, 4]);
      expect(wrapper.length().value).toBe(4);
    });

    it('should get object length', () => {
      const wrapper = new ChainableWrapper({ a: 1, b: 2, c: 3 });
      expect(wrapper.length().value).toBe(3);
    });

    it('should sum numeric arrays', () => {
      const wrapper = new ChainableWrapper([1, 2, 3, 4, 5]);
      expect(wrapper.sum().value).toBe(15);
    });

    it('should sum by key', () => {
      const data = [{ amount: 100 }, { amount: 200 }, { amount: 50 }];
      const wrapper = new ChainableWrapper(data);
      expect(wrapper.sum('amount').value).toBe(350);
    });

    it('should get object keys', () => {
      const wrapper = new ChainableWrapper({ name: 'Alice', age: 30 });
      expect(wrapper.keys().value).toEqual(['name', 'age']);
    });

    it('should get object values', () => {
      const wrapper = new ChainableWrapper({ name: 'Alice', age: 30 });
      expect(wrapper.values().value).toEqual(['Alice', 30]);
    });
  });

  describe('Method chaining', () => {
    it('should chain multiple operations', () => {
      const data = [
        { name: 'Alice', age: 30, salary: 70000 },
        { name: 'Bob', age: 25, salary: 50000 },
        { name: 'Charlie', age: 35, salary: 80000 },
        { name: 'David', age: 28, salary: 60000 },
      ];

      const wrapper = new ChainableWrapper(data);
      const result = wrapper
        .filter(person => ((person as Record<string, unknown>).age as number) > 26)
        .sortBy('salary')
        .pluck('name');

      expect(result.value).toEqual(['David', 'Alice', 'Charlie']);
    });

    it('should chain with aggregation', () => {
      const data = [
        { category: 'A', value: 10 },
        { category: 'B', value: 20 },
        { category: 'A', value: 15 },
      ];

      const wrapper = new ChainableWrapper(data);
      const result = wrapper.where('category', 'A').sum('value');

      expect(result.value).toBe(25);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty arrays', () => {
      const wrapper = new ChainableWrapper([]);

      expect(wrapper.filter(() => true).value).toEqual([]);
      expect(wrapper.map(x => x).value).toEqual([]);
      expect(wrapper.length().value).toBe(0);
      expect(wrapper.sum().value).toBe(0);
    });

    it('should handle non-array operations on arrays', () => {
      const wrapper = new ChainableWrapper('not an array');

      expect(wrapper.filter(() => true).value).toEqual([]);
      expect(wrapper.map(x => x).value).toEqual([]);
      expect(wrapper.pluck('key').value).toEqual([]);
    });

    it('should handle toString and valueOf', () => {
      const data = { name: 'Alice', age: 30 };
      const wrapper = new ChainableWrapper(data);

      expect(wrapper.toString()).toBe(JSON.stringify(data, null, 2));
      expect(wrapper.valueOf()).toEqual(data);
    });
  });
});
