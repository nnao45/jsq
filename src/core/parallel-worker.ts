/**
 * Worker thread for parallel JSON processing
 * This file is executed in worker threads to process JSON data in parallel
 */
import { parentPort } from 'node:worker_threads';
import type { JsqOptions } from '@/types/cli';
import { ExpressionEvaluator } from './evaluator';
import { JsonParser } from './parser';

interface WorkerTask {
  id: number;
  data: string[];
  expression: string;
  options: JsqOptions;
}

interface WorkerResult {
  id: number;
  results: unknown[];
  error?: string;
}

// Initialize worker components
let evaluator: ExpressionEvaluator | null = null;
let parser: JsonParser | null = null;

function initializeWorker(options: JsqOptions): void {
  if (!evaluator) {
    evaluator = new ExpressionEvaluator(options);
  }
  if (!parser) {
    parser = new JsonParser(options);
  }
}

async function processLine(
  line: string,
  expression: string,
  _options: JsqOptions
): Promise<unknown | null> {
  const trimmedLine = line.trim();
  if (!trimmedLine) return null;

  if (!parser || !evaluator) {
    throw new Error('Parser or evaluator not initialized');
  }

  const parsed = parser.parse(trimmedLine);
  return await evaluator.evaluate(expression, parsed);
}

function logProcessingError(error: unknown, options: JsqOptions): void {
  if (options.verbose) {
    console.error(
      `Worker ${process.pid}: Error processing line:`,
      error instanceof Error ? error.message : error
    );
  }
}

async function processAllLines(
  data: string[],
  expression: string,
  options: JsqOptions
): Promise<unknown[]> {
  const results: unknown[] = [];

  for (const line of data) {
    try {
      const result = await processLine(line, expression, options);
      if (result !== null) {
        results.push(result);
      }
    } catch (error) {
      logProcessingError(error, options);
    }
  }

  return results;
}

async function processTask(task: WorkerTask): Promise<WorkerResult> {
  const { id, data, expression, options } = task;

  try {
    initializeWorker(options);
    const results = await processAllLines(data, expression, options);
    return { id, results };
  } catch (error) {
    return {
      id,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown worker error',
    };
  }
}

// Handle messages from main thread
if (parentPort) {
  parentPort.on('message', async (task: WorkerTask) => {
    try {
      const result = await processTask(task);
      if (parentPort) {
        parentPort.postMessage(result);
      }
    } catch (error) {
      if (parentPort) {
        parentPort.postMessage({
          id: task.id,
          results: [],
          error: error instanceof Error ? error.message : 'Worker communication error',
        });
      }
    }
  });

  // Signal that worker is ready
  parentPort.postMessage({ type: 'ready', pid: process.pid });
}

// Graceful cleanup on termination
process.on('SIGTERM', async () => {
  if (evaluator) {
    await evaluator.dispose();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  if (evaluator) {
    await evaluator.dispose();
  }
  process.exit(0);
});
