import chalk from 'chalk';

export interface ErrorPosition {
  line: number;
  column: number;
  length?: number;
}

export interface FormattedError {
  type: 'syntax' | 'security' | 'runtime';
  message: string;
  detail?: string;
  position?: ErrorPosition;
  context?: string;
  suggestion?: string;
}

export class ErrorFormatter {
  static formatError(error: FormattedError, input: string): string {
    const lines: string[] = [];

    // エラータイプとメッセージ
    const typeLabel = ErrorFormatter.getTypeLabel(error.type);
    lines.push(chalk.bold.red(`${typeLabel}: ${error.message}`));

    // 詳細情報
    if (error.detail) {
      lines.push(chalk.gray(`DETAIL: ${error.detail}`));
    }

    // 位置情報とコンテキスト
    if (error.position && input) {
      lines.push('');
      lines.push(...ErrorFormatter.formatErrorContext(input, error.position));
    }

    // 提案
    if (error.suggestion) {
      lines.push('');
      lines.push(chalk.yellow(`HINT: ${error.suggestion}`));
    }

    return lines.join('\n');
  }

  private static getTypeLabel(type: FormattedError['type']): string {
    switch (type) {
      case 'syntax':
        return 'SYNTAX ERROR';
      case 'security':
        return 'SECURITY ERROR';
      case 'runtime':
        return 'RUNTIME ERROR';
    }
  }

  private static formatErrorContext(input: string, position: ErrorPosition): string[] {
    const lines: string[] = [];
    const inputLines = input.split('\n');

    // エラー位置の計算
    let currentLine = 1;
    let _currentColumn = 1;
    let charIndex = 0;

    // 実際のエラー位置を探す
    for (let i = 0; i < input.length && currentLine < position.line; i++) {
      if (input[i] === '\n') {
        currentLine++;
        _currentColumn = 1;
      } else {
        _currentColumn++;
      }
      charIndex++;
    }

    // 列位置まで移動
    for (let i = 1; i < position.column && charIndex < input.length; i++) {
      charIndex++;
    }

    // コンテキストの表示（前後1行を含む）
    const startLine = Math.max(0, position.line - 2);
    const endLine = Math.min(inputLines.length, position.line + 1);

    lines.push(chalk.blue(`LINE ${position.line}:${position.column}`));
    lines.push('');

    for (let i = startLine; i < endLine; i++) {
      const lineNum = i + 1;
      const lineContent = inputLines[i];
      const lineNumStr = String(lineNum).padStart(4, ' ');

      if (lineNum === position.line) {
        // エラー行をハイライト
        lines.push(chalk.gray(`${lineNumStr} | `) + chalk.white(lineContent));

        // エラー位置を指す矢印
        const arrowLine =
          ' '.repeat(6 + position.column - 1) + chalk.red('^'.repeat(position.length || 1));
        lines.push(arrowLine);
      } else {
        // 前後の行
        lines.push(chalk.gray(`${lineNumStr} | ${lineContent}`));
      }
    }

    return lines;
  }

  static parseJSONError(error: Error, input: string): FormattedError {
    const message = error.message;

    // JSON.parseのエラーメッセージから位置情報を抽出
    const positionMatch = message.match(/at position (\d+)/);
    const unexpectedMatch = message.match(/Unexpected token (.) in JSON at position (\d+)/);
    const unexpectedEndMatch = message.match(/Unexpected end of JSON input/);

    let position: ErrorPosition | undefined;
    let suggestion: string | undefined;

    if (positionMatch || unexpectedMatch) {
      const pos = parseInt(unexpectedMatch ? unexpectedMatch[2] : positionMatch?.[1], 10);
      position = ErrorFormatter.calculatePosition(input, pos);

      if (unexpectedMatch) {
        const token = unexpectedMatch[1];
        suggestion = ErrorFormatter.getJSONSuggestion(token, input, pos);
      }
    } else if (unexpectedEndMatch) {
      position = ErrorFormatter.calculatePosition(input, input.length);
      suggestion = 'JSON input ended unexpectedly. Check for missing closing brackets or quotes.';
    }

    return {
      type: 'syntax',
      message: 'Invalid JSON syntax',
      detail: message,
      position,
      suggestion,
    };
  }

  static parseSecurityError(patterns: string[], expression: string): FormattedError {
    // 最初に見つかった危険なパターンの位置を特定
    let earliestMatch: { pattern: string; index: number } | null = null;

    for (const pattern of patterns) {
      const index = expression.indexOf(pattern);
      if (index !== -1 && (!earliestMatch || index < earliestMatch.index)) {
        earliestMatch = { pattern, index };
      }
    }

    let position: ErrorPosition | undefined;
    let suggestion: string | undefined;

    if (earliestMatch) {
      position = ErrorFormatter.calculatePosition(expression, earliestMatch.index);
      position.length = earliestMatch.pattern.length;
      suggestion = ErrorFormatter.getSecuritySuggestion(earliestMatch.pattern);
    }

    return {
      type: 'security',
      message: 'Expression contains potentially dangerous patterns',
      detail: `Found dangerous patterns: ${patterns.join(', ')}`,
      position,
      suggestion,
    };
  }

  static parseExpressionError(error: Error, expression: string): FormattedError {
    const message = error.message;

    // 一般的なJavaScriptエラーパターンから位置情報を抽出
    const unexpectedTokenMatch = message.match(/Unexpected token '?(.+?)'?/);
    const _missingMatch = message.match(/Missing (.+?) after/);

    let position: ErrorPosition | undefined;
    let suggestion: string | undefined;

    if (unexpectedTokenMatch) {
      const token = unexpectedTokenMatch[1];
      const index = expression.indexOf(token);
      if (index !== -1) {
        position = ErrorFormatter.calculatePosition(expression, index);
        position.length = token.length;
      }
      suggestion = ErrorFormatter.getExpressionSuggestion(message);
    }

    return {
      type: 'syntax',
      message: 'Invalid expression syntax',
      detail: message,
      position,
      suggestion,
    };
  }

  private static calculatePosition(input: string, charIndex: number): ErrorPosition {
    let line = 1;
    let column = 1;

    for (let i = 0; i < Math.min(charIndex, input.length); i++) {
      if (input[i] === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }

    return { line, column };
  }

  private static getJSONSuggestion(token: string, input: string, position: number): string {
    switch (token) {
      case "'":
        return 'Single quotes are not valid in JSON. Use double quotes instead.';
      case ',':
        if (
          position === input.length - 1 ||
          input[position + 1] === '}' ||
          input[position + 1] === ']'
        ) {
          return 'Trailing commas are not allowed in JSON.';
        }
        return 'Check for missing values or extra commas.';
      case '}':
      case ']':
        return 'Unexpected closing bracket. Check for matching opening brackets.';
      default:
        return 'Check JSON syntax near this position.';
    }
  }

  private static getSecuritySuggestion(pattern: string): string {
    const suggestions: Record<string, string> = {
      eval: 'Use a safer alternative like JSON.parse() or a sandboxed evaluator.',
      Function: 'Dynamic function creation is dangerous. Consider using predefined functions.',
      require: 'Dynamic imports are not allowed. Use static imports or predefined modules.',
      import: 'Dynamic imports are not allowed. Use static imports or predefined modules.',
      process: 'Access to process object is restricted for security reasons.',
      global: 'Access to global scope is restricted. Use the provided context.',
      __dirname: 'File system access is not allowed in expressions.',
      __filename: 'File system access is not allowed in expressions.',
      'while(true)': 'Infinite loops are not allowed. Use finite iterations.',
      'for(;;)': 'Infinite loops are not allowed. Use finite iterations.',
      readFile: 'File system operations are not allowed in expressions.',
      writeFile: 'File system operations are not allowed in expressions.',
      exec: 'Shell command execution is not allowed for security reasons.',
      spawn: 'Process spawning is not allowed for security reasons.',
      fetch: 'Network requests are not allowed in expressions.',
      setTimeout: 'Asynchronous operations are restricted. Use synchronous alternatives.',
      setInterval: 'Asynchronous operations are restricted. Use synchronous alternatives.',
      Buffer: 'Buffer operations are restricted for security reasons.',
    };

    return suggestions[pattern] || 'This pattern is restricted for security reasons.';
  }

  private static getExpressionSuggestion(errorMessage: string): string {
    if (errorMessage.includes('Unexpected token')) {
      return 'Check for syntax errors like missing operators, brackets, or quotes.';
    }
    if (errorMessage.includes('is not defined')) {
      return 'The variable or function is not available in the expression context.';
    }
    if (errorMessage.includes('Cannot read property')) {
      return 'Trying to access a property of null or undefined. Add null checks.';
    }
    return 'Review the expression syntax and ensure all variables are properly defined.';
  }
}
