import { dirname, join } from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { Piscina } from 'piscina';
import type { ApplicationContext } from '@/core/application-context';
import type { JsqOptions } from '@/types/cli';
import type { InputProvider, ReplIO, ReplOptions } from '@/types/repl';
import { ReplFileCommunicator } from '@/utils/repl-file-communication';
import { type EvaluationHandler, ReplManager } from './repl-manager';

export async function createReplEvaluationHandler(options: JsqOptions): Promise<{
  evaluator: EvaluationHandler;
  dispose: () => Promise<void>;
}> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  let piscina: Piscina | undefined;
  let fileCommunicator: ReplFileCommunicator | undefined;

  if (options.replFileMode) {
    fileCommunicator = new ReplFileCommunicator();
    await fileCommunicator.start();

    const evaluator: EvaluationHandler = async (expression, data, opts) => {
      try {
        const response = await fileCommunicator?.evaluate(expression, data, opts);
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
    piscina = new Piscina({
      filename: join(__dirname, '../../../dist/piscina-parallel-worker.js'),
      minThreads: 1,
      maxThreads: 1,
      idleTimeout: 60000,
    });

    const evaluator: EvaluationHandler = async (expression, data, opts) => {
      try {
        const result = await piscina?.run({
          expression,
          data: typeof data === 'string' ? data : JSON.stringify(data),
          options: opts,
        });

        return { result: result.data };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    };

    return {
      evaluator,
      dispose: async () => {
        if (piscina) {
          await piscina.destroy();
        }
      },
    };
  }
}

export function createTerminalIO(inputStream: NodeJS.ReadStream): ReplIO {
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
  context: ApplicationContext,
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

    const evaluator: EvaluationHandler = async (expression, data, opts) => {
      try {
        const response = await fileCommunicator.evaluate(expression, data, opts);
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
    const piscina = new Piscina({
      filename: join(__dirname, '../../repl-worker.js'),
      maxThreads: 1,
      env: {
        JSQ_UNSAFE: options.unsafe ? 'true' : 'false',
      },
    });

    const evaluator: EvaluationHandler = async (expression, data, opts) => {
      try {
        const result = await piscina.run({
          expression,
          data: typeof data === 'string' ? data : JSON.stringify(data),
          options: opts,
          context,
        });
        return result;
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    };

    return new ReplManager(data, options, evaluator, defaultReplOptions);
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
    realTimeEvaluation: false,
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
