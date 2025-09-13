import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MockConsoleProvider,
  MockFileSystemProvider,
  MockPromptsProvider,
} from '@/utils/test-providers';
import type { ExpressionEvaluator } from './prompts-repl-manager';
import { PromptsReplManager } from './prompts-repl-manager';

describe.skip('PromptsReplManager - Empty Line Data Reset', () => {
  let promptsProvider: MockPromptsProvider;
  let mockConsole: MockConsoleProvider;
  let mockFileSystem: MockFileSystemProvider;
  let manager: PromptsReplManager;
  let currentDataValue: any = null;

  beforeEach(() => {
    promptsProvider = new MockPromptsProvider();
    mockConsole = new MockConsoleProvider();
    mockFileSystem = new MockFileSystemProvider();

    const mockEvaluator: ExpressionEvaluator = {
      evaluate: vi.fn(async (expression, currentData) => {
        // Track currentData value for assertions
        currentDataValue = currentData;

        if (expression === '$') {
          return { value: currentData };
        }
        if (expression === '$_') {
          return { value: 100 }; // Simulate lastResult
        }
        if (expression === '3 * 15') {
          return { value: 45 };
        }
        if (expression === '100') {
          return { value: 100 };
        }
        return { value: null };
      }),
    };

    manager = new PromptsReplManager({
      evaluator: mockEvaluator,
      promptsProvider,
      console: mockConsole,
      fileSystem: mockFileSystem,
      initialData: null,
    });
  });

  it('should reset currentData when empty line is entered', async () => {
    // Simulate user input sequence
    promptsProvider.setResponses(
      '3 * 15', // First command
      '', // Empty line
      '$', // Check current data
      '.exit' // Exit
    );

    // Start the REPL
    await manager.start();

    // Check that currentData was reset to null after empty line
    expect(currentDataValue).toBeNull();

    // Check console output
    const logs = mockConsole.logs;

    // Should have logged the result of 3 * 15
    const firstResultLog = logs.find(log => log.includes('→') && log.includes('45'));
    expect(firstResultLog).toBeDefined();

    // Should have logged null for $ after empty line
    const dollarResultLog = logs.find(log => log.includes('→') && log.includes('null'));
    expect(dollarResultLog).toBeDefined();
  });

  it('should maintain separate lastResult from currentData', async () => {
    promptsProvider.setResponses(
      '100', // Set initial value
      '', // Empty line (resets currentData)
      '$_', // Check lastResult (should still be 100)
      '$', // Check currentData (should be null)
      '.exit' // Exit
    );

    await manager.start();

    // Check console outputs for each command
    const logs = mockConsole.logs;

    // Find all result logs
    const resultLogs = logs.filter(log =>
      log.some(part => typeof part === 'string' && part.includes('→'))
    );

    // First result: 100
    expect(resultLogs[0]).toBeDefined();
    expect(resultLogs[0].join(' ')).toContain('100');

    // $_ should still show 100 (lastResult)
    expect(resultLogs[1]).toBeDefined();
    expect(resultLogs[1].join(' ')).toContain('100');

    // $ should show null (currentData was reset)
    expect(resultLogs[2]).toBeDefined();
    expect(resultLogs[2].join(' ')).toContain('null');
  });
});
