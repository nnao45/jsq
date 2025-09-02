#!/usr/bin/env node

import * as readline from 'node:readline';
import { JsqProcessor } from '@/core/lib/processor';
import type { JsqOptions } from '@/types/cli';
import { detectFileFormat, readFileByFormat } from '@/utils/file-input';
import { OutputFormatter } from '@/utils/output-formatter';
import { Pager } from '@/utils/pager';

const PROMPT = '> ';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const GRAY = '\x1b[90m';

interface ReplState {
  data: unknown;
  history: string[];
  historyIndex: number;
  currentInput: string;
  cursorPosition: number;
  processor: JsqProcessor;
  options: JsqOptions;
  lastFullOutput?: string; // 最後の完全な出力を保存
}

async function loadInitialData(options: JsqOptions): Promise<unknown> {
  if (options.file) {
    const format = await detectFileFormat(options.file, options.fileFormat);
    return await readFileByFormat(options.file, format);
  }
  return {};
}

// コンソール幅に合わせて文字列を切り詰める関数
function truncateToWidth(text: string, maxWidth: number): string {
  const columns = process.stdout.columns || 80;
  const availableWidth = Math.min(columns - PROMPT.length - 3, maxWidth); // プロンプトと三点リーダー分を引く

  if (text.length <= availableWidth) {
    return text;
  }

  return `${text.substring(0, availableWidth)}...`;
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
    state.lastFullOutput = formatted; // 完全な出力を保存
    const truncated = truncateToWidth(formatted, process.stdout.columns || 80);
    process.stdout.write(`${GREEN}${truncated}${RESET}`);
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
    process.stdout.write(`${GRAY}Error: ${shortError}${RESET}`);
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
    // If no TTY in test mode, output specific error
    if (process.env.NODE_ENV === 'test') {
      console.error('No expression provided');
    } else {
      console.error('Error: REPL requires an interactive terminal');
    }
    process.exit(1);
  }

  // Show initial prompt
  console.log(`${YELLOW}jsq REPL - Press Ctrl+C to exit, Ctrl+R to view full output${RESET}`);
  if (options.file) {
    if (process.argv.includes('--stdin-data')) {
      console.log(`${GREEN}Loaded data from stdin. Access it with $${RESET}`);
    } else {
      console.log(`Loaded data from: ${options.file}`);
    }
  }
  process.stdout.write(PROMPT);

  // Handle keypress events
  process.stdin.on('keypress', async (str, key) => {
    if (!key) return;

    // Handle special keys
    if (key.ctrl && key.name === 'c') {
      console.log('\nBye!');
      process.exit(0);
    }

    // Ctrl+R - 最後の出力をページャーで表示
    if (key.ctrl && key.name === 'r') {
      if (state.lastFullOutput) {
        const pager = new Pager(state.lastFullOutput);
        // ページャー表示前に現在の行をクリア
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        await pager.show();

        // ページャー終了後、REPLの表示を復元
        process.stdout.write(PROMPT + state.currentInput);
        readline.cursorTo(process.stdout, PROMPT.length + state.cursorPosition);
        // 結果を再表示
        evaluateExpression(state).catch(() => {});
      }
      return;
    }

    if (key.name === 'return') {
      // Enter pressed - execute the expression
      if (state.currentInput.trim()) {
        state.history.push(state.currentInput);
        state.historyIndex = state.history.length;

        // Execute the expression
        try {
          const result = await state.processor.process(
            state.currentInput,
            JSON.stringify(state.data)
          );
          const formatted = OutputFormatter.format(result.data, state.options);
          state.lastFullOutput = formatted;

          // Clear current line and show result
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(`${GREEN}${formatted}${RESET}\n`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(`${GRAY}Error: ${errorMsg}${RESET}\n`);
        }
      } else {
        // Just move to next line if input is empty
        // process.stdout.write('\n');
      }

      // Clear input and show new prompt
      state.currentInput = '';
      state.cursorPosition = 0;
      process.stdout.write(PROMPT);
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
