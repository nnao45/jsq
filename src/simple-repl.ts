#!/usr/bin/env node

import * as readline from 'node:readline';
import { JsqProcessor } from '@/core/lib/processor';
import type { JsqOptions } from '@/types/cli';
import { detectFileFormat, readFileByFormat } from '@/utils/file-input';
import { OutputFormatter } from '@/utils/output-formatter';

const PROMPT = '> ';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';

interface ReplState {
  data: unknown;
  history: string[];
  historyIndex: number;
  currentInput: string;
  cursorPosition: number;
  processor: JsqProcessor;
  options: JsqOptions;
}

async function loadInitialData(options: JsqOptions): Promise<unknown> {
  if (options.file) {
    const format = await detectFileFormat(options.file, options.fileFormat);
    return await readFileByFormat(options.file, format);
  }
  return {};
}

async function evaluateExpression(state: ReplState): Promise<void> {
  if (!state.currentInput.trim()) return;

  try {
    const result = await state.processor.process(state.currentInput, JSON.stringify(state.data));
    const formatted = OutputFormatter.format(result.data, state.options);

    // Save cursor position
    readline.cursorTo(process.stdout, 0);
    // Move to next line to show result
    process.stdout.write('\n');
    // Clear the entire line before showing result
    readline.clearLine(process.stdout, 0);
    // Show result
    process.stdout.write(`${GREEN}${formatted}${RESET}`);
    // Move back to prompt line
    process.stdout.write('\x1b[1A'); // Move up one line
    // Clear the prompt line and redraw
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(PROMPT + state.currentInput);
    // Restore cursor position
    readline.cursorTo(process.stdout, PROMPT.length + state.cursorPosition);
  } catch (error) {
    // Save cursor position
    readline.cursorTo(process.stdout, 0);
    // Move to next line to show error
    process.stdout.write('\n');
    // Clear the entire line before showing error
    readline.clearLine(process.stdout, 0);
    // Show error
    const errorMsg = error instanceof Error ? error.message : String(error);
    const shortError = errorMsg.split('\n')[0].substring(0, 80);
    process.stdout.write(`${RED}Error: ${shortError}${RESET}`);
    // Move back to prompt line
    process.stdout.write('\x1b[1A'); // Move up one line
    // Clear the prompt line and redraw
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(PROMPT + state.currentInput);
    // Restore cursor position
    readline.cursorTo(process.stdout, PROMPT.length + state.cursorPosition);
  }
}

async function startRepl() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options: JsqOptions = {
    debug: args.includes('--debug'),
    verbose: args.includes('--verbose'),
    safe: args.includes('--safe'),
    color: true,
    oneline: true, // Always use one-line output in REPL mode
  };

  // Handle file option
  const fileIndex = args.indexOf('--file');
  if (fileIndex !== -1 && fileIndex < args.length - 1) {
    options.file = args[fileIndex + 1];
  }

  // Load initial data
  const initialData = await loadInitialData(options);

  // Initialize state
  const state: ReplState = {
    data: initialData,
    history: [],
    historyIndex: -1,
    currentInput: '',
    cursorPosition: 0,
    processor: new JsqProcessor(options),
    options,
  };

  // Set up readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: PROMPT,
  });

  // Enable raw mode for character-by-character input
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
    readline.emitKeypressEvents(process.stdin, rl);
  } else {
    console.error('Error: REPL requires an interactive terminal');
    process.exit(1);
  }

  // Show initial prompt
  console.log(`${YELLOW}jsq REPL - Press Ctrl+C to exit${RESET}`);
  if (options.file) {
    console.log(`Loaded data from: ${options.file}`);
  }
  process.stdout.write(PROMPT);

  // Handle keypress events
  process.stdin.on('keypress', (str, key) => {
    if (!key) return;

    // Handle special keys
    if (key.ctrl && key.name === 'c') {
      console.log('\nBye!');
      process.exit(0);
    }

    if (key.name === 'return') {
      // Enter pressed - save to history and clear input
      if (state.currentInput.trim()) {
        state.history.push(state.currentInput);
        state.historyIndex = state.history.length;
      }
      state.currentInput = '';
      state.cursorPosition = 0;
      // Clear the current line before moving to next line
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(PROMPT + state.currentInput);
      process.stdout.write(`\n${PROMPT}`);
      return;
    }

    if (key.name === 'up') {
      // History up
      if (state.historyIndex > 0) {
        state.historyIndex--;
        state.currentInput = state.history[state.historyIndex];
        state.cursorPosition = state.currentInput.length;
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(PROMPT + state.currentInput);
      }
      return;
    }

    if (key.name === 'down') {
      // History down
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        state.currentInput = state.history[state.historyIndex];
        state.cursorPosition = state.currentInput.length;
      } else if (state.historyIndex === state.history.length - 1) {
        state.historyIndex = state.history.length;
        state.currentInput = '';
        state.cursorPosition = 0;
      }
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(PROMPT + state.currentInput);
      return;
    }

    if (key.name === 'left') {
      // Move cursor left
      if (state.cursorPosition > 0) {
        state.cursorPosition--;
        readline.cursorTo(process.stdout, PROMPT.length + state.cursorPosition);
      }
      return;
    }

    if (key.name === 'right') {
      // Move cursor right
      if (state.cursorPosition < state.currentInput.length) {
        state.cursorPosition++;
        readline.cursorTo(process.stdout, PROMPT.length + state.cursorPosition);
      }
      return;
    }

    if (key.name === 'backspace') {
      // Handle backspace
      if (state.cursorPosition > 0 && state.currentInput.length > 0) {
        state.currentInput =
          state.currentInput.slice(0, state.cursorPosition - 1) +
          state.currentInput.slice(state.cursorPosition);
        state.cursorPosition--;
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(PROMPT + state.currentInput);
        readline.cursorTo(process.stdout, PROMPT.length + state.cursorPosition);
        evaluateExpression(state).catch(() => {});
      }
      return;
    }

    // Regular character input
    if (str) {
      // Insert character at cursor position
      state.currentInput =
        state.currentInput.slice(0, state.cursorPosition) +
        str +
        state.currentInput.slice(state.cursorPosition);
      state.cursorPosition++;
      // Redraw the entire line
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(PROMPT + state.currentInput);
      readline.cursorTo(process.stdout, PROMPT.length + state.cursorPosition);
      evaluateExpression(state).catch(() => {});
    }
  });

  // Handle cleanup
  process.on('exit', async () => {
    await state.processor.dispose();
  });
}

// Start the REPL
startRepl().catch(error => {
  console.error('Failed to start REPL:', error);
  process.exit(1);
});
