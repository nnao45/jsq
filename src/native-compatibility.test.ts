import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ExpressionEvaluator } from './core/lib/evaluator';
import type { JsqOptions } from './types/cli';

describe('Native JavaScript Compatibility Tests', () => {
  let evaluator: ExpressionEvaluator;
  let options: JsqOptions;

  beforeEach(() => {
    options = {
      debug: false,
      verbose: false,
      unsafe: true,
      safe: false,
    };
    evaluator = new ExpressionEvaluator(options);
  });

  afterEach(async () => {
    await evaluator.dispose();
  });

  describe('Array Type System Tests', () => {
    it('Array.isArray($) returns true', async () => {
      const result = await evaluator.evaluate('Array.isArray($)', [1, 2, 3]);
      expect(result).toBe(true);
    });

    it('instanceof Array works', async () => {
      const result = await evaluator.evaluate('$ instanceof Array', [1, 2, 3]);
      expect(result).toBe(true);
    });

    it('typeof $ is object for arrays', async () => {
      const result = await evaluator.evaluate('typeof $', [1, 2, 3]);
      expect(result).toBe('object');
    });

    it('constructor is Array', async () => {
      const result = await evaluator.evaluate('$.constructor === Array', [1, 2, 3]);
      expect(result).toBe(true);
    });

    it('Symbol.toStringTag is Array', async () => {
      const result = await evaluator.evaluate('Object.prototype.toString.call($)', [1, 2, 3]);
      expect(result).toMatch(/\[object Array\]/);
    });
  });

  describe('Object Type System Tests', () => {
    it('typeof $ is function for objects', async () => {
      const result = await evaluator.evaluate('typeof $', { a: 1 });
      expect(result).toBe('function');
    });

    it('Object.prototype.toString for objects', async () => {
      const result = await evaluator.evaluate('Object.prototype.toString.call($)', { a: 1 });
      expect(result).toMatch(/\[object Function\]/);
    });

    it('hasOwnProperty works', async () => {
      const result = await evaluator.evaluate('$.hasOwnProperty("a")', { a: 1 });
      expect(result).toBe(true);
    });

    it('in operator works', async () => {
      const result = await evaluator.evaluate('"a" in $', { a: 1 });
      expect(result).toBe(true);
    });

    it('propertyIsEnumerable works', async () => {
      const result = await evaluator.evaluate('$.propertyIsEnumerable("a")', { a: 1 });
      expect(result).toBe(true);
    });
  });

  describe('Array Native Methods', () => {
    it('pop method', async () => {
      const result = await evaluator.evaluate('$.pop()', [1, 2, 3]);
      expect(result).toBe(3);
    });

    it('shift method', async () => {
      const result = await evaluator.evaluate('$.shift()', [1, 2, 3]);
      expect(result).toBe(1);
    });

    it('slice method', async () => {
      const result = await evaluator.evaluate('$.slice(1,3)', [1, 2, 3, 4]);
      expect(result).toEqual([2, 3]);
    });

    it('indexOf method', async () => {
      const result = await evaluator.evaluate('$.indexOf(2)', [1, 2, 3, 2]);
      expect(result).toBe(1);
    });

    it('lastIndexOf method', async () => {
      const result = await evaluator.evaluate('$.lastIndexOf(2)', [1, 2, 3, 2]);
      expect(result).toBe(3);
    });

    it('includes method', async () => {
      const result = await evaluator.evaluate('$.includes(2)', [1, 2, 3]);
      expect(result).toBe(true);
    });

    it('join method', async () => {
      const result = await evaluator.evaluate('$.join("-")', [1, 2, 3]);
      expect(result).toBe('1-2-3');
    });
  });

  describe('Array Iteration Methods', () => {
    it('map method', async () => {
      const result = await evaluator.evaluate('$.map(x => x*2)', [1, 2, 3]);
      expect(result).toEqual([2, 4, 6]);
    });

    it('filter method', async () => {
      const result = await evaluator.evaluate('$.filter(x => x > 2)', [1, 2, 3, 4]);
      expect(result).toEqual([3, 4]);
    });

    it('reduce method', async () => {
      const result = await evaluator.evaluate('$.reduce((a,b) => a+b, 0)', [1, 2, 3, 4]);
      expect(result).toBe(10);
    });

    it('reduceRight method', async () => {
      const result = await evaluator.evaluate('$.reduceRight((a,b) => a+b, 0)', [1, 2, 3, 4]);
      expect(result).toBe(10);
    });

    it('find method', async () => {
      const result = await evaluator.evaluate('$.find(x => x > 2)', [1, 2, 3, 4]);
      expect(result).toBe(3);
    });

    it('findIndex method', async () => {
      const result = await evaluator.evaluate('$.findIndex(x => x > 2)', [1, 2, 3, 4]);
      expect(result).toBe(2);
    });

    it('some method', async () => {
      const result = await evaluator.evaluate('$.some(x => x > 2)', [1, 2, 3]);
      expect(result).toBe(true);
    });

    it('every method', async () => {
      const result = await evaluator.evaluate('$.every(x => x > 0)', [1, 2, 3]);
      expect(result).toBe(true);
    });
  });

  describe('Object Static Methods', () => {
    it('Object.keys($)', async () => {
      const result = await evaluator.evaluate('Object.keys($)', { a: 1, b: 2 });
      expect(result).toEqual(['a', 'b']);
    });

    it('Object.values($) executes', async () => {
      const result = await evaluator.evaluate('Object.values($)', { a: 1, b: 2 });
      expect(result).toBeDefined();
    });

    it('Object.entries($) executes', async () => {
      const result = await evaluator.evaluate('Object.entries($)', { a: 1 });
      expect(result).toBeDefined();
    });

    it('Object.getOwnPropertyNames', async () => {
      const result = await evaluator.evaluate('Object.getOwnPropertyNames($).includes("a")', {
        a: 1,
      });
      expect(result).toBe(true);
    });

    it('Object.assign with $', async () => {
      const result = await evaluator.evaluate('Object.assign({}, $, {b:2})', { a: 1 });
      expect(result).toBeDefined();
    });
  });

  describe('Math Operations', () => {
    it('Math.max with spread', async () => {
      const result = await evaluator.evaluate('Math.max(...$)', [1, 5, 3, 9, 2]);
      expect(result).toBe(9);
    });

    it('Math.min with spread', async () => {
      const result = await evaluator.evaluate('Math.min(...$)', [1, 5, 3, 9, 2]);
      expect(result).toBe(1);
    });

    it('Math.min with array', async () => {
      const result = await evaluator.evaluate('Math.min($)', [1, 5, 3, 9, 2]);
      expect(result).toBe(Number.NaN);
    });

    it('Math.floor with map', async () => {
      const result = await evaluator.evaluate('$.map(Math.floor)', [1.9, 2.7, 3.1]);
      expect(result).toEqual([1, 2, 3]);
    });

    it('Math.ceil with map', async () => {
      const result = await evaluator.evaluate('$.map(Math.ceil)', [1.1, 2.3, 3.7]);
      expect(result).toEqual([2, 3, 4]);
    });

    it('Math.round with map', async () => {
      const result = await evaluator.evaluate('$.map(Math.round)', [1.2, 2.7, 3.5]);
      expect(result).toEqual([1, 3, 4]);
    });

    it('Math.abs with map', async () => {
      const result = await evaluator.evaluate('$.map(Math.abs)', [-1, -2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('JSON Operations', () => {
    it('JSON.stringify($) for array', async () => {
      const result = await evaluator.evaluate('JSON.stringify($)', [1, 2, 3]);
      expect(result).toBe('[1,2,3]');
    });

    it('JSON.stringify($) for object', async () => {
      const result = await evaluator.evaluate('JSON.stringify($)', { a: 1 });
      expect(result).toBe('{"a":1}');
    });

    it('JSON.stringify with replacer', async () => {
      const result = await evaluator.evaluate('JSON.stringify($, ["a"])', { a: 1, b: 2 });
      expect(result).toBe('{"a":1}');
    });

    it('JSON.stringify with indent', async () => {
      const result = await evaluator.evaluate('JSON.stringify($, null, 2).includes("  ")', {
        a: 1,
      });
      expect(result).toBe(true);
    });
  });

  describe('Spread Operator', () => {
    it('Array spread', async () => {
      const result = await evaluator.evaluate('[...$, 4, 5]', [1, 2, 3]);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('Spread in Math.max', async () => {
      const result = await evaluator.evaluate('Math.max(...$)', [5, 1, 9, 3]);
      expect(result).toBe(9);
    });

    it('Spread in concat', async () => {
      const result = await evaluator.evaluate('[0, ...$, 3]', [1, 2]);
      expect(result).toEqual([0, 1, 2, 3]);
    });

    it('Multiple spreads', async () => {
      const result = await evaluator.evaluate('[...$, ...$]', [1, 2]);
      expect(result).toEqual([1, 2, 1, 2]);
    });
  });

  describe('Destructuring', () => {
    it('Array destructuring', async () => {
      const result = await evaluator.evaluate('(([a,b,c]) => a+b+c)($)', [10, 20, 30]);
      expect(result).toBe(60);
    });

    it('Rest operator', async () => {
      const result = await evaluator.evaluate(
        '(([first,...rest]) => rest.length)($)',
        [1, 2, 3, 4, 5]
      );
      expect(result).toBe(4);
    });

    it('Default values', async () => {
      const result = await evaluator.evaluate('(([a,b=10]) => a+b)($)', [1]);
      expect(result).toBe(11);
    });
  });

  describe('Set and Map Operations', () => {
    it('new Set($)', async () => {
      const result = await evaluator.evaluate('new Set($).size', [1, 2, 2, 3, 3, 3]);
      expect(result).toBe(3);
    });

    it('Set.has method', async () => {
      const result = await evaluator.evaluate('new Set($).has(2)', [1, 2, 3]);
      expect(result).toBe(true);
    });

    it('Set to Array', async () => {
      const result = await evaluator.evaluate('[...new Set($)]', [1, 2, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    it('new Map from entries', async () => {
      const result = await evaluator.evaluate('new Map($).size', [
        ['a', 1],
        ['b', 2],
      ]);
      expect(result).toBe(2);
    });

    it('Map.get method', async () => {
      const result = await evaluator.evaluate('new Map($).get("a")', [
        ['a', 1],
        ['b', 2],
      ]);
      expect(result).toBe(1);
    });
  });

  describe('String Operations', () => {
    it('String.includes with array', async () => {
      const result = await evaluator.evaluate('$.some(s => s.includes("ana"))', [
        'apple',
        'banana',
      ]);
      expect(result).toBe(true);
    });

    it('String methods chain', async () => {
      const result = await evaluator.evaluate('$.map(s => s.toUpperCase())', ['hello', 'world']);
      expect(result).toEqual(['HELLO', 'WORLD']);
    });
  });

  describe('Number Operations', () => {
    it('Number.isInteger check', async () => {
      const result = await evaluator.evaluate('$.map(Number.isInteger)', [1, 2.5, 3]);
      expect(result).toEqual([true, false, true]);
    });

    it('Number.parseFloat', async () => {
      const result = await evaluator.evaluate('$.map(Number.parseFloat)', ['1.5', '2.7']);
      expect(result).toEqual([1.5, 2.7]);
    });

    it('Number.parseInt (with map quirk)', async () => {
      // This tests the native behavior where map passes additional arguments
      const result = await evaluator.evaluate('$.map(Number.parseInt)', ['10', '20']);
      // Note: This should produce [10, NaN] due to Number.parseInt("20", 1) being invalid
      // In Jest we get the raw result, but in CLI it gets JSON.stringify'd to [10, null]
      expect(result).toEqual([10, NaN]);
    });
  });

  describe('Boolean Operations', () => {
    it('Boolean filter', async () => {
      const result = await evaluator.evaluate('$.filter(Boolean)', [0, 1, '', true, null]);
      expect(result).toEqual([1, true]);
    });

    it('Boolean conversion', async () => {
      const result = await evaluator.evaluate('$.map(Boolean)', [0, 1, 2]);
      expect(result).toEqual([false, true, true]);
    });
  });

  describe('Date Operations', () => {
    it('Date creation', async () => {
      const result = await evaluator.evaluate('new Date(...$).getFullYear()', [2021, 0, 1]);
      expect(result).toBe(2021);
    });

    it('Date manipulation', async () => {
      const result = await evaluator.evaluate(
        '$.map(d => new Date(d).getFullYear())',
        [1609459200000]
      );
      expect(result).toEqual([2021]);
    });
  });

  describe('Advanced Compatibility', () => {
    it('Symbol.iterator', async () => {
      const result = await evaluator.evaluate('typeof $[Symbol.iterator]', [1, 2, 3]);
      expect(result).toBe('function');
    });

    it('Array.from($)', async () => {
      const result = await evaluator.evaluate('Array.from($)', [1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    it('Reflect.ownKeys', async () => {
      const result = await evaluator.evaluate('Reflect.ownKeys($).includes("a")', { a: 1, b: 2 });
      expect(result).toBe(true);
    });

    it('Property descriptors', async () => {
      const result = await evaluator.evaluate(
        'Object.getOwnPropertyDescriptor($, "a").enumerable',
        { a: 1 }
      );
      expect(result).toBe(true);
    });
  });

  describe('JSQ Specific Features', () => {
    it('Chainable sum method', async () => {
      const result = await evaluator.evaluate('$.sum()', [10, 20, 30, 40, 50]);
      expect(result).toBe(150);
    });

    it('Property access with sum', async () => {
      const result = await evaluator.evaluate('$.values.sum()', { values: [10, 20, 30] });
      expect(result).toBe(60);
    });

    it('Array length property', async () => {
      const result = await evaluator.evaluate('$.length', [1, 2, 3, 4, 5]);
      expect(result).toBe(5);
    });

    it('Chain method access', async () => {
      const result = await evaluator.evaluate('$.chain().map(x => x * 2).value', [1, 2, 3]);
      expect(result).toBeDefined();
    });
  });
});
