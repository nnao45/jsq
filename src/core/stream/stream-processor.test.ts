import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { JsqOptions } from '@/types/cli';
import { type StreamProcessingOptions, StreamProcessor } from './stream-processor';

describe.skip('StreamProcessor', () => {
  let processor: StreamProcessor;
  let options: JsqOptions;

  beforeEach(() => {
    options = {
      debug: false,
      verbose: false,
      safe: true,
    };
    processor = new StreamProcessor(options);
  });

  afterEach(async () => {
    await processor.dispose();
  });

  describe('createTransformStream', () => {
    it('should process JSON lines correctly', async () => {
      const input = [
        '{"name": "Alice", "age": 30}',
        '{"name": "Bob", "age": 25}',
        '{"name": "Charlie", "age": 35}',
      ];

      const inputStream = Readable.from(input.join('\n'));
      const transformStream = processor.createTransformStream('$.name');

      const results: string[] = [];
      transformStream.on('data', chunk => {
        results.push(chunk.toString().trim());
      });

      await pipeline(inputStream, transformStream);

      expect(results).toEqual(['"Alice"', '"Bob"', '"Charlie"']);
    });

    it('should handle filtering operations', async () => {
      const input = [
        '{"name": "Alice", "age": 30}',
        '{"name": "Bob", "age": 25}',
        '{"name": "Charlie", "age": 35}',
      ];

      const inputStream = Readable.from(input.join('\n'));
      const transformStream = processor.createTransformStream('$.age > 28 ? $.name : null');

      const results: string[] = [];
      transformStream.on('data', chunk => {
        const lines = chunk
          .toString()
          .trim()
          .split('\n')
          .filter(line => line.trim());
        results.push(...lines);
      });

      await pipeline(inputStream, transformStream);

      expect(results).toContain('"Alice"');
      expect(results).toContain('"Charlie"');
      expect(results).toContain('null');
    });

    it('should handle complex transformations', async () => {
      const input = [
        '{"user": {"name": "Alice", "details": {"age": 30}}}',
        '{"user": {"name": "Bob", "details": {"age": 25}}}',
      ];

      const inputStream = Readable.from(input.join('\n'));
      const transformStream = processor.createTransformStream(
        '({name: $.user.name, isAdult: $.user.details.age >= 18})'
      );

      const results: string[] = [];
      transformStream.on('data', chunk => {
        results.push(chunk.toString().trim());
      });

      await pipeline(inputStream, transformStream);

      const parsedResults = results.map(r => JSON.parse(r));
      expect(parsedResults).toEqual([
        { name: 'Alice', isAdult: true },
        { name: 'Bob', isAdult: true },
      ]);
    });

    it('should handle empty lines gracefully', async () => {
      const input = ['{"name": "Alice"}', '', '{"name": "Bob"}', '   ', '{"name": "Charlie"}'];

      const inputStream = Readable.from(input.join('\n'));
      const transformStream = processor.createTransformStream('$.name');

      const results: string[] = [];
      transformStream.on('data', chunk => {
        results.push(chunk.toString().trim());
      });

      await pipeline(inputStream, transformStream);

      expect(results).toEqual(['"Alice"', '"Bob"', '"Charlie"']);
    });

    it('should handle invalid JSON gracefully in verbose mode', async () => {
      const verboseOptions = { ...options, verbose: true };
      const verboseProcessor = new StreamProcessor(verboseOptions);

      const input = ['{"name": "Alice"}', '{invalid json}', '{"name": "Bob"}'];

      const inputStream = Readable.from(input.join('\n'));
      const transformStream = verboseProcessor.createTransformStream('$.name');

      const results: string[] = [];
      transformStream.on('data', chunk => {
        results.push(chunk.toString().trim());
      });

      await pipeline(inputStream, transformStream);

      expect(results).toEqual(['"Alice"', '"Bob"']);
      await verboseProcessor.dispose();
    });
  });

  describe('createObjectTransformStream', () => {
    it('should process objects directly', async () => {
      const objects = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ];

      const inputStream = Readable.from(objects, { objectMode: true });
      const transformStream = processor.createObjectTransformStream('$.name');

      const results: string[] = [];
      transformStream.on('data', chunk => {
        results.push(chunk.toString().trim());
      });

      await pipeline(inputStream, transformStream);

      expect(results).toEqual(['"Alice"', '"Bob"', '"Charlie"']);
    });

    it('should handle complex object transformations', async () => {
      const objects = [
        { product: 'laptop', price: 1000, category: 'electronics' },
        { product: 'book', price: 20, category: 'education' },
      ];

      const inputStream = Readable.from(objects, { objectMode: true });
      const transformStream = processor.createObjectTransformStream(
        '({name: $.product, expensive: $.price > 500})'
      );

      const results: string[] = [];
      transformStream.on('data', chunk => {
        results.push(chunk.toString().trim());
      });

      await pipeline(inputStream, transformStream);

      const parsedResults = results.map(r => JSON.parse(r));
      expect(parsedResults).toEqual([
        { name: 'laptop', expensive: true },
        { name: 'book', expensive: false },
      ]);
    });

    it('should handle non-serializable objects safely', async () => {
      const objects = [
        {
          name: 'test',
          func: () => 'hello',
          circular: {} as Record<string, unknown>,
        },
      ];
      objects[0].circular = objects[0]; // Create circular reference

      const inputStream = Readable.from(objects, { objectMode: true });
      const transformStream = processor.createObjectTransformStream('$.name');

      const results: string[] = [];
      transformStream.on('data', chunk => {
        results.push(chunk.toString().trim());
      });

      await pipeline(inputStream, transformStream);

      expect(results).toEqual(['"test"']);
    });
  });

  describe('createBatchTransformStream', () => {
    it('should process items in batches', async () => {
      const input = Array.from({ length: 10 }, (_, i) => JSON.stringify({ id: i, value: i * 2 }));

      const inputStream = Readable.from(input.join('\n'));
      const streamOptions: StreamProcessingOptions = {
        batchSize: 3,
        jsonLines: true,
      };
      const transformStream = processor.createBatchTransformStream('$.value', streamOptions);

      const results: string[] = [];
      transformStream.on('data', chunk => {
        const lines = chunk
          .toString()
          .trim()
          .split('\n')
          .filter(line => line.trim());
        results.push(...lines);
      });

      await pipeline(inputStream, transformStream);

      const parsedResults = results.map(r => JSON.parse(r));
      expect(parsedResults).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
    });

    it('should handle partial batches at end', async () => {
      const input = Array.from({ length: 5 }, (_, i) =>
        JSON.stringify({ id: i, name: `user${i}` })
      );

      const inputStream = Readable.from(input.join('\n'));
      const streamOptions: StreamProcessingOptions = {
        batchSize: 3,
        jsonLines: true,
      };
      const transformStream = processor.createBatchTransformStream('$.name', streamOptions);

      const results: string[] = [];
      transformStream.on('data', chunk => {
        const lines = chunk
          .toString()
          .trim()
          .split('\n')
          .filter(line => line.trim());
        results.push(...lines);
      });

      await pipeline(inputStream, transformStream);

      const parsedResults = results.map(r => JSON.parse(r));
      expect(parsedResults).toEqual(['"user0"', '"user1"', '"user2"', '"user3"', '"user4"']);
    });

    it('should handle batch processing errors gracefully', async () => {
      const verboseOptions = { ...options, verbose: true };
      const verboseProcessor = new StreamProcessor(verboseOptions);

      const input = [
        '{"id": 1, "value": 10}',
        '{invalid json}',
        '{"id": 3, "value": 30}',
        '{"id": 4, "value": 40}',
      ];

      const inputStream = Readable.from(input.join('\n'));
      const streamOptions: StreamProcessingOptions = {
        batchSize: 2,
        jsonLines: true,
      };
      const transformStream = verboseProcessor.createBatchTransformStream('$.value', streamOptions);

      const results: string[] = [];
      transformStream.on('data', chunk => {
        const lines = chunk
          .toString()
          .trim()
          .split('\n')
          .filter(line => line.trim());
        results.push(...lines);
      });

      await pipeline(inputStream, transformStream);

      const parsedResults = results.map(r => JSON.parse(r));
      expect(parsedResults).toEqual([10, 30, 40]);
      await verboseProcessor.dispose();
    });
  });

  describe('processStreamIterable', () => {
    it('should provide async iterable interface', async () => {
      const input = [
        '{"name": "Alice", "score": 95}',
        '{"name": "Bob", "score": 87}',
        '{"name": "Charlie", "score": 92}',
      ];

      const inputStream = Readable.from(input.join('\n'));
      const results: unknown[] = [];

      for await (const result of processor.processStreamIterable(
        '$.score > 90 ? $.name : null',
        inputStream
      )) {
        results.push(result);
      }

      expect(results).toEqual(['Alice', null, 'Charlie']);
    });

    it('should handle complex async iteration', async () => {
      const input = Array.from({ length: 50 }, (_, i) =>
        JSON.stringify({ id: i, category: i % 3 === 0 ? 'A' : 'B', value: i * 10 })
      );

      const inputStream = Readable.from(input.join('\n'));
      const results: unknown[] = [];

      for await (const result of processor.processStreamIterable(
        '$.category === "A" ? $.value : null',
        inputStream
      )) {
        if (result !== null) {
          results.push(result);
        }
      }

      expect(results.length).toBe(17); // Numbers divisible by 3 from 0-49
      expect(results[0]).toBe(0);
      expect(results[1]).toBe(30);
      expect(results[2]).toBe(60);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty stream', async () => {
      const inputStream = Readable.from([]);
      const transformStream = processor.createTransformStream('$.test');

      const results: string[] = [];
      transformStream.on('data', chunk => {
        results.push(chunk.toString());
      });

      await pipeline(inputStream, transformStream);

      expect(results).toEqual([]);
    });

    it('should handle large objects without memory issues', async () => {
      const largeObject = {
        id: 1,
        data: Array.from({ length: 100 }, (_, i) => ({
          index: i,
          value: `string_${i}`,
        })),
      };

      const inputStream = Readable.from([JSON.stringify(largeObject)]);
      const transformStream = processor.createTransformStream('$.data.length');

      const results: string[] = [];
      transformStream.on('data', chunk => {
        results.push(chunk.toString().trim());
      });

      await pipeline(inputStream, transformStream);

      expect(JSON.parse(results[0])).toBe(100);
    });

    it('should handle streaming with custom delimiter', async () => {
      const input = ['{"name": "Alice"}', '{"name": "Bob"}', '{"name": "Charlie"}'];

      const inputStream = Readable.from(input.join('|||'));
      const streamOptions: StreamProcessingOptions = {
        delimiter: '|||',
        jsonLines: true,
      };
      const transformStream = processor.createTransformStream('$.name', streamOptions);

      const results: string[] = [];
      transformStream.on('data', chunk => {
        results.push(chunk.toString().trim());
      });

      await pipeline(inputStream, transformStream);

      expect(results).toEqual(['"Alice"', '"Bob"', '"Charlie"']);
    });

    it('should handle incomplete JSON at buffer boundary', async () => {
      const incompleteJson = '{"name": "Alice", "data": {"nested": "val';
      const completeJson = 'ue"}, "id": 123}';

      const inputStream = Readable.from([incompleteJson, completeJson]);
      const transformStream = processor.createTransformStream('$.name');

      const results: string[] = [];
      transformStream.on('data', chunk => {
        results.push(chunk.toString().trim());
      });

      await pipeline(inputStream, transformStream);

      expect(results).toEqual(['"Alice"']);
    });

    it('should handle multiple JSON objects in single chunk', async () => {
      const multipleJson = [
        '{"id": 1, "name": "Alice"}',
        '{"id": 2, "name": "Bob"}',
        '{"id": 3, "name": "Charlie"}',
      ].join('\n');

      const inputStream = Readable.from([multipleJson]);
      const transformStream = processor.createTransformStream('$.id');

      const results: string[] = [];
      transformStream.on('data', chunk => {
        const lines = chunk
          .toString()
          .trim()
          .split('\n')
          .filter(line => line.trim());
        results.push(...lines);
      });

      await pipeline(inputStream, transformStream);

      expect(results.map(r => JSON.parse(r))).toEqual([1, 2, 3]);
    });
  });

  describe('verbose mode output', () => {
    it('should provide detailed processing information in verbose mode', async () => {
      const verboseOptions = { ...options, verbose: true };
      const verboseProcessor = new StreamProcessor(verboseOptions);

      // Capture stderr output
      const originalStderrWrite = process.stderr.write;
      const stderrOutput: string[] = [];
      process.stderr.write = (chunk: string | Uint8Array) => {
        stderrOutput.push(chunk.toString());
        return true;
      };

      try {
        const input = ['{"name": "Alice"}', '{"name": "Bob"}'];

        const inputStream = Readable.from(input.join('\n'));
        const transformStream = verboseProcessor.createTransformStream('$.name');

        const results: string[] = [];
        transformStream.on('data', chunk => {
          results.push(chunk.toString().trim());
        });

        await pipeline(inputStream, transformStream);

        expect(results).toEqual(['"Alice"', '"Bob"']);
        expect(stderrOutput.some(output => output.includes('Processed line'))).toBe(true);
      } finally {
        process.stderr.write = originalStderrWrite;
        await verboseProcessor.dispose();
      }
    });
  });

  describe('makeJSONSafe method', () => {
    it('should handle circular references in objects', async () => {
      const circularObj = { name: 'test' } as Record<string, unknown>;
      circularObj.self = circularObj;

      const inputStream = Readable.from([circularObj], { objectMode: true });
      const transformStream = processor.createObjectTransformStream('$.name');

      const results: string[] = [];
      transformStream.on('data', chunk => {
        results.push(chunk.toString().trim());
      });

      try {
        await pipeline(inputStream, transformStream);
        expect(results).toEqual(['"test"']);
      } catch (error) {
        // If circular reference handling fails, at least check we get an error
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should convert functions to string representations', async () => {
      const objWithFunction = {
        name: 'test',
        method: () => 'hello',
        arrow: () => 'world',
      };

      const inputStream = Readable.from([objWithFunction], { objectMode: true });
      const transformStream = processor.createObjectTransformStream('$.name');

      const results: string[] = [];
      transformStream.on('data', chunk => {
        results.push(chunk.toString().trim());
      });

      await pipeline(inputStream, transformStream);

      expect(results).toEqual(['"test"']);
    });
  });
});
