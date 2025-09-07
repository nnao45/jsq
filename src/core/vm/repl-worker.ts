/**
 * Worker for parallel JSON processing
 * This file is executed in worker threads
 */
import { parentPort } from 'node:worker_threads';
import type { JsqOptions } from '@/types/cli';
import { type ApplicationContext, createApplicationContext } from '../application-context';
import { ExpressionEvaluator } from '../lib/evaluator';
import { JsonParser } from '../lib/parser';

interface WorkerTask {
  type?: 'init' | 'process' | 'eval';
  data?: string[] | string;
  expression?: string;
  options?: JsqOptions;
  lastResult?: unknown;
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
        message: error instanceof Error ? error.message : 'Unknown error',
      },
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

  // Handle single evaluation for REPL mode
  if (task.type === 'eval' && typeof data === 'string') {
    
    try {
      if (!parser || !evaluator) {
        throw new Error('Worker not properly initialized');
      }
      const parsed = parser.parse(data);
      
      const result = await evaluator.evaluate(expression, parsed, task.lastResult);
      
      return { results: [result] };
    } catch (error) {
      return {
        results: [],
        errors: [
          {
            line: 1,
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
    }
  }

  // Handle batch processing
  const results: unknown[] = [];
  const errors: Array<{ line: number; message: string }> = [];

  // Process lines with line numbers
  const dataArray = Array.isArray(data) ? data : [data];
  for (let i = 0; i < dataArray.length; i++) {
    const { result, error } = await processLine(dataArray[i], expression || '', i + 1);

    if (error) {
      errors.push(error);
    } else if (result !== null) {
      results.push(result);
    }
  }

  return { results, errors };
}

// Worker message handling
if (parentPort) {
  
  parentPort.on('message', async (task: WorkerTask) => {
    try {
      const result = await processTask(task);
      parentPort?.postMessage({ type: 'result', ...result });
    } catch (error) {
      parentPort?.postMessage({
        type: 'result',
        results: [],
        errors: [
          {
            line: -1,
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      });
    }
  });

  // Send ready signal
  parentPort.postMessage({ type: 'ready' });
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
