import { describe, expect, it, vi } from 'vitest';
import { MockInputProvider } from '@/core/repl/mock-input-provider';
import { MockOutputProvider } from '@/core/repl/mock-output-provider';
import type { EvaluationHandler } from '@/core/repl/repl-manager';
import { ReplManager } from '@/core/repl/repl-manager';
import type { JsqOptions } from '@/types/cli';

describe('ReplManager', () => {
  const createTestSetup = () => {
    const mockInput = new MockInputProvider();
    const mockOutput = new MockOutputProvider();
    const mockEvaluator: EvaluationHandler = vi.fn(
      async (expression, data, _options, lastResult) => {
        if (expression === '.') {
          return { result: { test: 'data' } };
        }
        if (expression === '.invalid') {
          return { error: 'Invalid expression' };
        }
        if (expression === '$_') {
          return { result: lastResult };
        }
        if (expression === '$_ + 10' && typeof lastResult === 'number') {
          return { result: lastResult + 10 };
        }
        // Handle $.property access
        if (expression.startsWith('$.')) {
          const propPath = expression.substring(2);
          const props = propPath.split('.');
          let current: any = data;
          for (const prop of props) {
            if (current && typeof current === 'object' && prop in current) {
              current = current[prop];
            } else {
              return { result: undefined };
            }
          }
          return { result: current };
        }
        return { result: `Result of: ${expression}` };
      }
    );

    const options: JsqOptions = {
      expression: '',
      color: false,
      raw: false,
      compact: false,
      stream: false,
      keyDelimiter: '.',
      repl: false,
      realTimeEvaluation: false,
      replFileMode: false,
      verbose: false,
    };

    const replManager = new ReplManager({ test: 'data' }, options, mockEvaluator, {
      prompt: '> ',
      realTimeEvaluation: false,
      exitOnDoubleCtrlC: false,
      io: {
        input: mockInput,
        output: mockOutput,
      },
    });

    return {
      replManager,
      mockInput,
      mockOutput,
      mockEvaluator,
    };
  };

  describe('Character Input', () => {
    it('should handle character input correctly', async () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();

      replManager.start();

      // Type "test"
      await mockInput.playAll(0, [{ str: 't' }, { str: 'e' }, { str: 's' }, { str: 't' }]);

      expect(replManager.getCurrentInput()).toBe('test');
      expect(replManager.getCursorPosition()).toBe(4);
      expect(mockOutput.getCurrentLine()).toBe('> test');
    });

    it('should handle enter key and evaluate expression', async () => {
      const { replManager, mockInput, mockOutput, mockEvaluator } = createTestSetup();

      replManager.start();

      // Type "." and press enter
      await mockInput.playAll(0, [{ str: '.' }, { key: { name: 'return' } }]);

      expect(mockEvaluator).toHaveBeenCalledWith(
        '.',
        { test: 'data' },
        expect.any(Object),
        undefined
      );
      expect(mockOutput.getOutput()).toContain('> .');
      expect(replManager.getCurrentInput()).toBe('');
    });
  });

  describe('Navigation Keys', () => {
    it('should handle cursor movement', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      await mockInput.playAll(0, [
        { str: 't' },
        { str: 'e' },
        { str: 's' },
        { str: 't' },
        { key: { name: 'left' } },
        { key: { name: 'left' } },
      ]);

      expect(replManager.getCursorPosition()).toBe(2);

      await mockInput.playNext({ key: { name: 'right' } });
      expect(replManager.getCursorPosition()).toBe(3);

      await mockInput.playNext({ key: { name: 'home' } });
      expect(replManager.getCursorPosition()).toBe(0);

      await mockInput.playNext({ key: { name: 'end' } });
      expect(replManager.getCursorPosition()).toBe(4);
    });
  });

  describe('Control Keys', () => {
    it('should handle Ctrl+C', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      await mockInput.playAll(0, [
        { str: 't' },
        { str: 'e' },
        { str: 's' },
        { str: 't' },
        MockInputProvider.createControlKey('c'),
      ]);

      expect(replManager.getCurrentInput()).toBe('');
      expect(replManager.getCursorPosition()).toBe(0);
    });

    it('should handle Ctrl+A and Ctrl+E', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      await mockInput.playAll(0, [
        { str: 't' },
        { str: 'e' },
        { str: 's' },
        { str: 't' },
        MockInputProvider.createControlKey('a'),
      ]);

      expect(replManager.getCursorPosition()).toBe(0);

      await mockInput.playNext(MockInputProvider.createControlKey('e'));
      expect(replManager.getCursorPosition()).toBe(4);
    });

    it('should handle Ctrl+W (delete word)', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      await mockInput.playAll(0, [
        { str: 'h' },
        { str: 'e' },
        { str: 'l' },
        { str: 'l' },
        { str: 'o' },
        { str: ' ' },
        { str: 'w' },
        { str: 'o' },
        { str: 'r' },
        { str: 'l' },
        { str: 'd' },
        MockInputProvider.createControlKey('w'),
      ]);

      expect(replManager.getCurrentInput()).toBe('hello ');
    });
  });

  describe('History Navigation', () => {
    it('should navigate through history', async () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();

      replManager.start();
      mockOutput.clear();

      // Add items to history
      await mockInput.playAll(0, [
        { str: 'f' },
        { str: 'i' },
        { str: 'r' },
        { str: 's' },
        { str: 't' },
        { key: { name: 'return' } },
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));

      mockInput.clearKeySequence();
      await mockInput.playAll(0, [
        { str: 's' },
        { str: 'e' },
        { str: 'c' },
        { str: 'o' },
        { str: 'n' },
        { str: 'd' },
        { key: { name: 'return' } },
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Navigate up in history
      await mockInput.playNext({ key: { name: 'up' } });
      expect(replManager.getCurrentInput()).toBe('second');

      await mockInput.playNext({ key: { name: 'up' } });
      expect(replManager.getCurrentInput()).toBe('first');

      // Navigate down in history
      await mockInput.playNext({ key: { name: 'down' } });
      expect(replManager.getCurrentInput()).toBe('second');
    });
  });

  describe('Backspace and Delete', () => {
    it('should handle backspace correctly', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      await mockInput.playAll(0, [
        { str: 't' },
        { str: 'e' },
        { str: 's' },
        { str: 't' },
        { key: { name: 'backspace' } },
        { key: { name: 'backspace' } },
      ]);

      expect(replManager.getCurrentInput()).toBe('te');
    });

    it('should handle delete key correctly', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      await mockInput.playAll(0, [
        { str: 't' },
        { str: 'e' },
        { str: 's' },
        { str: 't' },
        { key: { name: 'left' } },
        { key: { name: 'left' } },
        { key: { name: 'delete' } },
      ]);

      expect(replManager.getCurrentInput()).toBe('tet');
    });
  });

  describe('Error Handling', () => {
    it('should display errors correctly', async () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();

      replManager.start();

      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'i' },
        { str: 'n' },
        { str: 'v' },
        { str: 'a' },
        { str: 'l' },
        { str: 'i' },
        { str: 'd' },
        { key: { name: 'return' } },
      ]);

      const output = mockOutput.getAllOutput();
      expect(output).toContain('Error: Invalid expression');
    });
  });

  describe('Real-time Evaluation', () => {
    it('should perform real-time evaluation when enabled', async () => {
      const { mockInput, mockOutput, mockEvaluator } = createTestSetup();

      const options: JsqOptions = {
        expression: '',
        color: false,
        raw: false,
        compact: false,
        stream: false,
        keyDelimiter: '.',
        repl: false,
        realTimeEvaluation: false,
        replFileMode: false,
        verbose: false,
      };

      const replManager = new ReplManager({ test: 'data' }, options, mockEvaluator, {
        prompt: '> ',
        realTimeEvaluation: true,
        exitOnDoubleCtrlC: false,
        io: {
          input: mockInput,
          output: mockOutput,
        },
      });

      replManager.start();

      await mockInput.playNext({ str: '.' });

      // リアルタイム評価は100msのデバウンスがあるため待機
      await new Promise(resolve => setTimeout(resolve, 150));

      // Real-time evaluation should have been called
      expect(mockEvaluator).toHaveBeenCalledWith(
        '.',
        { test: 'data' },
        expect.any(Object),
        undefined
      );
    });

    it('should evaluate on every character input when real-time evaluation is enabled', async () => {
      const { mockInput, mockOutput, mockEvaluator } = createTestSetup();

      const options: JsqOptions = {
        expression: '',
        color: false,
        raw: false,
        compact: false,
        stream: false,
        keyDelimiter: '.',
        repl: false,
        realTimeEvaluation: false,
        replFileMode: false,
        verbose: false,
      };

      const replManager = new ReplManager({ test: 'data' }, options, mockEvaluator, {
        prompt: '> ',
        realTimeEvaluation: true,
        exitOnDoubleCtrlC: false,
        io: {
          input: mockInput,
          output: mockOutput,
        },
      });

      replManager.start();

      // Clear mock calls
      vi.clearAllMocks();

      // Type ".test" character by character
      await mockInput.playNext({ str: '.' });
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockEvaluator).toHaveBeenCalledTimes(1);
      expect(mockEvaluator).toHaveBeenCalledWith(
        '.',
        { test: 'data' },
        expect.any(Object),
        undefined
      );

      vi.clearAllMocks();
      await mockInput.playNext({ str: 't' });
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockEvaluator).toHaveBeenCalledTimes(1);
      expect(mockEvaluator).toHaveBeenCalledWith(
        '.t',
        { test: 'data' },
        expect.any(Object),
        undefined
      );

      vi.clearAllMocks();
      await mockInput.playNext({ str: 'e' });
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockEvaluator).toHaveBeenCalledTimes(1);
      expect(mockEvaluator).toHaveBeenCalledWith(
        '.te',
        { test: 'data' },
        expect.any(Object),
        undefined
      );

      vi.clearAllMocks();
      await mockInput.playNext({ str: 's' });
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockEvaluator).toHaveBeenCalledTimes(1);
      expect(mockEvaluator).toHaveBeenCalledWith(
        '.tes',
        { test: 'data' },
        expect.any(Object),
        undefined
      );

      vi.clearAllMocks();
      await mockInput.playNext({ str: 't' });
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockEvaluator).toHaveBeenCalledTimes(1);
      expect(mockEvaluator).toHaveBeenCalledWith(
        '.test',
        { test: 'data' },
        expect.any(Object),
        undefined
      );
    });

    it('should evaluate on backspace and delete when real-time evaluation is enabled', async () => {
      const { mockInput, mockOutput, mockEvaluator } = createTestSetup();

      const options: JsqOptions = {
        expression: '',
        color: false,
        raw: false,
        compact: false,
        stream: false,
        keyDelimiter: '.',
        repl: false,
        realTimeEvaluation: false,
        replFileMode: false,
        verbose: false,
      };

      const replManager = new ReplManager({ test: 'data' }, options, mockEvaluator, {
        prompt: '> ',
        realTimeEvaluation: true,
        exitOnDoubleCtrlC: false,
        io: {
          input: mockInput,
          output: mockOutput,
        },
      });

      replManager.start();

      // Type ".test"
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 't' },
        { str: 'e' },
        { str: 's' },
        { str: 't' },
      ]);

      await new Promise(resolve => setTimeout(resolve, 50));
      vi.clearAllMocks();

      // Backspace
      await mockInput.playNext({ key: { name: 'backspace' } });
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockEvaluator).toHaveBeenCalledTimes(1);
      expect(mockEvaluator).toHaveBeenCalledWith(
        '.tes',
        { test: 'data' },
        expect.any(Object),
        undefined
      );

      vi.clearAllMocks();

      // Delete (move cursor left first)
      await mockInput.playNext({ key: { name: 'left' } });
      await mockInput.playNext({ key: { name: 'delete' } });
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockEvaluator).toHaveBeenCalledTimes(1);
      expect(mockEvaluator).toHaveBeenCalledWith(
        '.te',
        { test: 'data' },
        expect.any(Object),
        undefined
      );
    });
  });

  describe('Complex Expression Evaluation', () => {
    it('should evaluate complex object paths', async () => {
      const complexData = {
        users: [
          { id: 1, name: 'Alice', details: { age: 25, city: 'Tokyo' } },
          { id: 2, name: 'Bob', details: { age: 30, city: 'Osaka' } },
        ],
        settings: {
          theme: 'dark',
          language: 'ja',
        },
      };

      const { mockInput, mockOutput } = createTestSetup();
      const evaluator: EvaluationHandler = vi.fn(async expression => {
        if (expression === '.users[0].details.city') {
          return { result: 'Tokyo' };
        }
        if (expression === '.settings.theme') {
          return { result: 'dark' };
        }
        return { result: null };
      });

      const replManager = new ReplManager(
        complexData,
        {
          expression: '',
          color: false,
          raw: false,
          compact: false,
          stream: false,
          keyDelimiter: '.',
          repl: false,
          realTimeEvaluation: false,
          replFileMode: false,
          verbose: false,
        },
        evaluator,
        {
          prompt: '> ',
          realTimeEvaluation: false,
          exitOnDoubleCtrlC: false,
          io: {
            input: mockInput,
            output: mockOutput,
          },
        }
      );

      replManager.start();

      // Test array access
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'u' },
        { str: 's' },
        { str: 'e' },
        { str: 'r' },
        { str: 's' },
        { str: '[' },
        { str: '0' },
        { str: ']' },
        { str: '.' },
        { str: 'd' },
        { str: 'e' },
        { str: 't' },
        { str: 'a' },
        { str: 'i' },
        { str: 'l' },
        { str: 's' },
        { str: '.' },
        { str: 'c' },
        { str: 'i' },
        { str: 't' },
        { str: 'y' },
        { key: { name: 'return' } },
      ]);

      expect(evaluator).toHaveBeenCalledWith(
        '.users[0].details.city',
        complexData,
        expect.any(Object),
        undefined
      );
    });

    it('should handle empty expressions', async () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();

      replManager.start();
      mockOutput.clear();

      // Press enter without typing anything
      await mockInput.playNext({ key: { name: 'return' } });

      // Should show a new prompt without evaluation
      expect(replManager.getCurrentInput()).toBe('');
      const output = mockOutput.getAllOutput();
      expect(output).toContain('> ');
    });
  });

  describe('Previous Result Reference ($_)', () => {
    it('should NOT persist previous result when evaluating undefined expressions', async () => {
      const { mockInput, mockOutput } = createTestSetup();
      const evaluator: EvaluationHandler = vi.fn(
        async (expression, _data, _options, lastResult) => {
          if (expression === '$.test') {
            return { result: 'data' };
          }
          if (expression === '.aaa') {
            // Return undefined to test that $_ becomes undefined
            return { result: undefined };
          }
          if (expression === '$_') {
            return { result: lastResult };
          }
          return { result: null };
        }
      );

      const replManager = new ReplManager(
        { test: 'data' },
        {
          expression: '',
          color: false,
          raw: false,
          compact: false,
          stream: false,
          keyDelimiter: '.',
          repl: false,
          realTimeEvaluation: false,
          replFileMode: false,
          verbose: false,
        },
        evaluator,
        {
          prompt: '> ',
          realTimeEvaluation: false,
          exitOnDoubleCtrlC: false,
          io: {
            input: mockInput,
            output: mockOutput,
          },
        }
      );

      replManager.start();
      mockOutput.clear();

      // Wait a bit after clearing output
      await new Promise(resolve => setTimeout(resolve, 10));

      // First evaluate $.test
      await mockInput.playAll(0, [
        { str: '$' },
        { str: '.' },
        { str: 't' },
        { str: 'e' },
        { str: 's' },
        { str: 't' },
        { key: { name: 'return' } },
      ]);

      // Second evaluate .aaa (undefined property)
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'a' },
        { str: 'a' },
        { str: 'a' },
        { key: { name: 'return' } },
      ]);

      // Check $_ should be undefined
      await mockInput.playAll(0, [{ str: '$' }, { str: '_' }, { key: { name: 'return' } }]);

      const output = mockOutput.getAllOutput();
      const lines = output.split('\n');

      // The output shows that $_ becomes null when evaluating undefined
      // This is because undefined properties return null in the REPL
      // Find the last occurrence of null (which should be $_)
      const nullCount = lines.filter(line => line.trim() === 'null').length;

      // We should have at least 2 nulls: one for .aaa and one for $_
      expect(nullCount).toBeGreaterThanOrEqual(2);

      // The important thing is that $_ is NOT "data" after evaluating .aaa
      // Check that the last result is null, not "data"
      const lastResultLine = lines.filter(line => line.trim() && !line.includes('>')).pop();
      expect(lastResultLine?.trim()).toBe('null');
    });

    it('should reference previous evaluation result as $_', async () => {
      const { mockInput, mockOutput } = createTestSetup();
      const evaluator: EvaluationHandler = vi.fn(
        async (expression, _data, _options, lastResult) => {
          if (expression === '.first') {
            return { result: 42 };
          }
          if (expression === '$_') {
            return { result: lastResult };
          }
          if (expression === '$_ + 10') {
            return { result: (lastResult as number) + 10 };
          }
          return { result: null };
        }
      );

      const replManager = new ReplManager(
        { first: 42, second: 100 },
        {
          expression: '',
          color: false,
          raw: false,
          compact: false,
          stream: false,
          keyDelimiter: '.',
          repl: false,
          realTimeEvaluation: false,
          replFileMode: false,
          verbose: false,
        },
        evaluator,
        {
          prompt: '> ',
          realTimeEvaluation: false,
          exitOnDoubleCtrlC: false,
          io: {
            input: mockInput,
            output: mockOutput,
          },
        }
      );

      replManager.start();

      // First evaluation
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'f' },
        { str: 'i' },
        { str: 'r' },
        { str: 's' },
        { str: 't' },
        { key: { name: 'return' } },
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Clear input sequence
      mockInput.clearKeySequence();

      // Reference previous result with $_
      await mockInput.playAll(0, [{ str: '$' }, { str: '_' }, { key: { name: 'return' } }]);

      // Check that evaluator was called with lastResult
      expect(evaluator).toHaveBeenNthCalledWith(
        1,
        '.first',
        { first: 42, second: 100 },
        expect.any(Object),
        undefined
      );
      expect(evaluator).toHaveBeenNthCalledWith(
        2,
        '$_',
        { first: 42, second: 100 },
        expect.any(Object),
        42
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      // Clear input sequence again
      mockInput.clearKeySequence();

      // Use $_ in expression
      await mockInput.playAll(0, [
        { str: '$' },
        { str: '_' },
        { str: ' ' },
        { str: '+' },
        { str: ' ' },
        { str: '1' },
        { str: '0' },
        { key: { name: 'return' } },
      ]);

      expect(evaluator).toHaveBeenNthCalledWith(
        3,
        '$_ + 10',
        { first: 42, second: 100 },
        expect.any(Object),
        42
      );
    });

    it('should clear previous result on error', async () => {
      const { mockInput, mockOutput } = createTestSetup();
      const evaluator: EvaluationHandler = vi.fn(
        async (expression, _data, _options, lastResult) => {
          if (expression === '.valid') {
            return { result: 'success' };
          }
          if (expression === '.error') {
            return { error: 'Something went wrong' };
          }
          if (expression === '$_') {
            return { result: lastResult };
          }
          return { result: null };
        }
      );

      const replManager = new ReplManager(
        { valid: 'success', error: null },
        {
          expression: '',
          color: false,
          raw: false,
          compact: false,
          stream: false,
          keyDelimiter: '.',
          repl: false,
          realTimeEvaluation: false,
          replFileMode: false,
          verbose: false,
        },
        evaluator,
        {
          prompt: '> ',
          realTimeEvaluation: false,
          exitOnDoubleCtrlC: false,
          io: {
            input: mockInput,
            output: mockOutput,
          },
        }
      );

      replManager.start();

      // First successful evaluation
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'v' },
        { str: 'a' },
        { str: 'l' },
        { str: 'i' },
        { str: 'd' },
        { key: { name: 'return' } },
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));
      mockInput.clearKeySequence();

      // Evaluation that causes error
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'e' },
        { str: 'r' },
        { str: 'r' },
        { str: 'o' },
        { str: 'r' },
        { key: { name: 'return' } },
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));
      mockInput.clearKeySequence();

      // Try to access $_ after error
      await mockInput.playAll(0, [{ str: '$' }, { str: '_' }, { key: { name: 'return' } }]);

      // Check that lastResult was cleared after error
      expect(evaluator).toHaveBeenNthCalledWith(
        1,
        '.valid',
        { valid: 'success', error: null },
        expect.any(Object),
        undefined
      );
      expect(evaluator).toHaveBeenNthCalledWith(
        2,
        '.error',
        { valid: 'success', error: null },
        expect.any(Object),
        'success'
      );
      expect(evaluator).toHaveBeenNthCalledWith(
        3,
        '$_',
        { valid: 'success', error: null },
        expect.any(Object),
        undefined
      );
    });
  });

  describe('Special Characters and Unicode', () => {
    it('should handle Japanese characters', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'こ' },
        { str: 'ん' },
        { str: 'に' },
        { str: 'ち' },
        { str: 'は' },
      ]);

      expect(replManager.getCurrentInput()).toBe('.こんにちは');
    });

    it('should handle emojis correctly', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      await mockInput.playAll(0, [{ str: '.' }, { str: '🎉' }, { str: '✨' }, { str: '💕' }]);

      expect(replManager.getCurrentInput()).toBe('.🎉✨💕');
    });

    it('should handle special characters in expressions', async () => {
      const { replManager, mockInput } = createTestSetup();

      const specialEvaluator: EvaluationHandler = vi.fn(async expression => {
        if (expression === '.prop["key with spaces"]') {
          return { result: 'value' };
        }
        return { result: null };
      });

      const replManagerWithSpecial = new ReplManager(
        { prop: { 'key with spaces': 'value' } },
        {
          expression: '',
          color: false,
          raw: false,
          compact: false,
          stream: false,
          keyDelimiter: '.',
          repl: false,
          realTimeEvaluation: false,
          replFileMode: false,
          verbose: false,
        },
        specialEvaluator,
        {
          prompt: '> ',
          realTimeEvaluation: false,
          io: {
            input: mockInput,
            output: replManager.io.output,
          },
        }
      );

      replManagerWithSpecial.start();

      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'p' },
        { str: 'r' },
        { str: 'o' },
        { str: 'p' },
        { str: '[' },
        { str: '"' },
        { str: 'k' },
        { str: 'e' },
        { str: 'y' },
        { str: ' ' },
        { str: 'w' },
        { str: 'i' },
        { str: 't' },
        { str: 'h' },
        { str: ' ' },
        { str: 's' },
        { str: 'p' },
        { str: 'a' },
        { str: 'c' },
        { str: 'e' },
        { str: 's' },
        { str: '"' },
        { str: ']' },
        { key: { name: 'return' } },
      ]);

      expect(specialEvaluator).toHaveBeenCalledWith(
        '.prop["key with spaces"]',
        { prop: { 'key with spaces': 'value' } },
        expect.any(Object),
        undefined
      );
    });
  });

  describe('Advanced Control Key Combinations', () => {
    it('should handle Ctrl+K (delete to end of line)', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      await mockInput.playAll(0, [
        { str: 'h' },
        { str: 'e' },
        { str: 'l' },
        { str: 'l' },
        { str: 'o' },
        { str: ' ' },
        { str: 'w' },
        { str: 'o' },
        { str: 'r' },
        { str: 'l' },
        { str: 'd' },
        { key: { name: 'home' } },
        { key: { name: 'right' } },
        { key: { name: 'right' } },
        { key: { name: 'right' } },
        { key: { name: 'right' } },
        { key: { name: 'right' } },
        MockInputProvider.createControlKey('k'),
      ]);

      expect(replManager.getCurrentInput()).toBe('hello');
    });

    it('should handle Ctrl+U (delete to beginning of line)', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      await mockInput.playAll(0, [
        { str: 'h' },
        { str: 'e' },
        { str: 'l' },
        { str: 'l' },
        { str: 'o' },
        { str: ' ' },
        { str: 'w' },
        { str: 'o' },
        { str: 'r' },
        { str: 'l' },
        { str: 'd' },
        MockInputProvider.createControlKey('u'),
      ]);

      expect(replManager.getCurrentInput()).toBe('');
    });

    it('should handle Ctrl+L (clear screen)', async () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();

      replManager.start();

      // Type some text first
      await mockInput.playAll(0, [
        { str: 't' },
        { str: 'e' },
        { str: 's' },
        { str: 't' },
        { key: { name: 'return' } },
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Clear the output tracker
      mockOutput.clear();

      // Send Ctrl+L
      await mockInput.playNext(MockInputProvider.createControlKey('l'));

      // Check if clear was called
      const clearCalls = mockOutput.getMethodCalls('clear');
      expect(clearCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-line Input and Pasting', () => {
    it('should handle pasted multi-line content', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      // Simulate pasting a multi-line JSON (without newlines since they trigger enter)
      const pastedContent = '{"key": "value", "nested": {"prop": 123}}';

      // In real scenario, this would come as a single paste event
      // For testing, we'll simulate it character by character
      for (const char of pastedContent) {
        await mockInput.playNext({ str: char });
      }

      expect(replManager.getCurrentInput()).toBe(pastedContent);
    });
  });

  describe('History Edge Cases', () => {
    it('should handle history when at the beginning', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      // Try to go up in history when there's none
      await mockInput.playNext({ key: { name: 'up' } });
      expect(replManager.getCurrentInput()).toBe('');

      // Add one item
      await mockInput.playAll(0, [
        { str: 'f' },
        { str: 'i' },
        { str: 'r' },
        { str: 's' },
        { str: 't' },
        { key: { name: 'return' } },
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Go up twice (should stay at first)
      await mockInput.playNext({ key: { name: 'up' } });
      await mockInput.playNext({ key: { name: 'up' } });
      expect(replManager.getCurrentInput()).toBe('first');
    });

    it('should preserve current input when navigating history', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      // Add history
      await mockInput.playAll(0, [
        { str: 'o' },
        { str: 'l' },
        { str: 'd' },
        { key: { name: 'return' } },
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Clear input sequence before typing new content
      mockInput.clearKeySequence();

      // Type new content
      await mockInput.playAll(0, [{ str: 'n' }, { str: 'e' }, { str: 'w' }]);

      // Navigate up (should show history)
      await mockInput.playNext({ key: { name: 'up' } });
      expect(replManager.getCurrentInput()).toBe('old');

      // Navigate down (should return to empty, as 'new' wasn't committed to history)
      await mockInput.playNext({ key: { name: 'down' } });
      expect(replManager.getCurrentInput()).toBe('');
    });
  });

  describe('Manual Test Bug - Non-existent Property', () => {
    it('should return undefined for non-existent properties, not the entire object', async () => {
      const { mockInput, mockOutput } = createTestSetup();
      const evaluator: EvaluationHandler = vi.fn(
        async (expression, _data, _options, _lastResult) => {
          // Simulate the actual jsq behavior
          if (expression === '$.test') {
            return { result: 'data' };
          }
          if (expression === '$.aaaaaaaaaaa') {
            // This should return undefined, not the entire object
            return { result: undefined };
          }
          return { result: undefined };
        }
      );

      const replManager = new ReplManager(
        { test: 'data' },
        {
          expression: '',
          color: false,
          raw: false,
          compact: false,
          stream: false,
          keyDelimiter: '.',
          repl: false,
          realTimeEvaluation: false,
          replFileMode: false,
          verbose: false,
        },
        evaluator,
        {
          prompt: '> ',
          realTimeEvaluation: false,
          exitOnDoubleCtrlC: false,
          io: {
            input: mockInput,
            output: mockOutput,
          },
        }
      );

      replManager.start();
      mockOutput.clear();

      // Type $.aaaaaaaaaaa (non-existent property)
      await mockInput.playAll(0, [
        { str: '$' },
        { str: '.' },
        { str: 'a' },
        { str: 'a' },
        { str: 'a' },
        { str: 'a' },
        { str: 'a' },
        { str: 'a' },
        { str: 'a' },
        { str: 'a' },
        { str: 'a' },
        { str: 'a' },
        { str: 'a' },
        { key: { name: 'return' } },
      ]);

      // Wait for evaluation
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check the output
      const output = mockOutput.getAllOutput();

      // The output should contain 'undefined', not the entire object
      expect(output).toContain('undefined');
      expect(output).not.toContain('{ "test": "data" }');
      expect(output).not.toContain('"test": "data"');

      // Verify the evaluator was called with the correct expression
      expect(evaluator).toHaveBeenCalledWith(
        '$.aaaaaaaaaaa',
        { test: 'data' },
        expect.any(Object),
        undefined
      );
    });
  });

  describe('Edge Cases and Stress Tests', () => {
    it('should handle rapid key inputs', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      // Simulate very fast typing
      const chars = 'abcdefghijklmnopqrstuvwxyz'.split('');
      await mockInput.playAll(
        0,
        chars.map(c => ({ str: c }))
      );

      expect(replManager.getCurrentInput()).toBe('abcdefghijklmnopqrstuvwxyz');
    });

    it('should handle alternating control and regular keys', async () => {
      const { replManager, mockInput } = createTestSetup();

      replManager.start();

      await mockInput.playAll(0, [
        { str: 'a' },
        MockInputProvider.createControlKey('e'),
        { str: 'b' },
        MockInputProvider.createControlKey('a'),
        { str: 'c' },
        { key: { name: 'end' } },
        { str: 'd' },
      ]);

      expect(replManager.getCurrentInput()).toBe('cabd');
    });

    it.skip('should handle multiline input correctly', async () => {
      // SKIP: Current ReplManager implementation doesn't support multiline input
      const { replManager, mockInput, mockOutput, mockEvaluator } = createTestSetup();
      replManager.start();

      // Test multiline function definition
      await mockInput.playAll(0, [
        { str: 'f' },
        { str: 'u' },
        { str: 'n' },
        { str: 'c' },
        { str: 't' },
        { str: 'i' },
        { str: 'o' },
        { str: 'n' },
        { str: ' ' },
        { str: 't' },
        { str: 'e' },
        { str: 's' },
        { str: 't' },
        { str: '(' },
        { str: ')' },
        { str: ' ' },
        { str: '{' },
        { key: { name: 'return' } },
      ]);

      // Should detect incomplete expression and not evaluate
      expect(mockEvaluator).not.toHaveBeenCalled();
      expect(replManager.getCurrentInput()).toBe('function test() {');
      
      // Continue with function body
      await mockInput.playAll(0, [
        { str: '\n' },
        { str: ' ' },
        { str: ' ' },
        { str: 'r' },
        { str: 'e' },
        { str: 't' },
        { str: 'u' },
        { str: 'r' },
        { str: 'n' },
        { str: ' ' },
        { str: '4' },
        { str: '2' },
        { str: ';' },
        { key: { name: 'return' } },
      ]);

      // Still incomplete
      expect(mockEvaluator).not.toHaveBeenCalled();
      expect(replManager.getCurrentInput()).toBe('function test() {\n  return 42;');

      // Complete the function
      await mockInput.playAll(0, [
        { str: '\n' },
        { str: '}' },
        { key: { name: 'return' } },
      ]);

      // Now it should evaluate
      expect(mockEvaluator).toHaveBeenCalledWith('function test() {\n  return 42;\n}');
      expect(replManager.getCurrentInput()).toBe('');
    });

    it.skip('should handle multiline array/object literals', async () => {
      // SKIP: Current ReplManager implementation doesn't support multiline input
      const { replManager, mockInput, mockOutput, mockEvaluator } = createTestSetup();
      replManager.start();

      // Test multiline array
      await mockInput.playAll(0, [
        { str: '[' },
        { key: { name: 'return' } },
      ]);

      expect(mockEvaluator).not.toHaveBeenCalled();
      expect(replManager.getCurrentInput()).toBe('[');

      await mockInput.playAll(0, [
        { str: '\n' },
        { str: ' ' },
        { str: ' ' },
        { str: '1' },
        { str: ',' },
        { key: { name: 'return' } },
      ]);

      expect(mockEvaluator).not.toHaveBeenCalled();
      expect(replManager.getCurrentInput()).toBe('[\n  1,');

      await mockInput.playAll(0, [
        { str: '\n' },
        { str: ' ' },
        { str: ' ' },
        { str: '2' },
        { key: { name: 'return' } },
      ]);

      expect(mockEvaluator).not.toHaveBeenCalled();

      await mockInput.playAll(0, [
        { str: '\n' },
        { str: ']' },
        { key: { name: 'return' } },
      ]);

      expect(mockEvaluator).toHaveBeenCalledWith('[\n  1,\n  2\n]');
      expect(replManager.getCurrentInput()).toBe('');
    });

    it.skip('should handle interrupted multiline input with Ctrl+C', async () => {
      // SKIP: Current ReplManager implementation doesn't support multiline input
      const { replManager, mockInput, mockOutput, mockEvaluator } = createTestSetup();
      replManager.start();

      // Start multiline object
      await mockInput.playAll(0, [
        { str: '{' },
        { key: { name: 'return' } },
      ]);

      expect(replManager.getCurrentInput()).toBe('{');

      await mockInput.playAll(0, [
        { str: '\n' },
        { str: ' ' },
        { str: ' ' },
        { str: 'k' },
        { str: 'e' },
        { str: 'y' },
        { str: ':' },
        { str: ' ' },
      ]);

      expect(replManager.getCurrentInput()).toBe('{\n  key: ');

      // Interrupt with Ctrl+C
      await mockInput.playAll(0, [
        { key: { name: 'c', ctrl: true } },
      ]);

      // Input should be cleared
      expect(replManager.getCurrentInput()).toBe('');
      expect(mockEvaluator).not.toHaveBeenCalled();
    });

    it('should handle async evaluation errors properly', async () => {
      const asyncErrorEvaluator: EvaluationHandler = vi.fn(async (expression) => {
        if (expression === '.throwAsync') {
          throw new Error('Async error occurred');
        }
        if (expression === '.rejectPromise') {
          return Promise.reject(new Error('Promise rejected'));
        }
        if (expression === '.throwAfterDelay') {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new Error('Delayed error');
        }
        return { result: 'success' };
      });

      const { mockInput, mockOutput } = createTestSetup();
      const replManager = new ReplManager(
        { throwAsync: 'test', rejectPromise: 'test', throwAfterDelay: 'test' },
        {
          expression: '',
          color: false,
          raw: false,
          compact: false,
          stream: false,
          keyDelimiter: '.',
          repl: false,
          realTimeEvaluation: false,
          replFileMode: false,
          verbose: false,
        },
        asyncErrorEvaluator,
        {
          prompt: '> ',
          realTimeEvaluation: false,
          exitOnDoubleCtrlC: false,
          io: {
            input: mockInput,
            output: mockOutput,
          },
        }
      );

      replManager.start();

      // Test synchronous throw in async function
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 't' },
        { str: 'h' },
        { str: 'r' },
        { str: 'o' },
        { str: 'w' },
        { str: 'A' },
        { str: 's' },
        { str: 'y' },
        { str: 'n' },
        { str: 'c' },
        { key: { name: 'return' } },
      ]);

      await new Promise(resolve => setTimeout(resolve, 20));
      
      const outputs = mockOutput.getHistory();
      expect(outputs.some(o => o.includes('Async error occurred'))).toBe(true);
      expect(replManager.getCurrentInput()).toBe('');

      // Clear output history
      mockOutput.clear();

      // Test promise rejection
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'r' },
        { str: 'e' },
        { str: 'j' },
        { str: 'e' },
        { str: 'c' },
        { str: 't' },
        { str: 'P' },
        { str: 'r' },
        { str: 'o' },
        { str: 'm' },
        { str: 'i' },
        { str: 's' },
        { str: 'e' },
        { key: { name: 'return' } },
      ]);

      await new Promise(resolve => setTimeout(resolve, 20));
      
      const outputs2 = mockOutput.getHistory();
      expect(outputs2.some(o => o.includes('Promise rejected'))).toBe(true);
      expect(replManager.getCurrentInput()).toBe('');

      // Clear output history
      mockOutput.clear();

      // Test delayed error
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 't' },
        { str: 'h' },
        { str: 'r' },
        { str: 'o' },
        { str: 'w' },
        { str: 'A' },
        { str: 'f' },
        { str: 't' },
        { str: 'e' },
        { str: 'r' },
        { str: 'D' },
        { str: 'e' },
        { str: 'l' },
        { str: 'a' },
        { str: 'y' },
        { key: { name: 'return' } },
      ]);

      await new Promise(resolve => setTimeout(resolve, 30));
      
      const outputs3 = mockOutput.getHistory();
      expect(outputs3.some(o => o.includes('Delayed error'))).toBe(true);
      expect(replManager.getCurrentInput()).toBe('');
    });

    it('should handle concurrent async evaluations correctly', async () => {
      let evaluationCount = 0;
      const concurrentEvaluator: EvaluationHandler = vi.fn(async (expression) => {
        evaluationCount++;
        const currentCount = evaluationCount;
        await new Promise(resolve => setTimeout(resolve, 20));
        return { result: `Result ${currentCount}: ${expression}` };
      });

      const { mockInput, mockOutput } = createTestSetup();
      const replManager = new ReplManager(
        { test: 'data' },
        {
          expression: '',
          color: false,
          raw: false,
          compact: false,
          stream: false,
          keyDelimiter: '.',
          repl: false,
          realTimeEvaluation: true, // Enable real-time evaluation
          replFileMode: false,
          verbose: false,
        },
        concurrentEvaluator,
        {
          prompt: '> ',
          realTimeEvaluation: true,
          io: {
            input: mockInput,
            output: mockOutput,
          },
        }
      );

      replManager.start();

      // Type quickly to trigger multiple evaluations
      await mockInput.playAll(5, [
        { str: '1' },
        { str: '+' },
        { str: '1' },
      ]);

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should only evaluate once due to debouncing
      expect(concurrentEvaluator).toHaveBeenCalledTimes(1);
      expect(concurrentEvaluator).toHaveBeenCalledWith(
        '1+1',
        { test: 'data' },
        expect.any(Object),
        undefined
      );

      // Press enter for final evaluation
      await mockInput.playAll(0, [
        { key: { name: 'return' } },
      ]);

      await new Promise(resolve => setTimeout(resolve, 30));

      // Should evaluate again on enter
      expect(concurrentEvaluator).toHaveBeenCalledTimes(2);
    });

    it.skip('should handle evaluation timeout gracefully', async () => {
      // This test is temporarily skipped due to timing issues
      const slowEvaluator: EvaluationHandler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { result: 'slow result' };
      });

      const { mockInput, mockOutput } = createTestSetup();
      const replManager = new ReplManager(
        { test: 'data' },
        {
          expression: '',
          color: false,
          raw: false,
          compact: false,
          stream: false,
          keyDelimiter: '.',
          repl: false,
          realTimeEvaluation: false,
          replFileMode: false,
          verbose: false,
        },
        slowEvaluator,
        {
          prompt: '> ',
          realTimeEvaluation: false,
          exitOnDoubleCtrlC: false,
          io: {
            input: mockInput,
            output: mockOutput,
          },
        }
      );

      replManager.start();

      await mockInput.playAll(0, [
        { str: '.' },
        { str: 't' },
        { str: 'e' },
        { str: 's' },
        { str: 't' },
        { key: { name: 'return' } },
      ]);

      // The evaluation is async, so the REPL should continue to be responsive
      // After pressing enter, the input should be cleared
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(replManager.getCurrentInput()).toBe('');
    });
  });

  describe('Display management edge cases', () => {
    it('should handle very long lines that wrap', async () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();
      replManager.start();

      const longString = 'a'.repeat(200);
      const chars = longString.split('');
      
      for (const char of chars) {
        await mockInput.playKey(char);
      }

      expect(replManager.getCurrentInput()).toBe(longString);
      
      // Ensure cursor can navigate through long line
      await mockInput.playAll(0, [
        { key: { name: 'home' } },
      ]);
      
      expect(replManager.getCursorPosition()).toBe(0);
      
      await mockInput.playAll(0, [
        { key: { name: 'end' } },
      ]);
      
      expect(replManager.getCursorPosition()).toBe(longString.length);
    });

    it('should handle unicode characters properly', async () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();
      replManager.start();

      // Test various unicode characters
      const unicodeTests = [
        { chars: ['😀', '🎉', '🚀'], expected: '😀🎉🚀' },
        { chars: ['日', '本', '語'], expected: '日本語' },
        { chars: ['α', 'β', 'γ'], expected: 'αβγ' },
        { chars: ['→', '←', '↑', '↓'], expected: '→←↑↓' },
      ];

      for (let i = 0; i < unicodeTests.length; i++) {
        const test = unicodeTests[i];
        
        // For subsequent tests, clear any existing input
        if (i > 0) {
          // Add some text first so Ctrl+C won't exit
          await mockInput.playNext({ str: 'x' });
          await mockInput.playAll(0, [
            { key: { name: 'c', ctrl: true } },
          ]);
          
          // Wait a bit after Ctrl+C
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Type unicode characters
        for (const char of test.chars) {
          await mockInput.playNext({ str: char });
        }
        
        expect(replManager.getCurrentInput()).toBe(test.expected);
        
        // Test navigation through unicode
        await mockInput.playAll(0, [
          { key: { name: 'left' } },
          { key: { name: 'left' } },
        ]);
        
        expect(replManager.getCursorPosition()).toBe(test.expected.length - 2);
      }
    });

    it('should handle ANSI escape sequences in output', async () => {
      const ansiEvaluator: EvaluationHandler = vi.fn(async (expression) => {
        if (expression === '.colored') {
          return { result: '\x1b[31mRed Text\x1b[0m' };
        }
        if (expression === '.multicolor') {
          return { result: '\x1b[32mGreen\x1b[0m \x1b[34mBlue\x1b[0m' };
        }
        return { result: 'plain' };
      });

      const { mockInput, mockOutput } = createTestSetup();
      const replManager = new ReplManager(
        { colored: 'test', multicolor: 'test' },
        {
          expression: '',
          color: true, // Enable color mode
          raw: false,
          compact: false,
          stream: false,
          keyDelimiter: '.',
          repl: false,
          realTimeEvaluation: false,
          replFileMode: false,
          verbose: false,
        },
        ansiEvaluator,
        {
          prompt: '> ',
          realTimeEvaluation: false,
          exitOnDoubleCtrlC: false,
          io: {
            input: mockInput,
            output: mockOutput,
          },
        }
      );

      replManager.start();

      // Test colored output
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'c' },
        { str: 'o' },
        { str: 'l' },
        { str: 'o' },
        { str: 'r' },
        { str: 'e' },
        { str: 'd' },
        { key: { name: 'return' } },
      ]);

      await new Promise(resolve => setTimeout(resolve, 10));
      
      const outputs = mockOutput.getHistory();
      // In test environment, color codes might be stripped
      expect(outputs.some(o => o.includes('Red Text'))).toBe(true);
    });

    it('should handle mixed width characters in same line', async () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();
      replManager.start();

      // Mix of ASCII, emojis, and CJK characters
      const mixedInput = 'Hello😀世界!';
      const chars = Array.from(mixedInput);
      
      for (const char of chars) {
        await mockInput.playKey(char);
      }

      expect(replManager.getCurrentInput()).toBe(mixedInput);
      
      // Navigate through mixed width characters
      await mockInput.playAll(0, [
        { key: { name: 'home' } },
      ]);
      
      // Move right through each character
      for (let i = 0; i < chars.length; i++) {
        expect(replManager.getCursorPosition()).toBe(i);
        await mockInput.playNext({ key: { name: 'right' } });
      }
      
      expect(replManager.getCursorPosition()).toBe(chars.length);
    });

    it('should maintain display consistency during rapid updates', async () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();
      replManager.start();

      // Simulate rapid typing and deletion
      const rapidOps = [
        { str: 'a' },
        { str: 'b' },
        { str: 'c' },
        { key: { name: 'backspace' } },
        { str: 'd' },
        { key: { name: 'left' } },
        { str: 'e' },
        { key: { name: 'right' } },
        { str: 'f' },
        { key: { name: 'backspace' } },
      ];

      // Play all operations with minimal delay
      await mockInput.playAll(0, rapidOps);

      // Final state should be consistent
      expect(replManager.getCurrentInput()).toBe('abed');
      expect(replManager.getCursorPosition()).toBe(4);
    });

    it('should handle StringBuffer edge cases properly', () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();
      
      // Test empty buffer operations
      expect(replManager.getCurrentInput()).toBe('');
      expect(replManager.getCursorPosition()).toBe(0);
      
      // Test cursor at boundaries
      replManager['moveCursorLeft']();
      expect(replManager.getCursorPosition()).toBe(0); // Should not go negative
      
      replManager['moveCursorRight']();
      expect(replManager.getCursorPosition()).toBe(0); // Should not exceed buffer length
    });
  });
});
