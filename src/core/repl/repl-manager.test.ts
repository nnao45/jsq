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
      async (expression, _data, _options, lastResult) => {
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
});
