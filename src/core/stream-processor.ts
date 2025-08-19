import { Transform, Readable } from 'stream';
import { JsqOptions } from '@/types/cli';
import { ExpressionEvaluator } from './evaluator';
import { JsonParser } from './parser';
import { ExpressionTransformer } from './expression-transformer';

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

  private makeJSONSafe(obj: any): any {
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
      const safeObj: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          try {
            safeObj[key] = this.makeJSONSafe(obj[key]);
          } catch (error) {
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
  createObjectTransformStream(expression: string, streamOptions: StreamProcessingOptions = {}): Transform {
    const transformedExpression = ExpressionTransformer.transform(expression);
    let lineNumber = 0;

    return new Transform({
      objectMode: true,
      transform: async (chunk: any, encoding, callback) => {
        try {
          lineNumber++;
          
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
            callback(null, stringified + '\n');
          } catch (jsonError) {
            // If JSON.stringify fails, try to convert to a plain object
            const safeResult = this.makeJSONSafe(result);
            callback(null, JSON.stringify(safeResult) + '\n');
          }
        } catch (error) {
          if (this.options.verbose) {
            console.error(`Error processing object ${lineNumber}:`, error instanceof Error ? error.message : error);
          }
          callback(error instanceof Error ? error : new Error('Object processing error'));
        }
      }
    });
  }

  /**
   * Creates a transform stream that processes JSON data line by line
   */
  createTransformStream(expression: string, streamOptions: StreamProcessingOptions = {}): Transform {
    const { jsonLines = true, delimiter = '\n' } = streamOptions;
    let buffer = '';
    let lineNumber = 0;
    
    // Transform expression for better streaming performance
    const transformedExpression = ExpressionTransformer.toDataExpression(expression);
    return new Transform({
      objectMode: true,
      transform: async (chunk: Buffer, encoding, callback) => {
        try {
          buffer += chunk.toString();
          const lines = buffer.split(delimiter);
          
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';
          
          let processedResults: string[] = [];
          // Process complete lines
          for (const line of lines) {
            if (line.trim()) {
              lineNumber++;
              try {
                if (jsonLines) {
                  // Process as JSON Lines format (each line is a separate JSON object)
                  let data: any;
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
                    processedResults.push(stringified + '\n');
                  } catch (jsonError) {
                    // If JSON.stringify fails, try to convert to a plain object
                    const safeResult = this.makeJSONSafe(result);
                    processedResults.push(JSON.stringify(safeResult) + '\n');
                  }
                } else {
                  // Process as regular JSON (not implemented yet)
                  throw new Error('Non-JSON Lines format not yet supported in streaming mode');
                }
              } catch (error) {
                if (this.options.verbose) {
                  console.error(`Error processing line ${lineNumber}:`, error instanceof Error ? error.message : error);
                }
                // Continue processing other lines
                continue;
              }
            }
          }
          
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
      
      flush: async (callback) => {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          try {
            lineNumber++;
            if (jsonLines) {
              const data = this.parser.parse(buffer.trim());
              const result = await this.evaluator.evaluate(transformedExpression, data);
              
              if (this.options.verbose) {
                console.error(`Processed final line ${lineNumber}`);
              }
              
              try {
                const stringified = JSON.stringify(result);
                callback(null, stringified + '\n');
              } catch (jsonError) {
                // If JSON.stringify fails, try to convert to a plain object
                const safeResult = this.makeJSONSafe(result);
                callback(null, JSON.stringify(safeResult) + '\n');
              }
            } else {
              callback();
            }
          } catch (error) {
            if (this.options.verbose) {
              console.error(`Error processing final line ${lineNumber}:`, error instanceof Error ? error.message : error);
            }
            callback();
          }
        } else {
          callback();
        }
      }
    });
  }

  /**
   * Creates a batch transform stream that processes multiple items at once
   */
  createBatchTransformStream(expression: string, streamOptions: StreamProcessingOptions = {}): Transform {
    const { batchSize = 100, jsonLines = true, delimiter = '\n' } = streamOptions;
    let buffer = '';
    let batch: unknown[] = [];
    let totalProcessed = 0;
    
    // Transform expression for better streaming performance
    const transformedExpression = ExpressionTransformer.toDataExpression(expression);

    return new Transform({
      objectMode: true,
      transform: async (chunk: Buffer, encoding, callback) => {
        try {
          buffer += chunk.toString();
          const lines = buffer.split(delimiter);
          
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          // Collect lines into batches
          for (const line of lines) {
            if (line.trim()) {
              try {
                if (jsonLines) {
                  const data = this.parser.parse(line.trim());
                  batch.push(data);
                  
                  // Process batch when it reaches the specified size
                  if (batch.length >= batchSize) {
                    const results = await this.processBatch(transformedExpression, batch);
                    totalProcessed += batch.length;
                    
                    if (this.options.verbose) {
                      console.error(`Processed batch of ${batch.length} items (total: ${totalProcessed})`);
                    }
                    
                    // Output results as a single chunk
                    const batchOutput = results.map(result => JSON.stringify(result) + '\n').join('');
                    
                    batch = []; // Clear batch
                    
                    // Use callback and return to prevent multiple callbacks
                    callback(null, batchOutput);
                    return;
                  }
                }
              } catch (error) {
                if (this.options.verbose) {
                  console.error('Error parsing line:', error instanceof Error ? error.message : error);
                }
                // Continue processing other lines
                continue;
              }
            }
          }
          
          callback();
        } catch (error) {
          callback(error instanceof Error ? error : new Error('Batch stream processing error'));
        }
      },
      
      flush: async (callback) => {
        try {
          // Process any remaining data in buffer
          if (buffer.trim()) {
            try {
              if (jsonLines) {
                const data = this.parser.parse(buffer.trim());
                batch.push(data);
              }
            } catch (error) {
              if (this.options.verbose) {
                console.error('Error parsing final line:', error instanceof Error ? error.message : error);
              }
            }
          }

          // Process remaining batch
          if (batch.length > 0) {
            const results = await this.processBatch(transformedExpression, batch);
            totalProcessed += batch.length;
            
            if (this.options.verbose) {
              console.error(`Processed final batch of ${batch.length} items (total: ${totalProcessed})`);
            }
            
            // Output results as a single chunk  
            const batchOutput = results.map(result => JSON.stringify(result) + '\n').join('');
            callback(null, batchOutput);
          } else {
            callback();
          }
        } catch (error) {
          callback(error instanceof Error ? error : new Error('Batch flush error'));
        }
      }
    });
  }

  private async processBatch(expression: string, batch: unknown[]): Promise<unknown[]> {
    const results: unknown[] = [];
    
    for (const item of batch) {
      try {
        const result = await this.evaluator.evaluate(expression, item);
        results.push(result);
      } catch (error) {
        if (this.options.verbose) {
          console.error('Error processing batch item:', error instanceof Error ? error.message : error);
        }
        // Continue with other items in batch
      }
    }
    
    return results;
  }

  /**
   * Processes a readable stream and returns an async iterable
   */
  async *processStreamIterable(expression: string, inputStream: Readable, streamOptions: StreamProcessingOptions = {}): AsyncIterable<unknown> {
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
            console.error('Error parsing stream result:', error instanceof Error ? error.message : error);
          }
        }
      }
    }
  }
}