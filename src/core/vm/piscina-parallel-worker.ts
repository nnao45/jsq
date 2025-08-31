/**
 * Piscina worker for parallel JSON processing
 * This file is executed in worker threads managed by Piscina
 */
import type { JsqOptions } from '@/types/cli';
import { type ApplicationContext, createApplicationContext } from '../application-context';
import { ExpressionEvaluator } from '../lib/evaluator';
import { JsonParser } from '../lib/parser';

interface WorkerTask {
  type?: 'init' | 'process';
  data?: string[];
  expression?: string;
  options?: JsqOptions;
}

interface WorkerResult {
  results: unknown[];
  errors?: Array<{ line: number; message: string }>;
}

// Worker state - persisted between tasks
let evaluator: ExpressionEvaluator | null = null;
let parser: JsonParser | null = null;
let appContext: ApplicationContext | null = null;
let lastOptions: JsqOptions | null = null;

function initializeWorker(options: JsqOptions): void {
  // Only reinitialize if options changed
  if (lastOptions && JSON.stringify(lastOptions) === JSON.stringify(options)) {
    return;
  }

  // Clean up previous instances
  if (evaluator) {
    evaluator.dispose();
  }
  if (appContext) {
    appContext.dispose();
  }

  // Create new instances
  appContext = createApplicationContext();
  evaluator = new ExpressionEvaluator(options, appContext);
  parser = new JsonParser(options);
  lastOptions = options;
}

async function processLine(
  line: string,
  expression: string,
  lineNumber: number
): Promise<{ result: unknown | null; error?: { line: number; message: string } }> {
  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return { result: null };
  }

  if (!parser || !evaluator) {
    throw new Error('Parser or evaluator not initialized');
  }

  try {
    const parsed = parser.parse(trimmedLine);
    const result = await evaluator.evaluate(expression, parsed);
    return { result };
  } catch (error) {
    return {
      result: null,
      error: {
        line: lineNumber,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function processTask(task: WorkerTask): Promise<WorkerResult> {
  // Handle initialization
  if (task.type === 'init') {
    return { results: ['initialized'] };
  }

  const { data = [], expression = '', options = {} } = task;
  
  initializeWorker(options);

  const results: unknown[] = [];
  const errors: Array<{ line: number; message: string }> = [];

  // Process lines with line numbers
  for (let i = 0; i < data.length; i++) {
    const { result, error } = await processLine(data[i], expression || '', i + 1);
    
    if (error) {
      errors.push(error);
      if (options.verbose) {
        console.error(`Worker: Error on line ${error.line}: ${error.message}`);
      }
    } else if (result !== null) {
      results.push(result);
    }
  }

  return { results, errors };
}

// Piscina expects a default export
export default async function (task: WorkerTask): Promise<WorkerResult> {
  return processTask(task);
}

// Cleanup on process exit
process.on('exit', () => {
  if (evaluator) {
    evaluator.dispose();
  }
  if (appContext) {
    appContext.dispose();
  }
});