import { Readable, Transform } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { JsqOptions } from '@/types/cli';
import { JsqProcessor } from '../processor';
import type { StreamProcessingOptions } from '../stream/stream-processor';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;

// Mock WorkerPool to avoid import.meta.url issues in Jest
jest.mock('./worker-pool', () => {
  return {
    WorkerPool: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(undefined),
        processTask: jest.fn().mockImplementation(async (batch: string[], expression: string) => {
          // Simulate parallel processing by processing each line
          const results = batch
            .map(line => {
              try {
                const data = JSON.parse(line);
                // Simulate different expressions
                if (expression.includes('* 2')) {
                  return data.value * 2;
                } else if (expression.includes('* 3')) {
                  return data.value * 3;
                } else {
                  return data.value;
                }
              } catch {
                return null;
              }
            })
            .filter(result => result !== null);
          return { id: 1, results };
        }),
        getStats: jest.fn().mockReturnValue({
          totalWorkers: 4,
          busyWorkers: 2,
          queueLength: 0,
        }),
        shutdown: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('Parallel Processing', () => {
  let processor: JsqProcessor;
  let options: JsqOptions;

  beforeEach(() => {
    options = {
      verbose: false,
      debug: false,
    };
    processor = new JsqProcessor(options);

    // Mock console.error to reduce test noise
    console.error = jest.fn();
  });

  afterEach(async () => {
    await processor.dispose();
    console.error = originalConsoleError;
  });

  describe('createParallelTransformStream', () => {
    it('should create a parallel transform stream', async () => {
      const streamOptions: StreamProcessingOptions = {
        parallel: true,
        batchSize: 2,
        jsonLines: true,
      };

      const transformStream = processor.createParallelTransformStream('$.value * 2', streamOptions);
      expect(transformStream).toBeInstanceOf(Transform);
    });

    it('should process JSONL data in parallel with multiple workers', async () => {
      const streamOptions: StreamProcessingOptions = {
        parallel: 4, // Use 4 workers
        batchSize: 3,
        jsonLines: true,
      };

      const inputData = [
        '{"value": 1}',
        '{"value": 2}',
        '{"value": 3}',
        '{"value": 4}',
        '{"value": 5}',
        '{"value": 6}',
      ].join('\n');

      const transformStream = processor.createParallelTransformStream('$.value * 2', streamOptions);
      const readable = Readable.from([inputData]);

      const results: string[] = [];

      await new Promise<void>((resolve, reject) => {
        readable
          .pipe(transformStream)
          .on('data', (chunk: Buffer) => {
            results.push(chunk.toString());
          })
          .on('end', resolve)
          .on('error', reject);
      });

      const output = results.join('');
      const lines = output
        .trim()
        .split('\n')
        .filter(line => line);

      expect(lines).toHaveLength(6);

      const parsedResults = lines.map(line => JSON.parse(line));
      const sortedResults = parsedResults.sort((a, b) => a - b);
      expect(sortedResults).toEqual([2, 4, 6, 8, 10, 12]);
    }, 15000); // Increase timeout for parallel processing

    it('should fall back to sequential processing on worker errors', async () => {
      const streamOptions: StreamProcessingOptions = {
        parallel: 2,
        batchSize: 2,
        jsonLines: true,
      };

      const inputData = ['{"value": 1}', '{"value": 2}', '{"value": 3}'].join('\n');

      // Use a more complex expression that works sequentially
      const transformStream = processor.createParallelTransformStream(
        '$.value ? $.value * 2 : 0',
        streamOptions
      );
      const readable = Readable.from([inputData]);

      const results: string[] = [];

      await new Promise<void>((resolve, reject) => {
        readable
          .pipe(transformStream)
          .on('data', (chunk: Buffer) => {
            results.push(chunk.toString());
          })
          .on('end', resolve)
          .on('error', reject);
      });

      const output = results.join('');
      const lines = output
        .trim()
        .split('\n')
        .filter(line => line);

      expect(lines.length).toBeGreaterThan(0);
      const parsedResults = lines.map(line => JSON.parse(line));
      expect(parsedResults).toContain(2);
      expect(parsedResults).toContain(4);
      expect(parsedResults).toContain(6);
    }, 15000);

    it('should handle empty input gracefully', async () => {
      const streamOptions: StreamProcessingOptions = {
        parallel: 2,
        batchSize: 2,
        jsonLines: true,
      };

      const transformStream = processor.createParallelTransformStream('$.value', streamOptions);
      const readable = Readable.from(['']);

      const results: string[] = [];

      await new Promise<void>((resolve, reject) => {
        readable
          .pipe(transformStream)
          .on('data', (chunk: Buffer) => {
            results.push(chunk.toString());
          })
          .on('end', resolve)
          .on('error', reject);
      });

      expect(results.join('')).toBe('');
    });

    it('should fall back to batch processing when parallel is disabled', () => {
      const streamOptions: StreamProcessingOptions = {
        parallel: false,
        batchSize: 10,
        jsonLines: true,
      };

      const transformStream = processor.createParallelTransformStream('$.value', streamOptions);
      expect(transformStream).toBeInstanceOf(Transform);
    });

    it('should handle large batches efficiently', async () => {
      const streamOptions: StreamProcessingOptions = {
        parallel: 2,
        batchSize: 5,
        jsonLines: true,
      };

      // Generate larger dataset
      const inputData = Array.from({ length: 20 }, (_, i) => JSON.stringify({ value: i + 1 })).join(
        '\n'
      );

      const transformStream = processor.createParallelTransformStream('$.value * 3', streamOptions);
      const readable = Readable.from([inputData]);

      const results: string[] = [];
      const startTime = Date.now();

      await new Promise<void>((resolve, reject) => {
        readable
          .pipe(transformStream)
          .on('data', (chunk: Buffer) => {
            results.push(chunk.toString());
          })
          .on('end', resolve)
          .on('error', reject);
      });

      const processingTime = Date.now() - startTime;

      const output = results.join('');
      const lines = output
        .trim()
        .split('\n')
        .filter(line => line);

      expect(lines).toHaveLength(20);

      const parsedResults = lines.map(line => JSON.parse(line));
      const sortedResults = parsedResults.sort((a, b) => a - b);
      const expectedResults = Array.from({ length: 20 }, (_, i) => (i + 1) * 3);
      expect(sortedResults).toEqual(expectedResults);

      // Should complete in reasonable time with parallelization
      expect(processingTime).toBeLessThan(10000); // 10 seconds max
    }, 20000);
  });

  describe('parallel option parsing', () => {
    it('should handle boolean parallel option', async () => {
      const streamOptions: StreamProcessingOptions = {
        parallel: true,
        batchSize: 2,
        jsonLines: true,
      };

      const transformStream = processor.createParallelTransformStream('$.test', streamOptions);
      expect(transformStream).toBeInstanceOf(Transform);
    });

    it('should handle numeric parallel option', async () => {
      const streamOptions: StreamProcessingOptions = {
        parallel: 3,
        batchSize: 2,
        jsonLines: true,
      };

      const transformStream = processor.createParallelTransformStream('$.test', streamOptions);
      expect(transformStream).toBeInstanceOf(Transform);
    });

    it('should handle string numeric parallel option', async () => {
      const streamOptions: StreamProcessingOptions = {
        parallel: '4',
        batchSize: 2,
        jsonLines: true,
      };

      const transformStream = processor.createParallelTransformStream('$.test', streamOptions);
      expect(transformStream).toBeInstanceOf(Transform);
    });
  });
});
