#!/usr/bin/env node

import { cpus } from 'node:os';
import { dirname, join } from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import type { Worker } from 'node:worker_threads';
import { Command } from 'commander';
import { JsqProcessor } from '@/core/lib/processor';
import { setupProcessExitHandlers } from '@/core/vm/quickjs-gc-workaround';
import type { JsqOptions } from '@/types/cli';
import type { SupportedFormat } from '@/utils/file-input';
import {
  createFormatStream,
  detectFileFormat,
  readFileByFormat,
  validateFile,
} from '@/utils/file-input';
import { getStdinStream, readStdin } from '@/utils/input';
import { OutputFormatter } from '@/utils/output-formatter';
import { Pager } from '@/utils/pager';
import { ReplFileCommunicator } from '@/utils/repl-file-communication';
import { detectRuntime } from '@/utils/runtime';

// Set up process exit handlers to prevent QuickJS GC issues
setupProcessExitHandlers();

const program = new Command();

program
  .name('jsq')
  .description('A jQuery-like JSON query tool for the command line')
  .version('0.1.16');

// Add runtime info to verbose output
function logRuntimeInfo(options: JsqOptions): void {
  if (options.verbose) {
    const runtime = detectRuntime();
    console.error(`🚀 Running on ${runtime} runtime`);
  }
}

// Define common options once
const commonOptions = [
  ['-v, --verbose', 'Verbose output'],
  ['-s, --stream', 'Enable streaming mode for large datasets'],
  ['-b, --batch <size>', 'Process in batches of specified size (implies --stream)'],
  ['-p, --parallel [workers]', 'Enable parallel processing (optionally specify number of workers)'],
  ['-f, --file <path>', 'Read input from file instead of stdin'],
  [
    '--file-format <format>',
    'Specify input file format (json, jsonl, csv, tsv, parquet, yaml, yml, toml, auto)',
    'auto',
  ],
  ['--unsafe', 'Run in unsafe mode without VM isolation (dangerous!)'],
  ['--memory-limit <mb>', 'Memory limit in MB (default: 128)'],
  ['--cpu-limit <ms>', 'CPU time limit in milliseconds (default: 30000)'],
  ['-w, --watch', 'Watch input file for changes and re-execute expression'],
  ['--oneline', 'Output JSON in a single line (no pretty-printing)'],
  ['--no-color', 'Disable colored output'],
  ['--indent <spaces>', 'Number of spaces for indentation (default: 2)'],
  ['--compact', 'Compact output (no spaces after separators)'],
  ['--repl-file-mode', 'Use file-based communication for REPL (experimental)'],
] as const;

// Helper function to add options to a command
function addCommonOptions(cmd: Command): Command {
  commonOptions.forEach(([flags, description, defaultValue]) => {
    if (defaultValue) {
      cmd.option(flags, description, defaultValue);
    } else {
      cmd.option(flags, description);
    }
  });
  return cmd;
}

// Main command (default Node.js behavior)
const mainCommand = program.argument('[expression]', 'JavaScript expression to evaluate');

addCommonOptions(mainCommand).action(
  async (expression: string | undefined, options: JsqOptions) => {
    try {
      if (!expression) {
        // Check if it's an interactive terminal for REPL
        if (process.stdin.isTTY && !process.env.JSQ_NO_STDIN) {
          await handleReplMode(options);
          return;
        } else {
          // Non-interactive environment, try to read stdin and process data
          // 環境変数からデータを取得（Node.js子プロセス用）
          const stdinData = process.env.JSQ_STDIN_DATA || (await readStdin());
          if (stdinData !== 'null') {
            // When we have stdin data but no expression, start REPL mode
            options.stdinData = stdinData;
            await handleReplModeWithSubprocess(options);
            return;
          } else {
            // No stdin data and no expression
            throw new Error('No expression provided');
          }
        }
      }

      prepareOptions(options);
      logRuntimeInfo(options);

      if (options.watch && !options.file) {
        console.error('Error: --watch requires --file option to specify the file to watch');
        process.exit(1);
      }

      await processExpression(expression, options);
    } catch (error) {
      handleError(error, options);
    }
  }
);

// REPL関連の定数と型定義
const PROMPT = '> ';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const GRAY = '\x1b[90m';

interface WorkerMessage {
  type: 'ready' | 'result';
  results?: unknown[];
  errors?: Array<{ line: number; message: string }>;
}

interface ReplState {
  data: unknown;
  history: string[];
  historyIndex: number;
  currentInput: string;
  cursorPosition: number;
  worker?: Worker; // 単一ワーカーを使用
  fileCommunicator?: ReplFileCommunicator;
  options: JsqOptions;
  lastFullOutput?: string;
  isReplMode: boolean;
}

async function loadInitialData(options: JsqOptions): Promise<unknown> {
  if (options.file) {
    const format = await detectFileFormat(options.file, options.fileFormat);
    return await readFileByFormat(options.file, format);
  }
  if (options.stdinData) {
    try {
      return JSON.parse(options.stdinData);
    } catch {
      return options.stdinData;
    }
  }
  return {};
}

function truncateToWidth(text: string, maxWidth: number): string {
  const columns = process.stdout.columns || 80;
  const availableWidth = Math.min(columns - PROMPT.length - 3, maxWidth);

  if (text.length <= availableWidth) {
    return text;
  }

  return `${text.substring(0, availableWidth)}...`;
}

async function evaluateExpression(state: ReplState, isFinalEval: boolean = false): Promise<void> {
  if (!state.currentInput.trim()) {
    // 入力が空の時は評価結果をクリア
    const savedCursorPosition = state.cursorPosition;

    // 次の行に移動してクリア
    readline.cursorTo(process.stdout, 0);
    process.stdout.write('\n');
    readline.clearLine(process.stdout, 0);

    // エンター押した時は元の行に戻らない
    if (!isFinalEval) {
      // 元の行に戻ってプロンプトと入力を再表示
      process.stdout.write('\x1b[1A');
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(PROMPT + state.currentInput);
      readline.cursorTo(process.stdout, PROMPT.length + savedCursorPosition);
    }
    return;
  }

  try {
    let result: { results: unknown[]; errors?: Array<{ line: number; message: string }> };

    if (state.fileCommunicator) {
      // ファイル通信モード
      const response = await state.fileCommunicator.evaluate(
        state.currentInput,
        state.data,
        state.options
      );

      if (response.error) {
        throw new Error(response.error);
      }

      result = { results: [response.result] };
    } else if (state.worker) {
      // 通常のWorkerモード
      const taskResult = await new Promise<WorkerMessage>((resolve, reject) => {
        const onMessage = (message: WorkerMessage) => {
          if (message.type === 'result') {
            state.worker?.off('message', onMessage);
            resolve(message);
          }
        };
        state.worker?.on('message', onMessage);
        state.worker?.on('error', reject);
        state.worker?.postMessage({
          type: 'eval',
          data: typeof state.data === 'string' ? state.data : JSON.stringify(state.data),
          expression: state.currentInput,
          options: state.options,
        });
      });

      if (!taskResult.results || taskResult.errors?.length) {
        throw new Error(taskResult.errors?.[0]?.message || 'Evaluation failed');
      }

      result = {
        results: taskResult.results,
        errors: taskResult.errors,
      };
    } else {
      throw new Error('No evaluation engine available');
    }

    const formatOptions = state.isReplMode ? { ...state.options, isReplMode: true } : state.options;
    if (state.options.verbose) {
      console.error('[DEBUG] Result from worker:', result);
      console.error('[DEBUG] Result.results[0]:', result.results[0]);
      console.error('[DEBUG] Result type:', typeof result.results[0]);
    }
    const formatted = OutputFormatter.format(result.results[0], formatOptions);
    state.lastFullOutput = formatted;

    // 現在のカーソル位置を保存
    const savedCursorPosition = state.cursorPosition;

    // 即時評価時は1行にまとめる
    const oneLine = formatted ? formatted.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() : '';
    const displayText = truncateToWidth(oneLine, process.stdout.columns || 80);

    if (state.options.verbose) {
      console.error('[DEBUG] Formatted output:', formatted);
      console.error('[DEBUG] Display text:', displayText);
      console.error('[DEBUG] Is final eval:', isFinalEval);
    }

    // 次の行に移動
    readline.cursorTo(process.stdout, 0);
    process.stdout.write('\n');
    readline.clearLine(process.stdout, 0);

    // 結果を表示
    if (state.options.verbose) {
      console.error(`[DEBUG] Displaying result: "${displayText}" (final=${isFinalEval})`);
    }
    process.stdout.write(`${GREEN}${displayText}${RESET}`);

    // エンター押した時は元の行に戻らない
    if (!isFinalEval) {
      // 元の行に戻る（1行だけ下に移動したので、1行戻る）
      process.stdout.write('\x1b[1A');
      // 元の行をクリアして再表示
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(PROMPT + state.currentInput);
      readline.cursorTo(process.stdout, PROMPT.length + savedCursorPosition);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const shortError = errorMsg.split('\n')[0];

    // 現在のカーソル位置を保存
    const savedCursorPosition = state.cursorPosition;

    if (isFinalEval) {
      // エンター押した時は次の行にエラーを表示
      readline.cursorTo(process.stdout, 0);
      process.stdout.write('\n');
      readline.clearLine(process.stdout, 0);
      process.stdout.write(`${GRAY}Error: ${shortError.substring(0, 80)}${RESET}`);
    } else {
      // リアルタイム評価時は同じ行をクリアして再描画（エラーは表示しない）
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(PROMPT + state.currentInput);
      readline.cursorTo(process.stdout, PROMPT.length + savedCursorPosition);
    }
  }
}

function updateDisplay(state: ReplState): void {
  if (detectRuntime() === 'deno') {
    // Deno needs explicit ANSI escape sequences
    process.stdout.write('\r\x1b[K'); // carriage return + clear line
    process.stdout.write(PROMPT + state.currentInput);
    process.stdout.write(`\r\x1b[${PROMPT.length + state.cursorPosition}C`); // move cursor
  } else {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(PROMPT + state.currentInput);
    readline.cursorTo(process.stdout, PROMPT.length + state.cursorPosition);
  }
}

async function handleReplMode(options: JsqOptions): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const data = await loadInitialData(options);

  // デバッグ: 読み込まれたデータを表示
  if (options.verbose) {
    console.error(`[DEBUG] Loaded initial data:`, JSON.stringify(data).substring(0, 100));
  }

  let worker: Worker | undefined;
  let fileCommunicator: ReplFileCommunicator | undefined;

  if (options.replFileMode) {
    // ファイル通信モード
    fileCommunicator = new ReplFileCommunicator();
    await fileCommunicator.start();
  } else {
    // 通常のWorkerモード
    const { Worker } = await import('node:worker_threads');
    worker = new Worker(join(__dirname, 'repl-worker.js')) as import('node:worker_threads').Worker;

    // Workerの初期化を待つ
    await new Promise<void>((resolve, reject) => {
      const onMessage = (message: WorkerMessage) => {
        if (message.type === 'ready') {
          worker?.removeListener('message', onMessage);
          resolve();
        }
      };
      worker?.on('message', onMessage);
      worker?.on('error', reject);
    });
  }

  const state: ReplState = {
    data,
    history: [],
    historyIndex: 0,
    currentInput: '',
    cursorPosition: 0,
    worker,
    fileCommunicator,
    options,
    isReplMode: true,
  };

  process.stdout.write(`${YELLOW}jsq REPL - Interactive JSON Query Tool${RESET}\n`);
  process.stdout.write(`Type expressions to query the data. Press Ctrl+C to exit.\n`);
  if (options.file) {
    process.stdout.write(`Loaded data from: ${options.file}\n`);
  } else if (options.stdinData) {
    process.stdout.write(`Loaded data from stdin\n`);
  }
  process.stdout.write(`\n${PROMPT}`);

  // パイプ経由でデータを受け取った場合、TTYから入力を取得
  const { getInteractiveInputStream } = await import('@/utils/tty-helper');
  const inputStream = await getInteractiveInputStream(options.stdinData, options.verbose);

  readline.emitKeypressEvents(inputStream);
  if (inputStream.isTTY) {
    inputStream.setRawMode(true);
  }

  inputStream.on('keypress', async (str: string | undefined, key: readline.Key | undefined) => {
    if (options.verbose && detectRuntime() === 'deno') {
      console.error(`[DEBUG] Keypress event: str="${str}", key=${JSON.stringify(key)}`);
    }
    if (key?.ctrl) {
      switch (key.name) {
        case 'c':
          process.stdout.write('\n');
          if (state.currentInput.length > 0) {
            // リアルタイム評価結果をクリア
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);

            state.currentInput = '';
            state.cursorPosition = 0;
            process.stdout.write(PROMPT);
          } else {
            if (state.worker) {
              await state.worker.terminate();
            }
            if (state.fileCommunicator) {
              await state.fileCommunicator.dispose();
            }
            process.exit(130);
          }
          break;
        case 'd':
          if (state.currentInput.length === 0) {
            process.stdout.write('\n');
            if (state.worker) {
              await state.worker.terminate();
            }
            if (state.fileCommunicator) {
              await state.fileCommunicator.dispose();
            }
            process.exit(0);
          }
          break;
        case 'l':
          process.stdout.write('\x1bc');
          updateDisplay(state);
          break;
        case 'a':
          state.cursorPosition = 0;
          updateDisplay(state);
          break;
        case 'e':
          state.cursorPosition = state.currentInput.length;
          updateDisplay(state);
          break;
        case 'k':
          state.currentInput = state.currentInput.substring(0, state.cursorPosition);
          updateDisplay(state);
          break;
        case 'u':
          state.currentInput = state.currentInput.substring(state.cursorPosition);
          state.cursorPosition = 0;
          updateDisplay(state);
          break;
        case 'w': {
          const beforeCursor = state.currentInput.substring(0, state.cursorPosition);
          const afterCursor = state.currentInput.substring(state.cursorPosition);
          const lastSpaceIndex = beforeCursor.lastIndexOf(' ');
          if (lastSpaceIndex >= 0) {
            state.currentInput = beforeCursor.substring(0, lastSpaceIndex) + afterCursor;
            state.cursorPosition = lastSpaceIndex;
          } else {
            state.currentInput = afterCursor;
            state.cursorPosition = 0;
          }
          updateDisplay(state);
          break;
        }
        case 'r':
          if (state.lastFullOutput) {
            process.stdout.write('\n');
            const pager = new Pager(state.lastFullOutput);
            await pager.show();
            updateDisplay(state);
            await evaluateExpression(state);
          }
          break;
      }
      return;
    }

    if (key && !key.ctrl && !key.meta) {
      switch (key.name) {
        case 'return':
          if (state.currentInput.trim()) {
            state.history.push(state.currentInput);
            state.historyIndex = state.history.length;

            // 前のリアルタイム評価結果をクリア
            if (state.options.verbose) {
              console.error('[DEBUG] Clearing real-time evaluation result...');
            }
            // 現在の行に移動
            readline.cursorTo(process.stdout, 0);
            // 現在の行をクリア
            readline.clearLine(process.stdout, 0);
            // 次の行に移動
            process.stdout.write('\n');
            // その行もクリア（リアルタイム評価結果がある可能性）
            readline.clearLine(process.stdout, 0);
            // 元の行に戻る
            process.stdout.write('\x1b[1A');
            // プロンプトと入力を再表示
            process.stdout.write(PROMPT + state.currentInput);

            await evaluateExpression(state, true); // isFinalEval = true
            process.stdout.write(`\n${PROMPT}`);
          } else {
            process.stdout.write(`\n${PROMPT}`);
          }
          state.currentInput = '';
          state.cursorPosition = 0;
          break;
        case 'up':
          if (state.historyIndex > 0) {
            state.historyIndex--;
            state.currentInput = state.history[state.historyIndex];
            state.cursorPosition = state.currentInput.length;
            updateDisplay(state);
            await evaluateExpression(state);
          }
          break;
        case 'down':
          if (state.historyIndex < state.history.length - 1) {
            state.historyIndex++;
            state.currentInput = state.history[state.historyIndex];
            state.cursorPosition = state.currentInput.length;

            if (detectRuntime() === 'deno') {
              updateDisplay(state);
              setTimeout(async () => {
                await evaluateExpression(state);
              }, 0);
            } else {
              updateDisplay(state);
              await evaluateExpression(state);
            }
          } else if (state.historyIndex === state.history.length - 1) {
            state.historyIndex = state.history.length;
            state.currentInput = '';
            state.cursorPosition = 0;
            updateDisplay(state);
          }
          break;
        case 'left':
          if (state.cursorPosition > 0) {
            state.cursorPosition--;
            updateDisplay(state);
          }
          break;
        case 'right':
          if (state.cursorPosition < state.currentInput.length) {
            state.cursorPosition++;
            updateDisplay(state);
          }
          break;
        case 'home':
          state.cursorPosition = 0;
          updateDisplay(state);
          break;
        case 'end':
          state.cursorPosition = state.currentInput.length;
          updateDisplay(state);
          break;
        case 'backspace':
          if (state.cursorPosition > 0) {
            state.currentInput =
              state.currentInput.substring(0, state.cursorPosition - 1) +
              state.currentInput.substring(state.cursorPosition);
            state.cursorPosition--;

            if (detectRuntime() === 'deno') {
              updateDisplay(state);
              setTimeout(async () => {
                await evaluateExpression(state);
              }, 0);
            } else {
              updateDisplay(state);
              await evaluateExpression(state);
            }
          }
          break;
        case 'delete':
          if (state.cursorPosition < state.currentInput.length) {
            state.currentInput =
              state.currentInput.substring(0, state.cursorPosition) +
              state.currentInput.substring(state.cursorPosition + 1);

            if (detectRuntime() === 'deno') {
              updateDisplay(state);
              setTimeout(async () => {
                await evaluateExpression(state);
              }, 0);
            } else {
              updateDisplay(state);
              await evaluateExpression(state);
            }
          }
          break;
        default:
          if (str && str.length === 1 && !key.ctrl && !key.meta) {
            state.currentInput =
              state.currentInput.substring(0, state.cursorPosition) +
              str +
              state.currentInput.substring(state.cursorPosition);
            state.cursorPosition++;

            // Deno requires explicit async handling for display updates
            if (detectRuntime() === 'deno') {
              updateDisplay(state);
              // Use setTimeout to ensure event loop processes the display update
              setTimeout(async () => {
                await evaluateExpression(state);
              }, 0);
            } else {
              updateDisplay(state);
              await evaluateExpression(state);
            }
          }
      }
    }
  });

  process.on('exit', async () => {
    if (state.worker) {
      await state.worker.terminate();
    }
    if (state.fileCommunicator) {
      await state.fileCommunicator.dispose();
    }
  });

  // Handle SIGINT (Ctrl+C) when raw mode is not available
  process.on('SIGINT', async () => {
    console.error('[DEBUG] SIGINT received, cleaning up...');
    process.stdout.write('\n');
    if (state.worker) {
      await state.worker.terminate();
    }
    if (state.fileCommunicator) {
      await state.fileCommunicator.dispose();
    }
    process.exit(0);
  });

  // Keep the process running
  inputStream.resume();
}

async function handleReplModeWithSubprocess(options: JsqOptions): Promise<void> {
  const runtime = detectRuntime();

  if (runtime === 'bun' && !process.stdin.isTTY && options.stdinData) {
    // bunでパイプからの入力の場合、nodeでREPLを起動
    const { spawn } = await import('node:child_process');

    if (options.verbose) {
      console.error('[Bun] Starting REPL mode with Node.js for better compatibility');
    }

    // 現在のスクリプトをnodeで実行
    const child = spawn('node', ['dist/index.js'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        JSQ_STDIN_DATA: options.stdinData,
        JSQ_REPL_MODE: '1',
      },
    });

    // 子プロセスの終了を待つ
    await new Promise<void>((resolve, reject) => {
      child.on('exit', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`REPL exited with code ${code}`));
        }
      });
      child.on('error', reject);
    });
  } else {
    // それ以外の場合は直接REPLモードを起動
    await handleReplMode(options);
  }
}

function prepareOptions(options: JsqOptions): void {
  if (options.batch) {
    const batchSize =
      typeof options.batch === 'string' ? parseInt(options.batch, 10) : options.batch;
    if (Number.isNaN(batchSize) || batchSize <= 0) {
      console.error('Error: Batch size must be a positive number');
      process.exit(1);
    }
    options.batch = batchSize;
    options.stream = true;
  }

  // Process memory limit
  if (options.memoryLimit) {
    const memoryLimit =
      typeof options.memoryLimit === 'string'
        ? parseInt(options.memoryLimit, 10)
        : options.memoryLimit;
    if (Number.isNaN(memoryLimit) || memoryLimit <= 0) {
      console.error('Error: Memory limit must be a positive number (in MB)');
      process.exit(1);
    }
    options.memoryLimit = memoryLimit;
  }

  // Process CPU limit
  if (options.cpuLimit) {
    const cpuLimit =
      typeof options.cpuLimit === 'string' ? parseInt(options.cpuLimit, 10) : options.cpuLimit;
    if (Number.isNaN(cpuLimit) || cpuLimit <= 0) {
      console.error('Error: CPU limit must be a positive number (in milliseconds)');
      process.exit(1);
    }
    options.cpuLimit = cpuLimit;
  }
}

async function processExpression(expression: string, options: JsqOptions): Promise<void> {
  if (options.watch && options.file) {
    await watchAndProcess(expression, options);
  } else {
    await processOnce(expression, options);
  }
}

async function processOnce(expression: string, options: JsqOptions): Promise<void> {
  const { inputSource, detectedFormat } = await determineInputSource(options);
  const processor = new JsqProcessor(options);

  try {
    if (shouldUseStreaming(options, detectedFormat)) {
      await handleStreamingMode(expression, options, inputSource, detectedFormat, processor);
    } else {
      await handleNonStreamingMode(expression, options, inputSource, detectedFormat, processor);
    }
  } finally {
    await processor.dispose();

    // Give cleanup handlers time to run
    await new Promise(resolve => setImmediate(resolve));
  }
}

async function watchAndProcess(expression: string, options: JsqOptions): Promise<void> {
  const { watch } = await import('node:fs');

  if (!options.file) {
    throw new Error('File path is required for watch mode');
  }

  const filePath = options.file;
  let isProcessing = false;

  const clearConsole = () => {
    // Clear screen and move cursor to top
    process.stdout.write('\x1B[2J\x1B[0f');
  };

  const runProcess = async () => {
    if (isProcessing) return;
    isProcessing = true;

    clearConsole();
    console.log(`⏱️  Watching: ${filePath}`);
    console.log(`📝 Expression: ${expression}`);
    console.log('─'.repeat(process.stdout.columns || 80));
    console.log();

    try {
      await processOnce(expression, options);
      console.log(`\n${'─'.repeat(process.stdout.columns || 80)}`);
      console.log('Press Ctrl+C to exit watch mode');
    } catch (error) {
      console.error('\n❌ Error occurred:');
      if (error instanceof Error) {
        console.error(error.message);
      }
    }

    isProcessing = false;
  };

  // Run once initially
  await runProcess();

  // Watch for changes with debouncing
  let debounceTimer: NodeJS.Timeout | null = null;
  const watcher = watch(filePath, async eventType => {
    if (eventType === 'change') {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(async () => {
        await runProcess();
      }, 100); // 100ms debounce
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearConsole();
    console.log('👋 Exiting watch mode...');
    watcher.close();
    process.exit(0);
  });

  // Keep the process running
  process.stdin.resume();
}

async function determineInputSource(options: JsqOptions): Promise<{
  inputSource: 'stdin' | 'file' | 'none';
  detectedFormat: string;
}> {
  if (options.file) {
    await validateFile(options.file);
    const detectedFormat = await detectFileFormat(options.file, options.fileFormat);

    if (options.verbose) {
      console.error(`📁 Reading from file: ${options.file}`);
      console.error(`📋 Detected format: ${detectedFormat}`);
    }

    return { inputSource: 'file', detectedFormat };
  }

  // Check stdin availability - only assume no input when explicitly running in a terminal
  // or when explicitly set via environment variable for tests
  if (process.stdin.isTTY === true || process.env.JSQ_NO_STDIN === 'true') {
    return { inputSource: 'none', detectedFormat: 'json' };
  }

  // For all other cases (false or undefined), assume stdin might have input and let readStdin handle it
  return { inputSource: 'stdin', detectedFormat: 'json' };
}

function shouldUseStreaming(options: JsqOptions, detectedFormat: string): boolean {
  const streamingFormats = ['jsonl', 'csv', 'tsv', 'parquet'];
  return !!options.stream || !!options.batch || streamingFormats.includes(detectedFormat);
}

async function handleStreamingMode(
  expression: string,
  options: JsqOptions,
  inputSource: 'stdin' | 'file' | 'none',
  detectedFormat: string,
  processor: JsqProcessor
): Promise<void> {
  if (options.verbose) {
    if (options.batch) {
      console.error(`🚀 Starting batch processing mode (batch size: ${options.batch})`);
    } else {
      console.error('🚀 Starting streaming mode');
    }
  }

  const inputStream = await getInputStream(inputSource, options.file, detectedFormat);
  const streamOptions = createStreamOptions(options, detectedFormat);

  if (options.parallel) {
    // Parallel processing - use Worker threads for better performance
    const transformStream = processor.createParallelTransformStream(expression, streamOptions);
    inputStream.pipe(transformStream).pipe(process.stdout);
  } else if (options.batch && typeof options.batch === 'number') {
    const transformStream = processor.createBatchTransformStream(expression, streamOptions);
    inputStream.pipe(transformStream).pipe(process.stdout);
  } else {
    const transformStream = createTransformStream(
      processor,
      expression,
      detectedFormat,
      streamOptions
    );
    inputStream.pipe(transformStream).pipe(process.stdout);
  }

  await waitForStreamCompletion();
}

async function getInputStream(
  inputSource: 'stdin' | 'file' | 'none',
  filePath: string | undefined,
  detectedFormat: string
) {
  if (inputSource === 'file' && filePath) {
    return await createFormatStream(filePath, detectedFormat as SupportedFormat);
  }
  if (inputSource === 'none') {
    // Create a readable stream with null data
    const { Readable } = await import('node:stream');
    return Readable.from(['null']);
  }
  return getStdinStream();
}

function createStreamOptions(options: JsqOptions, detectedFormat: string) {
  const streamingFormats = ['jsonl', 'csv', 'tsv', 'parquet'];
  const result: {
    jsonLines: boolean;
    batchSize?: number;
    parallel?: boolean | number;
  } = {
    jsonLines:
      options.stream ||
      !!options.batch ||
      !!options.parallel ||
      streamingFormats.includes(detectedFormat),
  };

  if (typeof options.batch === 'number') {
    result.batchSize = options.batch;
  } else if (options.parallel) {
    // Optimize batch size based on CPU count and worker count
    const cpuCount = cpus().length;
    const workerCount = typeof options.parallel === 'number' ? options.parallel : cpuCount;
    // Use larger batches for better throughput (100-500 per worker)
    result.batchSize = Math.min(500, Math.max(100, Math.floor(1000 / workerCount)));
    if (options.verbose) {
      console.error(`📦 Auto-selected batch size: ${result.batchSize} (${workerCount} workers)`);
    }
  }

  if (options.parallel) {
    if (typeof options.parallel === 'string') {
      result.parallel = true;
    } else if (typeof options.parallel === 'number') {
      result.parallel = options.parallel;
    } else {
      result.parallel = options.parallel;
    }
  }

  return result;
}

function createTransformStream(
  processor: JsqProcessor,
  expression: string,
  detectedFormat: string,
  streamOptions: { jsonLines?: boolean; batchSize?: number }
) {
  const objectFormats = ['csv', 'tsv', 'parquet'];

  if (objectFormats.includes(detectedFormat)) {
    return processor.createObjectTransformStream(expression, streamOptions);
  }

  return processor.createTransformStream(expression, streamOptions);
}

async function waitForStreamCompletion(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    process.stdout.on('finish', resolve);
    process.stdout.on('error', reject);
  });
}

async function handleNonStreamingMode(
  expression: string,
  options: JsqOptions,
  inputSource: 'stdin' | 'file' | 'none',
  detectedFormat: string,
  processor: JsqProcessor
): Promise<void> {
  const input = await getInputData(inputSource, options.file, detectedFormat, options);

  if (isStructuredFormat(detectedFormat)) {
    await processStructuredData(expression, input, processor, options, detectedFormat);
  } else {
    await processRegularData(expression, input, processor, options);
  }
}

async function getInputData(
  inputSource: 'stdin' | 'file' | 'none',
  filePath: string | undefined,
  detectedFormat: string,
  options?: JsqOptions
): Promise<string | unknown> {
  if (inputSource === 'file' && filePath) {
    return await readFileByFormat(filePath, detectedFormat as SupportedFormat);
  }
  if (inputSource === 'none') {
    return 'null';
  }

  // If stdin data was already read, use it
  if (options?.stdinData) {
    return options.stdinData;
  }

  return await readStdin();
}

function isStructuredFormat(format: string): boolean {
  return ['csv', 'tsv', 'parquet', 'yaml', 'yml', 'toml'].includes(format);
}

async function processStructuredData(
  expression: string,
  input: unknown,
  processor: JsqProcessor,
  options: JsqOptions,
  format?: string
): Promise<void> {
  // For YAML and TOML, use data directly since they're already properly structured
  const parsedData = ['yaml', 'yml', 'toml'].includes(format || '') ? input : { data: input };
  const result = await processor.process(expression, JSON.stringify(parsedData));
  console.log(OutputFormatter.format(result.data, options));

  if (options.verbose && result.metadata) {
    console.error(`Processing time: ${result.metadata.processingTime}ms`);
    console.error(`Input records: ${Array.isArray(input) ? input.length : 'unknown'}`);
    console.error(`Output size: ${result.metadata.outputSize} bytes`);
  }
}

async function processRegularData(
  expression: string,
  input: string | unknown,
  processor: JsqProcessor,
  options: JsqOptions
): Promise<void> {
  // Allow null input - jsq will handle $ as null when no input is available
  // This enables usage like: jsq '_.range(5)' without requiring input data

  const result = await processor.process(expression, input as string);
  console.log(OutputFormatter.format(result.data, options));

  if (options.verbose && result.metadata) {
    console.error(`Processing time: ${result.metadata.processingTime}ms`);
    console.error(`Input size: ${result.metadata.inputSize} bytes`);
    console.error(`Output size: ${result.metadata.outputSize} bytes`);
    if (result.metadata.steps) {
      console.error(`Steps: ${result.metadata.steps.join(' → ')}`);
    }
  }
}

function handleError(error: unknown, _options: JsqOptions): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

  // Check if it's already a formatted error (contains ANSI color codes)
  if (errorMessage.includes('\x1b[')) {
    // Already formatted, output as-is
    console.error(errorMessage);
  } else {
    // Old style error, keep backward compatibility
    console.error('Error:', errorMessage);
  }

  process.exit(1);
}

// Set up exit handler to prevent QuickJS GC errors
process.on('exit', () => {
  // The isProcessExiting flag is set by setupProcessExitHandlers
});

// Handle uncaught exceptions gracefully
process.on('uncaughtException', err => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

program.parse();
