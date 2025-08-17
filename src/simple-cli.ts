#!/usr/bin/env node

import { Command } from 'commander';
import { JsqOptions } from '@/types/cli';
import { JsqProcessor } from '@/core/processor';
import { readStdin } from '@/utils/input';

const program = new Command();

program
  .name('jsq')
  .description('A jQuery-like JSON query tool for the command line')
  .version('0.1.0')
  .argument('[expression]', 'JavaScript expression to evaluate')
  .option('-d, --debug', 'Enable debug mode')
  .option('-v, --verbose', 'Verbose output')
  .option('-u, --use <libraries...>', 'Load npm libraries (comma-separated)')
  .option('--unsafe', 'Run without VM isolation (faster but less secure)')
  .action(async (expression: string | undefined, options: JsqOptions) => {
    try {
      if (!expression) {
        console.error('Error: No expression provided. Use: jsq "expression" < input.json');
        process.exit(1);
      }

      // Parse use option if it's a string
      if (typeof options.use === 'string') {
        options.use = options.use.split(',').map(lib => lib.trim());
      }

      // Show security warning if using external libraries with --unsafe
      if (options.use && options.use.length > 0 && options.unsafe) {
        console.error('⚠️  Warning: Running with --unsafe flag. External libraries will execute without VM isolation.');
      }

      const input = await readStdin();
      if (!input) {
        console.error('Error: No input data received from stdin');
        process.exit(1);
      }

      const processor = new JsqProcessor(options);
      const result = await processor.process(expression, input);
      
      console.log(JSON.stringify(result.data, null, 2));
      
      if (options.verbose && result.metadata) {
        console.error(`Processing time: ${result.metadata.processingTime}ms`);
        console.error(`Input size: ${result.metadata.inputSize} bytes`);
        console.error(`Output size: ${result.metadata.outputSize} bytes`);
        if (result.metadata.steps) {
          console.error(`Steps: ${result.metadata.steps.join(' → ')}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error:', errorMessage);
      process.exit(1);
    }
  });

program.parse();