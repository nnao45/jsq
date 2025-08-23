import type { JsqOptions } from '@/types/cli';
import { ErrorFormatter } from '@/utils/error-formatter';

export class JsonParser {
  private options: JsqOptions;

  constructor(options: JsqOptions) {
    this.options = options;
  }

  parse(input: string): unknown {
    this.input = input;

    try {
      if (!input.trim()) {
        throw new Error('Empty input');
      }

      // Try to parse as JSON
      const result = JSON.parse(input);

      // Use options for validation if schema is provided
      if (this.options.schema) {
        this.validateSchema(result, this.options.schema);
      }

      return result;
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Try to handle common JSON issues
        const cleanedInput = this.preprocessJson(input);
        try {
          return JSON.parse(cleanedInput);
        } catch (_secondError) {
          // Format the error with detailed position information
          const formattedError = ErrorFormatter.parseJSONError(error, input);
          const errorMessage = ErrorFormatter.formatError(formattedError, input);
          throw new Error(errorMessage);
        }
      }
      throw error;
    }
  }

  private preprocessJson(input: string): string {
    // Remove common issues with JSON input
    let cleaned = input.trim();

    // Remove trailing commas (common issue)
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    // Handle single quotes (convert to double quotes for property names)
    cleaned = cleaned.replace(/(\w+):/g, '"$1":');

    return cleaned;
  }

  parseStream(_inputStream: NodeJS.ReadableStream): AsyncIterable<unknown> {
    // Placeholder for streaming JSON parser
    // Will use libraries like stream-json for actual implementation
    throw new Error('Stream parsing not yet implemented');
  }

  validateSchema(_data: unknown, schemaPath?: string): boolean {
    if (!schemaPath) {
      return true;
    }

    // Placeholder for schema validation
    // Will integrate with Joi, Zod, or JSON Schema validators
    throw new Error('Schema validation not yet implemented');
  }
}
