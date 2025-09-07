import { dirname, join } from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import type { ApplicationContext } from '@/core/application-context';
import type { JsqOptions } from '@/types/cli';
import type { InputProvider, ReplIO, ReplOptions } from '@/types/repl';
import { ReplFileCommunicator } from '@/utils/repl-file-communication';
import { type EvaluationHandler, ReplManager } from './repl-manager';

interface WorkerMessage {
  type: 'ready' | 'result';
  results?: unknown[];
  errors?: Array<{ line: number; message: string }>;
}

export async function createReplEvaluationHandler(options: JsqOptions): Promise<{
  evaluator: EvaluationHandler;
  dispose: () => Promise<void>;
}> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  let worker: Worker | undefined;
  let fileCommunicator: ReplFileCommunicator | undefined;

  if (options.replFileMode) {
    fileCommunicator = new ReplFileCommunicator();
    await fileCommunicator.start();

    const evaluator: EvaluationHandler = async (expression, data, opts, lastResult) => {
      try {
        const response = await fileCommunicator?.evaluate(expression, data, opts, lastResult);
        if (response.error) {
          return { error: response.error };
        }
        return { result: response.result };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    };

    return {
      evaluator,
      dispose: async () => {
        if (fileCommunicator) {
          await fileCommunicator.dispose();
        }
      },
    };
  } else {
    // Create worker - repl-worker.js is in same dist directory
    worker = new Worker(join(__dirname, 'repl-worker.js'));

    // Wait for worker initialization
    await new Promise<void>((resolve, reject) => {
      const onMessage = (message: WorkerMessage) => {
        if (message.type === 'ready') {
          worker?.removeListener('message', onMessage);
          resolve();
        }
      };
      const onError = (error: Error) => {
        worker?.removeListener('error', onError);
        reject(error);
      };
      worker?.on('message', onMessage);
      worker?.on('error', onError);
    });

    const evaluator: EvaluationHandler = async (expression, data, opts, lastResult) => {
      try {
        return await new Promise((resolve, reject) => {
          let timeoutId: NodeJS.Timeout | undefined;

          const onMessage = (message: WorkerMessage) => {
            if (message.type === 'result') {
              cleanup();
              if (message.errors?.length > 0) {
                resolve({ error: message.errors[0].message });
              } else {
                resolve({ result: message.results[0] });
              }
            }
          };

          const onError = (error: Error) => {
            cleanup();
            reject(error);
          };

          const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            worker?.removeListener('message', onMessage);
            worker?.removeListener('error', onError);
          };

          // Set timeout for evaluation
          timeoutId = setTimeout(() => {
            cleanup();
            resolve({ error: 'Evaluation timeout' });
          }, 30000); // 30 seconds timeout

          worker?.once('message', onMessage);
          worker?.once('error', onError);

          worker?.postMessage({
            type: 'eval',
            expression,
            data: typeof data === 'string' ? data : JSON.stringify(data),
            options: opts,
            lastResult,
          });
        });
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    };

    return {
      evaluator,
      dispose: async () => {
        if (worker) {
          await worker.terminate();
        }
      },
    };
  }
}

export function createTerminalIO(inputStream: NodeJS.ReadStream): ReplIO {
  // Enable keypress events on the input stream
  readline.emitKeypressEvents(inputStream);
  if (inputStream.isTTY && inputStream.setRawMode) {
    inputStream.setRawMode(true);
  }

  return {
    input: inputStream as InputProvider,
    output: {
      write: (data: string) => process.stdout.write(data),
      clearLine: (direction: -1 | 0 | 1) => readline.clearLine(process.stdout, direction),
      cursorTo: (x: number) => readline.cursorTo(process.stdout, x),
    },
  };
}

export async function createRepl(
  data: unknown,
  options: JsqOptions,
  _context: ApplicationContext,
  replOptions?: ReplOptions
): Promise<ReplManager> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const defaultReplOptions: ReplOptions = {
    prompt: '> ',
    realTimeEvaluation: false,
    ...replOptions,
  };

  if (options.replFileMode) {
    const fileCommunicator = new ReplFileCommunicator();
    await fileCommunicator.start();

    const evaluator: EvaluationHandler = async (expression, data, opts, lastResult) => {
      try {
        const response = await fileCommunicator.evaluate(expression, data, opts, lastResult);
        if (response.error) {
          return { error: response.error };
        }
        return { result: response.result };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    };

    return new ReplManager(data, options, evaluator, defaultReplOptions);
  } else {
    // Create worker for REPL - repl-worker.js is in same dist directory
    const worker = new Worker(join(__dirname, 'repl-worker.js'), {
      env: {
        JSQ_UNSAFE: options.unsafe ? 'true' : 'false',
      },
    });

    // Wait for worker initialization
    await new Promise<void>((resolve, reject) => {
      const onMessage = (message: WorkerMessage) => {
        if (message.type === 'ready') {
          worker.removeListener('message', onMessage);
          resolve();
        }
      };
      const onError = (error: Error) => {
        worker.removeListener('error', onError);
        reject(error);
      };
      worker.on('message', onMessage);
      worker.on('error', onError);
    });

    const evaluator: EvaluationHandler = async (expression, data, opts, lastResult) => {
      try {
        return await new Promise((resolve, reject) => {
          let timeoutId: NodeJS.Timeout | undefined;

          const onMessage = (message: WorkerMessage) => {
            if (message.type === 'result') {
              cleanup();
              if (message.errors?.length > 0) {
                resolve({ error: message.errors[0].message });
              } else {
                resolve({ result: message.results[0] });
              }
            }
          };

          const onError = (error: Error) => {
            cleanup();
            reject(error);
          };

          const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            worker.removeListener('message', onMessage);
            worker.removeListener('error', onError);
          };

          // Set timeout for evaluation
          timeoutId = setTimeout(() => {
            cleanup();
            resolve({ error: 'Evaluation timeout' });
          }, 30000); // 30 seconds timeout

          worker.once('message', onMessage);
          worker.once('error', onError);

          worker.postMessage({
            type: 'eval',
            expression,
            data: typeof data === 'string' ? data : JSON.stringify(data),
            options: opts,
            lastResult,
          });
        });
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    };

    // Create repl manager
    const repl = new ReplManager(data, options, evaluator, defaultReplOptions);

    // Store worker reference for cleanup - using type assertion for internal property
    (repl as ReplManager & { _worker?: Worker })._worker = worker;

    return repl;
  }
}

export async function createAndStartRepl(
  data: unknown,
  options: JsqOptions,
  inputStream: NodeJS.ReadStream,
  colors?: {
    prompt?: string;
    yellow?: string;
    gray?: string;
    reset?: string;
  }
): Promise<ReplManager> {
  const { evaluator, dispose } = await createReplEvaluationHandler(options);

  const replManager = new ReplManager(data, options, evaluator, {
    prompt: colors?.prompt || '> ',
    realTimeEvaluation: process.env.JSQ_DISABLE_REALTIME_EVAL !== 'true',
    io: createTerminalIO(inputStream),
  });

  // Handle cleanup on exit
  const cleanup = async () => {
    replManager.stop();
    await dispose();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  replManager.start();

  return replManager;
}
