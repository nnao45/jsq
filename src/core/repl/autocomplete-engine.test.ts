import { describe, expect, it } from 'vitest';
import { AutocompleteEngine, type CompletionContext } from './autocomplete-engine';

describe('AutocompleteEngine', () => {
  let engine: AutocompleteEngine;

  beforeEach(() => {
    engine = new AutocompleteEngine();
  });

  describe('Basic completions', () => {
    it('should complete $ symbol', () => {
      const context: CompletionContext = {
        input: '$',
        cursorPosition: 1,
        currentData: { name: 'test', value: 42 },
      };
      const result = engine.getSuggestions(context);
      // When typing '$', it should show available properties from currentData
      expect(result.completions).toContain('name');
      expect(result.completions).toContain('value');
      expect(result.replaceStart).toBe(0);
      expect(result.replaceEnd).toBe(1);
    });

    it('should complete _ symbol', () => {
      const context: CompletionContext = {
        input: '_',
        cursorPosition: 1,
      };
      const result = engine.getSuggestions(context);
      // When typing '_', it should show available lodash methods
      expect(result.completions.length).toBeGreaterThan(0);
      // First few should be alphabetically sorted
      // Check first few alphabetically sorted completions
      expect(result.completions).toContain('add');
      expect(result.completions).toContain('assign');
      expect(result.completions).toContain('at');
    });

    it('should complete global objects', () => {
      const context: CompletionContext = {
        input: 'cons',
        cursorPosition: 4,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('console');
    });

    it('should complete JSON', () => {
      const context: CompletionContext = {
        input: 'JS',
        cursorPosition: 2,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('JSON');
    });
  });
  
  describe('Array literal completions', () => {
    it('should complete array methods for array literal', () => {
      const context: CompletionContext = {
        input: '[1,2,3].',
        cursorPosition: 8,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('map');
      expect(result.completions).toContain('filter');
      expect(result.completions).toContain('reduce');
      expect(result.completions).toContain('length');
      expect(result.replaceStart).toBe(8); // after the dot
    });
    
    it('should complete array methods with partial match for array literal', () => {
      const context: CompletionContext = {
        input: '[1,2,3].fi',
        cursorPosition: 10,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('filter');
      expect(result.completions).toContain('find');
      expect(result.completions).toContain('findIndex');
      expect(result.completions).toContain('fill');
      expect(result.completions).not.toContain('map'); // doesn't start with 'fi'
    });
    
    it('should complete for complex array literal', () => {
      const context: CompletionContext = {
        input: '["a", "b", "c"].jo',
        cursorPosition: 18,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('join');
    });
    
    it('should complete for nested array literal', () => {
      const context: CompletionContext = {
        input: '[[1,2],[3,4]].fl',
        cursorPosition: 16,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('flat');
      expect(result.completions).toContain('flatMap');
    });
  });

  describe('Property completions', () => {
    it('should complete object properties with $.', () => {
      const context: CompletionContext = {
        input: '$.n',
        cursorPosition: 3,
        currentData: { name: 'test', number: 42, nested: {} },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('name');
      expect(result.completions).toContain('number');
      expect(result.completions).toContain('nested');
      expect(result.replaceStart).toBe(2); // after the dot
    });

    it('should complete array methods without dot after $', () => {
      const context: CompletionContext = {
        input: '$.ma',
        cursorPosition: 4,
        currentData: [1, 2, 3],
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('map');
      expect(result.replaceStart).toBe(2); // after $
    });

    it('should complete array methods with partial match without dot', () => {
      const context: CompletionContext = {
        input: '$.fi',
        cursorPosition: 4,
        currentData: ['a', 'b', 'c'],
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('filter');
      expect(result.completions).toContain('find');
      expect(result.completions).toContain('findIndex');
      expect(result.completions).toContain('fill');
      expect(result.completions).not.toContain('map'); // doesn't start with 'fi'
    });

    it('should complete object properties without dot after $', () => {
      const context: CompletionContext = {
        input: '$.na',
        cursorPosition: 4,
        currentData: { name: 'test', namespace: 'default', value: 42 },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('name');
      expect(result.completions).toContain('namespace');
      expect(result.completions).not.toContain('value'); // doesn't start with 'na'
      expect(result.replaceStart).toBe(2); // after $
    });

    it('should complete string methods without dot after $', () => {
      const context: CompletionContext = {
        input: '$.ch',
        cursorPosition: 4,
        currentData: 'hello world',
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('charAt');
      expect(result.completions).toContain('charCodeAt');
      expect(result.completions).not.toContain('split'); // doesn't start with 'ch'
    });

    it('should filter properties by prefix', () => {
      const context: CompletionContext = {
        input: '$.na',
        cursorPosition: 4,
        currentData: { name: 'test', value: 42, nation: 'USA' },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('name');
      expect(result.completions).toContain('nation');
      expect(result.completions).not.toContain('value');
    });

    it('should complete array methods', () => {
      const context: CompletionContext = {
        input: '$.items.m',
        cursorPosition: 9,
        currentData: { items: [1, 2, 3] },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('map');
      expect(result.completions).not.toContain('charAt'); // String method
    });

    it('should complete string methods', () => {
      const context: CompletionContext = {
        input: '$.text.char',
        cursorPosition: 11,
        currentData: { text: 'hello' },
      };
      const result = engine.getSuggestions(context);
      console.log('String method completions:', result);
      expect(result.completions).toContain('charAt');
      expect(result.completions).toContain('charCodeAt');
    });

    it('should handle nested property access', () => {
      const context: CompletionContext = {
        input: '$.user.',
        cursorPosition: 7,
        currentData: { user: { name: 'Alice', age: 30, email: 'alice@example.com' } },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('name');
      expect(result.completions).toContain('age');
      expect(result.completions).toContain('email');
    });

    it('should handle array index access', () => {
      const context: CompletionContext = {
        input: '$.',
        cursorPosition: 2,
        currentData: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('[0]');
      expect(result.completions).toContain('[1]');
      expect(result.completions).toContain('length');
    });
  });

  describe('Lodash method completions', () => {
    it('should complete lodash methods with _.', () => {
      const context: CompletionContext = {
        input: '_.fi',
        cursorPosition: 4,
      };
      const result = engine.getSuggestions(context);
      console.log('Lodash completions for _.fi:', result);
      expect(result.completions).toContain('filter');
      expect(result.completions).toContain('find');
      expect(result.completions).toContain('findIndex');
      expect(result.completions).toContain('findLast');
      expect(result.completions).toContain('findLastIndex');
    });

    it('should complete lodash array methods', () => {
      const context: CompletionContext = {
        input: '_.un',
        cursorPosition: 4,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('unionBy');
      expect(result.completions).toContain('unionWith');
      expect(result.completions).toContain('uniq');
      expect(result.completions).toContain('uniqBy');
      expect(result.completions).toContain('unzip');
    });

    it('should complete lodash string methods', () => {
      const context: CompletionContext = {
        input: '_.ca',
        cursorPosition: 4,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('capitalize');
      expect(result.completions).toContain('camelCase');
    });
  });

  describe('SmartDollar method completions', () => {
    it('should include SmartDollar methods in lodash completions', () => {
      const context: CompletionContext = {
        input: '_.map',
        cursorPosition: 5,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('map');
      expect(result.completions).toContain('mapAsync');
      expect(result.completions).toContain('mapAsyncSeq');
      expect(result.completions).toContain('mapKeys');
      expect(result.completions).toContain('mapValues');
    });

    it('should complete async methods', () => {
      const context: CompletionContext = {
        input: '_.forEach',
        cursorPosition: 9,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('forEachAsync');
      expect(result.completions).toContain('forEachAsyncSeq');
    });

    it('should complete functional methods', () => {
      const context: CompletionContext = {
        input: '_.fo',
        cursorPosition: 4,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('fold');
      expect(result.completions).toContain('foldLeft');
      expect(result.completions).toContain('foldRight');
      expect(result.completions).toContain('forEachAsync');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty input', () => {
      const context: CompletionContext = {
        input: '',
        cursorPosition: 0,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toEqual([]);
    });

    it('should handle cursor in the middle of expression', () => {
      const context: CompletionContext = {
        input: '$.name',
        cursorPosition: 3, // Cursor after $.n
        currentData: { name: 'test', number: 42 },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('name');
      expect(result.completions).toContain('number');
    });

    it('should handle missing currentData gracefully', () => {
      const context: CompletionContext = {
        input: '$.property',
        cursorPosition: 10,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toEqual([]);
    });

    it('should handle non-existent properties', () => {
      const context: CompletionContext = {
        input: '$.nonexistent.',
        cursorPosition: 14,
        currentData: { name: 'test' },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toEqual([]);
    });

    it('should handle deeply nested paths', () => {
      const context: CompletionContext = {
        input: '$.a.b.c.',
        cursorPosition: 8,
        currentData: { a: { b: { c: { d: 'deep' } } } },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('d');
    });

    it('should respect maxCompletions limit', () => {
      const manyProps: any = {};
      for (let i = 0; i < 150; i++) {
        manyProps[`prop${i}`] = i;
      }
      const context: CompletionContext = {
        input: '$.prop',
        cursorPosition: 6,
        currentData: manyProps,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions.length).toBeLessThanOrEqual(100); // maxCompletions default
    });
  });

  describe('Prefix matching', () => {
    it('should complete array methods with prefix matching', () => {
      const context: CompletionContext = {
        input: '$.items.m',
        cursorPosition: 9,
        currentData: { items: [1, 2, 3] },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('map');
      expect(result.completions).not.toContain('some'); // 'some' doesn't start with 'm'
      expect(result.replaceStart).toBe(8); // Start after the dot
    });

    it('should complete lodash methods with prefix matching', () => {
      const context: CompletionContext = {
        input: '_.fl',
        cursorPosition: 4,
        currentData: {},
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('flatten');
      expect(result.completions).toContain('flatMap');
      expect(result.completions).toContain('flow');
      expect(result.completions).toContain('flowRight');
      expect(result.completions).not.toContain('filter'); // 'filter' starts with 'fi', not 'fl'
    });

    it('should only include methods starting with prefix', () => {
      const context: CompletionContext = {
        input: '$.items.f',
        cursorPosition: 9,
        currentData: { items: [1, 2, 3] },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('filter');
      expect(result.completions).toContain('find');
      expect(result.completions).toContain('findIndex');
      expect(result.completions).toContain('flat');
      expect(result.completions).toContain('flatMap');
      expect(result.completions).toContain('forEach');
      expect(result.completions).toContain('fill');
      expect(result.completions).not.toContain('shift'); // 'shift' doesn't start with 'f'
      expect(result.completions).not.toContain('map'); // 'map' doesn't start with 'f'
    });
  });

  describe('Cache behavior', () => {
    it('should cache results for same input', () => {
      const context: CompletionContext = {
        input: '$.n',
        cursorPosition: 3,
        currentData: { name: 'test', number: 42 },
      };

      const result1 = engine.getSuggestions(context);
      console.log('First result:', result1);
      const result2 = engine.getSuggestions(context);
      console.log('Second result:', result2);

      // Check that completions are the same (cache is working)
      expect(result1.completions).toEqual(result2.completions);
      expect(result1.replaceStart).toEqual(result2.replaceStart);
      expect(result1.replaceEnd).toEqual(result2.replaceEnd);
    });

    it('should clear cache when requested', () => {
      const context: CompletionContext = {
        input: '$.test',
        cursorPosition: 6,
        currentData: { test: 'value' },
      };

      engine.getSuggestions(context);
      engine.clearCache();

      // After clearing, should still work
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('test');
    });
  });

  describe('Case sensitivity', () => {
    it('should be case-insensitive for completions', () => {
      const context: CompletionContext = {
        input: '$.NA',
        cursorPosition: 4,
        currentData: { name: 'test', NAME: 'TEST', Name: 'Test' },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('name');
      expect(result.completions).toContain('NAME');
      expect(result.completions).toContain('Name');
    });

    it('should be case-insensitive for method completions', () => {
      const context: CompletionContext = {
        input: '_.FI',
        cursorPosition: 4,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('filter');
      expect(result.completions).toContain('find');
    });
  });

  describe('$.. pattern handling', () => {
    it('should return property suggestions for $.. pattern', () => {
      const context: CompletionContext = {
        input: '$..',
        cursorPosition: 3,
        currentData: { users: [], config: {}, count: 42, tags: [] },
      };

      const result = engine.getSuggestions(context);

      expect(result.completions).toContain('users');
      expect(result.completions).toContain('config');
      expect(result.completions).toContain('count');
      expect(result.completions).toContain('tags');
      expect(result.replaceStart).toBe(3);
      expect(result.replaceEnd).toBe(3);
    });

    it('should handle $..u pattern', () => {
      const context: CompletionContext = {
        input: '$..u',
        cursorPosition: 4,
        currentData: { users: [], unicorn: 'rainbow', count: 42 },
      };

      const result = engine.getSuggestions(context);

      // Since $.. is treated as $, this should filter properties starting with 'u'
      expect(result.completions).toContain('users');
      expect(result.completions).toContain('unicorn');
      expect(result.completions).not.toContain('count');
    });

    it('should differentiate between $. and $..', () => {
      const testData = { prop1: 'value1', prop2: 'value2' };

      const context1: CompletionContext = {
        input: '$.',
        cursorPosition: 2,
        currentData: testData,
      };

      const context2: CompletionContext = {
        input: '$..',
        cursorPosition: 3,
        currentData: testData,
      };

      const result1 = engine.getSuggestions(context1);
      const result2 = engine.getSuggestions(context2);

      // Both should return the same completions for now
      expect(result1.completions.sort()).toEqual(result2.completions.sort());
      expect(result1.replaceStart).toBe(2);
      expect(result2.replaceStart).toBe(3);
    });

    it('should not provide suggestions for _.. pattern', () => {
      const context: CompletionContext = {
        input: '_..',
        cursorPosition: 3,
        currentData: { test: 'data' },
      };

      const result = engine.getSuggestions(context);

      // _.. is not a valid lodash pattern
      expect(result.completions).toHaveLength(0);
    });
  });

  describe('Method chaining completions', () => {
    it('should complete methods after map() chain', () => {
      const context: CompletionContext = {
        input: '$.map(v=>v).',
        cursorPosition: 12,
        currentData: [1, 2, 3, 4, 5],
      };
      const result = engine.getSuggestions(context);
      // After map, should still have array methods available
      expect(result.completions).toContain('filter');
      expect(result.completions).toContain('reduce');
      expect(result.completions).toContain('forEach');
      expect(result.completions).toContain('map'); // Can chain multiple maps
      expect(result.replaceStart).toBe(12);
    });

    it('should complete methods after filter() chain', () => {
      const context: CompletionContext = {
        input: '$.filter(v=>v>2).',
        cursorPosition: 17,
        currentData: [1, 2, 3, 4, 5],
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('map');
      expect(result.completions).toContain('reduce');
      expect(result.completions).toContain('length');
    });

    it('should complete methods after multiple chains', () => {
      const context: CompletionContext = {
        input: '$.filter(v=>v>2).map(v=>v*2).',
        cursorPosition: 30,
        currentData: [1, 2, 3, 4, 5],
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('filter');
      expect(result.completions).toContain('reduce');
      expect(result.completions).toContain('join');
    });

    it('should complete methods with partial name after chain', () => {
      const context: CompletionContext = {
        input: '$.map(v=>v).fi',
        cursorPosition: 14,
        currentData: [1, 2, 3],
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('filter');
      expect(result.completions).toContain('find');
      expect(result.completions).toContain('findIndex');
      expect(result.completions).toContain('fill');
      expect(result.completions).not.toContain('map');
      expect(result.replaceStart).toBe(12);
    });

    it('should complete object methods after pluck chain', () => {
      const context: CompletionContext = {
        input: '$.pluck("name").',
        cursorPosition: 16,
        currentData: [{name: 'Alice'}, {name: 'Bob'}],
      };
      const result = engine.getSuggestions(context);
      // pluck returns an array of values
      expect(result.completions).toContain('filter');
      expect(result.completions).toContain('map');
      expect(result.completions).toContain('join');
    });

    it('should complete string methods after join chain', () => {
      const context: CompletionContext = {
        input: '$.join(",").',
        cursorPosition: 12,
        currentData: ['a', 'b', 'c'],
      };
      const result = engine.getSuggestions(context);
      // join returns a string
      expect(result.completions).toContain('split');
      expect(result.completions).toContain('replace');
      expect(result.completions).toContain('toLowerCase');
      expect(result.completions).toContain('toUpperCase');
    });
  });

  describe('Lodash method chaining completions', () => {
    it('should complete methods after _.map() chain', () => {
      const context: CompletionContext = {
        input: '_.map(v=>v).',
        cursorPosition: 12,
        currentData: [1, 2, 3, 4, 5],
      };
      const result = engine.getSuggestions(context);
      // After map, should still have lodash methods available
      expect(result.completions).toContain('filter');
      expect(result.completions).toContain('reduce');
      expect(result.completions).toContain('forEach');
      expect(result.completions).toContain('map'); // Can chain multiple maps
      expect(result.replaceStart).toBe(12);
    });

    it('should complete methods after _.filter() chain', () => {
      const context: CompletionContext = {
        input: '_.filter(v=>v>2).',
        cursorPosition: 17,
        currentData: [1, 2, 3, 4, 5],
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('map');
      expect(result.completions).toContain('reduce');
      expect(result.completions).toContain('sortBy');
    });

    it('should complete methods after _.groupBy() chain', () => {
      const context: CompletionContext = {
        input: '_.groupBy("type").',
        cursorPosition: 18,
        currentData: [{type: 'A', val: 1}, {type: 'B', val: 2}],
      };
      const result = engine.getSuggestions(context);
      // groupBy returns an object
      expect(result.completions).toContain('keys');
      expect(result.completions).toContain('values');
      expect(result.completions).toContain('mapValues');
    });

    it('should complete string methods after _.join() chain', () => {
      const context: CompletionContext = {
        input: '_.join(",").',
        cursorPosition: 12,
        currentData: ['a', 'b', 'c'],
      };
      const result = engine.getSuggestions(context);
      // join returns a string
      expect(result.completions).toContain('split');
      expect(result.completions).toContain('replace');
      expect(result.completions).toContain('toLowerCase');
    });

    it('should complete methods with partial name after _ chain', () => {
      const context: CompletionContext = {
        input: '_.map(v=>v).fi',
        cursorPosition: 14,
        currentData: [1, 2, 3],
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('filter');
      expect(result.completions).toContain('find');
      expect(result.completions).toContain('findIndex');
      expect(result.completions).not.toContain('map');
      expect(result.replaceStart).toBe(12);
    });
  });

  describe('Edge cases for autocomplete', () => {
    it('should handle completion with cursor in middle of expression', () => {
      const context: CompletionContext = {
        input: '$.namexyz',
        cursorPosition: 6, // cursor after 'name'
        currentData: { name: 'test', nameOld: 'old', namespace: 'ns' },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions.length).toBeGreaterThan(0);
      expect(result.completions).toContain('name');
      expect(result.completions).toContain('nameOld');
      expect(result.completions).toContain('namespace');
      expect(result.replaceStart).toBe(2);
      expect(result.replaceEnd).toBe(9); // Should include the whole word 'namexyz'
    });

    it.skip('should handle completion with special characters', () => {
      // SKIP: Bracket notation completion not yet implemented
      const context: CompletionContext = {
        input: '$["my-',
        cursorPosition: 6,
        currentData: { 'my-property': 'value', 'my-other-prop': 'value2' },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('my-property');
      expect(result.completions).toContain('my-other-prop');
    });

    it('should handle deeply nested property completion', () => {
      const context: CompletionContext = {
        input: '$.level1.level2.level3.',
        cursorPosition: 23,
        currentData: {
          level1: {
            level2: {
              level3: {
                deep: 'value',
                deeper: 'value2',
              },
            },
          },
        },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('deep');
      expect(result.completions).toContain('deeper');
    });

    it('should handle completion with numeric properties', () => {
      const context: CompletionContext = {
        input: '$.',
        cursorPosition: 2,
        currentData: { 0: 'zero', 1: 'one', '2': 'two', prop: 'value' },
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toContain('0');
      expect(result.completions).toContain('1');
      expect(result.completions).toContain('2');
      expect(result.completions).toContain('prop');
    });

    it('should handle completion state preservation during rapid input', () => {
      const context1: CompletionContext = {
        input: '$.',
        cursorPosition: 2,
        currentData: { foo: 'bar', foobar: 'baz' },
      };
      const result1 = engine.getSuggestions(context1);
      expect(result1.completions).toContain('foo');
      expect(result1.completions).toContain('foobar');

      // Simulate rapid typing
      const context2: CompletionContext = {
        input: '$.f',
        cursorPosition: 3,
        currentData: { foo: 'bar', foobar: 'baz' },
      };
      const result2 = engine.getSuggestions(context2);
      expect(result2.completions).toContain('foo');
      expect(result2.completions).toContain('foobar');
      expect(result2.replaceStart).toBe(2);
      expect(result2.replaceEnd).toBe(3);

      const context3: CompletionContext = {
        input: '$.fo',
        cursorPosition: 4,
        currentData: { foo: 'bar', foobar: 'baz' },
      };
      const result3 = engine.getSuggestions(context3);
      expect(result3.completions).toContain('foo');
      expect(result3.completions).toContain('foobar');
      expect(result3.replaceStart).toBe(2);
      expect(result3.replaceEnd).toBe(4);
    });

    it('should handle completion with undefined/null data gracefully', () => {
      const context: CompletionContext = {
        input: '$.',
        cursorPosition: 2,
        currentData: undefined,
      };
      const result = engine.getSuggestions(context);
      expect(result.completions).toEqual([]);
      expect(result.replaceStart).toBe(2);
      expect(result.replaceEnd).toBe(2);
    });

    it('should handle completion after operators', () => {
      const context: CompletionContext = {
        input: '$.value + _.',
        cursorPosition: 12,
        currentData: { value: 10 },
      };
      const result = engine.getSuggestions(context);
      // Should suggest lodash methods after '_.'
      expect(result.completions.length).toBeGreaterThan(0);
      // map and filter might be beyond the 100 item limit
      // Just check that we got lodash/smartdollar methods
      expect(result.completions).toContain('add');
      expect(result.completions).toContain('filter');
    });

    it.skip('should handle mixed expression completion', () => {
      // SKIP: Complex expression parsing not yet implemented
      const context: CompletionContext = {
        input: '$.items.map(x => x.',
        cursorPosition: 19,
        currentData: {
          items: [
            { id: 1, name: 'item1', category: 'A' },
            { id: 2, name: 'item2', category: 'B' },
          ],
        },
      };
      const result = engine.getSuggestions(context);
      // Should suggest array element properties
      expect(result.completions).toContain('id');
      expect(result.completions).toContain('name');
      expect(result.completions).toContain('category');
    });
  });
});
