import { describe, expect, it } from '@jest/globals';
import { ChainableWrapper } from './chainable';

describe('Advanced Collection Methods', () => {
  describe('Tier 1 Methods', () => {
    describe('partition', () => {
      it('should split array into truthy and falsy arrays', () => {
        const data = [1, 2, 3, 4, 5, 6];
        const result = new ChainableWrapper(data).partition(x => (x as number) % 2 === 0);
        expect(result.value).toEqual([[2, 4, 6], [1, 3, 5]]);
      });

      it('should handle empty array', () => {
        const result = new ChainableWrapper([]).partition(x => !!x);
        expect(result.value).toEqual([[], []]);
      });

      it('should handle non-arrays', () => {
        const result = new ChainableWrapper({}).partition(x => !!x);
        expect(result.value).toEqual([[], []]);
      });
    });

    describe('windowed', () => {
      it('should create sliding windows', () => {
        const data = [1, 2, 3, 4, 5];
        const result = new ChainableWrapper(data).windowed(3);
        expect(result.value).toEqual([[1, 2, 3], [2, 3, 4], [3, 4, 5]]);
      });

      it('should handle step parameter', () => {
        const data = [1, 2, 3, 4, 5, 6];
        const result = new ChainableWrapper(data).windowed(3, 2);
        expect(result.value).toEqual([[1, 2, 3], [3, 4, 5]]);
      });

      it('should handle window size larger than array', () => {
        const data = [1, 2];
        const result = new ChainableWrapper(data).windowed(3);
        expect(result.value).toEqual([]);
      });

      it('should handle zero or negative size', () => {
        const data = [1, 2, 3];
        const result = new ChainableWrapper(data).windowed(0);
        expect(result.value).toEqual([]);
      });
    });

    describe('chunked', () => {
      it('should be an alias for chunk', () => {
        const data = [1, 2, 3, 4, 5];
        const chunkResult = new ChainableWrapper(data).chunk(2);
        const chunkedResult = new ChainableWrapper(data).chunked(2);
        expect(chunkResult.value).toEqual(chunkedResult.value);
      });
    });

    describe('span', () => {
      it('should split array at first false predicate', () => {
        const data = [2, 4, 6, 1, 8, 10];
        const result = new ChainableWrapper(data).span(x => (x as number) % 2 === 0);
        expect(result.value).toEqual([[2, 4, 6], [1, 8, 10]]);
      });

      it('should handle all elements matching', () => {
        const data = [2, 4, 6, 8];
        const result = new ChainableWrapper(data).span(x => (x as number) % 2 === 0);
        expect(result.value).toEqual([[2, 4, 6, 8], []]);
      });

      it('should handle no elements matching', () => {
        const data = [1, 3, 5];
        const result = new ChainableWrapper(data).span(x => (x as number) % 2 === 0);
        expect(result.value).toEqual([[], [1, 3, 5]]);
      });
    });

    describe('takeUntil', () => {
      it('should take elements until predicate is true', () => {
        const data = [1, 2, 3, 4, 5];
        const result = new ChainableWrapper(data).takeUntil(x => (x as number) > 3);
        expect(result.value).toEqual([1, 2, 3]);
      });

      it('should handle predicate never true', () => {
        const data = [1, 2, 3];
        const result = new ChainableWrapper(data).takeUntil(x => (x as number) > 10);
        expect(result.value).toEqual([1, 2, 3]);
      });

      it('should handle predicate immediately true', () => {
        const data = [1, 2, 3];
        const result = new ChainableWrapper(data).takeUntil(x => (x as number) > 0);
        expect(result.value).toEqual([]);
      });
    });

    describe('dropUntil', () => {
      it('should drop elements until predicate is true', () => {
        const data = [1, 2, 3, 4, 5];
        const result = new ChainableWrapper(data).dropUntil(x => (x as number) > 3);
        expect(result.value).toEqual([4, 5]);
      });

      it('should handle predicate never true', () => {
        const data = [1, 2, 3];
        const result = new ChainableWrapper(data).dropUntil(x => (x as number) > 10);
        expect(result.value).toEqual([]);
      });

      it('should handle predicate immediately true', () => {
        const data = [1, 2, 3];
        const result = new ChainableWrapper(data).dropUntil(x => (x as number) > 0);
        expect(result.value).toEqual([1, 2, 3]);
      });
    });
  });

  describe('Tier 2 Methods', () => {
    describe('frequencies', () => {
      it('should count occurrences', () => {
        const data = ['a', 'b', 'a', 'c', 'b', 'a'];
        const result = new ChainableWrapper(data).frequencies();
        expect(result.value).toEqual({ a: 3, b: 2, c: 1 });
      });

      it('should handle numbers', () => {
        const data = [1, 2, 1, 3, 2, 1];
        const result = new ChainableWrapper(data).frequencies();
        expect(result.value).toEqual({ '1': 3, '2': 2, '3': 1 });
      });

      it('should handle empty array', () => {
        const result = new ChainableWrapper([]).frequencies();
        expect(result.value).toEqual({});
      });
    });

    describe('groupWith', () => {
      it('should group and transform simultaneously', () => {
        const data = [
          { type: 'fruit', name: 'apple' },
          { type: 'fruit', name: 'banana' },
          { type: 'vegetable', name: 'carrot' }
        ];
        const result = new ChainableWrapper(data).groupWith(
          item => (item as any).type,
          item => (item as any).name
        );
        expect(result.value).toEqual({
          fruit: ['apple', 'banana'],
          vegetable: ['carrot']
        });
      });
    });

    describe('reduceBy', () => {
      it('should reduce grouped values', () => {
        const data = [
          { category: 'A', value: 10 },
          { category: 'B', value: 5 },
          { category: 'A', value: 15 },
          { category: 'B', value: 8 }
        ];
        const result = new ChainableWrapper(data).reduceBy(
          item => (item as any).category,
          (acc: number, item: any) => acc + item.value,
          0
        );
        expect(result.value).toEqual({ A: 25, B: 13 });
      });
    });

    describe('scanLeft', () => {
      it('should produce running totals', () => {
        const data = [1, 2, 3, 4];
        const result = new ChainableWrapper(data).scanLeft(
          (acc: number, item: unknown) => acc + (item as number),
          0
        );
        expect(result.value).toEqual([0, 1, 3, 6, 10]);
      });

      it('should handle empty array', () => {
        const result = new ChainableWrapper([]).scanLeft(
          (acc: number, item: unknown) => acc + (item as number),
          0
        );
        expect(result.value).toEqual([0]);
      });
    });

    describe('distinctBy', () => {
      it('should remove duplicates by key', () => {
        const data = [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
          { id: 1, name: 'John Doe' }
        ];
        const result = new ChainableWrapper(data).distinctBy(item => (item as any).id);
        expect(result.value).toEqual([
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' }
        ]);
      });
    });

    describe('intersectBy', () => {
      it('should find intersection with key function', () => {
        const data1 = [{ id: 1 }, { id: 2 }, { id: 3 }];
        const data2 = [{ id: 2 }, { id: 3 }, { id: 4 }];
        const result = new ChainableWrapper(data1).intersectBy(data2, item => (item as any).id);
        expect(result.value).toEqual([{ id: 2 }, { id: 3 }]);
      });
    });
  });

  describe('Tier 3 Methods', () => {
    describe('spy', () => {
      it('should peek at elements without changing stream', () => {
        const spied: unknown[] = [];
        const data = [1, 2, 3];
        const result = new ChainableWrapper(data).spy(item => spied.push(item));
        
        expect(result.value).toEqual([1, 2, 3]);
        expect(spied).toEqual([1, 2, 3]);
      });
    });

    describe('filterMap', () => {
      it('should filter and map simultaneously', () => {
        const data = [1, 2, 3, 4, 5];
        const result = new ChainableWrapper(data).filterMap(item => {
          const num = item as number;
          return num % 2 === 0 ? num * 2 : null;
        });
        expect(result.value).toEqual([4, 8]);
      });

      it('should skip undefined values', () => {
        const data = [1, 2, 3, 4];
        const result = new ChainableWrapper(data).filterMap(item => {
          const num = item as number;
          return num > 2 ? num : undefined;
        });
        expect(result.value).toEqual([3, 4]);
      });
    });

    describe('findLast', () => {
      it('should find last matching element', () => {
        const data = [1, 2, 3, 2, 4];
        const result = new ChainableWrapper(data).findLast(item => (item as number) === 2);
        expect(result.value).toBe(2);
      });

      it('should return undefined if no match', () => {
        const data = [1, 3, 5];
        const result = new ChainableWrapper(data).findLast(item => (item as number) % 2 === 0);
        expect(result.value).toBeUndefined();
      });
    });

    describe('quantify', () => {
      it('should count matching elements', () => {
        const data = [1, 2, 3, 4, 5, 6];
        const result = new ChainableWrapper(data).quantify(item => (item as number) % 2 === 0);
        expect(result.value).toBe(3);
      });

      it('should return 0 for no matches', () => {
        const data = [1, 3, 5];
        const result = new ChainableWrapper(data).quantify(item => (item as number) % 2 === 0);
        expect(result.value).toBe(0);
      });
    });

    describe('pairwise', () => {
      it('should create pairs of consecutive elements', () => {
        const data = [1, 2, 3, 4];
        const result = new ChainableWrapper(data).pairwise();
        expect(result.value).toEqual([[1, 2], [2, 3], [3, 4]]);
      });

      it('should handle array with less than 2 elements', () => {
        const result = new ChainableWrapper([1]).pairwise();
        expect(result.value).toEqual([]);
      });
    });

    describe('intersperse', () => {
      it('should insert separator between elements', () => {
        const data = [1, 2, 3];
        const result = new ChainableWrapper(data).intersperse(',');
        expect(result.value).toEqual([1, ',', 2, ',', 3]);
      });

      it('should handle single element', () => {
        const result = new ChainableWrapper([1]).intersperse(',');
        expect(result.value).toEqual([1]);
      });

      it('should handle empty array', () => {
        const result = new ChainableWrapper([]).intersperse(',');
        expect(result.value).toEqual([]);
      });
    });
  });

  describe('Tier 4 Methods', () => {
    describe('peekable', () => {
      it('should create peekable iterator', () => {
        const data = [1, 2, 3];
        const result = new ChainableWrapper(data).peekable();
        const iterator = result.value as any;
        
        expect(iterator.hasNext()).toBe(true);
        expect(iterator.peek()).toBe(1);
        expect(iterator.next()).toBe(1);
        expect(iterator.peek()).toBe(2);
        expect(iterator.next()).toBe(2);
        expect(iterator.next()).toBe(3);
        expect(iterator.hasNext()).toBe(false);
        expect(iterator.peek()).toBeUndefined();
      });

      it('should handle empty array', () => {
        const result = new ChainableWrapper([]).peekable();
        const iterator = result.value as any;
        
        expect(iterator.hasNext()).toBe(false);
        expect(iterator.peek()).toBeUndefined();
        expect(iterator.next()).toBeUndefined();
      });
    });

    describe('batched', () => {
      it('should create batches without padding', () => {
        const data = [1, 2, 3, 4, 5];
        const result = new ChainableWrapper(data).batched(2);
        expect(result.value).toEqual([[1, 2], [3, 4], [5]]);
      });

      it('should create batches with padding', () => {
        const data = [1, 2, 3, 4, 5];
        const result = new ChainableWrapper(data).batched(3, 0);
        expect(result.value).toEqual([[1, 2, 3], [4, 5, 0]]);
      });

      it('should handle zero or negative size', () => {
        const data = [1, 2, 3];
        const result = new ChainableWrapper(data).batched(0);
        expect(result.value).toEqual([]);
      });
    });
  });

  describe('Functional Programming Methods', () => {
    describe('foldLeft', () => {
      it('should fold from left to right', () => {
        const data = [1, 2, 3, 4];
        const result = new ChainableWrapper(data).foldLeft(
          0,
          (acc: number, item: unknown) => acc + (item as number)
        );
        expect(result.value).toBe(10);
      });

      it('should fold strings', () => {
        const data = ['a', 'b', 'c'];
        const result = new ChainableWrapper(data).foldLeft(
          '',
          (acc: string, item: unknown) => acc + (item as string)
        );
        expect(result.value).toBe('abc');
      });
    });

    describe('foldRight', () => {
      it('should fold from right to left', () => {
        const data = ['a', 'b', 'c'];
        const result = new ChainableWrapper(data).foldRight(
          '',
          (item: unknown, acc: string) => (item as string) + acc
        );
        // FoldRight processes: 'a' + ('b' + ('c' + '')) = 'abc'
        expect(result.value).toBe('abc');
      });

      it('should demonstrate right-to-left processing with different operation', () => {
        const data = [1, 2, 3];
        const result = new ChainableWrapper(data).foldRight(
          [],
          (item: unknown, acc: unknown[]) => [item, ...acc]
        );
        // Processes from right: [1, [2, [3, []]]] = [1, 2, 3]
        expect(result.value).toEqual([1, 2, 3]);
      });

      it('should work with numbers', () => {
        const data = [1, 2, 3];
        const result = new ChainableWrapper(data).foldRight(
          0,
          (item: unknown, acc: number) => (item as number) + acc
        );
        expect(result.value).toBe(6);
      });
    });

    describe('traverse', () => {
      it('should traverse with accumulating state', () => {
        const data = [1, 2, 3];
        const result = new ChainableWrapper(data).traverse(
          0,
          (state: number, item: unknown) => ({
            value: state + (item as number),
            state: state + (item as number)
          })
        );
        expect(result.value).toEqual({
          values: [1, 3, 6],
          finalState: 6
        });
      });

      it('should handle empty array', () => {
        const result = new ChainableWrapper([]).traverse(
          0,
          (state: number, item: unknown) => ({
            value: state + (item as number),
            state: state + (item as number)
          })
        );
        expect(result.value).toEqual({
          values: [],
          finalState: 0
        });
      });
    });
  });

  describe('Method Chaining', () => {
    it('should allow chaining advanced methods', () => {
      const data = [1, 2, 3, 4, 5, 6];
      const result = new ChainableWrapper(data)
        .partition(x => (x as number) % 2 === 0)
        .map((part: unknown) => (part as number[]).length);
      
      expect(result.value).toEqual([3, 3]);
    });

    it('should chain multiple advanced methods', () => {
      const data = [1, 2, 3, 4, 5];
      const result = new ChainableWrapper(data)
        .windowed(2)
        .map((pair: unknown) => (pair as number[]).reduce((a, b) => a + b, 0));
      
      expect(result.value).toEqual([3, 5, 7, 9]);
    });
  });
});