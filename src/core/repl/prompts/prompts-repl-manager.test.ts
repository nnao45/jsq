import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MockConsoleProvider,
  MockFileSystemProvider,
  MockPromptsProvider,
} from '../../../utils/test-providers.js';
import { type ExpressionEvaluator, PromptsReplManager } from './prompts-repl-manager.js';

describe.skip('PromptsReplManager', () => {
  const createTestSetup = () => {
    const mockFileSystem = new MockFileSystemProvider();
    const mockPromptsProvider = new MockPromptsProvider();
    const mockConsole = new MockConsoleProvider();

    const mockEvaluator: ExpressionEvaluator = {
      evaluate: vi.fn(async (expression: string, currentData: any, lastResult?: any) => {
        if (expression === '$') {
          return { value: currentData || { test: 'data' } };
        }
        if (expression === 'invalid()') {
          return { error: 'Invalid expression' };
        }
        if (expression === '$_') {
          return { value: lastResult };
        }
        if (expression === '$_ + 10' && typeof lastResult === 'number') {
          return { value: lastResult + 10 };
        }
        // Handle $.property access
        if (expression.startsWith('$.')) {
          const propPath = expression.substring(2);
          const props = propPath.split('.');
          let current: any = currentData;
          for (const prop of props) {
            if (current && typeof current === 'object' && prop in current) {
              current = current[prop];
            } else {
              return { value: undefined };
            }
          }
          return { value: current };
        }
        return { value: `Result of: ${expression}` };
      }),
    };

    const manager = new PromptsReplManager({
      evaluator: mockEvaluator,
      historyFile: undefined,
      initialData: null,
      fileSystem: mockFileSystem,
      promptsProvider: mockPromptsProvider,
      console: mockConsole,
    });

    return { manager, mockFileSystem, mockPromptsProvider, mockConsole, mockEvaluator };
  };

  describe('initialization', () => {
    it('should create instance with default providers', () => {
      const mockEvaluator: ExpressionEvaluator = {
        evaluate: vi.fn(async () => ({ value: 'test' })),
      };

      const manager = new PromptsReplManager({
        evaluator: mockEvaluator,
      });

      expect(manager).toBeDefined();
    });

    it('should create instance with custom providers', () => {
      const { manager } = createTestSetup();
      expect(manager).toBeDefined();
    });
  });

  describe('command handling', () => {
    it('should handle .exit command', async () => {
      const { manager, mockPromptsProvider } = createTestSetup();
      mockPromptsProvider.setResponses({ command: '.exit' });

      const startPromise = manager.start();
      await expect(startPromise).resolves.toBeUndefined();
    });

    it('should handle .help command', async () => {
      const { manager, mockPromptsProvider, mockConsole } = createTestSetup();
      mockPromptsProvider.setResponses({ command: '.help' }, { command: '.exit' });

      await manager.start();

      const helpOutput = mockConsole.logs.some(log =>
        log.some(arg => String(arg).includes('Available commands'))
      );
      expect(helpOutput).toBe(true);
    });

    it('should handle .clear command', async () => {
      const { manager, mockPromptsProvider, mockConsole } = createTestSetup();
      mockPromptsProvider.setResponses({ command: '.clear' }, { command: '.exit' });

      await manager.start();

      expect(mockConsole.clearCalls).toBeGreaterThan(0);
    });

    it('should handle .history command with empty history', async () => {
      const { manager, mockPromptsProvider, mockConsole } = createTestSetup();
      mockPromptsProvider.setResponses({ command: '.history' }, { command: '.exit' });

      await manager.start();

      const historyOutput = mockConsole.logs.some(log =>
        log.some(arg => String(arg).includes('No history yet'))
      );
      expect(historyOutput).toBe(true);
    });

    it('should handle unknown command', async () => {
      const { manager, mockPromptsProvider, mockConsole } = createTestSetup();
      mockPromptsProvider.setResponses({ command: '.unknown' }, { command: '.exit' });

      await manager.start();

      const unknownOutput = mockConsole.logs.some(log =>
        log.some(arg => String(arg).includes('Unknown command'))
      );
      expect(unknownOutput).toBe(true);
    });
  });

  describe('expression evaluation', () => {
    it('should evaluate expressions and display results', async () => {
      const { manager, mockPromptsProvider, mockConsole, mockEvaluator } = createTestSetup();
      mockPromptsProvider.setResponses({ command: '$' }, { command: '.exit' });

      await manager.start();

      // Check that evaluate was called with the correct parameters
      expect(mockEvaluator.evaluate).toHaveBeenCalled();
      const call = vi.mocked(mockEvaluator.evaluate).mock.calls[0];
      expect(call[0]).toBe('$');
      expect(call[1]).toBe(null);
      expect(call[2]).toBeUndefined();

      // Find the log with the result output
      const resultLog = mockConsole.logs.find(
        log => log.length >= 2 && String(log[0]).includes('→')
      );
      expect(resultLog).toBeDefined();
      expect(resultLog?.[1]).toEqual({ test: 'data' });
    });

    it('should handle evaluation errors', async () => {
      const { manager, mockPromptsProvider, mockConsole } = createTestSetup();
      mockPromptsProvider.setResponses({ command: 'invalid()' }, { command: '.exit' });

      await manager.start();

      const errorOutput = mockConsole.errors.some(error =>
        error.some(arg => String(arg).includes('Invalid expression'))
      );
      expect(errorOutput).toBe(true);
    });

    it('should track last result', async () => {
      const { manager, mockPromptsProvider, mockEvaluator } = createTestSetup();
      mockPromptsProvider.setResponses({ command: '$' }, { command: '$_' }, { command: '.exit' });

      await manager.start();

      // The first call should be for '.'
      const calls = vi.mocked(mockEvaluator.evaluate).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);

      // Second call should be for '$_' with updated currentData and lastResult
      const secondCall = calls[1];
      expect(secondCall[0]).toBe('$_');
      expect(secondCall[1]).toEqual({ test: 'data' });
      expect(secondCall[2]).toEqual({ test: 'data' });
    });
  });

  describe('session management', () => {
    it('should save session to file', async () => {
      const { manager, mockPromptsProvider, mockConsole, mockFileSystem } = createTestSetup();
      mockPromptsProvider.setResponses(
        { command: '$' },
        { command: '.save test-session.json' },
        { command: '.exit' }
      );

      await manager.start();

      const savedContent = mockFileSystem.getFile('test-session.json');
      expect(savedContent).toBeDefined();
      const parsed = JSON.parse(savedContent as string);
      expect(parsed.data).toEqual({ test: 'data' });
      expect(parsed.history).toContain('$');

      const successOutput = mockConsole.logs.some(log =>
        log.some(arg => String(arg).includes('Session saved'))
      );
      expect(successOutput).toBe(true);
    });

    it('should handle save errors', async () => {
      const { manager, mockPromptsProvider, mockConsole, mockFileSystem } = createTestSetup();

      // Make writeFile throw an error
      mockFileSystem.writeFile = vi.fn().mockRejectedValue(new Error('Write failed'));

      mockPromptsProvider.setResponses(
        { command: '.save test-session.json' },
        { command: '.exit' }
      );

      await manager.start();

      const errorOutput = mockConsole.errors.some(error =>
        error.some(arg => String(arg).includes('Failed to save session'))
      );
      expect(errorOutput).toBe(true);
    });

    it('should load session from file', async () => {
      const { manager, mockPromptsProvider, mockConsole, mockFileSystem } = createTestSetup();

      // Prepare a session file
      const sessionData = {
        data: { loaded: 'data' },
        timestamp: new Date().toISOString(),
        history: ['previous command'],
      };
      mockFileSystem.setFile('test-session.json', JSON.stringify(sessionData));

      mockPromptsProvider.setResponses(
        { command: '.load test-session.json' },
        { command: '.exit' }
      );

      await manager.start();

      const successOutput = mockConsole.logs.some(log =>
        log.some(arg => String(arg).includes('Session loaded'))
      );
      expect(successOutput).toBe(true);
    });

    it('should handle missing filename for load', async () => {
      const { manager, mockPromptsProvider, mockConsole } = createTestSetup();
      mockPromptsProvider.setResponses({ command: '.load' }, { command: '.exit' });

      await manager.start();

      const errorOutput = mockConsole.errors.some(error =>
        error.some(arg => String(arg).includes('Please specify a filename'))
      );
      expect(errorOutput).toBe(true);
    });

    it('should handle non-existent file for load', async () => {
      const { manager, mockPromptsProvider, mockConsole } = createTestSetup();
      mockPromptsProvider.setResponses({ command: '.load nonexistent.json' }, { command: '.exit' });

      await manager.start();

      const errorOutput = mockConsole.errors.some(error =>
        error.some(arg => String(arg).includes('File not found'))
      );
      expect(errorOutput).toBe(true);
    });

    it('should handle invalid JSON file', async () => {
      const { manager, mockPromptsProvider, mockConsole, mockFileSystem } = createTestSetup();
      mockFileSystem.setFile('invalid.json', 'not valid json');

      mockPromptsProvider.setResponses({ command: '.load invalid.json' }, { command: '.exit' });

      await manager.start();

      const errorOutput = mockConsole.errors.some(error =>
        error.some(arg => String(arg).includes('Invalid JSON'))
      );
      expect(errorOutput).toBe(true);
    });
  });

  describe('history management', () => {
    it('should load history from file if specified', async () => {
      const { mockFileSystem } = createTestSetup();
      const historyContent = 'command1\ncommand2\ncommand3';
      mockFileSystem.setFile('.jsq_history', historyContent);

      const manager = new PromptsReplManager({
        evaluator: { evaluate: vi.fn(async () => ({ value: 'test' })) },
        historyFile: '.jsq_history',
        fileSystem: mockFileSystem,
        promptsProvider: new MockPromptsProvider(),
        console: new MockConsoleProvider(),
      });

      // Give some time for async history loading
      await new Promise(resolve => setTimeout(resolve, 50));

      const history = (manager as any).history;
      expect(history).toEqual(['command1', 'command2', 'command3']);
    });

    it('should save history to file', async () => {
      const { mockFileSystem, mockPromptsProvider } = createTestSetup();
      mockPromptsProvider.setResponses({ command: 'test command' }, { command: '.exit' });

      const manager = new PromptsReplManager({
        evaluator: { evaluate: vi.fn(async () => ({ value: 'test' })) },
        historyFile: '.jsq_history',
        fileSystem: mockFileSystem,
        promptsProvider: mockPromptsProvider,
        console: new MockConsoleProvider(),
      });

      await manager.start();

      const savedHistory = mockFileSystem.getFile('.jsq_history');
      expect(savedHistory).toContain('test command');
    });
  });

  describe('config command', () => {
    it('should show configuration', async () => {
      const { manager, mockPromptsProvider, mockConsole } = createTestSetup();
      mockPromptsProvider.setResponses(
        { command: '.' },
        { command: '.config' },
        { command: '.exit' }
      );

      await manager.start();

      const configOutput = mockConsole.logs.filter(log =>
        log.some(arg => String(arg).includes('Current configuration'))
      );
      expect(configOutput.length).toBeGreaterThan(0);

      const replModeOutput = mockConsole.logs.some(log =>
        log.some(arg => String(arg).includes('experimental'))
      );
      expect(replModeOutput).toBe(true);
    });
  });

  describe('error display', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should display syntax errors with helpful messages', async () => {
      const { mockPromptsProvider, mockConsole } = createTestSetup();
      const evaluator: ExpressionEvaluator = {
        evaluate: vi.fn(async () => ({ error: 'SyntaxError: Unexpected token }' })),
      };

      const customManager = new PromptsReplManager({
        evaluator,
        fileSystem: new MockFileSystemProvider(),
        promptsProvider: mockPromptsProvider,
        console: mockConsole,
      });

      mockPromptsProvider.setResponses({ command: 'invalid syntax' }, { command: '.exit' });

      await customManager.start();

      const syntaxErrorOutput = mockConsole.errors.some(error =>
        error.some(arg => String(arg).includes('Syntax Error'))
      );
      expect(syntaxErrorOutput).toBe(true);
    });

    it('should display reference errors with suggestions', async () => {
      const { mockPromptsProvider, mockConsole } = createTestSetup();
      const evaluator: ExpressionEvaluator = {
        evaluate: vi.fn(async () => ({ error: 'ReferenceError: foo is not defined' })),
      };

      const customManager = new PromptsReplManager({
        evaluator,
        fileSystem: new MockFileSystemProvider(),
        promptsProvider: mockPromptsProvider,
        console: mockConsole,
      });

      mockPromptsProvider.setResponses({ command: 'foo' }, { command: '.exit' });

      await customManager.start();

      const referenceErrorOutput = mockConsole.errors.some(error =>
        error.some(arg => String(arg).includes('Reference Error'))
      );
      expect(referenceErrorOutput).toBe(true);

      const suggestionOutput = mockConsole.errors.some(error =>
        error.some(arg => String(arg).includes('$.foo'))
      );
      expect(suggestionOutput).toBe(true);
    });
  });

  describe('stop functionality', () => {
    it('should stop when stop() is called', () => {
      const { manager } = createTestSetup();
      manager.stop();
      expect((manager as any).shouldExit).toBe(true);
    });
  });

  describe('prompt cancellation', () => {
    it('should handle prompt cancellation', async () => {
      const { manager, mockPromptsProvider, mockConsole } = createTestSetup();

      // Simulate cancellation by throwing the specific error
      mockPromptsProvider.prompt = vi
        .fn()
        .mockRejectedValueOnce(new Error('cancelled'))
        .mockResolvedValueOnce({ command: '.exit' });

      await manager.start();

      const cancelOutput = mockConsole.logs.some(log =>
        log.some(arg => String(arg).includes('Use .exit to quit'))
      );
      expect(cancelOutput).toBe(true);
    });
  });

  describe('real-time evaluation', () => {
    it('should be enabled by default', () => {
      const { manager } = createTestSetup();
      expect((manager as any).realTimeEvaluation).toBe(true);
    });

    it('should be enabled when option is set', () => {
      const evaluator: ExpressionEvaluator = {
        evaluate: vi.fn(async () => ({ value: 42 })),
      };

      const manager = new PromptsReplManager({
        evaluator,
        fileSystem: new MockFileSystemProvider(),
        promptsProvider: new MockPromptsProvider(),
        console: new MockConsoleProvider(),
        realTimeEvaluation: true,
      });

      expect((manager as any).realTimeEvaluation).toBe(true);
    });

    it('should perform immediate evaluation', async () => {
      const mockEvaluator: ExpressionEvaluator = {
        evaluate: vi.fn(async () => ({ value: 'test result' })),
      };

      const manager = new PromptsReplManager({
        evaluator: mockEvaluator,
        fileSystem: new MockFileSystemProvider(),
        promptsProvider: new MockPromptsProvider(),
        console: new MockConsoleProvider(),
        realTimeEvaluation: true,
      });

      // Initialize rl to prevent early return
      (manager as any).rl = {
        cursor: 0,
        line: '1 + 1',
      };

      // Mock process.stdout
      const originalWrite = process.stdout.write;
      process.stdout.write = vi.fn() as any;

      // Access private method for testing
      await (manager as any).performImmediateEvaluation('1 + 1');

      // Restore
      process.stdout.write = originalWrite;

      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('1 + 1', null, undefined);
    });

    it('should not evaluate empty input', async () => {
      const mockEvaluator: ExpressionEvaluator = {
        evaluate: vi.fn(),
      };

      const manager = new PromptsReplManager({
        evaluator: mockEvaluator,
        fileSystem: new MockFileSystemProvider(),
        promptsProvider: new MockPromptsProvider(),
        console: new MockConsoleProvider(),
        realTimeEvaluation: true,
      });

      await (manager as any).performImmediateEvaluation('');
      await (manager as any).performImmediateEvaluation('   ');

      expect(mockEvaluator.evaluate).not.toHaveBeenCalled();
    });

    it('should not evaluate commands during real-time', async () => {
      const mockEvaluator: ExpressionEvaluator = {
        evaluate: vi.fn(),
      };

      const manager = new PromptsReplManager({
        evaluator: mockEvaluator,
        fileSystem: new MockFileSystemProvider(),
        promptsProvider: new MockPromptsProvider(),
        console: new MockConsoleProvider(),
        realTimeEvaluation: true,
      });

      await (manager as any).performImmediateEvaluation('.exit');
      await (manager as any).performImmediateEvaluation('.help');

      expect(mockEvaluator.evaluate).not.toHaveBeenCalled();
    });

    it('should handle evaluation errors silently', async () => {
      const mockConsole = new MockConsoleProvider();
      const mockEvaluator: ExpressionEvaluator = {
        evaluate: vi.fn(async () => ({ error: 'Some error' })),
      };

      const manager = new PromptsReplManager({
        evaluator: mockEvaluator,
        fileSystem: new MockFileSystemProvider(),
        promptsProvider: new MockPromptsProvider(),
        console: mockConsole,
        realTimeEvaluation: true,
      });

      await (manager as any).performImmediateEvaluation('bad code');

      // Should not show error in real-time evaluation
      expect(mockConsole.errors).toHaveLength(0);
    });

    it('should handle different value types', async () => {
      const testCases = [
        { value: 'string result' },
        { value: 123 },
        { value: true },
        { value: null },
        { value: undefined },
        { value: { obj: 'test' } },
        { value: [1, 2, 3] },
        { value: new Error('test error') },
      ];

      for (const testCase of testCases) {
        const mockEvaluator: ExpressionEvaluator = {
          evaluate: vi.fn(async () => ({ value: testCase.value })),
        };

        const manager = new PromptsReplManager({
          evaluator: mockEvaluator,
          fileSystem: new MockFileSystemProvider(),
          promptsProvider: new MockPromptsProvider(),
          console: new MockConsoleProvider(),
          realTimeEvaluation: true,
        });

        // Initialize rl to prevent crashes
        (manager as any).rl = {
          cursor: 0,
          line: 'test input',
        };

        // Mock process.stdout.write to prevent actual output
        const originalWrite = process.stdout.write;
        process.stdout.write = vi.fn() as any;

        await (manager as any).performImmediateEvaluation('test');

        // Restore
        process.stdout.write = originalWrite;

        expect(mockEvaluator.evaluate).toHaveBeenCalled();
      }
    });

    it('should prevent concurrent evaluations', async () => {
      const mockEvaluator: ExpressionEvaluator = {
        evaluate: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { value: 'result' };
        }),
      };

      const manager = new PromptsReplManager({
        evaluator: mockEvaluator,
        fileSystem: new MockFileSystemProvider(),
        promptsProvider: new MockPromptsProvider(),
        console: new MockConsoleProvider(),
        realTimeEvaluation: true,
      });

      // Initialize rl
      (manager as any).rl = {
        cursor: 0,
        line: 'test',
      };

      // Start two evaluations
      const eval1 = (manager as any).performImmediateEvaluation('test1');
      const eval2 = (manager as any).performImmediateEvaluation('test2');

      await Promise.all([eval1, eval2]);

      // Only one should have been executed
      expect(mockEvaluator.evaluate).toHaveBeenCalledTimes(1);
    });

    it('should clear preview line correctly', () => {
      const manager = new PromptsReplManager({
        evaluator: { evaluate: vi.fn() },
        fileSystem: new MockFileSystemProvider(),
        promptsProvider: new MockPromptsProvider(),
        console: new MockConsoleProvider(),
        realTimeEvaluation: true,
      });

      // Mock process.stdout.write
      const originalWrite = process.stdout.write;
      const writeCalls: string[] = [];
      process.stdout.write = vi.fn((str: string) => {
        writeCalls.push(str);
        return true;
      }) as any;

      // Set hasPreviewLine flag
      (manager as any).hasPreviewLine = true;
      (manager as any).rl = { prompt: vi.fn() };

      // Call clearPreviewLine
      (manager as any).clearPreviewLine();

      // Check that it wrote the correct escape sequences
      expect(writeCalls).toContain('\n');
      expect(writeCalls).toContain('\x1b[2K'); // Clear line
      expect(writeCalls).toContain('\x1b[0G'); // Move to beginning
      expect(writeCalls).toContain('\x1b[A'); // Move up

      expect((manager as any).hasPreviewLine).toBe(false);

      // Restore
      process.stdout.write = originalWrite;
    });
  });
});
