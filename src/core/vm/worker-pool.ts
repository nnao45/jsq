/**
 * Worker pool for parallel JSON processing
 * Manages multiple worker threads to process JSON data in parallel
 */
import { cpus } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import type { JsqOptions } from '@/types/cli';

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

interface QueuedTask {
  task: WorkerTask;
  resolve: (result: WorkerResult) => void;
  reject: (error: Error) => void;
}

interface WorkerInfo {
  worker: Worker;
  busy: boolean;
  id: number;
  currentTask?: QueuedTask;
}

export class WorkerPool {
  private workers: WorkerInfo[] = [];
  private taskQueue: QueuedTask[] = [];
  private nextTaskId = 0;
  private maxWorkers: number;
  private workerScript: string;
  private isShuttingDown = false;

  constructor(maxWorkers?: number) {
    this.maxWorkers = maxWorkers || Math.max(1, cpus().length - 1);

    // Determine worker script path - use __dirname in CommonJS environment
    this.workerScript = join(__dirname, 'parallel-worker.js');
  }

  async initialize(): Promise<void> {
    if (this.workers.length > 0) {
      return; // Already initialized
    }

    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(this.workerScript);
      const workerInfo: WorkerInfo = {
        worker,
        busy: false,
        id: i,
      };

      // Setup worker event handlers
      worker.on('message', (result: WorkerResult | { type: string; pid: number }) => {
        if ('type' in result && result.type === 'ready') {
          // Worker is ready
          return;
        }

        this.handleWorkerResult(workerInfo, result as WorkerResult);
      });

      worker.on('error', error => {
        console.error(`Worker ${i} error:`, error);
        this.handleWorkerError(workerInfo, error);
      });

      worker.on('exit', code => {
        if (code !== 0 && !this.isShuttingDown) {
          console.error(`Worker ${i} exited with code ${code}`);
        }
      });

      this.workers.push(workerInfo);

      // Create initialization promise
      initPromises.push(
        new Promise(resolve => {
          const onReady = (message: { type?: string; pid?: number }) => {
            if (message.type === 'ready') {
              worker.off('message', onReady);
              resolve();
            }
          };
          worker.on('message', onReady);
        })
      );
    }

    // Wait for all workers to be ready
    await Promise.all(initPromises);
  }

  async processTask(data: string[], expression: string, options: JsqOptions): Promise<unknown[]> {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }

    await this.initialize();

    const taskId = this.nextTaskId++;
    const task: WorkerTask = {
      id: taskId,
      data,
      expression,
      options,
    };

    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task,
        resolve,
        reject,
      });

      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) {
      return;
    }

    // Find an available worker
    const availableWorker = this.workers.find(w => !w.busy);
    if (!availableWorker) {
      return; // All workers are busy
    }

    const queuedTask = this.taskQueue.shift();
    if (!queuedTask) {
      return;
    }

    // Mark worker as busy
    availableWorker.busy = true;

    // Store the resolver for this task
    availableWorker.currentTask = queuedTask;

    // Send task to worker
    availableWorker.worker.postMessage(queuedTask.task);
  }

  private handleWorkerResult(workerInfo: WorkerInfo, result: WorkerResult): void {
    const queuedTask = workerInfo.currentTask;

    if (!queuedTask) {
      console.error('Received result from worker without corresponding task');
      return;
    }

    // Mark worker as available
    workerInfo.busy = false;
    workerInfo.currentTask = undefined;

    // Resolve or reject the task
    if (result.error) {
      queuedTask.reject(new Error(`Worker error: ${result.error}`));
    } else {
      queuedTask.resolve(result);
    }

    // Process next task in queue
    this.processQueue();
  }

  private handleWorkerError(workerInfo: WorkerInfo, error: Error): void {
    const queuedTask = workerInfo.currentTask;

    // Mark worker as available
    workerInfo.busy = false;

    if (queuedTask) {
      workerInfo.currentTask = undefined;
      queuedTask.reject(error);
    }

    // Process next task in queue
    this.processQueue();
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    // Wait for all workers to finish current tasks
    const shutdownPromises = this.workers.map(async workerInfo => {
      try {
        await workerInfo.worker.terminate();
      } catch (error) {
        console.error(`Error terminating worker ${workerInfo.id}:`, error);
      }
    });

    await Promise.all(shutdownPromises);
    this.workers = [];

    // Reject any remaining queued tasks
    for (const queuedTask of this.taskQueue) {
      queuedTask.reject(new Error('Worker pool shutting down'));
    }
    this.taskQueue = [];
  }

  getStats(): { totalWorkers: number; busyWorkers: number; queueLength: number } {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queueLength: this.taskQueue.length,
    };
  }
}
