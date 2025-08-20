#!/usr/bin/env node

import { render } from 'ink';
import type { JsqOptions } from '../types/cli';
import { detectFileFormat, readFileByFormat, validateFile } from '../utils/file-input';
import { isStdinAvailable, readStdin } from '../utils/input';
import { REPLApp } from './repl-app';

function parseOptions(args: string[]): JsqOptions {
  return {
    safe: args.includes('--safe'),
    debug: args.includes('--debug'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

async function loadDataFromFile(filePath: string): Promise<string> {
  await validateFile(filePath);
  const format = await detectFileFormat(filePath);

  if (format === 'json' || format === 'jsonl') {
    const content = await readFileByFormat(filePath, format);
    return typeof content === 'string' ? content : JSON.stringify(content);
  } else {
    // For CSV, TSV, Parquet, wrap in data object
    const content = await readFileByFormat(filePath, format);
    return JSON.stringify({ data: content });
  }
}

async function getInitialData(args: string[]): Promise<string> {
  const fileIndex = args.indexOf('--file');

  if (fileIndex !== -1 && args[fileIndex + 1]) {
    const filePath = args[fileIndex + 1];
    try {
      return await loadDataFromFile(filePath);
    } catch (error) {
      console.error('Error loading file:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  if (isStdinAvailable()) {
    try {
      return await readStdin();
    } catch (error) {
      console.error('Error reading stdin:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  return '{}';
}

function showWelcomeMessage(options: JsqOptions, dataLength: number): void {
  if (options.verbose) {
    console.error('🚀 Starting jsq REPL...');
    console.error(`📊 Data loaded: ${dataLength} chars`);
    console.error(`${options.safe ? '🔒 Running in safe' : '⚡ Running in fast'} mode`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseOptions(args);
  const initialData = await getInitialData(args);

  showWelcomeMessage(options, initialData.length);

  // Render the REPL
  const { waitUntilExit } = render(<REPLApp initialData={initialData} options={options} />);

  try {
    await waitUntilExit();
  } catch (error) {
    console.error('REPL error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
