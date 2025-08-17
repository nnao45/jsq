import { JsqOptions, ProcessingResult } from '@/types/cli';
import { JsonParser } from './parser';
import { ExpressionEvaluator } from './evaluator';

export class JsqProcessor {
  private parser: JsonParser;
  private evaluator: ExpressionEvaluator;
  private options: JsqOptions;

  constructor(options: JsqOptions) {
    this.options = options;
    this.parser = new JsonParser(options);
    this.evaluator = new ExpressionEvaluator(options);
  }

  async process(expression: string, input: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Parse the input JSON
      const data = this.parser.parse(input);
      
      // Evaluate the expression
      const result = await this.evaluator.evaluate(expression, data);
      
      const processingTime = Date.now() - startTime;
      
      const metadata: ProcessingResult['metadata'] = {
        processingTime,
        inputSize: input.length,
        outputSize: JSON.stringify(result).length,
      };
      
      // Add debug steps if in debug mode
      if (this.options.debug) {
        metadata!.steps = ['Parse JSON', 'Evaluate expression', 'Format output'];
      }
      
      return {
        data: result,
        metadata,
      };
    } catch (error) {
      throw new Error(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processStream(_expression: string, _inputStream: NodeJS.ReadableStream): Promise<AsyncIterable<unknown>> {
    // This is a placeholder for streaming implementation
    // Will be enhanced in later phases
    throw new Error('Streaming not yet implemented');
  }
}