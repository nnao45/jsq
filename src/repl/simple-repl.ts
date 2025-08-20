import { createInterface, type Interface as ReadlineInterface } from 'node:readline';
import { JsqProcessor } from '../core/processor';
import type { JsqOptions } from '../types/cli';

interface REPLSession {
  processor: JsqProcessor;
  options: JsqOptions;
  data: string;
  history: Array<{ expression: string; result: string; error?: string }>;
}

export async function startSimpleREPL(data: string, options: JsqOptions): Promise<void> {
  const session: REPLSession = {
    processor: new JsqProcessor(options),
    options,
    data,
    history: [],
  };

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'jsq> ',
  });

  console.log('🚀 jsq REPL - jQuery-style JSON processor');
  console.log(`${options.safe ? '🔒 Safe' : '⚡ Fast'} mode enabled`);
  console.log('Type your expression or "exit" to quit, ".help" for help\n');

  // Show data preview
  const preview = data.length > 200 ? `${data.slice(0, 200)}...` : data;
  console.log(`Data: ${preview}\n`);

  rl.prompt();

  rl.on('line', async (input: string) => {
    await handleReplInput(input, rl, session);
  });

  rl.on('close', async () => {
    console.log('\nGoodbye! 👋');
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

function handleReplCommands(
  trimmed: string,
  rl: ReadlineInterface,
  session: REPLSession
): boolean {
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
    rl.prompt();
    return true;
  }

  if (trimmed === '.data') {
    console.log(`Current data: ${session.data}`);
    rl.prompt();
    return true;
  }

  if (trimmed === '.history') {
    session.history.forEach((item, index) => {
      console.log(`${index + 1}: ${item.expression} => ${item.result || item.error}`);
    });
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

    console.log(`\r✓ ${output}`);

    session.history.push({
      expression: trimmed,
      result: output,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.log(`\r✗ Error: ${errorMsg}`);

    session.history.push({
      expression: trimmed,
      result: '',
      error: errorMsg,
    });
  }

  rl.prompt();
}
