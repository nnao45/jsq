#!/usr/bin/env node

import { Command } from 'commander';
import { JsqOptions } from '@/types/cli';
import { JsqProcessor } from '@/core/processor';
import { readStdin, getStdinStream, isStdinAvailable } from '@/utils/input';
import { createFileStream, readFileContent, detectFileFormat, validateFile, readFileByFormat, createFormatStream } from '@/utils/file-input';

const program = new Command();

program
  .name('jsq')
  .description('A jQuery-like JSON query tool for the command line')
  .version('0.1.0')
  .argument('[expression]', 'JavaScript expression to evaluate')
  .option('-d, --debug', 'Enable debug mode')
  .option('-v, --verbose', 'Verbose output')
  .option('-u, --use <libraries...>', 'Load npm libraries (comma-separated)')
  .option('-s, --stream', 'Enable streaming mode for large datasets')
  .option('-b, --batch <size>', 'Process in batches of specified size (implies --stream)')
  .option('--json-lines', 'Input/output in JSON Lines format (one JSON object per line)')
  .option('-f, --file <path>', 'Read input from file instead of stdin')
  .option('--file-format <format>', 'Specify input file format (json, jsonl, csv, tsv, parquet, auto)', 'auto')
  .option('--unsafe', 'Legacy option (deprecated, use --safe for VM isolation)')
  .option('--safe', 'Run with VM isolation (slower but more secure)')
  .option('--repl', 'Start interactive REPL mode')
  .action(async (expression: string | undefined, options: JsqOptions) => {
    try {
      // Handle REPL mode
      if (options.repl) {
        const { spawn } = await import('child_process');
        const path = await import('path');
        
        // Launch standalone REPL
        const replPath = path.join(__dirname, 'repl.js');
        const replArgs = [];
        
        if (options.safe) replArgs.push('--safe');
        if (options.debug) replArgs.push('--debug');
        if (options.verbose) replArgs.push('--verbose');
        if (options.file) replArgs.push('--file', options.file);
        
        const replProcess = spawn('node', [replPath, ...replArgs], {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        
        replProcess.on('exit', (code) => {
          process.exit(code || 0);
        });
        
        replProcess.on('error', (error) => {
          console.error('Failed to start REPL:', error);
          process.exit(1);
        });
        
        return;
      }

      if (!expression) {
        console.error('Error: No expression provided. Use: jsq "expression" < input.json or jsq --repl');
        process.exit(1);
      }

      // Parse use option if it's a string
      if (typeof options.use === 'string') {
        options.use = options.use.split(',').map(lib => lib.trim());
      }

      // Parse batch option
      if (options.batch) {
        const batchSize = typeof options.batch === 'string' ? parseInt(options.batch, 10) : options.batch;
        if (isNaN(batchSize) || batchSize <= 0) {
          console.error('Error: Batch size must be a positive number');
          process.exit(1);
        }
        options.batch = batchSize;
        options.stream = true; // Batch mode implies streaming
      }


      // Show security warning if using external libraries without --safe
      if (options.use && options.use.length > 0 && !options.safe) {
        console.error('⚠️  Warning: Running without --safe flag. External libraries will execute without VM isolation. Consider using --safe for better security.');
      }

      // Determine input source
      let inputSource: 'stdin' | 'file' = 'stdin';
      let detectedFormat: 'json' | 'jsonl' = 'json';
      
      if (options.file) {
        inputSource = 'file';
        // Validate file exists and is readable
        await validateFile(options.file);
        // Detect file format
        detectedFormat = await detectFileFormat(options.file, options.fileFormat);
        
        if (options.verbose) {
          console.error(`📁 Reading from file: ${options.file}`);
          console.error(`📋 Detected format: ${detectedFormat}`);
        }
      } else {
        // Check if stdin is available
        if (!isStdinAvailable()) {
          console.error('Error: No input data available. Please pipe JSON data to jsq or use --file option.');
          process.exit(1);
        }
      }

      const processor = new JsqProcessor(options);

      try {
        // Handle streaming mode (for JSON Lines, CSV, TSV, Parquet)
        const streamingFormats = ['jsonl', 'csv', 'tsv', 'parquet'];
        if (options.stream || options.batch || options.jsonLines || streamingFormats.includes(detectedFormat)) {
          if (options.verbose) {
            if (options.batch) {
              console.error(`🚀 Starting batch processing mode (batch size: ${options.batch})`);
            } else {
              console.error('🚀 Starting streaming mode');
            }
          }

          const inputStream = inputSource === 'file' 
            ? await createFormatStream(options.file!, detectedFormat) 
            : getStdinStream();
          const streamOptions = {
            jsonLines: options.jsonLines || options.stream || !!options.batch || streamingFormats.includes(detectedFormat),
            batchSize: typeof options.batch === 'number' ? options.batch : undefined,
          };

          if (options.batch && typeof options.batch === 'number') {
            // Use batch processing
            const transformStream = processor.createBatchTransformStream(expression, streamOptions);
            inputStream.pipe(transformStream).pipe(process.stdout);
          } else {
            // Check if we need object stream processing (for CSV, TSV, Parquet)
            const objectFormats = ['csv', 'tsv', 'parquet'];
            if (objectFormats.includes(detectedFormat)) {
              // Use object processing for structured data formats
              const transformStream = processor.createObjectTransformStream(expression, streamOptions);
              inputStream.pipe(transformStream).pipe(process.stdout);
            } else {
              // Use line-by-line processing for JSON/JSONL
              const transformStream = processor.createTransformStream(expression, streamOptions);
              inputStream.pipe(transformStream).pipe(process.stdout);
            }
          }

          // Wait for stream to complete
          await new Promise<void>((resolve, reject) => {
            process.stdout.on('finish', resolve);
            process.stdout.on('error', reject);
          });
        } else {
          // Handle regular (non-streaming) mode
          let input: string | unknown[];
          
          if (inputSource === 'file') {
            input = await readFileByFormat(options.file!, detectedFormat);
            
            // For structured formats (CSV, TSV, Parquet), the input is already parsed
            if (['csv', 'tsv', 'parquet'].includes(detectedFormat)) {
              // Convert parsed data array to a single object with data property
              const parsedData = { data: input };
              const result = await processor.process(expression, JSON.stringify(parsedData));
              console.log(JSON.stringify(result.data, null, 2));
              
              if (options.verbose && result.metadata) {
                console.error(`Processing time: ${result.metadata.processingTime}ms`);
                console.error(`Input records: ${Array.isArray(input) ? input.length : 'unknown'}`);
                console.error(`Output size: ${result.metadata.outputSize} bytes`);
              }
              
              await processor.dispose();
              return;
            }
          } else {
            input = await readStdin();
          }
          
          if (!input) {
            console.error(`Error: No input data received from ${inputSource === 'file' ? 'file' : 'stdin'}`);
            process.exit(1);
          }

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
      } finally {
        await processor.dispose();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error:', errorMessage);
      process.exit(1);
    }
  });

program.parse();