#!/usr/bin/env node

import { render } from 'ink/build/index.js';
import React from 'react';
import type { JsqOptions } from '../types/cli';
import { detectFileFormat, readFileByFormat, validateFile } from '../utils/file-input';
import type { SupportedFormat } from '../utils/format-parsers';
import { isStdinAvailable, readStdin } from '../utils/input';
import { ModernREPLApp } from './modern-repl-app';

async function main() {
  const args = process.argv.slice(2);
  const options = parseOptions(args);
  const initialData = await loadInitialData(args);

  await startRepl(initialData, options);
}

function parseOptions(args: string[]): JsqOptions {
  return {
    safe: args.includes('--safe'),
    debug: args.includes('--debug'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

async function loadInitialData(args: string[]): Promise<string> {
  const fileIndex = args.indexOf('--file');

  if (fileIndex !== -1 && args[fileIndex + 1]) {
    const filePath = args[fileIndex + 1];
    if (filePath) {
      return await loadFromFile(filePath);
    }
  }

  if (isStdinAvailable()) {
    return await loadFromStdin();
  }

  return '{}';
}

async function loadFromFile(filePath: string): Promise<string> {
  try {
    await validateFile(filePath);
    const format = await detectFileFormat(filePath);
    return await processFileContent(filePath, format);
  } catch (error) {
    console.error('Error loading file:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function processFileContent(filePath: string, format: SupportedFormat): Promise<string> {
  const content = await readFileByFormat(filePath, format);

  if (format === 'json') {
    return typeof content === 'string' ? content : JSON.stringify(content);
  }

  if (format === 'jsonl') {
    const lines = (content as string).split('\n').filter(line => line.trim());
    const jsonlData = lines.map(line => JSON.parse(line));
    return JSON.stringify({ data: jsonlData });
  }

  return JSON.stringify({ data: content });
}

async function loadFromStdin(): Promise<string> {
  try {
    return await readStdin();
  } catch (error) {
    console.error('Error reading stdin:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function startRepl(initialData: string, options: JsqOptions): Promise<void> {
  // Check if stdin supports raw mode (required for interactive input)
  if (!process.stdin.isTTY) {
    console.error('🚫 REPL requires an interactive terminal (TTY)');
    console.error('💡 Run jsq --repl directly without pipes or redirects');
    console.error('📝 Example: jsq --repl --file data.json');
    process.exit(1);
  }

  // Render the REPL
  const { waitUntilExit } = render(React.createElement(ModernREPLApp, { initialData, options }), {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
  });

  await waitUntilExit();
}

main().catch(error => {
  console.error('REPL error:', error);
  process.exit(1);
});
