import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createInterface, type Interface as ReadlineInterface } from 'node:readline';

// Extended readline interface for internal history access
interface ExtendedReadlineInterface extends ReadlineInterface {
  history?: string[];
}

import { JsqProcessor } from '../core/processor';
import type { JsqOptions } from '../types/cli';

interface REPLSession {
  processor: JsqProcessor;
  options: JsqOptions;
  data: string;
  history: Array<{ expression: string; result: string; error?: string }>;
  historyIndex: number;
  currentInput: string;
}

export async function startSimpleREPL(data: string, options: JsqOptions): Promise<void> {
  const session: REPLSession = {
    processor: new JsqProcessor(options),
    options,
    data,
    history: await loadHistory(),
    historyIndex: -1,
    currentInput: '',
  };

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'jsq> ',
    historySize: 1000,
  });

  // Setup keyboard event handling for history navigation
  setupKeyboardHandlers(rl, session);

  console.log('🚀 jsq REPL - jQuery-style JSON processor');
  console.log('⚡ Optimized mode enabled');
  console.log('Type your expression or "exit" to quit, ".help" for help');
  console.log('📈 Use ↑/↓ arrows to navigate command history\n');

  // Show data preview
  const preview = data.length > 200 ? `${data.slice(0, 200)}...` : data;
  console.log(`Data: ${preview}\n`);

  rl.prompt();

  rl.on('line', async (input: string) => {
    // Reset history navigation
    session.historyIndex = -1;
    session.currentInput = '';

    await handleReplInput(input, rl, session);
  });

  rl.on('close', async () => {
    console.log('\nGoodbye! 👋');
    await saveHistory(session.history);
    await session.processor.dispose();
    process.exit(0);
  });
}

function showHelp(): void {
  console.log(`
Available commands:
  .help     - Show this help message
  .exit     - Exit the REPL
  .clear    - Clear screen and history
  .data     - Show current data
  .history  - Show command history

Navigation:
  ↑ / ↓     - Navigate command history
  Enter     - Execute command and clear prompt
  Ctrl+C    - Exit REPL

JavaScript/jsq expressions:
  $                    - Access root data
  $.property          - Access property
  $.array.filter()    - Filter array
  $.array.map()       - Transform array
  $.array.pluck()     - Extract property from objects
  
Examples:
  $.users.length
  $.users.filter(u => u.age > 25)
  $.users.map(u => u.name)
  $.users.pluck("email")
`);
}

async function handleReplInput(
  input: string,
  rl: ReadlineInterface,
  session: REPLSession
): Promise<void> {
  const trimmed = input.trim();

  if (handleReplCommands(trimmed, rl, session)) {
    return;
  }

  if (!trimmed) {
    rl.prompt();
    return;
  }

  await processExpression(trimmed, rl, session);
}

function handleReplCommands(trimmed: string, rl: ReadlineInterface, session: REPLSession): boolean {
  if (trimmed === 'exit' || trimmed === '.exit') {
    rl.close();
    return true;
  }

  if (trimmed === '.help') {
    showHelp();
    rl.prompt();
    return true;
  }

  if (trimmed === '.clear') {
    console.clear();
    session.history = [];
    console.log('🚀 jsq REPL - jQuery-style JSON processor');
    console.log('⚡ Optimized mode enabled');
    console.log('History cleared. Type ".help" for help\n');
    rl.prompt();
    return true;
  }

  if (trimmed === '.data') {
    console.log(`Current data: ${session.data}`);
    rl.prompt();
    return true;
  }

  if (trimmed === '.history') {
    if (session.history.length === 0) {
      console.log('No command history available.');
    } else {
      console.log('\nCommand History:');
      session.history.slice(-10).forEach((item, index) => {
        const historyIndex = session.history.length - 10 + index + 1;
        const status = item.error ? '✗' : '✓';
        console.log(`${historyIndex.toString().padStart(3)}: ${status} ${item.expression}`);
      });
    }
    rl.prompt();
    return true;
  }

  return false;
}

async function processExpression(
  trimmed: string,
  rl: ReadlineInterface,
  session: REPLSession
): Promise<void> {
  try {
    process.stdout.write('Processing... ');
    const result = await session.processor.process(trimmed, session.data);

    let output: string;
    if (typeof result.data === 'string') {
      output = JSON.stringify(result.data);
    } else {
      output = JSON.stringify(result.data, null, 2);
    }

    // Clear the "Processing..." message and show result
    process.stdout.write('\r\x1b[K');
    console.log(`✓ ${output}`);

    // Add to history only if it's not a duplicate of the last command
    if (
      session.history.length === 0 ||
      session.history[session.history.length - 1].expression !== trimmed
    ) {
      session.history.push({
        expression: trimmed,
        result: output,
      });

      // Update readline's internal history
      const rlExtended = rl as ExtendedReadlineInterface;
      rlExtended.history?.unshift(trimmed);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    // Clear the "Processing..." message and show error
    process.stdout.write('\r\x1b[K');
    console.log(`✗ Error: ${errorMsg}`);

    // Add to history only if it's not a duplicate of the last command
    if (
      session.history.length === 0 ||
      session.history[session.history.length - 1].expression !== trimmed
    ) {
      session.history.push({
        expression: trimmed,
        result: '',
        error: errorMsg,
      });

      // Update readline's internal history
      const rlExtended = rl as ExtendedReadlineInterface;
      rlExtended.history?.unshift(trimmed);
    }
  }

  rl.prompt();
}

// History persistence functions
async function loadHistory(): Promise<
  Array<{ expression: string; result: string; error?: string }>
> {
  try {
    const historyPath = path.join(os.homedir(), '.jsq_history');
    const historyData = await fs.readFile(historyPath, 'utf-8');
    const parsed = JSON.parse(historyData);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveHistory(
  history: Array<{ expression: string; result: string; error?: string }>
): Promise<void> {
  try {
    const historyPath = path.join(os.homedir(), '.jsq_history');
    // Keep only the last 1000 history entries
    const trimmedHistory = history.slice(-1000);
    await fs.writeFile(historyPath, JSON.stringify(trimmedHistory, null, 2));
  } catch {
    // Ignore errors in saving history - don't interrupt user experience
  }
}

// Keyboard handler setup
function setupKeyboardHandlers(rl: ReadlineInterface, session: REPLSession): void {
  // Load command history into readline's internal history
  const rlExtended = rl as ExtendedReadlineInterface;

  // Clear readline's default history and load ours
  if (rlExtended.history) {
    rlExtended.history.length = 0;
    session.history.forEach(entry => {
      rlExtended.history?.push(entry.expression);
    });
  }

  // Enable keypress events
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  let isProcessingEnter = false;

  // Handle process.stdin keypress events for additional functionality
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex REPL key handling logic required
  process.stdin.on('keypress', (str, key) => {
    if (!key) return;

    // Handle Enter/Return key
    if ((key.name === 'return' || key.name === 'enter') && !key.ctrl && !key.meta) {
      if (!isProcessingEnter) {
        isProcessingEnter = true;
        const currentLine = rlAny.line || '';

        // Clear the input line visually without sending newline
        process.stdout.write('\r\x1b[K');

        // Process the command
        handleReplInput(currentLine, rl, session).finally(() => {
          isProcessingEnter = false;
        });

        // Clear the readline buffer
        rlAny.line = '';
        rlAny.cursor = 0;
      }
      return; // Don't let readline handle this enter key
    }

    // Handle Ctrl+L to clear screen (like bash)
    if (key.ctrl && key.name === 'l') {
      console.clear();
      console.log('🚀 jsq REPL - jQuery-style JSON processor');
      console.log('⚡ Optimized mode enabled\n');
      rl.prompt();
      return;
    }

    // Reset history navigation state on regular input
    if (key.name !== 'up' && key.name !== 'down' && key.name !== 'return' && key.name !== 'enter') {
      session.historyIndex = -1;
    }

    // Let readline handle other keys normally
    if (key.name !== 'return' && key.name !== 'enter') {
      rlAny._ttyWrite(str, key);
    }
  });
}
