import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MockConsoleProvider,
  MockFileSystemProvider,
  MockPromptsProvider,
} from '../../../utils/test-providers.js';
import { type ExpressionEvaluator, PromptsReplManager } from './prompts-repl-manager.js';

describe('PromptsReplManager - $ variable reset behavior', () => {
  let mockEvaluator: ExpressionEvaluator;
  let mockConsole: MockConsoleProvider;
  let manager: PromptsReplManager;
  let inputStream: Readable;

  beforeEach(() => {
    mockConsole = new MockConsoleProvider();

    mockEvaluator = {
      evaluate: vi.fn(async (expression: string, currentData: any, lastResult?: any) => {
        if (expression === '$') {
          return { value: currentData };
        }
        if (expression === '$_') {
          return { value: lastResult };
        }
        if (expression === '$.value') {
          return { value: currentData?.value };
        }
        if (expression === '$ = $.value') {
          return { value: currentData?.value };
        }
        return { value: null };
      }),
    };
  });

  it('should preserve initial piped data in $ after assignment and empty line', async () => {
    const initialData = { value: 45 };
    inputStream = new Readable({
      read() {},
    });

    manager = new PromptsReplManager({
      evaluator: mockEvaluator,
      historyFile: undefined,
      initialData,
      inputStream,
      fileSystem: new MockFileSystemProvider(),
      promptsProvider: new MockPromptsProvider(),
      console: mockConsole,
      realTimeEvaluation: false,
    });

    // Start the REPL
    const startPromise = manager.start();

    // Wait for the REPL to be ready
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate user input: check initial $
    inputStream.push('$\n');
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check that $ returns the initial data
    expect(mockEvaluator.evaluate).toHaveBeenCalledWith('$', initialData, initialData);
    expect(mockConsole.logs.some(log => log.join(' ').includes('{"value":45}'))).toBe(true);
    mockConsole.logs = [];

    // Simulate assignment: $ = $.value
    inputStream.push('$ = $.value\n');
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check that the assignment was evaluated
    expect(mockEvaluator.evaluate).toHaveBeenCalledWith(
      '$ = $.value',
      initialData,
      expect.anything()
    );
    expect(mockConsole.logs.some(log => log.join(' ').includes('45'))).toBe(true);
    mockConsole.logs = [];

    // Simulate empty line (just pressing enter)
    inputStream.push('\n');
    await new Promise(resolve => setTimeout(resolve, 50));

    // Now check $ again - it should still be the initial data, not null
    inputStream.push('$\n');
    await new Promise(resolve => setTimeout(resolve, 50));

    // $ should be called with initialData, not null
    const lastCall = vi.mocked(mockEvaluator.evaluate).mock.calls.slice(-1)[0];
    expect(lastCall[0]).toBe('$');
    expect(lastCall[1]).toEqual(initialData); // Should be the initial data, not null
    expect(mockConsole.logs.some(log => log.join(' ').includes('{"value":45}'))).toBe(true);

    // Clean up
    inputStream.push(null);
    await startPromise;
  });

  it('should reset to initial data after multiple empty lines', async () => {
    const initialData = [1, 2, 3];
    inputStream = new Readable({
      read() {},
    });

    manager = new PromptsReplManager({
      evaluator: mockEvaluator,
      historyFile: undefined,
      initialData,
      inputStream,
      fileSystem: new MockFileSystemProvider(),
      promptsProvider: new MockPromptsProvider(),
      console: mockConsole,
      realTimeEvaluation: false,
    });

    // Start the REPL
    const startPromise = manager.start();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check initial $
    inputStream.push('$\n');
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(mockConsole.logs.some(log => log.join(' ').includes('[1,2,3]'))).toBe(true);
    mockConsole.logs = [];

    // Multiple empty lines
    inputStream.push('\n');
    await new Promise(resolve => setTimeout(resolve, 50));
    inputStream.push('\n');
    await new Promise(resolve => setTimeout(resolve, 50));
    inputStream.push('\n');
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check $ again - should still be initial data
    inputStream.push('$\n');
    await new Promise(resolve => setTimeout(resolve, 50));

    const lastCall = vi.mocked(mockEvaluator.evaluate).mock.calls.slice(-1)[0];
    expect(lastCall[1]).toEqual(initialData);
    expect(mockConsole.logs.some(log => log.join(' ').includes('[1,2,3]'))).toBe(true);

    // Clean up
    inputStream.push(null);
    await startPromise;
  });

  it('should handle null initial data correctly', async () => {
    inputStream = new Readable({
      read() {},
    });

    manager = new PromptsReplManager({
      evaluator: mockEvaluator,
      historyFile: undefined,
      initialData: null,
      inputStream,
      fileSystem: new MockFileSystemProvider(),
      promptsProvider: new MockPromptsProvider(),
      console: mockConsole,
      realTimeEvaluation: false,
    });

    // Start the REPL
    const startPromise = manager.start();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check $
    inputStream.push('$\n');
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(mockConsole.logs.some(log => log.join(' ').includes('null'))).toBe(true);
    mockConsole.logs = [];

    // Empty line
    inputStream.push('\n');
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check $ again - should still be null
    inputStream.push('$\n');
    await new Promise(resolve => setTimeout(resolve, 50));

    const lastCall = vi.mocked(mockEvaluator.evaluate).mock.calls.slice(-1)[0];
    expect(lastCall[1]).toBe(null);
    expect(mockConsole.logs.some(log => log.join(' ').includes('null'))).toBe(true);

    // Clean up
    inputStream.push(null);
    await startPromise;
  });
});
