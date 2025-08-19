#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { ModernREPLApp } from './modern-repl-app';
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
      
      if (format === 'json') {
        const content = await readFileByFormat(filePath, format);
        initialData = typeof content === 'string' ? content : JSON.stringify(content);
      } else if (format === 'jsonl') {
        // For JSONL, convert to array format for REPL
        const content = await readFileByFormat(filePath, format) as string;
        const lines = content.split('\n').filter(line => line.trim());
        const jsonlData = lines.map(line => JSON.parse(line));
        initialData = JSON.stringify({ data: jsonlData });
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

  // Check if stdin supports raw mode (required for interactive input)
  if (!process.stdin.isTTY) {
    console.error('🚫 REPL requires an interactive terminal (TTY)');
    console.error('💡 Run jsq --repl directly without pipes or redirects');
    console.error('📝 Example: jsq --repl --file data.json');
    process.exit(1);
  }

  // Render the REPL
  const { waitUntilExit } = render(
    React.createElement(ModernREPLApp, { initialData, options }),
    { stdin: process.stdin, stdout: process.stdout, stderr: process.stderr }
  );

  await waitUntilExit();
}

main().catch(error => {
  console.error('REPL error:', error);
  process.exit(1);
});