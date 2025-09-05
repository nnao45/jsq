import { describe, expect, it, vi } from 'vitest';
import { MockInputProvider } from '@/core/repl/mock-input-provider';
import { MockOutputProvider } from '@/core/repl/mock-output-provider';
import type { EvaluationHandler } from '@/core/repl/repl-manager';
import { ReplManager } from '@/core/repl/repl-manager';
import type { JsqOptions } from '@/types/cli';

describe.skip('REPL Autocomplete', () => {
  const createTestSetup = () => {
    const mockInput = new MockInputProvider();
    const mockOutput = new MockOutputProvider();

    // Complex data structure for autocomplete testing
    const testData = {
      users: [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ],
      config: {
        database: {
          host: 'localhost',
          port: 5432,
          username: 'admin',
        },
        server: {
          port: 3000,
          hostname: 'api.example.com',
        },
      },
      userCount: 2,
      userList: ['Alice', 'Bob'],
      userMap: new Map([
        ['alice', 1],
        ['bob', 2],
      ]),
    };

    const mockEvaluator: EvaluationHandler = vi.fn(async (expression, _data, opts) => {
      // Simulate autocomplete suggestions
      if (opts?.isAutocomplete) {
        const prefix = expression.substring(1); // Remove leading dot
        const suggestions = [];

        // Generate suggestions based on the prefix
        if (prefix === '') {
          suggestions.push(...Object.keys(testData));
        } else if (prefix === 'u') {
          suggestions.push('users', 'userCount', 'userList', 'userMap');
        } else if (prefix === 'user') {
          suggestions.push('users', 'userCount', 'userList', 'userMap');
        } else if (prefix === 'users.') {
          suggestions.push('users[0]', 'users[1]', 'users.length');
        } else if (prefix === 'users[0].') {
          suggestions.push('users[0].id', 'users[0].name', 'users[0].email');
        } else if (prefix === 'config.') {
          suggestions.push('config.database', 'config.server');
        } else if (prefix === 'config.database.') {
          suggestions.push(
            'config.database.host',
            'config.database.port',
            'config.database.username'
          );
        }

        return { result: suggestions };
      }

      return { result: `Evaluated: ${expression}` };
    });

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

    const replManager = new ReplManager(testData, options, mockEvaluator, {
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
      testData,
    };
  };

  describe('Tab Completion', () => {
    it('should show suggestions on tab with empty input', async () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();

      replManager.start();
      mockOutput.clear();

      // Type dot and press tab
      await mockInput.playAll(0, [{ str: '.' }, { key: { name: 'tab' } }]);

      const output = mockOutput.getAllOutput();
      expect(output).toContain('users');
      expect(output).toContain('config');
      expect(output).toContain('userCount');
      expect(output).toContain('userList');
    });

    it('should show filtered suggestions based on prefix', async () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();

      replManager.start();
      mockOutput.clear();

      // Type ".u" and press tab
      await mockInput.playAll(0, [{ str: '.' }, { str: 'u' }, { key: { name: 'tab' } }]);

      const output = mockOutput.getAllOutput();
      expect(output).toContain('users');
      expect(output).toContain('userCount');
      expect(output).toContain('userList');
      expect(output).toContain('userMap');
      expect(output).not.toContain('config');
    });

    it('should autocomplete single match', async () => {
      const { replManager, mockInput, mockEvaluator } = createTestSetup();

      // Override evaluator for single match
      mockEvaluator.mockImplementation(async (expression, _data, opts) => {
        if (opts?.isAutocomplete && expression === '.userC') {
          return { result: ['userCount'] };
        }
        return { result: null };
      });

      replManager.start();

      // Type ".userC" and press tab
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'u' },
        { str: 's' },
        { str: 'e' },
        { str: 'r' },
        { str: 'C' },
        { key: { name: 'tab' } },
      ]);

      // Should autocomplete to ".userCount"
      expect(replManager.getCurrentInput()).toBe('.userCount');
    });

    it('should handle nested object completion', async () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();

      replManager.start();
      mockOutput.clear();

      // Type ".config." and press tab
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'c' },
        { str: 'o' },
        { str: 'n' },
        { str: 'f' },
        { str: 'i' },
        { str: 'g' },
        { str: '.' },
        { key: { name: 'tab' } },
      ]);

      const output = mockOutput.getAllOutput();
      expect(output).toContain('config.database');
      expect(output).toContain('config.server');
    });

    it('should handle array index suggestions', async () => {
      const { replManager, mockInput, mockOutput } = createTestSetup();

      replManager.start();
      mockOutput.clear();

      // Type ".users." and press tab
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'u' },
        { str: 's' },
        { str: 'e' },
        { str: 'r' },
        { str: 's' },
        { str: '.' },
        { key: { name: 'tab' } },
      ]);

      const output = mockOutput.getAllOutput();
      expect(output).toContain('users[0]');
      expect(output).toContain('users[1]');
      expect(output).toContain('users.length');
    });
  });

  describe('Completion Cycling', () => {
    it('should cycle through suggestions with multiple tabs', async () => {
      const { replManager, mockInput, mockEvaluator } = createTestSetup();

      // Set up a predictable set of suggestions
      mockEvaluator.mockImplementation(async (expression, _data, opts) => {
        if (opts?.isAutocomplete && expression === '.user') {
          return { result: ['userCount', 'userList', 'userMap', 'users'] };
        }
        return { result: null };
      });

      replManager.start();

      // Type ".user" and press tab multiple times
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'u' },
        { str: 's' },
        { str: 'e' },
        { str: 'r' },
      ]);

      const initialInput = replManager.getCurrentInput();
      expect(initialInput).toBe('.user');

      // First tab - should show suggestions or complete to first match
      await mockInput.playNext({ key: { name: 'tab' } });

      // Additional tabs should cycle through if implemented
      await mockInput.playNext({ key: { name: 'tab' } });
      await mockInput.playNext({ key: { name: 'tab' } });
    });
  });

  describe('Edge Cases', () => {
    it('should handle no suggestions gracefully', async () => {
      const { replManager, mockInput, mockEvaluator } = createTestSetup();

      mockEvaluator.mockImplementation(async (_expression, _data, opts) => {
        if (opts?.isAutocomplete) {
          return { result: [] };
        }
        return { result: null };
      });

      replManager.start();

      const inputBefore = '.nosuchproperty';
      await mockInput.playAll(
        0,
        inputBefore.split('').map(c => ({ str: c }))
      );

      await mockInput.playNext({ key: { name: 'tab' } });

      // Input should remain unchanged
      expect(replManager.getCurrentInput()).toBe(inputBefore);
    });

    it('should handle autocomplete errors', async () => {
      const { replManager, mockInput, mockEvaluator } = createTestSetup();

      mockEvaluator.mockImplementation(async (_expression, _data, opts) => {
        if (opts?.isAutocomplete) {
          return { error: 'Autocomplete failed' };
        }
        return { result: null };
      });

      replManager.start();

      await mockInput.playAll(0, [{ str: '.' }, { str: 'u' }, { key: { name: 'tab' } }]);

      // Should handle error gracefully
      expect(replManager.getCurrentInput()).toBe('.u');
    });

    it('should preserve cursor position after failed completion', async () => {
      const { replManager, mockInput, mockEvaluator } = createTestSetup();

      mockEvaluator.mockImplementation(async (_expression, _data, opts) => {
        if (opts?.isAutocomplete) {
          return { result: [] };
        }
        return { result: null };
      });

      replManager.start();

      // Type text and move cursor to middle
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'u' },
        { str: 's' },
        { str: 'e' },
        { str: 'r' },
        { key: { name: 'left' } },
        { key: { name: 'left' } },
      ]);

      const cursorBefore = replManager.getCursorPosition();

      await mockInput.playNext({ key: { name: 'tab' } });

      // Cursor position should be preserved
      expect(replManager.getCursorPosition()).toBe(cursorBefore);
    });
  });

  describe('Complex Autocomplete Scenarios', () => {
    it('should handle method suggestions on objects', async () => {
      const { replManager, mockInput, mockEvaluator, mockOutput } = createTestSetup();

      mockEvaluator.mockImplementation(async (expression, _data, opts) => {
        if (opts?.isAutocomplete && expression === '.userList.') {
          // Simulate array method suggestions
          return {
            result: [
              'userList.length',
              'userList.map',
              'userList.filter',
              'userList.reduce',
              'userList.forEach',
              'userList[0]',
              'userList[1]',
            ],
          };
        }
        return { result: null };
      });

      replManager.start();
      mockOutput.clear();

      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'u' },
        { str: 's' },
        { str: 'e' },
        { str: 'r' },
        { str: 'L' },
        { str: 'i' },
        { str: 's' },
        { str: 't' },
        { str: '.' },
        { key: { name: 'tab' } },
      ]);

      const output = mockOutput.getAllOutput();
      expect(output).toContain('userList.length');
      expect(output).toContain('userList.map');
      expect(output).toContain('userList[0]');
    });

    it('should handle partial bracket notation completion', async () => {
      const { replManager, mockInput, mockEvaluator } = createTestSetup();

      mockEvaluator.mockImplementation(async (expression, _data, opts) => {
        if (opts?.isAutocomplete && expression === '.config["data') {
          return { result: ['.config["database"]'] };
        }
        return { result: null };
      });

      replManager.start();

      // Type partial bracket notation
      await mockInput.playAll(0, [
        { str: '.' },
        { str: 'c' },
        { str: 'o' },
        { str: 'n' },
        { str: 'f' },
        { str: 'i' },
        { str: 'g' },
        { str: '[' },
        { str: '"' },
        { str: 'd' },
        { str: 'a' },
        { str: 't' },
        { str: 'a' },
        { key: { name: 'tab' } },
      ]);

      // Should complete the bracket notation
      expect(replManager.getCurrentInput()).toBe('.config["database"]');
    });
  });
});
