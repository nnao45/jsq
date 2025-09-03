import type { Readable } from 'node:stream';
import type { JsqOptions, ProcessingResult } from '@/types/cli';
import { type ApplicationContext, createApplicationContext } from '../application-context';
import { type StreamProcessingOptions, StreamProcessor } from '../stream/stream-processor';
import { ExpressionEvaluator } from './evaluator';
import { JsonParser } from './parser';

export class JsqProcessor {
  private parser: JsonParser;
  private evaluator: ExpressionEvaluator;
  private streamProcessor: StreamProcessor;
  private appContext: ApplicationContext;

  constructor(options: JsqOptions) {
    this.appContext = createApplicationContext();
    this.parser = new JsonParser(options);
    this.evaluator = new ExpressionEvaluator(options, this.appContext);
    this.streamProcessor = new StreamProcessor(options, this.appContext);
  }

  async dispose(): Promise<void> {
    await this.evaluator.dispose();
    await this.streamProcessor.dispose();

    // Clean up application context (which contains all "global" resources)
    await this.appContext.dispose();
  }

  async process(expression: string, input: string): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      // Check for no input scenarios
      let data: unknown;
      if (!input || input === null || (typeof input === 'string' && input.trim() === '')) {
        // No input available - expressions should work with $ as null
        data = null; // Will be handled by the expression evaluator
      } else {
        // Parse the input JSON
        data = this.parser.parse(input);
      }

      // Evaluate the expression
      const result = await this.evaluator.evaluate(expression, data);

      const processingTime = Date.now() - startTime;

      const metadata: ProcessingResult['metadata'] = {
        processingTime,
        inputSize: input ? input.length : 0,
        outputSize: result !== undefined ? JSON.stringify(result).length : 0,
      };

      return {
        data: result,
        metadata,
      };
    } catch (error) {
      throw new Error(
        `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async processStream(
    expression: string,
    inputStream: Readable,
    streamOptions?: StreamProcessingOptions
  ): Promise<AsyncIterable<unknown>> {
    return this.streamProcessor.processStreamIterable(expression, inputStream, streamOptions);
  }

  /**
   * Create a transform stream for piping operations
   */
  createTransformStream(expression: string, streamOptions?: StreamProcessingOptions) {
    return this.streamProcessor.createTransformStream(expression, streamOptions);
  }

  /**
   * Create a batch transform stream for processing multiple items at once
   */
  createBatchTransformStream(expression: string, streamOptions?: StreamProcessingOptions) {
    return this.streamProcessor.createBatchTransformStream(expression, streamOptions);
  }

  createObjectTransformStream(expression: string, streamOptions?: StreamProcessingOptions) {
    return this.streamProcessor.createObjectTransformStream(expression, streamOptions);
  }

  /**
   * Create a parallel transform stream for high-performance processing
   */
  createParallelTransformStream(expression: string, streamOptions?: StreamProcessingOptions) {
    return this.streamProcessor.createParallelTransformStream(expression, streamOptions);
  }

  /**
   * Create a Piscina-based parallel transform stream for better performance
   */
  createPiscinaParallelTransformStream(
    expression: string,
    streamOptions?: StreamProcessingOptions
  ) {
    return this.streamProcessor.createPiscinaParallelTransformStream(expression, streamOptions);
  }
}
