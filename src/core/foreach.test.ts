import { describe, expect, it, jest } from '@jest/globals';
import { ChainableWrapper } from './chainable';

describe('forEach and each methods', () => {
  describe('forEach', () => {
    it('should iterate over array elements', () => {
      const data = [1, 2, 3, 4, 5];
      const wrapper = new ChainableWrapper(data);
      const results: number[] = [];
      const indices: number[] = [];

      const result = wrapper.forEach((item, index) => {
        results.push(item as number);
        indices.push(index as number);
      });

      expect(results).toEqual([1, 2, 3, 4, 5]);
      expect(indices).toEqual([0, 1, 2, 3, 4]);
      expect(result.value).toEqual(data); // forEach returns original data
    });

    it('should provide array as third parameter', () => {
      const data = [10, 20, 30];
      const wrapper = new ChainableWrapper(data);
      let capturedArray: unknown[] | undefined;

      wrapper.forEach((_item, _index, array) => {
        capturedArray = array;
      });

      expect(capturedArray).toEqual(data);
    });

    it('should handle single non-array value', () => {
      const data = 'hello';
      const wrapper = new ChainableWrapper(data);
      const results: unknown[] = [];

      wrapper.forEach(item => {
        results.push(item);
      });

      expect(results).toEqual(['hello']);
    });

    it('should be chainable', () => {
      const data = [1, 2, 3];
      const wrapper = new ChainableWrapper(data);

      const result = wrapper
        .forEach(item => {
          console.log(item);
        })
        .map(x => x * 2)
        .filter(x => x > 2);

      expect(result.value).toEqual([4, 6]);
    });

    it('should handle empty array', () => {
      const data: number[] = [];
      const wrapper = new ChainableWrapper(data);
      const results: number[] = [];

      wrapper.forEach(item => {
        results.push(item as number);
      });

      expect(results).toEqual([]);
    });

    it('should handle objects in array', () => {
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const wrapper = new ChainableWrapper(data);
      const names: string[] = [];

      wrapper.forEach((item: { name: string }) => {
        names.push(item.name);
      });

      expect(names).toEqual(['Alice', 'Bob']);
    });
  });

  describe('each (alias)', () => {
    it('should work as an alias for forEach', () => {
      const data = [1, 2, 3];
      const wrapper = new ChainableWrapper(data);
      const forEachResults: number[] = [];
      const eachResults: number[] = [];

      wrapper.forEach(item => {
        forEachResults.push(item as number);
      });

      wrapper.each(item => {
        eachResults.push(item as number);
      });

      expect(eachResults).toEqual(forEachResults);
    });

    it('should be chainable like forEach', () => {
      const data = [5, 10, 15];
      const wrapper = new ChainableWrapper(data);

      const result = wrapper.each(item => console.log(item)).filter(x => x > 5);

      expect(result.value).toEqual([10, 15]);
    });
  });

  describe('forEach with side effects', () => {
    it('should allow mutation of external state', () => {
      const data = [1, 2, 3, 4, 5];
      const wrapper = new ChainableWrapper(data);
      let sum = 0;

      wrapper.forEach(item => {
        sum += item as number;
      });

      expect(sum).toBe(15);
    });

    it('should execute side effects in order', () => {
      const data = ['a', 'b', 'c'];
      const wrapper = new ChainableWrapper(data);
      let result = '';

      wrapper.forEach(item => {
        result += item;
      });

      expect(result).toBe('abc');
    });

    it('should work with console.log mock', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const data = [1, 2, 3];
      const wrapper = new ChainableWrapper(data);

      wrapper.forEach(item => {
        console.log(item);
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(2);
      expect(consoleLogSpy).toHaveBeenCalledWith(3);

      consoleLogSpy.mockRestore();
    });
  });
});
