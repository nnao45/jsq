#!/usr/bin/env node

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import type { JsqOptions } from '@/types/cli';

const program = new Command();

program
  .name('jsq')
  .description('A jQuery-like JSON query tool for the command line')
  .version('0.1.16')
  .argument('[expression]', 'JavaScript expression to evaluate')
  .option('-d, --debug', 'Enable debug mode with step-by-step visualization')
  .option('-w, --watch <file>', 'Watch file for changes and re-execute')
  .option('-s, --stream', 'Enable streaming mode for large files')
  .option('-b, --batch <size>', 'Batch size for streaming (default: 1000)', '1000')
  .option('-u, --use <libraries...>', 'Load npm libraries')
  .option('-t, --types <file>', 'TypeScript definition file')
  .option('--schema <file>', 'Schema file for validation')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('-f, --format <type>', 'Output format (json, pretty, csv, yaml)', 'pretty')
  .option('-v, --verbose', 'Verbose output')
  .action(async (expression: string | undefined, options: JsqOptions) => {
    try {
      const { App } = await import('@/ui/App');
      render(React.createElement(App, { expression, options }));
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse();
