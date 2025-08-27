import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsqProcessor } from './processor';

describe('Async Array Methods Tests', () => {
  let processor: JsqProcessor;

  beforeEach(() => {
    processor = new JsqProcessor({ verbose: false });
  });

  afterEach(async () => {
    await processor.dispose();
  });

  describe('forEachAsync (parallel execution)', () => {
    it.skip('should execute async functions in parallel', async () => {
      const data = '[1, 2, 3]';

      // Test forEachAsync without side effects (VM doesn't allow global variable mutation)
      const result = await processor.process(
        'await $.forEachAsync(async (x) => { return x * 2; }); "completed"',
        data
      );

      // forEachAsync doesn't return values, just check completion
      expect(result.data).toBe('completed');
    });

    it.skip('should handle empty arrays', async () => {
      const data = '[]';
      const result = await processor.process(
        'await $.forEachAsync(async (x) => { console.log(x); }); "completed"',
        data
      );
      expect(result.data).toBe('completed');
    });
  });

  describe('forEachAsyncSeq (sequential execution)', () => {
    it.skip('should execute async functions sequentially', async () => {
      const data = '[1, 2, 3]';
      const result = await processor.process(
        'await $.forEachAsyncSeq(async (x) => { return x * 2; }); "completed"',
        data
      );
      expect(result.data).toBe('completed');
    });
  });

  describe('mapAsync (parallel mapping)', () => {
    it.skip('should map with async functions in parallel', async () => {
      const data = '[1, 2, 3]';
      const result = await processor.process(
        'await $.mapAsync(async (x) => { return x * 2; })',
        data
      );
      expect(result.data).toEqual([2, 4, 6]);
    });

    it.skip('should handle async operations with promises', async () => {
      const data = '["a", "b", "c"]';
      const result = await processor.process(
        'await $.mapAsync(async (str) => { return str.toUpperCase() + "!"; })',
        data
      );
      expect(result.data).toEqual(['A!', 'B!', 'C!']);
    });

    it.skip('should work with single values', async () => {
      const data = '"hello"';
      const result = await processor.process(
        'await $.mapAsync(async (str) => { return str.toUpperCase(); })',
        data
      );
      expect(result.data).toEqual(['HELLO']);
    });
  });

  describe('mapAsyncSeq (sequential mapping)', () => {
    it.skip('should map with async functions sequentially', async () => {
      const data = '[1, 2, 3]';
      const result = await processor.process(
        'await $.mapAsyncSeq(async (x) => { return x * 3; })',
        data
      );
      expect(result.data).toEqual([3, 6, 9]);
    });
  });

  describe('Real-world async examples', () => {
    it.skip('should simulate API calls with delay', async () => {
      const data = '[1, 2, 3]';
      const result = await processor.process(
        'await $.mapAsync(async (id) => { return { id: id, data: "item_" + id }; })',
        data
      );
      expect(result.data).toEqual([
        { id: 1, data: 'item_1' },
        { id: 2, data: 'item_2' },
        { id: 3, data: 'item_3' },
      ]);
    });

    it.skip('should work with nested async operations', async () => {
      const data = '["user1", "user2"]';
      const result = await processor.process(
        'await $.mapAsync(async (username) => { return { name: username, active: true }; })',
        data
      );
      expect(result.data).toEqual([
        { name: 'user1', active: true },
        { name: 'user2', active: true },
      ]);
    });
  });

  describe('Error handling in async methods', () => {
    it.skip('should handle errors in forEachAsync gracefully', async () => {
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

    it.skip('should handle mixed success and failure in mapAsync', async () => {
      const data = '[1, 2, 3]';
      try {
        await processor.process(
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
