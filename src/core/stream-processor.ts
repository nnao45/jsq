import { cpus } from 'node:os';
import { type Readable, Transform } from 'node:stream';
import type { JsqOptions } from '@/types/cli';
import { ExpressionEvaluator } from './evaluator';
import { ExpressionTransformer } from './expression-transformer';
import { JsonParser } from './parser';
import { WorkerPool } from './worker-pool';

export interface StreamProcessingOptions {
  batchSize?: number;
  jsonLines?: boolean;
  delimiter?: string;
  parallel?: boolean | number;
  maxWorkers?: number;
}

export class StreamProcessor {
  private options: JsqOptions;
  private evaluator: ExpressionEvaluator;
  private parser: JsonParser;
  private workerPool?: WorkerPool;

  constructor(options: JsqOptions) {
    this.options = options;
    this.evaluator = new ExpressionEvaluator(options);
    this.parser = new JsonParser(options);
  }

  async dispose(): Promise<void> {
    await this.evaluator.dispose();
    if (this.workerPool) {
      await this.workerPool.shutdown();
    }
  }

  private getWorkerCount(parallelOption?: boolean | string | number): number {
    if (parallelOption === false || parallelOption === undefined) {
      return 0; // No parallel processing
    }

    if (parallelOption === true) {
      return Math.max(1, cpus().length - 1);
    }

    const numericValue =
      typeof parallelOption === 'string' ? parseInt(parallelOption, 10) : parallelOption;

    if (Number.isNaN(numericValue) || numericValue < 1) {
      return Math.max(1, cpus().length - 1);
    }

    return Math.min(numericValue, cpus().length * 2); // Cap at 2x CPU count
  }

  private async initializeWorkerPool(workerCount: number): Promise<void> {
    if (this.workerPool) {
      return; // Already initialized
    }

    this.workerPool = new WorkerPool(workerCount);
    await this.workerPool.initialize();

    if (this.options.verbose) {
      console.error(`Initialized worker pool with ${workerCount} workers`);
    }
  }

  private makeJSONSafe(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.makeJSONSafe(item));
    }

    if (typeof obj === 'object') {
      const safeObj: Record<string, unknown> = {};
      for (const key in obj) {
        if (Object.hasOwn(obj, key)) {
          try {
            safeObj[key] = this.makeJSONSafe(obj[key]);
          } catch (_error) {
            // If property access fails, use string representation
            safeObj[key] = String(obj[key]);
          }
        }
      }
      return safeObj;
    }

    // For functions and other non-serializable types
    return String(obj);
  }

  /**
   * Creates a transform stream that processes objects directly (for CSV, TSV, etc.)
   */
  createObjectTransformStream(
    expression: string,
    _streamOptions: StreamProcessingOptions = {}
  ): Transform {
    const transformedExpression = ExpressionTransformer.transform(expression);
    let lineNumber = 0;

    return new Transform({
      objectMode: true,
      transform: async (chunk: unknown, _encoding, callback) => {
        lineNumber++;

        try {
          const result = await this.processObjectChunk(chunk, transformedExpression, lineNumber);
          callback(null, result);
        } catch (error) {
          if (this.options.verbose) {
            console.error(
              `Error processing object ${lineNumber}:`,
              error instanceof Error ? error.message : error
            );
          }
          callback(error instanceof Error ? error : new Error('Object processing error'));
        }
      },
    });
  }

  private async processObjectChunk(
    chunk: unknown,
    transformedExpression: string,
    lineNumber: number
  ): Promise<string> {
    if (this.options.verbose) {
      console.error(`Processing object ${lineNumber}`);
    }

    // Special handling for $ expression to avoid VM cloning issues
    let result: unknown;
    if (transformedExpression === '(function() { return $; })()' || transformedExpression === '$') {
      // For simple $ expression, just return the chunk as-is
      result = chunk;
    } else {
      // Process the object normally
      result = await this.evaluator.evaluate(transformedExpression, chunk);
    }

    if (this.options.verbose) {
      console.error(`Processed object ${lineNumber}`);
    }

    // Convert result to JSON string
    try {
      const stringified = JSON.stringify(result);
      return `${stringified}\n`;
    } catch (_jsonError) {
      // If JSON.stringify fails, try to convert to a plain object
      const safeResult = this.makeJSONSafe(result);
      return `${JSON.stringify(safeResult)}\n`;
    }
  }

  private async processJsonLine(
    line: string,
    transformedExpression: string,
    lineNumber: number
  ): Promise<string | null> {
    try {
      let data: unknown;
      if (typeof line === 'object' && line !== null) {
        // Data is already parsed (e.g., from CSV stream)
        data = line;
      } else {
        // Data is a string that needs JSON parsing
        data = this.parser.parse(line.trim());
      }
      const result = await this.evaluator.evaluate(transformedExpression, data);

      if (this.options.verbose) {
        console.error(`Processed line ${lineNumber}`);
      }

      // Collect result - handle special objects
      try {
        const stringified = JSON.stringify(result);
        return `${stringified}\n`;
      } catch (_jsonError) {
        // If JSON.stringify fails, try to convert to a plain object
        const safeResult = this.makeJSONSafe(result);
        return `${JSON.stringify(safeResult)}\n`;
      }
    } catch (error) {
      if (this.options.verbose) {
        console.error(
          `Error processing line ${lineNumber}:`,
          error instanceof Error ? error.message : error
        );
      }
      return null;
    }
  }

  private async processLines(
    lines: string[],
    transformedExpression: string,
    lineNumber: { value: number },
    jsonLines: boolean
  ): Promise<string[]> {
    const processedResults: string[] = [];

    for (const line of lines) {
      if (line.trim()) {
        lineNumber.value++;
        if (jsonLines) {
          const result = await this.processJsonLine(line, transformedExpression, lineNumber.value);
          if (result) {
            processedResults.push(result);
          }
        } else {
          // Process as regular JSON (not implemented yet)
          throw new Error('Non-JSON Lines format not yet supported in streaming mode');
        }
      }
    }

    return processedResults;
  }

  /**
   * Creates a transform stream that processes JSON data line by line
   */
  createTransformStream(
    expression: string,
    streamOptions: StreamProcessingOptions = {}
  ): Transform {
    const { jsonLines = true, delimiter = '\n' } = streamOptions;
    let buffer = '';
    const lineNumber = { value: 0 };

    // Transform expression for better streaming performance
    const transformedExpression = ExpressionTransformer.transform(expression);
    return new Transform({
      objectMode: true,
      transform: async (chunk: Buffer, _encoding, callback) => {
        try {
          buffer += chunk.toString();
          const lines = buffer.split(delimiter);

          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          const processedResults = await this.processLines(
            lines,
            transformedExpression,
            lineNumber,
            jsonLines
          );

          // Push all results and call callback once
          if (processedResults.length > 0) {
            callback(null, processedResults.join(''));
          } else {
            callback();
          }
        } catch (error) {
          callback(error instanceof Error ? error : new Error('Stream processing error'));
        }
      },

      flush: async callback => {
        await this.flushBuffer(buffer, transformedExpression, lineNumber, jsonLines, callback);
      },
    });
  }

  private async flushBuffer(
    buffer: string,
    transformedExpression: string,
    lineNumber: { value: number },
    jsonLines: boolean,
    callback: (error?: Error | null, data?: string) => void
  ): Promise<void> {
    if (!buffer.trim()) {
      callback();
      return;
    }

    try {
      lineNumber.value++;
      if (jsonLines) {
        const result = await this.processJsonLine(buffer, transformedExpression, lineNumber.value);
        callback(null, result || undefined);
      } else {
        callback();
      }
    } catch (error) {
      if (this.options.verbose) {
        console.error(
          `Error processing final line ${lineNumber.value}:`,
          error instanceof Error ? error.message : error
        );
      }
      callback();
    }
  }

  private async processBatchLine(
    line: string,
    batch: unknown[],
    batchSize: number,
    transformedExpression: string,
    totalProcessed: { value: number },
    jsonLines: boolean
  ): Promise<string | null> {
    if (!line.trim()) {
      return null;
    }

    try {
      if (jsonLines) {
        const data = this.parser.parse(line.trim());
        batch.push(data);

        // Process batch when it reaches the specified size
        if (batch.length >= batchSize) {
          const results = await this.processBatch(transformedExpression, batch);
          totalProcessed.value += batch.length;

          if (this.options.verbose) {
            console.error(
              `Processed batch of ${batch.length} items (total: ${totalProcessed.value})`
            );
          }

          // Output results as a single chunk
          const batchOutput = results.map(result => `${JSON.stringify(result)}\n`).join('');

          batch.length = 0; // Clear batch
          return batchOutput;
        }
      }
    } catch (error) {
      if (this.options.verbose) {
        console.error('Error parsing line:', error instanceof Error ? error.message : error);
      }
    }

    return null;
  }

  private async processBatchBuffer(
    lines: string[],
    batch: unknown[],
    batchSize: number,
    transformedExpression: string,
    totalProcessed: { value: number },
    jsonLines: boolean
  ): Promise<string | null> {
    for (const line of lines) {
      const result = await this.processBatchLine(
        line,
        batch,
        batchSize,
        transformedExpression,
        totalProcessed,
        jsonLines
      );
      if (result) {
        return result;
      }
    }
    return null;
  }

  /**
   * Creates a parallel transform stream that processes items across multiple workers
   */
  createParallelTransformStream(
    expression: string,
    streamOptions: StreamProcessingOptions = {}
  ): Transform {
    const { batchSize = 100, jsonLines = true, delimiter = '\n', parallel } = streamOptions;
    const workerCount = this.getWorkerCount(parallel);

    if (workerCount === 0) {
      // Fall back to regular batch processing if no parallel workers
      return this.createBatchTransformStream(expression, streamOptions);
    }

    let buffer = '';
    const lineBatch: string[] = [];
    const totalProcessed = { value: 0 };
    let isWorkerPoolInitialized = false;

    // Transform expression for better streaming performance
    const transformedExpression = ExpressionTransformer.transform(expression);

    return new Transform({
      objectMode: true,
      transform: async (chunk: Buffer, _encoding, callback) => {
        try {
          // Initialize worker pool on first chunk
          if (!isWorkerPoolInitialized) {
            await this.initializeWorkerPool(workerCount);
            isWorkerPoolInitialized = true;
          }

          // Process chunk into lines
          const newLines = this.processChunkToLines(chunk.toString(), buffer, delimiter);
          buffer = newLines.remainingBuffer;

          // Add valid lines to batch
          this.addLinesToBatch(newLines.lines, lineBatch);

          // Process batch if ready
          if (this.shouldProcessBatch(lineBatch.length, batchSize)) {
            await this.processBatchIfReady(
              lineBatch,
              batchSize,
              transformedExpression,
              totalProcessed,
              jsonLines,
              callback
            );
          } else {
            callback();
          }
        } catch (error) {
          callback(error instanceof Error ? error : new Error('Parallel stream processing error'));
        }
      },

      flush: async callback => {
        try {
          // Add remaining buffer to batch
          this.addRemainingBufferToBatch(buffer, lineBatch);

          // Process final batch
          await this.processFinalBatch(
            lineBatch,
            transformedExpression,
            totalProcessed,
            jsonLines,
            callback
          );
        } catch (error) {
          callback(error instanceof Error ? error : new Error('Parallel flush error'));
        }
      },
    });
  }

  /**
   * Creates a batch transform stream that processes multiple items at once
   */
  createBatchTransformStream(
    expression: string,
    streamOptions: StreamProcessingOptions = {}
  ): Transform {
    const { batchSize = 100, jsonLines = true, delimiter = '\n' } = streamOptions;
    let buffer = '';
    const batch: unknown[] = [];
    const totalProcessed = { value: 0 };

    // Transform expression for better streaming performance
    const transformedExpression = ExpressionTransformer.transform(expression);

    return new Transform({
      objectMode: true,
      transform: async (chunk: Buffer, _encoding, callback) => {
        try {
          buffer += chunk.toString();
          const lines = buffer.split(delimiter);

          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          const result = await this.processBatchBuffer(
            lines,
            batch,
            batchSize,
            transformedExpression,
            totalProcessed,
            jsonLines
          );

          if (result) {
            callback(null, result);
          } else {
            callback();
          }
        } catch (error) {
          callback(error instanceof Error ? error : new Error('Batch stream processing error'));
        }
      },

      flush: async callback => {
        try {
          const result = await this.finalizeBatch(
            buffer,
            batch,
            transformedExpression,
            totalProcessed,
            jsonLines
          );

          if (result) {
            callback(null, result);
          } else {
            callback();
          }
        } catch (error) {
          callback(error instanceof Error ? error : new Error('Batch flush error'));
        }
      },
    });
  }

  private async finalizeBatch(
    buffer: string,
    batch: unknown[],
    transformedExpression: string,
    totalProcessed: { value: number },
    jsonLines: boolean
  ): Promise<string | null> {
    // Process any remaining data in buffer
    if (buffer.trim()) {
      try {
        if (jsonLines) {
          const data = this.parser.parse(buffer.trim());
          batch.push(data);
        }
      } catch (error) {
        if (this.options.verbose) {
          console.error(
            'Error parsing final line:',
            error instanceof Error ? error.message : error
          );
        }
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      const results = await this.processBatch(transformedExpression, batch);
      totalProcessed.value += batch.length;

      if (this.options.verbose) {
        console.error(
          `Processed final batch of ${batch.length} items (total: ${totalProcessed.value})`
        );
      }

      // Output results as a single chunk
      return results.map(result => `${JSON.stringify(result)}\n`).join('');
    }

    return null;
  }

  private async processBatch(expression: string, batch: unknown[]): Promise<unknown[]> {
    const results: unknown[] = [];

    for (const item of batch) {
      try {
        const result = await this.evaluator.evaluate(expression, item);
        results.push(result);
      } catch (error) {
        if (this.options.verbose) {
          console.error(
            'Error processing batch item:',
            error instanceof Error ? error.message : error
          );
        }
        // Continue with other items in batch
      }
    }

    return results;
  }

  private async processBatchParallel(
    expression: string,
    batch: string[],
    workerPool: WorkerPool
  ): Promise<unknown[]> {
    try {
      const result = await workerPool.processTask(batch, expression, this.options);
      return result.results;
    } catch (error) {
      this.logParallelProcessingError(error);
      return await this.fallbackSequentialProcessing(expression, batch);
    }
  }

  private logParallelProcessingError(error: unknown): void {
    if (this.options.verbose) {
      console.error(
        'Error in parallel processing:',
        error instanceof Error ? error.message : error
      );
    }
  }

  private async fallbackSequentialProcessing(
    expression: string,
    batch: string[]
  ): Promise<unknown[]> {
    const results: unknown[] = [];

    for (const line of batch) {
      try {
        const data = this.parser.parse(line.trim());
        const result = await this.evaluator.evaluate(expression, data);
        results.push(result);
      } catch (itemError) {
        this.logFallbackItemError(itemError);
      }
    }

    return results;
  }

  private logFallbackItemError(error: unknown): void {
    if (this.options.verbose) {
      console.error(
        'Error processing fallback item:',
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Processes a readable stream and returns an async iterable
   */
  async *processStreamIterable(
    expression: string,
    inputStream: Readable,
    streamOptions: StreamProcessingOptions = {}
  ): AsyncIterable<unknown> {
    const transformStream = this.createTransformStream(expression, streamOptions);

    // Pipe input through transform
    inputStream.pipe(transformStream);

    // Yield results as they become available
    for await (const chunk of transformStream) {
      if (chunk) {
        try {
          // Parse the JSON result back to object for yielding
          yield JSON.parse(chunk.toString().trim());
        } catch (error) {
          if (this.options.verbose) {
            console.error(
              'Error parsing stream result:',
              error instanceof Error ? error.message : error
            );
          }
        }
      }
    }
  }

  // Helper methods for stream processing complexity reduction
  private processChunkToLines(
    chunkStr: string,
    buffer: string,
    delimiter: string
  ): {
    lines: string[];
    remainingBuffer: string;
  } {
    const newBuffer = buffer + chunkStr;
    const lines = newBuffer.split(delimiter);
    const remainingBuffer = lines.pop() || '';
    return { lines, remainingBuffer };
  }

  private addLinesToBatch(lines: string[], lineBatch: string[]): void {
    for (const line of lines) {
      if (line.trim()) {
        lineBatch.push(line.trim());
      }
    }
  }

  private shouldProcessBatch(batchLength: number, batchSize: number): boolean {
    return batchLength >= batchSize && this.workerPool !== null;
  }

  private async processBatchIfReady(
    lineBatch: string[],
    batchSize: number,
    transformedExpression: string,
    totalProcessed: { value: number },
    jsonLines: boolean,
    callback: (error?: Error | null, result?: unknown) => void
  ): Promise<void> {
    const batchToProcess = lineBatch.splice(0, batchSize);

    if (jsonLines && this.workerPool) {
      const results = await this.processBatchParallel(
        transformedExpression,
        batchToProcess,
        this.workerPool
      );

      totalProcessed.value += batchToProcess.length;
      this.logBatchProcessed(batchToProcess.length, totalProcessed.value, false);

      const batchOutput = results.map(result => `${JSON.stringify(result)}\n`).join('');
      callback(null, batchOutput);
    } else {
      callback();
    }
  }

  private addRemainingBufferToBatch(buffer: string, lineBatch: string[]): void {
    if (buffer.trim()) {
      lineBatch.push(buffer.trim());
    }
  }

  private async processFinalBatch(
    lineBatch: string[],
    transformedExpression: string,
    totalProcessed: { value: number },
    jsonLines: boolean,
    callback: (error?: Error | null, result?: unknown) => void
  ): Promise<void> {
    if (lineBatch.length > 0 && this.workerPool && jsonLines) {
      const results = await this.processBatchParallel(
        transformedExpression,
        lineBatch,
        this.workerPool
      );

      totalProcessed.value += lineBatch.length;
      this.logBatchProcessed(lineBatch.length, totalProcessed.value, true);

      const batchOutput = results.map(result => `${JSON.stringify(result)}\n`).join('');
      callback(null, batchOutput);
    } else {
      callback();
    }
  }

  private logBatchProcessed(batchSize: number, total: number, isFinal: boolean): void {
    if (this.options.verbose && this.workerPool) {
      const stats = this.workerPool.getStats();
      const prefix = isFinal ? 'final' : '';
      console.error(
        `Processed ${prefix} parallel batch of ${batchSize} items ` +
          `(total: ${total}, workers: ${stats.busyWorkers || stats.totalWorkers}/${stats.totalWorkers}` +
          (isFinal ? ')' : `, queue: ${stats.queueLength})`)
      );
    }
  }
}
