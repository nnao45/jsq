import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { JsqOptions } from '@/types/cli';
import { createApplicationContext } from '../application-context';
import { ExpressionEvaluator } from '../lib/evaluator';

describe('Smart Dollar Modern Methods', () => {
  let evaluator: ExpressionEvaluator;
  let mockOptions: JsqOptions;
  let appContext: ReturnType<typeof createApplicationContext>;

  beforeEach(() => {
    mockOptions = {
      verbose: false,
      unsafe: true, // Use unsafe mode to bypass VM issues for now
      use: undefined,
    };
    appContext = createApplicationContext();
    evaluator = new ExpressionEvaluator(mockOptions, appContext);
  });

  afterEach(async () => {
    await evaluator.dispose();
    await appContext.dispose();
  });

  describe('Functional Programming Methods', () => {
    describe('fold/foldLeft/foldRight', () => {
      it('should support fold (alias for reduce)', async () => {
        const data = [1, 2, 3, 4, 5];
        const result = await evaluator.evaluate('$.fold((acc, x) => acc + x, 0)', data);
        expect(result).toBe(15);
      });

      it('should support foldRight', async () => {
        const data = ['a', 'b', 'c', 'd'];
        const result = await evaluator.evaluate('$.foldRight("", (x, acc) => acc + x)', data);
        expect(result).toBe('dcba');
      });
    });

    describe('scan/scanLeft/scanRight', () => {
      it('should support scan with running totals', async () => {
        const data = [1, 2, 3, 4];
        const result = await evaluator.evaluate('$.scan((acc, x) => acc + x, 0)', data);
        expect(result).toEqual([0, 1, 3, 6, 10]);
      });

      it('should support scanRight', async () => {
        const data = [1, 2, 3, 4];
        const result = await evaluator.evaluate('$.scanRight((x, acc) => x + acc, 0)', data);
        expect(result).toEqual([10, 9, 7, 4, 0]);
      });
    });

    describe('zip/zipWith/unzip', () => {
      it('should support zip', async () => {
        const data = [1, 2, 3];
        // Store the other array in a separate evaluation or modify the test approach
        const result = await evaluator.evaluate('$.zip(["a", "b", "c", "d"])', data);
        expect(result).toEqual([
          [1, 'a'],
          [2, 'b'],
          [3, 'c'],
        ]);
      });

      it('should support zipWith custom function', async () => {
        const data = [1, 2, 3];
        const result = await evaluator.evaluate('$.zipWith([10, 20, 30], (a, b) => a + b)', data);
        expect(result).toEqual([11, 22, 33]);
      });

      it('should support unzip', async () => {
        const data = [
          [1, 'a'],
          [2, 'b'],
          [3, 'c'],
        ];
        const result = await evaluator.evaluate('$.unzip()', data);
        expect(result).toEqual([
          [1, 2, 3],
          ['a', 'b', 'c'],
        ]);
      });
    });

    describe('intersperse', () => {
      it('should insert separator between elements', async () => {
        const data = ['a', 'b', 'c'];
        const result = await evaluator.evaluate('$.intersperse("-")', data);
        expect(result).toEqual(['a', '-', 'b', '-', 'c']);
      });
    });

    describe('sliding/windows', () => {
      it('should create sliding windows', async () => {
        const data = [1, 2, 3, 4, 5];
        const result = await evaluator.evaluate('$.sliding(3)', data);
        expect(result).toEqual([
          [1, 2, 3],
          [2, 3, 4],
          [3, 4, 5],
        ]);
      });

      it('should support custom step', async () => {
        const data = [1, 2, 3, 4, 5, 6];
        const result = await evaluator.evaluate('$.sliding(2, 2)', data);
        expect(result).toEqual([
          [1, 2],
          [3, 4],
          [5, 6],
        ]);
      });
    });

    describe('enumerate', () => {
      it('should add indices to elements', async () => {
        const data = ['a', 'b', 'c'];
        const result = await evaluator.evaluate('$.enumerate()', data);
        expect(result).toEqual([
          [0, 'a'],
          [1, 'b'],
          [2, 'c'],
        ]);
      });
    });
  });

  describe('Haskell-style Methods', () => {
    describe('head/tail/init/last', () => {
      it('should get head', async () => {
        const data = [1, 2, 3, 4];
        const result = await evaluator.evaluate('$.head()', data);
        expect(result).toBe(1);
      });

      it('should get tail', async () => {
        const data = [1, 2, 3, 4];
        const result = await evaluator.evaluate('$.tail()', data);
        expect(result).toEqual([2, 3, 4]);
      });

      it('should get init', async () => {
        const data = [1, 2, 3, 4];
        const result = await evaluator.evaluate('$.init()', data);
        expect(result).toEqual([1, 2, 3]);
      });

      it('should get last', async () => {
        const data = [1, 2, 3, 4];
        const result = await evaluator.evaluate('$.last()', data);
        expect(result).toBe(4);
      });
    });

    describe('cons/snoc', () => {
      it('should prepend with cons', async () => {
        const data = [2, 3, 4];
        const result = await evaluator.evaluate('$.cons(1)', data);
        expect(result).toEqual([1, 2, 3, 4]);
      });

      it('should append with snoc', async () => {
        const data = [1, 2, 3];
        const result = await evaluator.evaluate('$.snoc(4)', data);
        expect(result).toEqual([1, 2, 3, 4]);
      });
    });

    describe('span/breakAt', () => {
      it('should split with span', async () => {
        const data = [1, 2, 3, 4, 5];
        const result = await evaluator.evaluate('$.span(x => x < 4)', data);
        expect(result).toEqual([
          [1, 2, 3],
          [4, 5],
        ]);
      });

      it('should split with breakAt', async () => {
        const data = [1, 2, 3, 4, 5];
        const result = await evaluator.evaluate('$.breakAt(x => x >= 4)', data);
        expect(result).toEqual([
          [1, 2, 3],
          [4, 5],
        ]);
      });
    });

    describe('iterate', () => {
      it('should generate by iteration', async () => {
        const result = await evaluator.evaluate('$().iterate(x => x * 2, 5)', 1);
        expect(result).toEqual([1, 2, 4, 8, 16]);
      });
    });

    describe('unfold', () => {
      it('should generate from seed', async () => {
        const result = await evaluator.evaluate('$().unfold(x => x > 0 ? [x, x - 1] : null)', 10);
        expect(result).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
      });
    });
  });

  describe('Modern Utility Methods', () => {
    describe('cycle', () => {
      it('should repeat array elements', async () => {
        const data = [1, 2, 3];
        const result = await evaluator.evaluate('$.cycle(2)', data);
        expect(result).toEqual([1, 2, 3, 1, 2, 3]);
      });
    });

    describe('intercalate', () => {
      it('should join arrays with separator', async () => {
        const data = [
          [1, 2],
          [3, 4],
          [5, 6],
        ];
        const result = await evaluator.evaluate('$.intercalate(0)', data);
        expect(result).toEqual([1, 2, 0, 3, 4, 0, 5, 6]);
      });
    });

    describe('transpose', () => {
      it('should transpose matrix', async () => {
        const data = [
          [1, 2, 3],
          [4, 5, 6],
        ];
        const result = await evaluator.evaluate('$.transpose()', data);
        expect(result).toEqual([
          [1, 4],
          [2, 5],
          [3, 6],
        ]);
      });
    });

    describe('distinctBy', () => {
      it('should remove duplicates by key function', async () => {
        const data = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 1, name: 'Charlie' },
          { id: 3, name: 'David' },
        ];
        const result = await evaluator.evaluate('$.distinctBy(x => x.id)', data);
        expect(result).toEqual([
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'David' },
        ]);
      });
    });

    describe('groupByMultiple', () => {
      it('should group by multiple keys', async () => {
        const data = [
          { category: 'A', type: 'X', value: 1 },
          { category: 'A', type: 'Y', value: 2 },
          { category: 'B', type: 'X', value: 3 },
          { category: 'A', type: 'X', value: 4 },
        ];
        const result = await evaluator.evaluate(
          '$.groupByMultiple(x => x.category, x => x.type)',
          data
        );
        expect(result).toHaveLength(3);
        expect(result[0].keys).toEqual(['A', 'X']);
        expect(result[0].items).toHaveLength(2);
      });
    });

    describe('tee', () => {
      it('should split into multiple branches', async () => {
        const data = [1, 2, 3, 4, 5];
        const result = await evaluator.evaluate(
          '$.tee(arr => arr.filter(x => x % 2 === 0), arr => arr.map(x => x * 2))',
          data
        );
        expect(result).toEqual([
          [2, 4],
          [2, 4, 6, 8, 10],
        ]);
      });
    });

    describe('debug', () => {
      it('should return same instance for chaining', async () => {
        const data = [1, 2, 3];
        const result = await evaluator.evaluate('$.debug("test").sum()', data);
        expect(result).toBe(6);
      });
    });

    describe('benchmark', () => {
      it('should measure and transform', async () => {
        const data = [1, 2, 3, 4, 5];
        const result = await evaluator.evaluate('$.benchmark(arr => arr.map(x => x * 2))', data);
        expect(result).toEqual([2, 4, 6, 8, 10]);
      });
    });

    describe('memoize', () => {
      it('should memoize function results', async () => {
        const data = [5];
        const result = await evaluator.evaluate('$.memoize(arr => arr[0] * arr[0])', data);
        expect(result).toBe(25);
      });
    });

    describe('partitionBy', () => {
      it('should partition by multiple predicates', async () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const result = await evaluator.evaluate(
          '$.partitionBy(x => x % 2 === 0, x => x > 5)',
          data
        );
        expect(result).toEqual([
          [2, 4, 6, 8], // even numbers
          [7, 9], // odd numbers > 5
          [1, 3, 5], // rest
        ]);
      });
    });
  });
});
