import { describe, expect, it, beforeEach, vi } from 'vitest';
import { PromptsReplManager } from './prompts-repl-manager';
import type { JsqOptions } from '@/types/cli';
import { MockInputProvider, MockOutputProvider, MockPromptsProvider } from '@/utils/test-providers';

describe('PromptsReplManager - Empty Line Data Reset', () => {
  let options: JsqOptions;
  let inputProvider: MockInputProvider;
  let outputProvider: MockOutputProvider;
  let promptsProvider: MockPromptsProvider;
  let manager: PromptsReplManager;

  beforeEach(() => {
    options = {
      expression: '',
      prompts: true,
      verbose: false,
      oneline: false,
      noColor: false,
      indent: 2,
      compact: false
    } as JsqOptions;

    inputProvider = new MockInputProvider();
    outputProvider = new MockOutputProvider();
    promptsProvider = new MockPromptsProvider();

    manager = new PromptsReplManager(options, {
      inputProvider,
      outputProvider,
      promptsProvider
    });
  });

  it('should reset currentData when empty line is entered', async () => {
    // Simulate user input sequence
    promptsProvider.setMockResponses([
      { command: '3 * 15' },    // First command
      { command: '' },           // Empty line
      { command: '$' },          // Check current data
      { command: '.exit' }       // Exit
    ]);

    // Spy on processInput to check currentData state
    const processInputSpy = vi.spyOn(manager as any, 'processInput');

    // Start the REPL
    await manager.start();

    // Verify the sequence of calls
    expect(processInputSpy).toHaveBeenCalledTimes(2); // Only non-empty inputs
    expect(processInputSpy).toHaveBeenNthCalledWith(1, '3 * 15');
    expect(processInputSpy).toHaveBeenNthCalledWith(2, '$');

    // Check output
    const output = outputProvider.getOutput();
    
    // Should show result of 3 * 15
    expect(output).toContain('→');
    expect(output).toContain('45');
    
    // After empty line and typing $, should show null (not 45)
    const lines = output.split('\n');
    const dollarResultIndex = lines.findIndex((line, index) => 
      index > 0 && lines[index - 1].includes('$') && line.includes('→')
    );
    
    if (dollarResultIndex !== -1) {
      const dollarResult = lines[dollarResultIndex];
      expect(dollarResult).not.toContain('45');
      expect(dollarResult).toMatch(/null|undefined/);
    }
  });

  it('should maintain separate lastResult from currentData', async () => {
    promptsProvider.setMockResponses([
      { command: '100' },        // Set initial value
      { command: '' },           // Empty line (resets currentData)
      { command: '$_' },         // Check lastResult (should still be 100)
      { command: '$' },          // Check currentData (should be null)
      { command: '.exit' }
    ]);

    await manager.start();

    const output = outputProvider.getOutput();
    const lines = output.split('\n').filter(line => line.includes('→'));
    
    // First result: 100
    expect(lines[0]).toContain('100');
    
    // $_ should still show 100 (lastResult)
    expect(lines[1]).toContain('100');
    
    // $ should show null (currentData was reset)
    expect(lines[2]).toMatch(/null|undefined/);
  });
});