import chalk from 'chalk';
import type { JsqOptions } from '../types/cli.js';

interface FormatterOptions {
  oneline?: boolean;
  color?: boolean;
  noColor?: boolean;
  indent?: string | number;
  compact?: boolean;
  sortKeys?: boolean;
}

export class OutputFormatter {
  private options: FormatterOptions;
  private indentSize: number;
  private useColor: boolean;

  constructor(options: JsqOptions) {
    this.options = {
      oneline: options.oneline,
      color: options.color,
      noColor: options.noColor,
      indent: options.indent,
      compact: options.compact,
      sortKeys: options.sortKeys,
    };

    // Determine indent size
    this.indentSize = this.parseIndentSize(options.indent);

    // Determine color usage
    this.useColor = this.shouldUseColor(options);
  }

  private parseIndentSize(indent: string | number | undefined): number {
    if (indent === undefined) return 2;
    const parsed = typeof indent === 'string' ? parseInt(indent, 10) : indent;
    return Number.isNaN(parsed) || parsed < 0 ? 2 : parsed;
  }

  private shouldUseColor(options: JsqOptions): boolean {
    if (options.noColor) return false;
    if (options.color) return true;
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

    return this.formatPretty(data);
  }

  private formatOneline(data: unknown): string {
    return this.formatCompact(data);
  }

  private formatCompact(data: unknown): string {
    const json = JSON.stringify(data, this.getReplacer());
    return this.useColor ? this.colorize(json) : json;
  }

  private formatPretty(data: unknown): string {
    const json = JSON.stringify(data, this.getReplacer(), this.indentSize);
    return this.useColor ? this.colorize(json) : json;
  }

  private getReplacer(): ((key: string, value: unknown) => unknown) | undefined {
    if (!this.options.sortKeys) return undefined;

    return (_key: string, value: unknown) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value)
          .sort()
          .reduce((sorted: Record<string, unknown>, key: string) => {
            sorted[key] = (value as Record<string, unknown>)[key];
            return sorted;
          }, {});
      }
      return value;
    };
  }

  private colorize(json: string): string {
    // Use a more careful approach to avoid coloring inside strings
    let result = '';
    const inString = false;
    let escapeNext = false;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];
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
          result += chalk.blueBright(keyPart);
          i += keyPart.length - 1;
          continue;
        }

        // Otherwise, it's a string value
        const stringMatch = remainingText.match(/^"([^"\\]|\\.)*"/);
        if (stringMatch) {
          result += chalk.green(stringMatch[0]);
          i += stringMatch[0].length - 1;
          continue;
        }
      }

      if (!inString) {
        // Numbers
        const numberMatch = remainingText.match(/^-?\d+\.?\d*([eE][+-]?\d+)?/);
        if (numberMatch) {
          result += chalk.magenta(numberMatch[0]);
          i += numberMatch[0].length - 1;
          continue;
        }

        // Booleans
        const boolMatch = remainingText.match(/^(true|false)/);
        if (boolMatch) {
          result += chalk.yellow(boolMatch[0]);
          i += boolMatch[0].length - 1;
          continue;
        }

        // Null
        const nullMatch = remainingText.match(/^null/);
        if (nullMatch) {
          result += chalk.gray(nullMatch[0]);
          i += nullMatch[0].length - 1;
          continue;
        }

        // Punctuation
        if (/[{}[\]:,]/.test(char)) {
          result += chalk.dim(char);
          continue;
        }
      }

      result += char;
    }

    return result;
  }

  // Static method for quick formatting
  static format(data: unknown, options: JsqOptions = {}): string {
    const formatter = new OutputFormatter(options);
    return formatter.format(data);
  }
}
