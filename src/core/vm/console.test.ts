import { describe, expect, it, vi } from 'vitest';
import type { JsqOptions } from '../../types/cli';
import { JsqProcessor } from '../lib/processor';

describe('Console functionality', () => {
  // Mock console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;

  const consoleLogSpy = vi.fn();
  const consoleErrorSpy = vi.fn();
  const consoleWarnSpy = vi.fn();
  const consoleInfoSpy = vi.fn();

  beforeEach(() => {
    // Replace console methods with spies
    console.log = consoleLogSpy;
    console.error = consoleErrorSpy;
    console.warn = consoleWarnSpy;
    console.info = consoleInfoSpy;

    // Clear all spies
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleInfoSpy.mockClear();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
  });

  it('should output console.log messages', async () => {
    const options: JsqOptions = {};
    const processor = new JsqProcessor(options);

    const result = await processor.process('console.log("hello world")', 'null');

    // console.log should have been called with "hello world"
    expect(consoleLogSpy).toHaveBeenCalledWith('hello world');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);

    // Result should be undefined (console.log returns undefined)
    expect(result.data).toBe(undefined);

    await processor.dispose();
  });

  it('should output multiple console.log messages', async () => {
    const options: JsqOptions = {};
    const processor = new JsqProcessor(options);

    const result = await processor.process(
      'console.log("first"); console.log("second"); console.log("third")',
      'null'
    );

    // console.log should have been called three times
    expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    expect(consoleLogSpy).toHaveBeenNthCalledWith(1, 'first');
    expect(consoleLogSpy).toHaveBeenNthCalledWith(2, 'second');
    expect(consoleLogSpy).toHaveBeenNthCalledWith(3, 'third');

    // Result should be undefined (last statement returns undefined)
    expect(result.data).toBe(undefined);

    await processor.dispose();
  });

  it('should output console.error messages', async () => {
    const options: JsqOptions = {};
    const processor = new JsqProcessor(options);

    const result = await processor.process('console.error("error message")', 'null');

    // console.error should have been called
    expect(consoleErrorSpy).toHaveBeenCalledWith('error message');
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    // Result should be undefined
    expect(result.data).toBe(undefined);

    await processor.dispose();
  });

  it('should output console.warn messages', async () => {
    const options: JsqOptions = {};
    const processor = new JsqProcessor(options);

    const result = await processor.process('console.warn("warning message")', 'null');

    // console.warn should have been called
    expect(consoleWarnSpy).toHaveBeenCalledWith('warning message');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

    // Result should be undefined
    expect(result.data).toBe(undefined);

    await processor.dispose();
  });

  it('should output console.info messages', async () => {
    const options: JsqOptions = {};
    const processor = new JsqProcessor(options);

    const result = await processor.process('console.info("info message")', 'null');

    // console.info should have been called
    expect(consoleInfoSpy).toHaveBeenCalledWith('info message');
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);

    // Result should be undefined
    expect(result.data).toBe(undefined);

    await processor.dispose();
  });

  it('should handle console.log with multiple arguments', async () => {
    const options: JsqOptions = {};
    const processor = new JsqProcessor(options);

    await processor.process('console.log("hello", "world", 123)', 'null');

    // console.log should have been called with multiple arguments
    expect(consoleLogSpy).toHaveBeenCalledWith('hello', 'world', '123');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);

    await processor.dispose();
  });

  it('should handle console.log with objects', async () => {
    const options: JsqOptions = {};
    const processor = new JsqProcessor(options);

    await processor.process('console.log({foo: "bar", num: 42})', 'null');

    // console.log should have been called with JSON stringified object
    expect(consoleLogSpy).toHaveBeenCalledWith('{"foo":"bar","num":42}');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);

    await processor.dispose();
  });

  it('should handle console.log with arrays', async () => {
    const options: JsqOptions = {};
    const processor = new JsqProcessor(options);

    await processor.process('console.log([1, 2, 3, "hello"])', 'null');

    // console.log should have been called with JSON stringified array
    expect(consoleLogSpy).toHaveBeenCalledWith('[1,2,3,"hello"]');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);

    await processor.dispose();
  });

  it('should output console.log and return expression value', async () => {
    const options: JsqOptions = {};
    const processor = new JsqProcessor(options);

    const result = await processor.process(
      'console.log("logging..."); [1, 2, 3].map(x => x * 2)',
      'null'
    );

    // console.log should have been called
    expect(consoleLogSpy).toHaveBeenCalledWith('logging...');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);

    // Result should be the array
    expect(result.data).toEqual([2, 4, 6]);

    await processor.dispose();
  });

  it('should handle console.log with $ data', async () => {
    const options: JsqOptions = {};
    const processor = new JsqProcessor(options);
    const testData = { name: 'test', value: 42 };

    const result = await processor.process(
      'console.log("Data is:", $); $.value',
      JSON.stringify(testData)
    );

    // console.log should have been called with data
    expect(consoleLogSpy).toHaveBeenCalledWith('Data is:', JSON.stringify(testData));
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);

    // Result should be 42
    expect(result.data).toBe(42);

    await processor.dispose();
  });

  it('should output console messages in unsafe mode', async () => {
    const options: JsqOptions = { unsafe: true };
    const processor = new JsqProcessor(options);

    const result = await processor.process('console.log("unsafe mode log")', 'null');

    // console.log should have been called even in unsafe mode
    expect(consoleLogSpy).toHaveBeenCalledWith('unsafe mode log');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);

    // Result should be undefined
    expect(result.data).toBe(undefined);

    await processor.dispose();
  });
});
