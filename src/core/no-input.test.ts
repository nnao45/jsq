import { describe, expect, it } from '@jest/globals';
import { JsqProcessor } from './processor';

describe('No Input Execution Tests', () => {
  const processor = new JsqProcessor({ verbose: false });

  describe('Lodash utility functions without input', () => {
    it('should execute _.range(5) without input data', async () => {
      const result = await processor.process('_.range(5)', 'null');
      expect(result.data).toEqual([0, 1, 2, 3, 4]);
    });

    it('should execute _.range(1, 5) without input data', async () => {
      const result = await processor.process('_.range(1, 5)', 'null');
      expect(result.data).toEqual([1, 2, 3, 4]);
    });

    it('should execute _.range(0, 10, 2) without input data', async () => {
      const result = await processor.process('_.range(0, 10, 2)', 'null');
      expect(result.data).toEqual([0, 2, 4, 6, 8]);
    });

    it('should execute _.times(3, i => i * 2) without input data', async () => {
      const result = await processor.process('_.times(3, i => i * 2)', 'null');
      expect(result.data).toEqual([0, 2, 4]);
    });

    it('should execute _.identity("hello") without input data', async () => {
      const result = await processor.process('_.identity("hello")', 'null');
      expect(result.data).toBe('hello');
    });

    it('should execute _.random(1, 10) without input data', async () => {
      const result = await processor.process('_.random(1, 10)', 'null');
      expect(typeof result.data).toBe('number');
      expect(result.data).toBeGreaterThanOrEqual(1);
      expect(result.data).toBeLessThanOrEqual(10);
    });
  });

  describe('Mathematical and utility expressions without input', () => {
    it('should execute simple math expressions', async () => {
      const result = await processor.process('Math.PI', 'null');
      expect(result.data).toBe(Math.PI);
    });

    it('should execute array creation expressions', async () => {
      const result = await processor.process('[1, 2, 3].map(x => x * 2)', 'null');
      expect(result.data).toEqual([2, 4, 6]);
    });

    it('should execute object creation expressions', async () => {
      const result = await processor.process('({a: 1, b: 2, c: 3})', 'null');
      expect(result.data).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should execute date expressions', async () => {
      const result = await processor.process('new Date(2023, 0, 1).getFullYear()', 'null');
      expect(result.data).toBe(2023);
    });
  });

  describe('Complex expressions without input dependency', () => {
    it('should execute array generation and manipulation', async () => {
      const result = await processor.process('_.range(1, 6).map(x => x * x)', 'null');
      expect(result.data).toEqual([1, 4, 9, 16, 25]);
    });

    it('should execute nested utility function calls', async () => {
      const result = await processor.process('_.chunk(_.range(10), 3)', 'null');
      expect(result.data).toEqual([[0, 1, 2], [3, 4, 5], [6, 7, 8], [9]]);
    });

    it('should execute object merging', async () => {
      const result = await processor.process(
        `
        _.merge(
          { name: 'Alice' },
          { age: 25 },
          { city: 'Tokyo' }
        )
      `,
        'null'
      );
      expect(result.data).toEqual({
        name: 'Alice',
        age: 25,
        city: 'Tokyo',
      });
    });

    it('should execute functional programming patterns', async () => {
      const result = await processor.process(
        `
        _.range(1, 11)
          .filter(x => x % 2 === 0)
          .map(x => x * 3)
      `,
        'null'
      );
      expect(result.data).toEqual([6, 12, 18, 24, 30]);
    });
  });

  describe('String and template operations without input', () => {
    it('should execute template string operations', async () => {
      const template = '`Hello ${"World"}`';
      const result = await processor.process(template, 'null');
      expect(result.data).toBe('Hello World');
    });

    it('should execute string utility functions', async () => {
      const result = await processor.process('_.capitalize("hello world")', 'null');
      expect(result.data).toBe('Hello world');
    });

    it('should execute string manipulation with multiple steps', async () => {
      const result = await processor.process(
        `
        "  hello world  "
          .trim()
          .split(" ")
          .map(word => _.capitalize(word))
          .join("-")
      `,
        'null'
      );
      expect(result.data).toBe('Hello-World');
    });
  });

  describe('Pipeline operations with null input', () => {
    it('should execute $ | utility function correctly', async () => {
      const result = await processor.process('$ | _.range(5)', 'null');
      expect(result.data).toEqual([0, 1, 2, 3, 4]);
    });

    it('should execute complex pipeline with null input', async () => {
      const result = await processor.process('$ | _.range(1, 6) | $.map(x => x * x)', 'null');
      expect(result.data).toEqual([1, 4, 9, 16, 25]);
    });

    it('should handle mixed pipeline operations', async () => {
      const result = await processor.process(
        '$ | _.times(4, i => i + 1) | $.filter(x => x % 2 === 0)',
        'null'
      );
      expect(result.data).toEqual([2, 4]);
    });

    it('should execute $ in isolation', async () => {
      const result = await processor.process('$', 'null');
      expect(result.data).toBeNull();
    });

    it('should use $ in conditional expressions', async () => {
      // Note: $ is a function object when data is null, so it's truthy
      // Use explicit null check for proper conditional behavior
      const result = await processor.process(
        '($ === null || $.valueOf() === null) ? "default" : $',
        'null'
      );
      expect(result.data).toBe('default');
    });
  });

  describe('Error handling for expressions requiring input', () => {
    it('should handle $ when null gracefully', async () => {
      const result = await processor.process(
        '$.valueOf() === null ? "default" : $.valueOf()',
        'null'
      );
      expect(result.data).toBe('default');
    });

    it('should handle property access on null $', async () => {
      const result = await processor.process('$ ? $.length : 0', 'null');
      expect(result.data).toBe(0);
    });

    it('should handle method calls with null check', async () => {
      const result = await processor.process('$ && $.map ? $.map(x => x * 2) : []', 'null');
      expect(result.data).toEqual([]);
    });
  });

  afterAll(async () => {
    await processor.dispose();
  });
});
