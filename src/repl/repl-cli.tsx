#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { REPLApp } from './repl-app';
import { JsqOptions } from '../types/cli';
import { readStdin, isStdinAvailable } from '../utils/input';
import { readFileByFormat, detectFileFormat, validateFile } from '../utils/file-input';

async function main() {
  const args = process.argv.slice(2);
  let initialData = '{}';
  
  // Parse basic options
  const options: JsqOptions = {
    safe: args.includes('--safe'),
    debug: args.includes('--debug'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };

  // Handle data input
  const fileIndex = args.indexOf('--file');
  if (fileIndex !== -1 && args[fileIndex + 1]) {
    const filePath = args[fileIndex + 1];
    try {
      await validateFile(filePath);
      const format = await detectFileFormat(filePath);
      
      if (format === 'json' || format === 'jsonl') {
        const content = await readFileByFormat(filePath, format);
        initialData = typeof content === 'string' ? content : JSON.stringify(content);
      } else {
        // For CSV, TSV, Parquet, wrap in data object
        const content = await readFileByFormat(filePath, format);
        initialData = JSON.stringify({ data: content });
      }
    } catch (error) {
      console.error('Error loading file:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  } else if (isStdinAvailable()) {
    try {
      initialData = await readStdin();
    } catch (error) {
      console.error('Error reading stdin:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  // Show welcome message
  if (options.verbose) {
    console.error('🚀 Starting jsq REPL...');
    console.error(`📊 Data loaded: ${initialData.length} chars`);
    console.error(`${options.safe ? '🔒 Running in safe' : '⚡ Running in fast'} mode`);
  }

  // Render the REPL
  const { waitUntilExit } = render(
    <REPLApp initialData={initialData} options={options} />
  );

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