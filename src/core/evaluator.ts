import type { JsqOptions } from '@/types/cli';
import type { ChainableWrapper } from './chainable';
import { ExpressionTransformer } from './expression-transformer';
import { createSmartDollar } from './jquery-wrapper';
import { LibraryManager } from './library-manager';

export class ExpressionEvaluator {
  private options: JsqOptions;
  private libraryManager: LibraryManager;
  private static warningShown = false;

  constructor(options: JsqOptions) {
    this.options = options;
    this.libraryManager = new LibraryManager(options);

    // Show warning if --safe flag is used (no longer supported) - only once
    if (options.safe && !ExpressionEvaluator.warningShown) {
      console.warn('⚠️  Warning: --safe mode has been deprecated. All evaluations now run in optimized mode.');
      ExpressionEvaluator.warningShown = true;
    }
  }

  async dispose(): Promise<void> {
    // No cleanup needed for simplified implementation
  }

  async evaluate(expression: string, data: unknown): Promise<unknown> {
    try {
      const transformedExpression = this.transformExpression(expression);
      const loadedLibraries = await this.loadExternalLibraries();
      const $ = createSmartDollar(data);
      const context = await this.createEvaluationContext($, loadedLibraries, data);
      const result = this.executeExpression(transformedExpression, context);
      return this.unwrapResult(result);
    } catch (error) {
      throw new Error(
        `Expression evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private transformExpression(expression: string): string {
    const transformedExpression = ExpressionTransformer.transform(expression);

    if (this.options.verbose && transformedExpression !== expression) {
      console.error('Transformed expression:', transformedExpression);
    }

    return transformedExpression;
  }

  private async loadExternalLibraries(): Promise<Record<string, unknown>> {
    return this.options.use ? await this.libraryManager.loadLibraries(this.options.use) : {};
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
      Set,
      Map,
      Reflect,
      Symbol,
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

  private executeExpression(
    transformedExpression: string,
    context: Record<string, unknown>
  ): unknown {
    if (this.options.verbose) {
      console.error('⚡ Running in optimized mode');
    }
    
    return this.safeEval(transformedExpression, context);
  }

  private unwrapResult(result: unknown): unknown {
    this.debugResult(result);

    if (this.isChainableWrapper(result)) {
      return this.unwrapChainableWrapper(result);
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
      ((result as object).constructor.name.includes('ChainableWrapper') ||
       (result as object).constructor.name.includes('_ChainableWrapper'))
    );
  }

  private unwrapChainableWrapper(result: unknown): unknown {
    if (this.options.verbose) {
      console.error('Debug: Unwrapping result with .value');
    }
    const wrapped = result as ChainableWrapper;
    const unwrapped = wrapped.value;
    if (this.options.verbose) {
      console.error('Debug: Unwrapped value type:', typeof unwrapped);
    }
    return unwrapped;
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