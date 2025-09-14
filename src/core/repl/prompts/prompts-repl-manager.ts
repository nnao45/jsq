import * as readline from 'node:readline';
import pc from 'picocolors';

// Extended interface for readline with internal properties
interface ExtendedReadlineInterface extends readline.Interface {
  line: string;
  cursor: number;
}

// Key interface for keypress events
interface Key {
  name?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

// Extended NodeJS.ReadStream with keypress event
interface ExtendedReadStream extends NodeJS.ReadStream {
  // Add keypress event support while maintaining compatibility
  on(event: 'keypress', listener: (char: string, key: Key) => void): this;
  // biome-ignore lint/suspicious/noExplicitAny: Base ReadStream interface requires any[]
  on(event: string, listener: (...args: any[]) => void): this;
}

// Define the interface expected by PromptsReplManager
export interface ExpressionEvaluator {
  evaluate(
    expression: string,
    currentData: unknown,
    lastResult?: unknown
  ): Promise<{ value?: unknown; error?: unknown }>;
}

import type {
  ConsoleProvider,
  FileSystemProvider,
  PromptsProvider,
} from '../../../types/dependency-interfaces.js';
import type { ReplManagerInterface } from '../../../types/repl-interface.js';
import {
  DefaultConsoleProvider,
  DefaultFileSystemProvider,
  DefaultPromptsProvider,
} from '../../../utils/default-providers.js';
import { OutputFormatter } from '../../../utils/output-formatter.js';
import { Pager } from '../../../utils/pager.js';
import { AutocompleteEngine } from '../autocomplete-engine.js';

interface PromptsReplOptions {
  evaluator: ExpressionEvaluator;
  historyFile?: string;
  initialData?: unknown;
  inputStream?: ExtendedReadStream;
  fileSystem?: FileSystemProvider;
  promptsProvider?: PromptsProvider;
  console?: ConsoleProvider;
  realTimeEvaluation?: boolean;
}

export class PromptsReplManager implements ReplManagerInterface {
  private evaluator: ExpressionEvaluator;
  private autocompleteEngine: AutocompleteEngine;
  private history: string[] = [];
  // private _historyIndex = 0; // will be used in future updates
  private shouldExit = false;
  private currentData: unknown = null;
  private lastResult: unknown;
  private historyFile?: string;
  private inputStream?: ExtendedReadStream;
  private fileSystem: FileSystemProvider;
  private promptsProvider: PromptsProvider;
  private console: ConsoleProvider;
  private realTimeEvaluation: boolean;
  private rl?: ExtendedReadlineInterface;
  // private _evaluationTimer?: NodeJS.Timeout; // will be used in future updates
  private hasPreviewLine = false;
  private isEvaluating = false;
  private lastSigintTime: number = 0;
  // private _isShowingCompletionMenu = false; // will be used in future updates
  private hasCompletionStatus = false;
  private completionStatusTimer?: NodeJS.Timeout;
  private outputFormatter: OutputFormatter;
  private completionState: {
    lastCompletions: string[];
    currentIndex: number;
    lastPrefix: string;
    lastCursorPos: number;
    lastLine: string;
    isActive: boolean;
  } | null = null;

  constructor(options: PromptsReplOptions) {
    this.evaluator = options.evaluator;
    this.historyFile = options.historyFile;
    this.currentData = options.initialData || null;
    this.inputStream = options.inputStream;
    this.fileSystem = options.fileSystem || new DefaultFileSystemProvider();
    this.promptsProvider = options.promptsProvider || new DefaultPromptsProvider();
    this.console = options.console || new DefaultConsoleProvider();
    this.autocompleteEngine = new AutocompleteEngine();
    this.realTimeEvaluation = options.realTimeEvaluation ?? true;

    // Initialize OutputFormatter with compact mode for REPL
    this.outputFormatter = new OutputFormatter({
      compact: true,
      noColor: false,
      isReplMode: true,
    });

    if (this.historyFile) {
      this.loadHistory().catch(() => {});
    }
  }

  async start(): Promise<void> {
    this.console.log(pc.cyan('Welcome to jsq REPL (experimental) 🚀'));
    this.console.log(pc.gray('Type .help for commands, .exit to quit\n'));

    // For non-TTY environments with real-time evaluation, disable it
    // const _shouldUseRealTime = this.realTimeEvaluation &&
    //                         this.inputStream &&
    //                         this.inputStream.isTTY;
    // will be used in future real-time evaluation feature

    // Always use readline mode for better tab completion support in TTY environments
    // In non-TTY environments, use prompts mode as readline doesn't work well
    const useReadlineMode = this.inputStream?.isTTY;

    if (useReadlineMode) {
      // Use readline for better tab completion support
      await this.startInteractiveMode();
    } else {
      // Use prompts for standard mode
      while (!this.shouldExit) {
        try {
          const input = await this.promptUser();

          if (input === null || input === undefined) {
            continue;
          }

          await this.processInput(input);
        } catch (error) {
          if (error instanceof Error && error.message.includes('cancelled')) {
            this.console.log('\nUse .exit to quit');
            continue;
          }
          this.console.error(pc.red('Error:'), error);
        }
      }
    }

    this.console.log(pc.yellow('\nBye! 👋'));
  }

  private async promptUser(): Promise<string> {
    // Check if we're in a non-TTY environment
    if (!this.inputStream || !this.inputStream.isTTY) {
      // In non-TTY mode, read directly from stdin
      return new Promise((resolve, reject) => {
        let buffer = '';
        const timeout = setTimeout(() => {
          // Clean up
          if (this.inputStream) {
            this.inputStream.removeListener('data', onData);
            this.inputStream.removeListener('end', onEnd);
          }
          reject(new Error('Timeout waiting for input'));
        }, 30000); // 30 second timeout

        const onEnd = () => {
          clearTimeout(timeout);
          if (this.inputStream) {
            this.inputStream.removeListener('data', onData);
            this.inputStream.removeListener('end', onEnd);
          }
          // EOF received, exit gracefully
          this.shouldExit = true;
          resolve('.exit');
        };

        const onData = (chunk: Buffer) => {
          const str = chunk.toString();
          if (str.includes('\n')) {
            clearTimeout(timeout);
            // Remove the listeners
            if (this.inputStream) {
              this.inputStream.removeListener('data', onData);
              this.inputStream.removeListener('end', onEnd);
            }
            const input = (buffer + str).trim();
            if (input?.trim()) {
              this.history.push(input);
              this.saveHistory().catch(() => {});
            }
            resolve(input);
          } else {
            buffer += str;
          }
        };

        if (this.inputStream) {
          // Check if stream is still readable
          if (this.inputStream.readable) {
            this.inputStream.on('data', onData);
            this.inputStream.on('end', onEnd);
          } else {
            // Stream is not readable, immediately exit
            clearTimeout(timeout);
            this.shouldExit = true;
            resolve('.exit');
            return;
          }
        } else {
          // This shouldn't happen
          clearTimeout(timeout);
          reject(new Error('No input stream available'));
        }

        // Show prompt
        process.stdout.write('> ');
      });
    }

    // TTY mode - use prompts
    const response = await this.promptsProvider.prompt({
      type: 'text',
      name: 'command',
      message: '>',
    });

    const input = (response as { command: string }).command;

    if (input?.trim()) {
      this.history.push(input);
      this.saveHistory().catch(() => {});
    }

    return input;
  }

  private async getSuggestions(input: string): Promise<string[]> {
    if (!input) return [];

    const commands = ['.exit', '.help', '.clear', '.history', '.save', '.load', '.config'];
    if (input.startsWith('.')) {
      return commands.filter(cmd => cmd.startsWith(input));
    }

    try {
      const context = {
        input: input,
        cursorPosition: input.length,
        currentData: this.currentData,
      };
      const result = this.autocompleteEngine.getSuggestions(context);
      return result.completions;
    } catch (error) {
      this.console.error('Autocomplete error:', error);
      return [];
    }
  }

  private async processInput(input: string): Promise<void> {
    if (input.startsWith('.')) {
      await this.handleCommand(input);
      return;
    }

    try {
      const result = await this.evaluator.evaluate(input, this.currentData, this.lastResult);

      if (result.error) {
        this.displayError(result.error);
      } else {
        // Use OutputFormatter for colorized compact output
        const formattedValue = this.outputFormatter.format(result.value);
        this.console.log(pc.green('→'), formattedValue);
        this.lastResult = result.value;
        // Don't update currentData when evaluating - only update it when new JSON data is piped in
        // This prevents showing stale evaluation results on new lines
      }
    } catch (error) {
      this.displayError(error);
    }
  }

  private async handleCommand(command: string): Promise<void> {
    const cmd = command.trim().toLowerCase();

    switch (cmd) {
      case '.exit':
        this.shouldExit = true;
        if (this.rl) {
          this.rl.close();
        }
        break;

      case '.help':
        this.showHelp();
        break;

      case '.clear':
        this.console.clear();
        break;

      case '.history':
        this.showHistory();
        break;

      case '.save':
        await this.saveSession(command);
        break;

      case '.load':
        await this.loadSession(command);
        break;

      case '.config':
        this.showConfig();
        break;

      default:
        if (cmd.startsWith('.save ')) {
          await this.saveSession(command);
        } else if (cmd.startsWith('.load ')) {
          await this.loadSession(command);
        } else {
          this.console.log(pc.yellow(`Unknown command: ${command}`));
          this.console.log(pc.gray('Type .help for available commands'));
        }
    }
  }

  private showHelp(): void {
    this.console.log(pc.cyan('\nAvailable commands:'));
    this.console.log('  .exit           - Exit the REPL');
    this.console.log('  .help           - Show this help message');
    this.console.log('  .clear          - Clear the screen');
    this.console.log('  .history        - Show command history');
    this.console.log('  .save [file]    - Save current data to file');
    this.console.log('  .load [file]    - Load data from file');
    this.console.log('  .config         - Show current configuration');
    this.console.log('');
    this.console.log(pc.gray('Start typing to see autocomplete suggestions'));
  }

  private showHistory(): void {
    const realHistory = this.history.filter(cmd => cmd !== '.history');

    if (realHistory.length === 0) {
      this.console.log(pc.gray('No history yet'));
      return;
    }

    this.console.log(pc.cyan('\nCommand history:'));
    realHistory.forEach((cmd, index) => {
      this.console.log(pc.gray(`${index + 1}:`), cmd);
    });
  }

  private async startInteractiveMode(): Promise<void> {
    let currentInput = '';
    let evaluationTimer: NodeJS.Timeout | undefined;

    // Check if input stream is available
    if (!this.inputStream) {
      throw new Error('Input stream is not available');
    }

    this.rl = readline.createInterface({
      input: this.inputStream,
      output: process.stdout,
      prompt: pc.bold('> '),
      terminal: this.inputStream.isTTY || false,
      // Remove completer option to prevent readline from interfering with our tab handling
    });

    // Enable keypress events only in TTY mode
    if (this.inputStream?.isTTY) {
      readline.emitKeypressEvents(this.inputStream);
      if (this.inputStream.setRawMode) {
        this.inputStream.setRawMode(true);
      }
    }

    this.rl.on('line', async line => {
      currentInput = '';
      if (evaluationTimer) {
        clearTimeout(evaluationTimer);
        evaluationTimer = undefined;
      }

      // Clear preview line when submitting
      this.clearPreviewLine();

      // Clear completion status
      this.clearCompletionStatus();

      // Clear completion timer
      if (this.completionStatusTimer) {
        clearTimeout(this.completionStatusTimer);
        this.completionStatusTimer = undefined;
      }

      // Reset completion state
      this.completionState = null;

      // Clear autocomplete engine cache to ensure fresh completions next time
      this.autocompleteEngine.clearCache();

      // Reset evaluation state to ensure no leftover preview
      this.isEvaluating = false;
      this.hasPreviewLine = false;

      if (line.trim()) {
        this.history.push(line);
        // this._historyIndex = this.history.length;
        this.saveHistory().catch(() => {});

        try {
          await this.processInput(line);
        } catch (error) {
          this.console.error(pc.red('Error:'), error);
        }
      } else {
        // Empty line - reset current data to prevent showing previous results
        this.currentData = null;
      }

      if (!this.shouldExit && this.rl) {
        this.rl.prompt();
      }
    });

    this.rl.on('SIGINT', () => {
      const currentLine = this.rl.line || '';
      const now = Date.now();

      if (currentLine.trim() === '') {
        // Check for double Ctrl+C within 300ms
        if (now - this.lastSigintTime < 300) {
          // Exit on double Ctrl+C
          this.shouldExit = true;
          if (this.rl) this.rl.close();
          return;
        }

        // First Ctrl+C on empty line - show hint
        this.console.log('\n(To exit, press Ctrl+C again)');
        this.lastSigintTime = now;
        if (this.rl) this.rl.prompt();
      } else {
        // Clear current line and reset timer
        this.console.log('\n');
        this.lastSigintTime = 0;
        // Clear the readline internal buffer
        if (this.rl) {
          this.rl.line = '';
          this.rl.cursor = 0;
          this.rl.prompt();
        }
      }
    });

    this.rl.on('close', () => {
      this.shouldExit = true;
      // Clean up timer
      if (this.completionStatusTimer) {
        clearTimeout(this.completionStatusTimer);
        this.completionStatusTimer = undefined;
      }
    });

    // Real-time evaluation on keypress
    if (this.inputStream && typeof this.inputStream.on === 'function') {
      this.inputStream.on('keypress', async (char: string, key: Key) => {
        // Handle Tab key explicitly for autocomplete
        if (key && key.name === 'tab' && !key.ctrl && !key.meta) {
          // Prevent default tab behavior by removing any tab character that was inserted
          let currentLine = this.rl.line || '';
          const currentCursor = this.rl.cursor || 0;

          // If a tab character was inserted, remove it
          if (currentLine.includes('\t')) {
            currentLine = currentLine.replace(/\t/g, '');
            this.rl.line = currentLine;
            this.rl.cursor = Math.min(currentCursor, currentLine.length);
          }

          // Check if we should use cached completions (for cycling)
          const shouldUseCached =
            this.completionState?.isActive &&
            this.completionState.lastLine === currentLine &&
            this.completionState.lastCompletions.length > 1;

          if (shouldUseCached && this.completionState) {
            // Use cached completions for cycling
            const completions = this.completionState.lastCompletions;
            this.completionState.currentIndex =
              (this.completionState.currentIndex + 1) % completions.length;
            const selectedCompletion = completions[this.completionState.currentIndex];
            const applied = this.applyCompletion(
              this.completionState.lastPrefix,
              selectedCompletion
            );
            this.rl.line = applied;
            this.rl.cursor = applied.length;
            this.completionState.lastLine = applied;

            // Show which completion we're on (on the same line)
            // Note: showCompletionStatus will handle the line refresh
            // this.showCompletionStatus(this.completionState.currentIndex + 1, completions.length, selectedCompletion);

            // Trigger immediate evaluation after cycling through completions
            if (this.realTimeEvaluation && applied.trim()) {
              setTimeout(async () => {
                await this.performImmediateEvaluation(applied);
              }, 50);
            }

            return;
          }

          // Manually trigger completion
          const completions = await this.getSuggestions(currentLine);

          if (completions.length === 0) {
            this.completionState = null;
            return;
          }

          if (completions.length === 1) {
            // Single completion - apply it directly
            const applied = this.applyCompletion(currentLine, completions[0]);
            this.rl.line = applied;
            this.rl.cursor = applied.length;
            // We need to manually refresh the line without causing a newline
            this.refreshCurrentLine();
            this.completionState = null;

            // Trigger immediate evaluation after tab completion
            if (this.realTimeEvaluation && applied.trim()) {
              setTimeout(async () => {
                await this.performImmediateEvaluation(applied);
              }, 50);
            }
          } else {
            // Multiple completions - setup for cycling
            this.completionState = {
              lastCompletions: completions,
              currentIndex: 0,
              lastPrefix: currentLine,
              lastCursorPos: currentCursor,
              lastLine: currentLine,
              isActive: true,
            };

            // Apply first completion immediately
            const firstCompletion = completions[0];
            const applied = this.applyCompletion(currentLine, firstCompletion);
            this.rl.line = applied;
            this.rl.cursor = applied.length;
            this.completionState.lastLine = applied;

            // Show status message (on the same line)
            // Note: showCompletionStatus will handle the line refresh
            // this.showCompletionStatus(1, completions.length, firstCompletion, true);

            // Trigger immediate evaluation for first completion
            if (this.realTimeEvaluation && applied.trim()) {
              setTimeout(async () => {
                await this.performImmediateEvaluation(applied);
              }, 50);
            }
          }
          return;
        }

        // Reset completion state on any other key
        if ((key && key.name !== 'tab') || (!key && char)) {
          this.completionState = null;
          // Clear any completion status display
          this.clearCompletionStatus();
          // Clear the timer as well
          if (this.completionStatusTimer) {
            clearTimeout(this.completionStatusTimer);
            this.completionStatusTimer = undefined;
          }
        }

        // Handle Ctrl+R for showing last result in pager
        if (key && key.ctrl && key.name === 'r') {
          await this.showLastResultInPager();
          return;
        }

        if (!key || key.name === 'return' || key.name === 'tab' || key.ctrl || key.meta) {
          // Clear preview line on return key
          if (key && key.name === 'return') {
            this.clearPreviewLine();
            this.hasPreviewLine = false;
          }
          return;
        }

        // Update current input
        currentInput = this.rl.line || '';

        // Debounce immediate evaluation
        if (evaluationTimer) {
          clearTimeout(evaluationTimer);
        }

        if (this.realTimeEvaluation && currentInput.trim()) {
          evaluationTimer = setTimeout(async () => {
            // Ensure we're still on the same line and the input hasn't changed
            const currentLineNow = this.rl.line || '';
            if (currentLineNow === currentInput && currentInput.trim()) {
              await this.performImmediateEvaluation(currentInput);
            }
          }, 100);
        }
      });
    }

    this.rl.prompt();

    // Keep the process alive
    await new Promise<void>(resolve => {
      const checkInterval = setInterval(() => {
        if (this.shouldExit || !this.rl) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  private applyCompletion(currentLine: string, completion: string): string {
    // AutocompleteEngine returns just the property/method name, not the full path
    // So we need to apply it correctly based on the current line

    // If we're completing after a dot (e.g., "$.test.")
    const lastDotIndex = currentLine.lastIndexOf('.');
    if (lastDotIndex >= 0) {
      // Get everything up to and including the dot
      const prefix = currentLine.substring(0, lastDotIndex + 1);
      // Return prefix + completion
      return prefix + completion;
    }

    // If we're completing from the start or middle of a property
    // Find where the current property starts
    const match = currentLine.match(/(\$|_|\w+)\.?(\w*)$/);
    if (match) {
      const beforeMatch = currentLine.substring(0, match.index || 0);
      // If the completion already includes the full path (e.g., "$.test")
      if (completion.startsWith('$') || completion.startsWith('_')) {
        return completion;
      }
      // Otherwise, append the completion
      return beforeMatch + completion;
    }

    // Default case - just return the completion
    return completion;
  }

  private clearPreviewLine(): void {
    if (this.hasPreviewLine) {
      // Save current cursor position and line content
      const currentLine = this.rl ? this.rl.line || '' : '';
      const cursorPos = this.rl ? this.rl.cursor || 0 : 0;

      // Move to the line below
      process.stdout.write('\n');
      // Clear that line
      process.stdout.write('\x1b[2K');
      process.stdout.write('\x1b[0G');
      // Move back up
      process.stdout.write('\x1b[A');

      // Restore the prompt and current line
      if (this.rl) {
        // Clear current line first
        process.stdout.write('\x1b[2K');
        process.stdout.write('\x1b[0G');

        // Rewrite prompt and input
        const promptText = pc.bold('> ');
        process.stdout.write(promptText + currentLine);

        // Restore cursor position
        process.stdout.write(`\x1b[${2 + cursorPos + 1}G`);
      }

      this.hasPreviewLine = false;
    }
  }

  private refreshCurrentLine(): void {
    if (!this.rl) return;

    // Save current cursor position and line
    const savedCursorPos = this.rl.cursor || 0;
    const currentLine = this.rl.line || '';

    // Clear the current line
    process.stdout.write('\x1b[2K'); // Clear entire line
    process.stdout.write('\x1b[0G'); // Move to beginning of line

    // Rewrite prompt and current input
    const promptText = pc.bold('> ');
    process.stdout.write(promptText + currentLine);

    // Return cursor to its original position
    process.stdout.write(`\x1b[${2 + savedCursorPos + 1}G`);
  }

  private clearCompletionStatus(): void {
    if (!this.hasCompletionStatus || !this.rl) return;

    // Clear any existing timer
    if (this.completionStatusTimer) {
      clearTimeout(this.completionStatusTimer);
      this.completionStatusTimer = undefined;
    }

    // Clear the completion status line
    process.stdout.write('\n'); // Move to next line
    process.stdout.write('\x1b[2K'); // Clear entire line
    process.stdout.write('\x1b[A'); // Move back up
    process.stdout.write('\x1b[0G'); // Move to beginning of line

    // Simply refresh the line without the completion status
    this.refreshCurrentLine();
    this.hasCompletionStatus = false;
  }

  /*
  private _showCompletionStatus(_current: number, _total: number, _completion: string, _showHint: boolean = false): void {
    // future feature
    if (!this.rl) return;

    // Clear any existing completion status timer
    if (this.completionStatusTimer) {
      clearTimeout(this.completionStatusTimer);
    }

    // If we have a preview line (evaluation result), temporarily hide it
    if (this.hasPreviewLine) {
      // Move to the preview line
      process.stdout.write('\n');
      // Clear that line
      process.stdout.write('\x1b[2K');
      process.stdout.write('\x1b[0G');
      
      // Show completion status on the preview line
      const completionText = pc.green(_completion);
      let statusMessage = completionText;
      
      if (_showHint && _current === 1) {
        statusMessage += pc.gray(' (Tab to cycle)');
      }
      
      process.stdout.write(pc.gray('→ ') + statusMessage);
      
      // Move cursor back to the input line
      process.stdout.write('\x1b[A'); // Move up one line
      process.stdout.write('\x1b[0G'); // Move to beginning of line
      
      // Rewrite the input line
      const savedCursorPos = this.rl.cursor || 0;
      const currentLine = this.rl.line || '';
      const promptText = pc.bold('> ');
      process.stdout.write(promptText + currentLine);
      process.stdout.write('\x1b[' + (2 + savedCursorPos + 1) + 'G');
      
      this.hasCompletionStatus = true;
      
      // Set timer to restore the evaluation result after 1 second
      this.completionStatusTimer = setTimeout(async () => {
        // Restore the evaluation result
        if (this.hasPreviewLine && currentLine.trim()) {
          await this.performImmediateEvaluation(currentLine);
        }
        this.hasCompletionStatus = false;
      }, 1000);
    } else {
      // No preview line, show status on the next line
      const savedCursorPos = this.rl.cursor || 0;
      const currentLine = this.rl.line || '';
      
      // Move to next line and show completion status
      process.stdout.write('\n');
      process.stdout.write('\x1b[2K'); // Clear entire line
      process.stdout.write('\x1b[0G'); // Move to beginning of line
      
      // Show completion status
      const completionText = pc.green(_completion);
      let statusMessage = completionText;
      
      if (_showHint && _current === 1) {
        statusMessage += pc.gray(' (Tab to cycle)');
      }
      
      process.stdout.write(statusMessage);
      
      // Move cursor back to the input line
      process.stdout.write('\x1b[A'); // Move up one line
      process.stdout.write('\x1b[0G'); // Move to beginning of line
      
      // Rewrite the input line
      const promptText = pc.bold('> ');
      process.stdout.write(promptText + currentLine);
      process.stdout.write('\x1b[' + (2 + savedCursorPos + 1) + 'G');
      
      this.hasCompletionStatus = true;
      
      // Set timer to clear the status after 1 second
      this.completionStatusTimer = setTimeout(() => {
        this.clearCompletionStatus();
      }, 1000);
    }
  }
  */

  private async performImmediateEvaluation(input: string): Promise<void> {
    if (!input.trim() || !this.rl || this.isEvaluating) return;

    const trimmed = input.trim();

    // Don't evaluate commands
    if (trimmed.startsWith('.')) return;

    // Clear existing preview before evaluating
    this.clearPreviewLine();

    // Double-check current line is still the same
    const currentLineNow = this.rl.line || '';
    if (currentLineNow !== input) {
      return;
    }

    this.isEvaluating = true;
    try {
      const result = await this.evaluator.evaluate(trimmed, this.currentData, this.lastResult);

      // Only show results, not errors (during real-time evaluation)
      if (!result.error && result.value !== undefined) {
        // Format the output compactly with colors
        let output: string;
        if (typeof result.value === 'string') {
          output = result.value;
        } else if (result.value instanceof Error) {
          output = result.value.toString();
        } else {
          // Use OutputFormatter for colorized compact output
          output = this.outputFormatter.format(result.value);
        }

        // Escape newlines and other control characters for single-line display
        output = output.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');

        // Get terminal width and truncate if needed
        const termWidth = process.stdout.columns || 80;
        const prefix = '→ ';
        const promptLength = 2; // "> " length
        const maxOutputWidth = termWidth - prefix.length - 2; // -2 for some padding

        if (output.length > maxOutputWidth) {
          output = `${output.substring(0, maxOutputWidth - 3)}...`;
        }

        // Show result on next line
        const savedCursorPos = this.rl.cursor || 0;
        const currentLine = this.rl.line || '';

        process.stdout.write('\n');
        process.stdout.write(pc.gray(prefix) + pc.dim(output));

        // Move cursor back to the original position
        process.stdout.write('\x1b[A'); // Move up one line
        process.stdout.write('\x1b[0G'); // Move to beginning of line
        process.stdout.write(pc.bold('> ') + currentLine); // Rewrite prompt and current input
        // ANSIエスケープシーケンスは1ベース、カーソル位置は0ベースなので+1
        process.stdout.write(`\x1b[${promptLength + savedCursorPos + 1}G`); // Position cursor correctly

        this.hasPreviewLine = true;
      }
    } catch (_error) {
      // Silently ignore errors during immediate evaluation
    } finally {
      this.isEvaluating = false;
    }
  }

  stop(): void {
    this.shouldExit = true;
    // Clean up timer
    if (this.completionStatusTimer) {
      clearTimeout(this.completionStatusTimer);
      this.completionStatusTimer = undefined;
    }
    if (this.rl) {
      this.rl.close();
    }
  }

  private displayError(error: unknown): void {
    const errorString = error?.toString?.() || 'Unknown error';

    if (errorString.includes('SyntaxError')) {
      this.displaySyntaxError(errorString);
    } else if (errorString.includes('ReferenceError')) {
      this.displayReferenceError(errorString);
    } else if (errorString.includes('TypeError')) {
      this.displayTypeError(errorString);
    } else if (errorString.includes('RangeError')) {
      this.displayRangeError(errorString);
    } else {
      this.console.error(pc.red('❌ Error:'), errorString);
    }

    if (error && typeof error === 'object' && 'stack' in error && typeof error.stack === 'string') {
      this.console.error(pc.gray('\nStack trace:'));
      this.console.error(pc.gray(error.stack));
    }
  }

  private displaySyntaxError(error: string): void {
    this.console.error(pc.red('❌ Syntax Error:'));

    if (error.includes('Unexpected token')) {
      this.console.error(pc.yellow('  → Check for missing brackets, quotes, or semicolons'));
    } else if (error.includes('Unexpected end of input')) {
      this.console.error(
        pc.yellow('  → Expression seems incomplete. Did you forget to close a bracket?')
      );
    }

    this.console.error(pc.gray(`  ${error}`));
  }

  private displayReferenceError(error: string): void {
    this.console.error(pc.red('❌ Reference Error:'));

    const match = error.match(/(\w+) is not defined/);
    if (match) {
      const varName = match[1];
      this.console.error(pc.yellow(`  → "${varName}" is not defined`));
      this.console.error(
        pc.gray(`  Did you mean to reference a property? Try: $.${varName} or _.${varName}`)
      );
    } else {
      this.console.error(pc.gray(`  ${error}`));
    }
  }

  private displayTypeError(error: string): void {
    this.console.error(pc.red('❌ Type Error:'));

    if (error.includes('Cannot read property')) {
      this.console.error(pc.yellow('  → Trying to access a property of null or undefined'));
      this.console.error(
        pc.gray('  Use optional chaining (?.) to safely access nested properties')
      );
    } else if (error.includes('is not a function')) {
      this.console.error(pc.yellow('  → Trying to call something that is not a function'));
    }

    this.console.error(pc.gray(`  ${error}`));
  }

  private displayRangeError(error: string): void {
    this.console.error(pc.red('❌ Range Error:'));

    if (error.includes('Maximum call stack')) {
      this.console.error(pc.yellow('  → Infinite recursion detected'));
    } else if (error.includes('Invalid array length')) {
      this.console.error(pc.yellow('  → Array size is too large or negative'));
    }

    this.console.error(pc.gray(`  ${error}`));
  }

  private async saveSession(command: string): Promise<void> {
    const parts = command.split(/\s+/);
    const filename = parts[1] || 'jsq-session.json';

    try {
      const dataToSave = {
        data: this.currentData,
        timestamp: new Date().toISOString(),
        history: this.history.filter(cmd => !cmd.startsWith('.')),
      };

      await this.fileSystem.writeFile(filename, JSON.stringify(dataToSave, null, 2));
      this.console.log(pc.green(`✅ Session saved to: ${filename}`));

      // Note: stats functionality would need to be added to FileSystemProvider if needed
      // For now, we'll skip the size display
    } catch (error) {
      this.console.error(pc.red('❌ Failed to save session:'), error);
    }
  }

  private async loadSession(command: string): Promise<void> {
    const parts = command.split(/\s+/);
    const filename = parts[1];

    if (!filename) {
      this.console.error(pc.red('❌ Please specify a filename'));
      this.console.log(pc.gray('  Usage: .load <filename>'));
      return;
    }

    try {
      const content = await this.fileSystem.readFile(filename);
      const session = JSON.parse(content);

      if (session.data) {
        this.currentData = session.data;
        this.console.log(pc.green(`✅ Session loaded from: ${filename}`));

        if (session.timestamp) {
          this.console.log(pc.gray(`  Saved at: ${session.timestamp}`));
        }

        this.console.log(pc.cyan('  Data is now available as $'));
      } else {
        this.console.error(pc.yellow('⚠️  No data found in session file'));
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        this.console.error(pc.red(`❌ File not found: ${filename}`));
      } else if (error instanceof SyntaxError) {
        this.console.error(pc.red('❌ Invalid JSON file'));
      } else {
        this.console.error(pc.red('❌ Failed to load session:'), error);
      }
    }
  }

  /*
  private async _showCompletionMenu(completions: string[], _currentLine: string): Promise<string | null> {
    // future feature
    // Check if we're in a piped/non-interactive environment
    if (!process.stdin.isTTY) {
      // In non-interactive mode, just return the first completion
      return completions.length > 0 ? completions[0] : null;
    }
    
    // Create choices for the menu
    const choices = completions.map(completion => ({
      title: completion,
      value: completion
    }));
    
    // Save readline state and disable raw mode
    const wasRawMode = process.stdin.isRaw;
    
    // Pause readline temporarily
    this.rl.pause();
    
    if (wasRawMode) {
      process.stdin.setRawMode(false);
    }
    
    // Clear current line and move up to show menu properly
    this.console.log(''); // Add a newline first
    
    try {
      // Set stdin to be interactive temporarily for prompts
      const originalIsTTY = process.stdin.isTTY;
      (process.stdin as any).isTTY = true;
      
      const response = await this.promptsProvider.prompt({
        type: 'select',
        name: 'value',
        message: 'Choose completion:',
        choices: choices,
        initial: 0,
        stdin: process.stdin,
        stdout: process.stdout
      });
      
      // Restore original isTTY
      (process.stdin as any).isTTY = originalIsTTY;
      
      return response.value || null;
    } catch (error) {
      // User cancelled with Ctrl+C or ESC
      return null;
    } finally {
      // Restore raw mode state
      if (wasRawMode && process.stdin.setRawMode) {
        // Small delay to let prompts clean up
        await new Promise(resolve => setTimeout(resolve, 100));
        process.stdin.setRawMode(true);
      }
      
      // Resume readline
      this.rl.resume();
    }
  }
  */

  private showConfig(): void {
    this.console.log(pc.cyan('\nCurrent configuration:'));
    this.console.log(pc.gray('  History file:'), this.historyFile || '.jsq_history');
    this.console.log(pc.gray('  Autocomplete:'), 'Enabled');

    if (this.currentData !== null) {
      const dataType = Array.isArray(this.currentData) ? 'Array' : typeof this.currentData;
      const dataSize = JSON.stringify(this.currentData).length;
      this.console.log(pc.gray('  Current data:'), `${dataType} (${dataSize} bytes)`);
    } else {
      this.console.log(pc.gray('  Current data:'), 'None');
    }
  }

  private async loadHistory(): Promise<void> {
    if (!this.historyFile) return;

    try {
      const content = await this.fileSystem.readFile(this.historyFile);
      this.history = content.split('\n').filter(line => line.trim());
    } catch (_error) {
      // ファイルがない場合は無視
    }
  }

  private async saveHistory(): Promise<void> {
    if (!this.historyFile) return;

    try {
      const content = this.history.slice(-1000).join('\n');
      await this.fileSystem.writeFile(this.historyFile, content);
    } catch (_error) {
      // 保存に失敗しても続行
    }
  }

  private async showLastResultInPager(): Promise<void> {
    // 最後の評価結果がない場合は何もしない
    if (this.lastResult === undefined) {
      return;
    }

    // 現在の入力を保存
    const savedLine = this.rl?.line || '';
    const savedCursor = this.rl?.cursor || 0;

    // 評価結果をフォーマット
    const formattedResult = OutputFormatter.format(this.lastResult, {
      isReplMode: false,
      oneline: false,
      noColor: false,
    });

    // 画面をクリア
    this.console.log('\x1b[2J\x1b[H');

    // Pagerで表示
    const pager = new Pager(formattedResult);
    await pager.show();

    // REPLの画面を再描画
    if (this.rl) {
      // Clear screen and redraw
      this.rl.write(null, { ctrl: true, name: 'l' });
      this.rl.prompt();
      // Restore the saved line
      if (savedLine) {
        this.rl.write(savedLine);
        // Move cursor to the saved position
        const moveBack = savedLine.length - savedCursor;
        if (moveBack > 0) {
          this.rl.write(null, { ctrl: true, name: 'b', sequence: '\x1b[D'.repeat(moveBack) });
        }
      }
    }
  }
}
