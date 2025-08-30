#!/usr/bin/env node

import { type ChildProcess, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
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
import { detectRuntime } from '@/utils/runtime';

// Helper function to exit cleanly without QuickJS GC errors
function exitCleanly(code: number): void {
  // The isProcessExiting flag will be set by the exit handler
  process.exit(code);
}

// Set up process exit handlers to prevent QuickJS GC issues
setupProcessExitHandlers();

function findPackageRoot(): string {
  const fs = require('node:fs');

  // Try to find package root from the script location
  let currentDir = dirname(__filename || process.argv[1] || '.');

  while (currentDir !== dirname(currentDir)) {
    const packageJsonPath = join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.name === '@nnao45/jsq') {
          return currentDir;
        }
      } catch {
        // Continue searching
      }
    }
    currentDir = dirname(currentDir);
  }

  // If we can't find it, try from the dist directory upwards
  // This handles the case where we're running from dist/index.js
  currentDir = join(dirname(__filename || process.argv[1] || '.'), '..');
  if (fs.existsSync(join(currentDir, 'package.json'))) {
    return currentDir;
  }

  // Final fallback
  return join(__dirname, '..');
}

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
  ['-d, --debug', 'Enable debug mode'],
  ['-v, --verbose', 'Verbose output'],
  ['-s, --stream', 'Enable streaming mode for large datasets'],
  ['-b, --batch <size>', 'Process in batches of specified size (implies --stream)'],
  ['-p, --parallel [workers]', 'Enable parallel processing (optionally specify number of workers)'],
  ['--json-lines', 'Input/output in JSON Lines format (one JSON object per line)'],
  ['-f, --file <path>', 'Read input from file instead of stdin'],
  [
    '--file-format <format>',
    'Specify input file format (json, jsonl, csv, tsv, parquet, yaml, yml, toml, auto)',
    'auto',
  ],
  ['--unsafe', 'Run in unsafe mode without VM isolation (dangerous!)'],
  ['--safe', 'Legacy option (deprecated, shows warning)'],
  ['--sandbox', 'Legacy option (deprecated, VM isolation is now default)'],
  ['--memory-limit <mb>', 'Memory limit in MB (default: 128)'],
  ['--cpu-limit <ms>', 'CPU time limit in milliseconds (default: 30000)'],
  ['--repl', 'Start interactive REPL mode'],
  ['-w, --watch', 'Watch input file for changes and re-execute expression'],
  ['--oneline', 'Output JSON in a single line (no pretty-printing)'],
  ['--color', 'Enable colored output'],
  ['--no-color', 'Disable colored output'],
  ['--indent <spaces>', 'Number of spaces for indentation (default: 2)'],
  ['--compact', 'Compact output (no spaces after separators)'],
  ['--sort-keys', 'Sort object keys alphabetically'],
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
      if (options.repl) {
        await handleReplMode(options);
        return;
      }

      if (!expression) {
        console.error(
          'Error: No expression provided. Use: jsq "expression" < input.json or jsq --repl'
        );
        process.exit(1);
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

// Bun subcommand
const bunCommand = program
  .command('bun')
  .description('Run jsq with Bun runtime')
  .argument('[expression]', 'JavaScript expression to evaluate');

addCommonOptions(bunCommand).action(async (expression: string | undefined, options: JsqOptions) => {
  // Check if already running in Bun
  const currentRuntime = detectRuntime();
  if (currentRuntime === 'bun') {
    // Already in Bun, just run normally
    await mainCommand.parseAsync(['', '', expression || '', ...process.argv.slice(3)]);
  } else {
    // Need to switch to Bun
    await runWithRuntime('bun', expression, options);
  }
});

// Deno subcommand
const denoCommand = program
  .command('deno')
  .description('Run jsq with Deno runtime')
  .argument('[expression]', 'JavaScript expression to evaluate');

addCommonOptions(denoCommand).action(
  async (expression: string | undefined, options: JsqOptions) => {
    // Check if already running in Deno
    const currentRuntime = detectRuntime();
    if (currentRuntime === 'deno') {
      // Already in Deno, just run normally
      await mainCommand.parseAsync(['', '', expression || '', ...process.argv.slice(3)]);
    } else {
      // Need to switch to Deno
      await runWithRuntime('deno', expression, options);
    }
  }
);

async function runWithRuntime(
  runtime: 'bun' | 'deno',
  expression: string | undefined,
  options: JsqOptions
): Promise<void> {
  try {
    const args: string[] = [];
    const packageRoot = findPackageRoot();

    if (runtime === 'bun') {
      args.push('bun', join(packageRoot, 'dist/index.js'));
    } else if (runtime === 'deno') {
      args.push(
        'deno',
        'run',
        '--allow-all',
        '--unstable-sloppy-imports',
        '--unstable-detect-cjs',
        join(packageRoot, 'dist/index.js')
      );
    }

    // Add expression if provided
    if (expression) {
      args.push(expression);
    }

    // Convert options back to CLI flags
    if (options.debug) args.push('--debug');
    if (options.verbose) args.push('--verbose');
    if (options.stream) args.push('--stream');
    if (options.jsonLines) args.push('--json-lines');
    if (options.unsafe) args.push('--unsafe');
    if (options.safe) args.push('--safe');
    if (options.repl) args.push('--repl');
    if (options.batch) args.push('--batch', String(options.batch));
    if (options.file) args.push('--file', options.file);
    if (options.fileFormat && options.fileFormat !== 'auto')
      args.push('--file-format', options.fileFormat);
    if (options.sandbox) args.push('--sandbox');
    if (options.memoryLimit) args.push('--memory-limit', String(options.memoryLimit));
    if (options.cpuLimit) args.push('--cpu-limit', String(options.cpuLimit));
    if (options.watch) args.push('--watch');
    if (options.parallel) {
      if (typeof options.parallel === 'string' || typeof options.parallel === 'number') {
        args.push('--parallel', String(options.parallel));
      } else {
        args.push('--parallel');
      }
    }
    // Add output formatting options
    if (options.oneline) args.push('--oneline');
    if (options.color) args.push('--color');
    if (options.noColor) args.push('--no-color');
    if (options.indent) args.push('--indent', String(options.indent));
    if (options.compact) args.push('--compact');
    if (options.sortKeys) args.push('--sort-keys');

    if (args.length === 0 || !args[0]) {
      throw new Error('No runtime command specified');
    }

    const child: ChildProcess = spawn(args[0], args.slice(1), {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', (code: number | null) => {
      process.exit(code || 0);
    });

    child.on('error', (error: Error) => {
      console.error(`Failed to start ${runtime}:`, error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error(`Error running with ${runtime}:`, error);
    process.exit(1);
  }
}

async function handleReplMode(options: JsqOptions): Promise<void> {
  const { spawn } = await import('node:child_process');
  const path = await import('node:path');

  const replPath = path.join(__dirname, 'repl.js');
  const replArgs = [];

  if (options.safe) replArgs.push('--safe');
  if (options.debug) replArgs.push('--debug');
  if (options.verbose) replArgs.push('--verbose');
  if (options.file) replArgs.push('--file', options.file);

  const replProcess = spawn('node', [replPath, ...replArgs], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  replProcess.on('exit', code => {
    process.exit(code || 0);
  });

  replProcess.on('error', error => {
    console.error('Failed to start REPL:', error);
    process.exit(1);
  });
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

  // Show warning for deprecated sandbox flag
  if (options.sandbox) {
    console.error(
      '⚠️  Warning: --sandbox flag is deprecated. VM isolation is now the default mode.'
    );
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

    // Force exit after cleanup
    exitCleanly(0);
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
        if (options.debug && error.stack) {
          console.error('\nStack trace:', error.stack);
        }
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
  if (process.stdin.isTTY === true) {
    return { inputSource: 'none', detectedFormat: 'json' };
  }

  // For all other cases (false or undefined), assume stdin might have input and let readStdin handle it
  return { inputSource: 'stdin', detectedFormat: 'json' };
}

function shouldUseStreaming(options: JsqOptions, detectedFormat: string): boolean {
  const streamingFormats = ['jsonl', 'csv', 'tsv', 'parquet'];
  return (
    !!options.stream ||
    !!options.batch ||
    !!options.jsonLines ||
    streamingFormats.includes(detectedFormat)
  );
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
    // Parallel processing - use batch processing with workers
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
      options.jsonLines ||
      options.stream ||
      !!options.batch ||
      !!options.parallel ||
      streamingFormats.includes(detectedFormat),
  };

  if (typeof options.batch === 'number') {
    result.batchSize = options.batch;
  } else if (options.parallel) {
    result.batchSize = 200;
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
  const input = await getInputData(inputSource, options.file, detectedFormat);

  if (isStructuredFormat(detectedFormat)) {
    await processStructuredData(expression, input, processor, options, detectedFormat);
  } else {
    await processRegularData(expression, input, processor, options);
  }
}

async function getInputData(
  inputSource: 'stdin' | 'file' | 'none',
  filePath: string | undefined,
  detectedFormat: string
): Promise<string | unknown> {
  if (inputSource === 'file' && filePath) {
    return await readFileByFormat(filePath, detectedFormat as SupportedFormat);
  }
  if (inputSource === 'none') {
    return null;
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

function handleError(error: unknown, options: JsqOptions): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

  // Check if it's already a formatted error (contains ANSI color codes)
  if (errorMessage.includes('\x1b[')) {
    // Already formatted, output as-is
    console.error(errorMessage);
  } else {
    // Old style error, keep backward compatibility
    console.error('Error:', errorMessage);
  }

  if (options.debug && error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
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
