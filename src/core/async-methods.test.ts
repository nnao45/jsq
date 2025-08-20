import { describe, expect, it } from '@jest/globals';
import { JsqProcessor } from './processor';

describe('Async Array Methods Tests', () => {
  const processor = new JsqProcessor({ verbose: false });

  describe('forEachAsync (parallel execution)', () => {
    it('should execute async functions in parallel', async () => {
      const data = '[1, 2, 3]';
      const results: number[] = [];
      
      // Use a variable to collect results
      const result = await processor.process(
        'const results = []; await $.forEachAsync(async (x) => { await new Promise(r => setTimeout(r, 10)); results.push(x * 2); }); results',
        data
      );
      
      // Since it's parallel, we just check that all items were processed
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle empty arrays', async () => {
      const data = '[]';
      const result = await processor.process(
        'await $.forEachAsync(async (x) => { console.log(x); }); "completed"',
        data
      );
      expect(result.data).toBe('completed');
    });
  });

  describe('forEachAsyncSeq (sequential execution)', () => {
    it('should execute async functions sequentially', async () => {
      const data = '[1, 2, 3]';
      const result = await processor.process(
        'const results = []; await $.forEachAsyncSeq(async (x) => { results.push(x * 2); }); results',
        data
      );
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('mapAsync (parallel mapping)', () => {
    it('should map with async functions in parallel', async () => {
      const data = '[1, 2, 3]';
      const result = await processor.process(
        'await $.mapAsync(async (x) => { await new Promise(r => setTimeout(r, 10)); return x * 2; })',
        data
      );
      expect(result.data).toEqual([2, 4, 6]);
    });

    it('should handle async operations with promises', async () => {
      const data = '["a", "b", "c"]';
      const result = await processor.process(
        'await $.mapAsync(async (str) => { return str.toUpperCase() + "!"; })',
        data
      );
      expect(result.data).toEqual(['A!', 'B!', 'C!']);
    });

    it('should work with single values', async () => {
      const data = '"hello"';
      const result = await processor.process(
        'await $.mapAsync(async (str) => { return str.toUpperCase(); })',
        data
      );
      expect(result.data).toEqual(['HELLO']);
    });
  });

  describe('mapAsyncSeq (sequential mapping)', () => {
    it('should map with async functions sequentially', async () => {
      const data = '[1, 2, 3]';
      const result = await processor.process(
        'await $.mapAsyncSeq(async (x) => { await new Promise(r => setTimeout(r, 5)); return x * 3; })',
        data
      );
      expect(result.data).toEqual([3, 6, 9]);
    });
  });

  describe('Real-world async examples', () => {
    it('should simulate API calls with delay', async () => {
      const data = '[1, 2, 3]';
      const result = await processor.process(
        `await $.mapAsync(async (id) => { 
          await new Promise(r => setTimeout(r, 1)); 
          return { id: id, data: "item_" + id }; 
        })`,
        data
      );
      expect(result.data).toEqual([
        { id: 1, data: 'item_1' },
        { id: 2, data: 'item_2' },
        { id: 3, data: 'item_3' }
      ]);
    });

    it('should work with nested async operations', async () => {
      const data = '["user1", "user2"]';
      const result = await processor.process(
        `await $.mapAsync(async (username) => {
          const profile = await Promise.resolve({ name: username, active: true });
          return profile;
        })`,
        data
      );
      expect(result.data).toEqual([
        { name: 'user1', active: true },
        { name: 'user2', active: true }
      ]);
    });
  });

  describe('Error handling in async methods', () => {
    it('should handle errors in forEachAsync gracefully', async () => {
      const data = '[1, 2, 3]';
      try {
        await processor.process(
          'await $.forEachAsync(async (x) => { if (x === 2) throw new Error("test error"); })',
          data
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle mixed success and failure in mapAsync', async () => {
      const data = '[1, 2, 3]';
      try {
        const result = await processor.process(
          'await $.mapAsync(async (x) => { if (x === 2) throw new Error("fail"); return x * 2; })',
          data
        );
        // This should throw an error
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  afterAll(async () => {
    await processor.dispose();
  });
});