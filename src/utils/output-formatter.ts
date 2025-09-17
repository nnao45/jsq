import pc from 'picocolors';
import type { JsqOptions } from '../types/cli.js';

interface FormatterOptions {
  oneline?: boolean | undefined;
  noColor?: boolean | undefined;
  indent?: string | number | undefined;
  compact?: boolean | undefined;
  isReplMode?: boolean | undefined;
}

export class OutputFormatter {
  private options: FormatterOptions;
  private indentSize: number;
  private useColor: boolean;
  private verbose: boolean;

  constructor(options: JsqOptions & { isReplMode?: boolean }) {
    this.options = {
      oneline: options.oneline,
      noColor: options.noColor,
      indent: options.indent,
      compact: options.compact,
      isReplMode: options.isReplMode,
    };

    // Determine indent size
    this.indentSize = this.parseIndentSize(options.indent);

    // Determine color usage
    this.useColor = this.shouldUseColor(options);

    // Store verbose flag
    this.verbose = options.verbose || false;
  }

  private parseIndentSize(indent: string | number | undefined): number {
    if (indent === undefined) return 2;
    const parsed = typeof indent === 'string' ? parseInt(indent, 10) : indent;
    return Number.isNaN(parsed) || parsed < 0 ? 2 : parsed;
  }

  private shouldUseColor(options: JsqOptions): boolean {
    // Check --no-color option first
    if (options.noColor) return false;
    // Check NO_COLOR environment variable (standard convention)
    if (process.env.NO_COLOR) return false;
    // Default: use color if stdout is a TTY
    return process.stdout.isTTY || false;
  }

  format(data: unknown): string {
    if (this.options.oneline) {
      return this.formatOneline(data);
    }

    if (this.options.compact) {
      return this.formatCompact(data);
    }

    // Determine default format based on isReplMode flag
    // When isReplMode is explicitly set to true, always use pretty format
    // Otherwise, decide based on TTY status
    if (this.options.isReplMode) {
      return this.formatPretty(data);
    }

    // Backward compatibility: decide based on TTY status
    const isRepl = process.stdin.isTTY;

    if (this.verbose) {
      return this.formatPretty(data);
    }

    // If not in REPL mode (piped), default to pretty format
    if (!isRepl) {
      return this.formatPretty(data);
    }

    // In REPL mode, default to simple format
    return this.formatSimple(data);
  }

  // Static method for quick formatting
  static format(data: unknown, options: JsqOptions & { isReplMode?: boolean } = {}): string {
    const formatter = new OutputFormatter(options);
    return formatter.format(data);
  }

  private formatOneline(data: unknown): string {
    const compactJson = this.formatCompact(data);

    // Handle edge case where formatCompact might return undefined
    if (!compactJson) {
      return 'undefined';
    }

    // 改行文字を空白に置換して一行化
    const singleLine = compactJson.replace(/\n\s*/g, ' ');

    // ターミナル幅を取得（デフォルト80文字）
    const terminalWidth = process.stdout.columns || 80;

    // プロンプトと矢印を考慮して利用可能な幅を計算
    // "→ " (2文字) + 余白を考慮
    const availableWidth = terminalWidth - 5;

    // 利用可能な幅を超えた場合は省略
    if (singleLine.length > availableWidth) {
      return `${singleLine.substring(0, availableWidth - 3)}...`;
    }

    return singleLine;
  }

  private formatCompact(data: unknown): string {
    const json = JSON.stringify(data, this.getReplacer());
    return this.useColor ? this.colorize(json) : json;
  }

  private formatPretty(data: unknown): string {
    const json = JSON.stringify(data, this.getReplacer(), this.indentSize);
    return this.useColor ? this.colorize(json) : json;
  }

  private formatSimple(data: unknown): string {
    // Simple format (option 2): Arrays print each element on a new line, everything else on one line
    if (Array.isArray(data)) {
      return data.map(item => JSON.stringify(item, this.getReplacer())).join('\n');
    }

    // For non-arrays, just output as compact JSON
    return JSON.stringify(data, this.getReplacer());
  }

  private getReplacer(): ((key: string, value: unknown) => unknown) | undefined {
    return undefined;
  }

  private colorize(json: string): string {
    // Use a more careful approach to avoid coloring inside strings
    let result = '';
    const inString = false;
    let escapeNext = false;

    for (let i = 0; i < json.length; i++) {
      const char = json.charAt(i);
      const remainingText = json.slice(i);

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        result += char;
        continue;
      }

      if (char === '"' && !escapeNext) {
        // Check if this is a JSON key (followed by a colon)
        const keyMatch = remainingText.match(/^"([^"\\]|\\.)*"\s*:/);
        if (keyMatch && !inString) {
          // Extract just the key part (without the colon)
          const keyPart = keyMatch[0].substring(0, keyMatch[0].lastIndexOf(':'));
          result += pc.whiteBright(keyPart);
          i += keyPart.length - 1;
          continue;
        }

        // Otherwise, it's a string value
        const stringMatch = remainingText.match(/^"([^"\\]|\\.)*"/);
        if (stringMatch) {
          result += pc.green(stringMatch[0]);
          i += stringMatch[0].length - 1;
          continue;
        }
      }

      if (!inString) {
        // Numbers
        const numberMatch = remainingText.match(/^-?\d+\.?\d*([eE][+-]?\d+)?/);
        if (numberMatch) {
          result += pc.cyanBright(numberMatch[0]);
          i += numberMatch[0].length - 1;
          continue;
        }

        // Booleans
        const boolMatch = remainingText.match(/^(true|false)/);
        if (boolMatch) {
          result += pc.yellowBright(boolMatch[0]);
          i += boolMatch[0].length - 1;
          continue;
        }

        // Null
        const nullMatch = remainingText.match(/^null/);
        if (nullMatch) {
          result += pc.gray(nullMatch[0]);
          i += nullMatch[0].length - 1;
          continue;
        }

        // Punctuation
        if (/[{}[\]:,]/.test(char)) {
          result += pc.dim(char);
          continue;
        }
      }

      result += char;
    }

    return result;
  }
}
