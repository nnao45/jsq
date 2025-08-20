import { type Readable, Transform } from 'node:stream';
import type { JsqOptions } from '@/types/cli';
import { ExpressionEvaluator } from './evaluator';
import { ExpressionTransformer } from './expression-transformer';
import { JsonParser } from './parser';

export interface StreamProcessingOptions {
  batchSize?: number;
  jsonLines?: boolean;
  delimiter?: string;
}

export class StreamProcessor {
  private options: JsqOptions;
  private evaluator: ExpressionEvaluator;
  private parser: JsonParser;

  constructor(options: JsqOptions) {
    this.options = options;
    this.evaluator = new ExpressionEvaluator(options);
    this.parser = new JsonParser(options);
  }

  async dispose(): Promise<void> {
    await this.evaluator.dispose();
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

    // Process the object directly
    const result = await this.evaluator.evaluate(transformedExpression, chunk);

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
    const transformedExpression = ExpressionTransformer.toDataExpression(expression);
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
    const transformedExpression = ExpressionTransformer.toDataExpression(expression);

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
}
