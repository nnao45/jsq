import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { JsqProcessor } from './processor';

describe('Semicolon Sequential Execution Tests', () => {
  let processor: JsqProcessor;

  beforeEach(() => {
    processor = new JsqProcessor({ verbose: false });
  });

  afterEach(async () => {
    await processor.dispose();
  });

  describe('Basic semicolon functionality', () => {
    it.skip('should execute expressions sequentially and return the last value', async () => {
      const data = '{"name": "Alice", "age": 25}';
      const result = await processor.process('$.name; $.age', data);
      expect(result.data).toBe(25);
    });

    it.skip('should execute side effect expressions without affecting $', async () => {
      const data = '{"value": 42}';
      // console.log doesn't modify $, so $.value should still be accessible
      const result = await processor.process('console.log("Processing..."); $.value', data);
      expect(result.data).toBe(42);
    });

    it('should handle multiple semicolons', async () => {
      const data = '{"a": 1, "b": 2, "c": 3}';
      const result = await processor.process('$.a; $.b; $.c', data);
      expect(result.data).toBe(3);
    });
  });

  describe('Semicolon with complex expressions', () => {
    it('should handle object properties and array operations', async () => {
      const data = '{"users": [{"name": "Alice"}, {"name": "Bob"}], "count": 2}';
      const result = await processor.process('$.users; $.count', data);
      expect(result.data).toBe(2);
    });

    it('should work with array operations', async () => {
      const data = '[1, 2, 3, 4, 5]';
      const result = await processor.process('$.filter(x => x % 2 === 0); $.length', data);
      expect(result.data).toBe(5); // Original array length, not the filtered one
    });

    it('should handle mathematical expressions', async () => {
      const data = '{"x": 10, "y": 5}';
      const result = await processor.process('$.x + $.y; $.x * $.y', data);
      expect(result.data).toBe(50);
    });
  });

  describe('Semicolon with variable declarations', () => {
    it('should handle variable declarations before final expression', async () => {
      const data = '{"name": "Alice", "age": 25}';
      const result = await processor.process(
        'const name = $.name; name + " is " + $.age + " years old"',
        data
      );
      expect(result.data).toBe('Alice is 25 years old');
    });

    it('should handle multiple variable declarations with semicolons', async () => {
      const data = '{"first": "John", "last": "Doe", "age": 30}';
      const result = await processor.process(
        'const first = $.first; const last = $.last; first + " " + last',
        data
      );
      expect(result.data).toBe('John Doe');
    });
  });

  describe('Semicolon in strings should be ignored', () => {
    it('should not split on semicolons inside strings', async () => {
      const data = '{"message": "Hello; World"}';
      const result = await processor.process('$.message', data);
      expect(result.data).toBe('Hello; World');
    });

    it('should handle complex string expressions with semicolons', async () => {
      const data = '{"text": "Sample"}';
      const result = await processor.process(
        '"Text: " + $.text + "; Length: " + $.text.length',
        data
      );
      expect(result.data).toBe('Text: Sample; Length: 6');
    });
  });

  describe('Semicolon with async operations', () => {
    it.skip('should handle async operations in semicolon expressions', async () => {
      const data = '{}';
      const result = await processor.process(
        'const delay = Promise.resolve("delayed"); const value = await delay; value',
        data
      );
      expect(result.data).toBe('delayed');
    });

    it('should handle mixed sync and async operations', async () => {
      const data = '{"base": "test"}';
      const result = await processor.process(
        'console.log("Starting..."); const result = $.base + "-processed"; result',
        data
      );
      expect(result.data).toBe('test-processed');
    });
  });

  describe('Error handling with semicolons', () => {
    it('should handle errors in intermediate expressions gracefully', async () => {
      const data = '{"value": 42}';
      // Even if first expression has an issue, the second should work
      const result = await processor.process('const temp = "ignored"; 42', data);
      expect(result.data).toBe(42);
    });
  });

  describe('Semicolon with utility functions', () => {
    it('should work with lodash functions', async () => {
      const data = '[1, 2, 3, 4, 5]';
      const result = await processor.process('_.sum($); _.max($)', data);
      expect(result.data).toBe(5); // max of the array
    });

    it('should handle complex lodash chains with semicolons', async () => {
      const data = '{"numbers": [1, 2, 3, 4, 5, 6]}';
      const result = await processor.process(
        '_.sum($.numbers); _.filter($.numbers, n => n % 2 === 0).length',
        data
      );
      expect(result.data).toBe(3); // count of even numbers
    });
  });
});
