import { beforeEach, describe, expect, it } from 'vitest';
import type { JsqOptions } from '@/types/cli';
import type { ApplicationContext } from '../application-context';
import { ExpressionEvaluator } from './evaluator';

describe('Evaluator - $ evaluation after reset', () => {
  let evaluator: ExpressionEvaluator;
  let options: JsqOptions;
  let appContext: ApplicationContext;

  beforeEach(() => {
    options = {
      expression: '',
      verbose: false,
      stream: false,
      parallel: false,
      unsafe: false,
      memoryLimit: 128,
      cpuLimit: 30000,
      prompts: true,
    } as JsqOptions;

    appContext = {
      expressionCache: new Map(),
      options,
      chainableWrapper: null,
      securityManager: null,
      inputReader: null,
      outputHandler: null,
      evaluator: null,
      replManager: null,
      exitHandler: null,
      mode: 'pipe',
    } as unknown as ApplicationContext;

    evaluator = new ExpressionEvaluator(options, appContext);
  });

  it('should return null when $ is evaluated with null data', async () => {
    const result = await evaluator.evaluate('$', null);
    expect(result).toBeNull();
  });

  it('should return undefined when $ is evaluated with undefined data', async () => {
    const result = await evaluator.evaluate('$', undefined);
    expect(result).toBeUndefined();
  });

  it('should return the current data when $ is evaluated', async () => {
    // First evaluation with some data
    const firstData = { value: 45 };
    const result1 = await evaluator.evaluate('$', firstData);
    expect(result1).toEqual(firstData);

    // Second evaluation with null data (simulating reset after empty line)
    const result2 = await evaluator.evaluate('$', null);
    expect(result2).toBeNull();
  });

  it('should not return previous result when data is reset to null', async () => {
    // Simulate the bug scenario
    // 1. Evaluate an expression with data
    const result1 = await evaluator.evaluate('$.value', { value: 45 });
    expect(result1).toBe(45);

    // 2. Reset data to null (like pressing Enter on empty line)
    // 3. Evaluate $ with null data
    const result2 = await evaluator.evaluate('$', null);
    expect(result2).toBeNull(); // Should be null, not 45
  });

  it('should handle lastResult parameter correctly', async () => {
    // First evaluation
    const result1 = await evaluator.evaluate('3 * 15', null);
    expect(result1).toBe(45);

    // Second evaluation with lastResult
    const result2 = await evaluator.evaluate('$_', null, result1);
    expect(result2).toBe(45); // $_ should return lastResult

    // Third evaluation with $ and null data
    const result3 = await evaluator.evaluate('$', null, result1);
    expect(result3).toBeNull(); // $ should return current data (null), not lastResult
  });
});
