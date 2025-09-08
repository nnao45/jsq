import type { JsqEvaluator } from '../../evaluator/jsq-evaluator.js';
import type { Logger } from '../../utils/logger.js';
import { AutocompleteEngine } from '../autocomplete-engine.js';
import { EnquirerAutocompleteAdapter } from './enquirer-autocomplete-adapter.js';
import { CustomAutocompletePrompt } from './custom-autocomplete-prompt.js';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';

interface EnquirerReplOptions {
  evaluator: JsqEvaluator;
  logger: Logger;
  historyFile?: string;
}

export class EnquirerReplManager {
  private evaluator: JsqEvaluator;
  private logger: Logger;
  private autocompleteEngine: AutocompleteEngine;
  private autocompleteAdapter: EnquirerAutocompleteAdapter;
  private history: string[] = [];
  private shouldExit = false;
  private currentData: any = null;
  private historyFile?: string;

  constructor(options: EnquirerReplOptions) {
    this.evaluator = options.evaluator;
    this.logger = options.logger;
    this.historyFile = options.historyFile;
    this.autocompleteEngine = new AutocompleteEngine();
    this.autocompleteAdapter = new EnquirerAutocompleteAdapter(this.autocompleteEngine);
  }

  async start(): Promise<void> {
    this.logger.info('Starting Enquirer-based REPL...');
    
    console.log(chalk.cyan('Welcome to jsq REPL (Enquirer Edition) 🚀'));
    console.log(chalk.gray('Type .help for commands, .exit to quit\n'));

    while (!this.shouldExit) {
      try {
        const input = await this.promptUser();
        
        if (input === null || input === undefined) {
          continue;
        }

        await this.processInput(input);
      } catch (error) {
        if (error instanceof Error && error.message.includes('cancelled')) {
          // ユーザーがCtrl+Cでキャンセルした場合
          console.log('\nUse .exit to quit');
          continue;
        }
        this.logger.error('REPL error:', error);
        console.error(chalk.red('Error:'), error);
      }
    }

    console.log(chalk.yellow('\nBye! 👋'));
  }

  private async promptUser(): Promise<string> {
    const prompt = new CustomAutocompletePrompt({
      message: '> ',
      limit: 10,
      initial: '',
      autocompleteEngine: this.autocompleteEngine,
      currentData: this.currentData,
      historyFile: this.historyFile || '.jsq_history',
      maxHistory: 1000
    });

    try {
      const result = await prompt.run();
      return result;
    } catch (error) {
      // Ctrl+Cでキャンセルされた場合
      throw error;
    }
  }

  private async getSuggestions(input: string): Promise<string[]> {
    if (!input) return [];
    
    // コマンド補完
    const commands = ['.exit', '.help', '.clear', '.history', '.save', '.load', '.config'];
    if (input.startsWith('.')) {
      return commands.filter(cmd => cmd.startsWith(input));
    }

    // AutocompleteEngineを使った補完
    try {
      const suggestions = await this.autocompleteAdapter.getSuggestions(
        input,
        this.currentData
      );
      
      // Enquirerのフォーマットに変換
      return suggestions.map(s => s.value);
    } catch (error) {
      this.logger.error('Autocomplete error:', error);
      return [];
    }
  }

  private async processInput(input: string): Promise<void> {
    // 履歴はCustomAutocompletePromptで管理されるが、
    // .historyコマンドのためにローカルにも保存
    if (input.trim()) {
      this.history.push(input);
    }

    // 特殊コマンドの処理
    if (input.startsWith('.')) {
      await this.handleCommand(input);
      return;
    }

    // JavaScript式の評価
    try {
      const result = await this.evaluator.evaluate(input);
      
      if (result.error) {
        this.displayError(result.error);
      } else {
        console.log(chalk.green('→'), result.value);
        // 評価結果を保存して次の補完で使えるようにする
        this.currentData = result.value;
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
        break;
      
      case '.help':
        this.showHelp();
        break;
      
      case '.clear':
        console.clear();
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
        // .save <filename> や .load <filename> の処理
        if (cmd.startsWith('.save ')) {
          await this.saveSession(command);
        } else if (cmd.startsWith('.load ')) {
          await this.loadSession(command);
        } else {
          console.log(chalk.yellow(`Unknown command: ${command}`));
          console.log(chalk.gray('Type .help for available commands'));
        }
    }
  }

  private showHelp(): void {
    console.log(chalk.cyan('\nAvailable commands:'));
    console.log('  .exit           - Exit the REPL');
    console.log('  .help           - Show this help message');
    console.log('  .clear          - Clear the screen');
    console.log('  .history        - Show command history');
    console.log('  .save [file]    - Save current data to file');
    console.log('  .load [file]    - Load data from file');
    console.log('  .config         - Show current configuration');
    console.log('');
    console.log(chalk.gray('Navigation:'));
    console.log('  ↑/↓             - Navigate command history');
    console.log('  Tab             - Show autocomplete suggestions');
    console.log('  Shift+Enter     - Insert newline (multiline)');
  }

  private showHistory(): void {
    // .historyコマンド自体は履歴から除外して判定
    const realHistory = this.history.filter(cmd => cmd !== '.history');
    
    if (realHistory.length === 0) {
      console.log(chalk.gray('No history yet'));
      return;
    }

    console.log(chalk.cyan('\nCommand history:'));
    realHistory.forEach((cmd, index) => {
      console.log(chalk.gray(`${index + 1}:`), cmd);
    });
  }

  async stop(): Promise<void> {
    this.shouldExit = true;
    this.logger.info('Stopping Enquirer REPL...');
  }

  /**
   * エラーをユーザーフレンドリーに表示
   */
  private displayError(error: any): void {
    const errorString = error?.toString?.() || 'Unknown error';
    
    // エラーの種類を判定
    if (errorString.includes('SyntaxError')) {
      this.displaySyntaxError(errorString);
    } else if (errorString.includes('ReferenceError')) {
      this.displayReferenceError(errorString);
    } else if (errorString.includes('TypeError')) {
      this.displayTypeError(errorString);
    } else if (errorString.includes('RangeError')) {
      this.displayRangeError(errorString);
    } else {
      // その他のエラー
      console.error(chalk.red('❌ Error:'), errorString);
    }

    // スタックトレースがある場合は詳細表示
    if (error?.stack && this.logger.level === 'debug') {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
  }

  private displaySyntaxError(error: string): void {
    console.error(chalk.red('❌ Syntax Error:'));
    
    // よくある構文エラーのヒント
    if (error.includes('Unexpected token')) {
      console.error(chalk.yellow('  → Check for missing brackets, quotes, or semicolons'));
    } else if (error.includes('Unexpected end of input')) {
      console.error(chalk.yellow('  → Expression seems incomplete. Did you forget to close a bracket?'));
    }
    
    console.error(chalk.gray(`  ${error}`));
  }

  private displayReferenceError(error: string): void {
    console.error(chalk.red('❌ Reference Error:'));
    
    // 変数名を抽出
    const match = error.match(/(\w+) is not defined/);
    if (match) {
      const varName = match[1];
      console.error(chalk.yellow(`  → "${varName}" is not defined`));
      console.error(chalk.gray(`  Did you mean to reference a property? Try: $.${varName} or _.${varName}`));
    } else {
      console.error(chalk.gray(`  ${error}`));
    }
  }

  private displayTypeError(error: string): void {
    console.error(chalk.red('❌ Type Error:'));
    
    if (error.includes('Cannot read property')) {
      console.error(chalk.yellow('  → Trying to access a property of null or undefined'));
      console.error(chalk.gray('  Use optional chaining (?.) to safely access nested properties'));
    } else if (error.includes('is not a function')) {
      console.error(chalk.yellow('  → Trying to call something that is not a function'));
    }
    
    console.error(chalk.gray(`  ${error}`));
  }

  private displayRangeError(error: string): void {
    console.error(chalk.red('❌ Range Error:'));
    
    if (error.includes('Maximum call stack')) {
      console.error(chalk.yellow('  → Infinite recursion detected'));
    } else if (error.includes('Invalid array length')) {
      console.error(chalk.yellow('  → Array size is too large or negative'));
    }
    
    console.error(chalk.gray(`  ${error}`));
  }

  /**
   * 現在のデータをファイルに保存
   */
  private async saveSession(command: string): Promise<void> {
    const parts = command.split(/\s+/);
    const filename = parts[1] || 'jsq-session.json';

    try {
      const dataToSave = {
        data: this.currentData,
        timestamp: new Date().toISOString(),
        history: this.history.filter(cmd => !cmd.startsWith('.'))
      };

      await fs.writeFile(filename, JSON.stringify(dataToSave, null, 2));
      console.log(chalk.green(`✅ Session saved to: ${filename}`));
      
      const stats = await fs.stat(filename);
      console.log(chalk.gray(`  Size: ${stats.size} bytes`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to save session:'), error);
    }
  }

  /**
   * ファイルからデータを読み込み
   */
  private async loadSession(command: string): Promise<void> {
    const parts = command.split(/\s+/);
    const filename = parts[1];

    if (!filename) {
      console.error(chalk.red('❌ Please specify a filename'));
      console.log(chalk.gray('  Usage: .load <filename>'));
      return;
    }

    try {
      const content = await fs.readFile(filename, 'utf-8');
      const session = JSON.parse(content);

      if (session.data) {
        this.currentData = session.data;
        this.evaluator.setData(session.data);
        console.log(chalk.green(`✅ Session loaded from: ${filename}`));
        
        if (session.timestamp) {
          console.log(chalk.gray(`  Saved at: ${session.timestamp}`));
        }
        
        console.log(chalk.cyan('  Data is now available as $'));
      } else {
        console.error(chalk.yellow('⚠️  No data found in session file'));
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(chalk.red(`❌ File not found: ${filename}`));
      } else if (error instanceof SyntaxError) {
        console.error(chalk.red('❌ Invalid JSON file'));
      } else {
        console.error(chalk.red('❌ Failed to load session:'), error);
      }
    }
  }

  /**
   * 現在の設定を表示
   */
  private showConfig(): void {
    console.log(chalk.cyan('\nCurrent configuration:'));
    console.log(chalk.gray('  REPL Mode:'), 'Enquirer Edition');
    console.log(chalk.gray('  History file:'), this.historyFile || '.jsq_history');
    console.log(chalk.gray('  Autocomplete:'), 'Enabled');
    console.log(chalk.gray('  Multiline:'), 'Enabled (Shift+Enter)');
    
    if (this.currentData !== null) {
      const dataType = Array.isArray(this.currentData) ? 'Array' : typeof this.currentData;
      const dataSize = JSON.stringify(this.currentData).length;
      console.log(chalk.gray('  Current data:'), `${dataType} (${dataSize} bytes)`);
    } else {
      console.log(chalk.gray('  Current data:'), 'None');
    }
    
    console.log(chalk.gray('  Logger level:'), this.logger.level || 'info');
  }
}