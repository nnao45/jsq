/**
 * Piscina-based worker pool for parallel JSON processing
 * Uses Piscina for better worker management and debugging
 */
import { cpus } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Piscina from 'piscina';
import type { JsqOptions } from '@/types/cli';

export interface WorkerTask {
  data: string[];
  expression: string;
  options: JsqOptions;
}

export interface WorkerResult {
  results: unknown[];
  errors?: Array<{ line: number; message: string }>;
}

export class PiscinaWorkerPool {
  private pool: Piscina | null = null;
  private readonly maxWorkers: number;
  private readonly workerScript: string;

  constructor(maxWorkers?: number) {
    this.maxWorkers = maxWorkers || Math.max(1, cpus().length - 1);

    // Determine worker script path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // When running from dist, the worker is in the same directory
    this.workerScript = join(__dirname, 'piscina-parallel-worker.js');
  }

  async initialize(): Promise<void> {
    if (this.pool) {
      return; // Already initialized
    }

    this.pool = new Piscina({
      filename: this.workerScript,
      maxThreads: this.maxWorkers,
      minThreads: Math.min(2, this.maxWorkers),
      // Worker recycling for better performance
      idleTimeout: 60000, // 60 seconds
      // Concurrency settings
      concurrentTasksPerWorker: 2,
      // Queue settings
      maxQueue: 0, // Unlimited queue
      // Resource limits
      resourceLimits: {
        maxOldGenerationSizeMb: 512,
        maxYoungGenerationSizeMb: 256,
      },
      // Better error handling
      recordTiming: true,
    });

    // Wait for workers to be ready
    await this.pool.run({ type: 'init' });
  }

  async processBatch(task: WorkerTask): Promise<WorkerResult> {
    if (!this.pool) {
      throw new Error('Worker pool not initialized');
    }

    try {
      const result = await this.pool.run(task);
      return result as WorkerResult;
    } catch (error) {
      return {
        results: [],
        errors: [{
          line: -1,
          message: error instanceof Error ? error.message : 'Unknown error'
        }]
      };
    }
  }

  async processMultipleBatches(tasks: WorkerTask[]): Promise<WorkerResult[]> {
    if (!this.pool) {
      throw new Error('Worker pool not initialized');
    }

    // Process all batches in parallel using Piscina's queue
    const promises = tasks.map(task => this.processBatch(task));
    return Promise.all(promises);
  }

  getQueueSize(): number {
    return this.pool?.queueSize ?? 0;
  }

  getUtilization(): number {
    return this.pool?.utilization ?? 0;
  }

  getStats() {
    if (!this.pool) {
      return null;
    }

    return {
      threads: this.pool.threads.length,
      queueSize: this.pool.queueSize,
      utilization: this.pool.utilization,
      // waitTime and runTime are not available in the current Piscina version
      waitTime: 0,
      runTime: 0,
    };
  }

  async terminate(): Promise<void> {
    if (this.pool) {
      await this.pool.destroy();
      this.pool = null;
    }
  }
}