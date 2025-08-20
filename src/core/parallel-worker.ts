/**
 * Worker thread for parallel JSON processing
 * This file is executed in worker threads to process JSON data in parallel
 */
import { parentPort, workerData } from 'node:worker_threads';
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

async function processTask(task: WorkerTask): Promise<WorkerResult> {
  const { id, data, expression, options } = task;
  
  try {
    initializeWorker(options);
    
    const results: unknown[] = [];
    
    for (const line of data) {
      try {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        const parsed = parser!.parse(trimmedLine);
        const result = await evaluator!.evaluate(expression, parsed);
        results.push(result);
      } catch (error) {
        if (options.verbose) {
          console.error(`Worker ${process.pid}: Error processing line:`, error instanceof Error ? error.message : error);
        }
        // Continue processing other lines
        continue;
      }
    }
    
    return { id, results };
  } catch (error) {
    return {
      id,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown worker error'
    };
  }
}

// Handle messages from main thread
if (parentPort) {
  parentPort.on('message', async (task: WorkerTask) => {
    try {
      const result = await processTask(task);
      parentPort!.postMessage(result);
    } catch (error) {
      parentPort!.postMessage({
        id: task.id,
        results: [],
        error: error instanceof Error ? error.message : 'Worker communication error'
      });
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