#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { Command } from 'commander';
import { JsqProcessor } from '@/core/processor';
import type { JsqOptions } from '@/types/cli';
import {
  createFormatStream,
  detectFileFormat,
  readFileByFormat,
  validateFile,
} from '@/utils/file-input';
import { getStdinStream, isStdinAvailable, readStdin } from '@/utils/input';

function findPackageRoot(): string {
  const fs = require('node:fs');

  // Try to find package root from the script location
  let currentDir = dirname(__filename || process.argv[1]);

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
  currentDir = join(dirname(__filename || process.argv[1]), '..');
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

// Main command (default Node.js behavior)
program
  .argument('[expression]', 'JavaScript expression to evaluate')
  .option('-d, --debug', 'Enable debug mode')
  .option('-v, --verbose', 'Verbose output')
  .option('-u, --use <libraries...>', 'Load npm libraries (comma-separated)')
  .option('-s, --stream', 'Enable streaming mode for large datasets')
  .option('-b, --batch <size>', 'Process in batches of specified size (implies --stream)')
  .option('--json-lines', 'Input/output in JSON Lines format (one JSON object per line)')
  .option('-f, --file <path>', 'Read input from file instead of stdin')
  .option(
    '--file-format <format>',
    'Specify input file format (json, jsonl, csv, tsv, parquet, yaml, yml, toml, auto)',
    'auto'
  )
  .option('--unsafe', 'Legacy option (deprecated, no effect)')
  .option('--safe', 'Legacy option (deprecated, shows warning)')
  .option('--repl', 'Start interactive REPL mode')
  .action(async (expression: string | undefined, options: JsqOptions) => {
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
      await processExpression(expression, options);
    } catch (error) {
      handleError(error, options);
    }
  });

// Bun subcommand
program
  .command('bun')
  .description('Run jsq with Bun runtime')
  .argument('[expression]', 'JavaScript expression to evaluate')
  .option('-d, --debug', 'Enable debug mode')
  .option('-v, --verbose', 'Verbose output')
  .option('-u, --use <libraries...>', 'Load npm libraries (comma-separated)')
  .option('-s, --stream', 'Enable streaming mode for large datasets')
  .option('-b, --batch <size>', 'Process in batches of specified size (implies --stream)')
  .option('--json-lines', 'Input/output in JSON Lines format (one JSON object per line)')
  .option('-f, --file <path>', 'Read input from file instead of stdin')
  .option(
    '--file-format <format>',
    'Specify input file format (json, jsonl, csv, tsv, parquet, yaml, yml, toml, auto)',
    'auto'
  )
  .option('--unsafe', 'Legacy option (deprecated, no effect)')
  .option('--safe', 'Legacy option (deprecated, shows warning)')
  .option('--repl', 'Start interactive REPL mode')
  .action(async (expression: string | undefined, options: JsqOptions) => {
    await runWithRuntime('bun', expression, options);
  });

// Deno subcommand
program
  .command('deno')
  .description('Run jsq with Deno runtime')
  .argument('[expression]', 'JavaScript expression to evaluate')
  .option('-d, --debug', 'Enable debug mode')
  .option('-v, --verbose', 'Verbose output')
  .option('-u, --use <libraries...>', 'Load npm libraries (comma-separated)')
  .option('-s, --stream', 'Enable streaming mode for large datasets')
  .option('-b, --batch <size>', 'Process in batches of specified size (implies --stream)')
  .option('--json-lines', 'Input/output in JSON Lines format (one JSON object per line)')
  .option('-f, --file <path>', 'Read input from file instead of stdin')
  .option(
    '--file-format <format>',
    'Specify input file format (json, jsonl, csv, tsv, parquet, yaml, yml, toml, auto)',
    'auto'
  )
  .option('--unsafe', 'Legacy option (deprecated, no effect)')
  .option('--safe', 'Legacy option (deprecated, shows warning)')
  .option('--repl', 'Start interactive REPL mode')
  .action(async (expression: string | undefined, options: JsqOptions) => {
    await runWithRuntime('deno', expression, options);
  });

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex runtime delegation logic required
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
    if (options.use) {
      const useLibs = Array.isArray(options.use) ? options.use.join(',') : options.use;
      args.push('--use', useLibs);
    }
    if (options.batch) args.push('--batch', String(options.batch));
    if (options.file) args.push('--file', options.file);
    if (options.fileFormat && options.fileFormat !== 'auto')
      args.push('--file-format', options.fileFormat);

    const child = spawn(args[0], args.slice(1), {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', code => {
      process.exit(code || 0);
    });

    child.on('error', error => {
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
  if (typeof options.use === 'string') {
    options.use = options.use.split(',').map(lib => lib.trim());
  }

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

  if (options.use && options.use.length > 0 && !options.safe) {
    console.error(
      '⚠️  Warning: Running without --safe flag. External libraries will execute without VM isolation. Consider using --safe for better security.'
    );
  }
}

async function processExpression(expression: string, options: JsqOptions): Promise<void> {
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
  }
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
    options.stream ||
    options.batch ||
    options.jsonLines ||
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

  if (options.batch && typeof options.batch === 'number') {
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
    return await createFormatStream(filePath, detectedFormat);
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
  return {
    jsonLines:
      options.jsonLines ||
      options.stream ||
      !!options.batch ||
      streamingFormats.includes(detectedFormat),
    batchSize: typeof options.batch === 'number' ? options.batch : undefined,
  };
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
    return await readFileByFormat(filePath, detectedFormat);
  }
  if (inputSource === 'none') {
    return 'null';
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
  console.log(JSON.stringify(result.data, null, 2));

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
  console.log(JSON.stringify(result.data, null, 2));

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
  console.error('Error:', errorMessage);

  if (options.debug && error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }

  process.exit(1);
}

program.parse();
