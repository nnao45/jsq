import type { JsqOptions } from '@/types/cli';
import type { ChainableWrapper } from './chainable';
import { ExpressionTransformer } from './expression-transformer';
import { createSmartDollar } from './jquery-wrapper';
import { LibraryManager } from './library-manager';
import { VMChainableWrapper } from './vm-chainable';
import { VMExecutor } from './vm-executor';

export class ExpressionEvaluator {
  private options: JsqOptions;
  private libraryManager: LibraryManager;
  private vmExecutor?: VMExecutor;

  constructor(options: JsqOptions) {
    this.options = options;
    this.libraryManager = new LibraryManager(options);

    // VM is enabled only with --safe flag, disabled by default
    if (options.safe) {
      this.vmExecutor = new VMExecutor({
        unsafe: false,
        timeout: 10000, // 10 second timeout
        memoryLimit: 256, // 256MB memory limit
      });
    }
  }

  async dispose(): Promise<void> {
    if (this.vmExecutor) {
      await this.vmExecutor.dispose();
    }
  }

  async evaluate(expression: string, data: unknown): Promise<unknown> {
    try {
      const transformedExpression = this.transformExpression(expression);
      const loadedLibraries = await this.loadExternalLibraries();
      const $ = this.createSmartDollar(data);
      const context = await this.createEvaluationContext($, loadedLibraries, data);
      const result = await this.executeExpression(transformedExpression, context);
      return this.unwrapResult(result);
    } catch (error) {
      throw new Error(
        `Expression evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private transformExpression(expression: string): string {
    const transformedExpression = !this.options.safe
      ? ExpressionTransformer.transform(expression)
      : expression;

    if (this.options.verbose && transformedExpression !== expression) {
      console.error('Transformed expression:', transformedExpression);
    }

    return transformedExpression;
  }

  private async loadExternalLibraries(): Promise<Record<string, unknown>> {
    return this.options.use ? await this.libraryManager.loadLibraries(this.options.use) : {};
  }

  private createSmartDollar(data: unknown): unknown {
    if (!this.options.safe) {
      return createSmartDollar(data);
    }
    return this.createVMDollar(data);
  }

  private createVMDollar(data: unknown): unknown {
    const $ = (...args: unknown[]) => {
      if (args.length === 0) {
        return new VMChainableWrapper(data);
      }
      return new VMChainableWrapper(args[0]);
    };

    this.setupVMDollarProperties($, data);
    this.addDataPropertiesToVMDollar($, data);
    this.setupVMDollarMethods($, data);

    return $;
  }

  private setupVMDollarProperties($: unknown, data: unknown): void {
    const dollarObj = $ as Record<string, unknown>;
    dollarObj.__isVMChainableWrapper = true;
    dollarObj.data = data;
    dollarObj.value = data;
  }

  private addDataPropertiesToVMDollar($: unknown, data: unknown): void {
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      const dollarObj = $ as Record<string, unknown>;

      for (const [key, value] of Object.entries(obj)) {
        if (this.isValidPropertyKey(key)) {
          this.setVMDollarProperty(dollarObj, key, value);
        }
      }
    }
  }

  private isValidPropertyKey(key: string): boolean {
    const reservedKeys = ['length', 'prototype', 'constructor', 'call', 'apply', 'bind'];
    return !reservedKeys.includes(key);
  }

  private setVMDollarProperty(
    dollarObj: Record<string, unknown>,
    key: string,
    value: unknown
  ): void {
    try {
      Object.defineProperty(dollarObj, key, {
        value: new VMChainableWrapper(value),
        enumerable: true,
        configurable: true,
        writable: false,
      });
    } catch {
      dollarObj[key] = new VMChainableWrapper(value);
    }
  }

  private setupVMDollarMethods($: unknown, data: unknown): void {
    const dollarObj = $ as Record<string, unknown>;

    try {
      Object.defineProperty(dollarObj, 'valueOf', {
        value: () => data,
        enumerable: false,
        configurable: true,
        writable: false,
      });
      Object.defineProperty(dollarObj, 'toString', {
        value: () => JSON.stringify(data),
        enumerable: false,
        configurable: true,
        writable: false,
      });
    } catch {
      dollarObj.valueOf = () => data;
      dollarObj.toString = () => JSON.stringify(data);
    }
  }

  private async createEvaluationContext(
    $: unknown,
    loadedLibraries: Record<string, unknown>,
    data: unknown
  ): Promise<Record<string, unknown>> {
    const context = {
      $,
      console: this.createConsoleObject(),
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      _: await this.loadUtilities(),
      ...loadedLibraries,
      data,
    };

    this.setupLibraryAliases(context, loadedLibraries);
    return context;
  }

  private createConsoleObject(): Record<string, unknown> {
    return this.options.verbose ? console : { log: () => {}, error: () => {}, warn: () => {} };
  }

  private setupLibraryAliases(
    context: Record<string, unknown>,
    loadedLibraries: Record<string, unknown>
  ): void {
    if (loadedLibraries.lodash) {
      context._ = loadedLibraries.lodash;
    }
    if (loadedLibraries.moment) {
      context.moment = loadedLibraries.moment;
    }
    if (loadedLibraries.dayjs) {
      context.dayjs = loadedLibraries.dayjs;
    }
  }

  private async executeExpression(
    transformedExpression: string,
    context: Record<string, unknown>
  ): Promise<unknown> {
    if (this.vmExecutor && this.options.safe) {
      this.logVMMode();
      return await this.vmExecutor.executeExpression(transformedExpression, context);
    }

    this.logUnsafeMode();
    return this.safeEval(transformedExpression, context);
  }

  private logVMMode(): void {
    if (this.options.verbose) {
      console.error('🔒 Running in secure VM mode');
    }
  }

  private logUnsafeMode(): void {
    if (this.options.verbose) {
      if (this.options.unsafe) {
        console.error('⚡ Running in unsafe mode (VM disabled)');
      } else {
        console.error('⚡ Running in fast mode (VM disabled)');
      }
    }
  }

  private unwrapResult(result: unknown): unknown {
    this.debugResult(result);

    if (this.isChainableWrapper(result)) {
      return this.unwrapChainableWrapper(result);
    }

    if (this.isVMChainableWrapper(result)) {
      const wrapped = result as Record<string, unknown>;
      return wrapped.data;
    }

    return result;
  }

  private debugResult(result: unknown): void {
    if (this.options.verbose) {
      console.error('Debug: Result type:', typeof result, 'isArray:', Array.isArray(result));
      if (result && typeof result === 'object') {
        console.error('Debug: Result has value:', 'value' in result);
        console.error('Debug: Result constructor:', (result as object).constructor?.name);
      }
    }
  }

  private isChainableWrapper(result: unknown): boolean {
    return (
      result !== null &&
      typeof result === 'object' &&
      !Array.isArray(result) &&
      'value' in result &&
      ((result as object).constructor.name === 'ChainableWrapper' ||
        (result as object).constructor.name === 'VMChainableWrapper' ||
        (result as Record<string, unknown>).__isVMChainableWrapper)
    );
  }

  private unwrapChainableWrapper(result: unknown): unknown {
    if (this.options.verbose) {
      console.error('Debug: Unwrapping result with .value');
    }
    const wrapped = result as ChainableWrapper | VMChainableWrapper;
    const unwrapped = wrapped.value;
    if (this.options.verbose) {
      console.error('Debug: Unwrapped value type:', typeof unwrapped);
    }
    return unwrapped;
  }

  private isVMChainableWrapper(result: unknown): boolean {
    return (
      result !== null &&
      typeof result === 'object' &&
      !Array.isArray(result) &&
      'data' in result &&
      (result as Record<string, unknown>).__isVMChainableWrapper
    );
  }

  private safeEval(expression: string, context: Record<string, unknown>): unknown {
    // Create a safe evaluation environment
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    try {
      // Use Function constructor for safer evaluation than eval()
      const func = new Function(
        ...contextKeys,
        `
        "use strict";
        return (${expression});
      `
      );

      return func(...contextValues);
    } catch (error) {
      throw new Error(
        `Invalid expression: ${error instanceof Error ? error.message : 'Syntax error'}`
      );
    }
  }

  private async loadUtilities(): Promise<Record<string, unknown>> {
    // Load utility functions similar to lodash
    return {
      map: <T, U>(arr: T[], fn: (item: T, index: number) => U): U[] => arr.map(fn),
      filter: <T>(arr: T[], predicate: (item: T, index: number) => boolean): T[] =>
        arr.filter(predicate),
      find: <T>(arr: T[], predicate: (item: T, index: number) => boolean): T | undefined =>
        arr.find(predicate),
      reduce: <T, U>(arr: T[], fn: (acc: U, item: T, index: number) => U, initial: U): U =>
        arr.reduce(fn, initial),
      groupBy: <T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> => {
        return arr.reduce(
          (groups, item) => {
            const key = keyFn(item);
            if (!groups[key]) groups[key] = [];
            groups[key]?.push(item);
            return groups;
          },
          {} as Record<string, T[]>
        );
      },
      sortBy: <T>(arr: T[], keyFn: (item: T) => number | string): T[] => {
        return [...arr].sort((a, b) => {
          const aKey = keyFn(a);
          const bKey = keyFn(b);
          return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
        });
      },
      uniq: <T>(arr: T[]): T[] => [...new Set(arr)],
      flatten: <T>(arr: (T | T[])[]): T[] => arr.flat() as T[],
      chunk: <T>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      },
    };
  }
}
