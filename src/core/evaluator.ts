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
      console.warn(
        '⚠️  Warning: --safe mode has been deprecated. All evaluations now run in optimized mode.'
      );
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
      // Array manipulation methods
      map: <T, U>(arr: T[], fn: (item: T, index: number) => U): U[] => arr.map(fn),
      filter: <T>(arr: T[], predicate: (item: T, index: number) => boolean): T[] =>
        arr.filter(predicate),
      find: <T>(arr: T[], predicate: (item: T, index: number) => boolean): T | undefined =>
        arr.find(predicate),
      findIndex: <T>(arr: T[], predicate: (item: T, index: number) => boolean): number =>
        arr.findIndex(predicate),
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
      orderBy: <T>(arr: T[], keys: string[] | ((item: T) => any)[], orders: ('asc' | 'desc')[] = []): T[] => {
        return [...arr].sort((a, b) => {
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const order = orders[i] || 'asc';
            
            let aVal: any, bVal: any;
            if (typeof key === 'function') {
              aVal = key(a);
              bVal = key(b);
            } else {
              aVal = (a as any)[key];
              bVal = (b as any)[key];
            }
            
            let comparison = 0;
            if (aVal < bVal) comparison = -1;
            else if (aVal > bVal) comparison = 1;
            
            if (comparison !== 0) {
              return order === 'desc' ? -comparison : comparison;
            }
          }
          return 0;
        });
      },
      uniq: <T>(arr: T[]): T[] => [...new Set(arr)],
      uniqBy: <T>(arr: T[], keyFn: (item: T) => any): T[] => {
        const seen = new Set();
        return arr.filter(item => {
          const key = keyFn(item);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      },
      flatten: <T>(arr: (T | T[])[]): T[] => arr.flat() as T[],
      flattenDeep: (arr: any[]): any[] => {
        const flatten = (a: any[]): any[] => a.reduce((acc, val) => 
          Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val), []);
        return flatten(arr);
      },
      compact: <T>(arr: (T | null | undefined | false | 0 | '')[]): T[] => 
        arr.filter(Boolean) as T[],
      chunk: <T>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      },
      take: <T>(arr: T[], count: number): T[] => arr.slice(0, count),
      takeWhile: <T>(arr: T[], predicate: (item: T) => boolean): T[] => {
        const result: T[] = [];
        for (const item of arr) {
          if (!predicate(item)) break;
          result.push(item);
        }
        return result;
      },
      drop: <T>(arr: T[], count: number): T[] => arr.slice(count),
      dropWhile: <T>(arr: T[], predicate: (item: T) => boolean): T[] => {
        let index = 0;
        while (index < arr.length && predicate(arr[index])) {
          index++;
        }
        return arr.slice(index);
      },
      reverse: <T>(arr: T[]): T[] => [...arr].reverse(),
      shuffle: <T>(arr: T[]): T[] => {
        const result = [...arr];
        for (let i = result.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
      },
      sample: <T>(arr: T[]): T | undefined => {
        return arr[Math.floor(Math.random() * arr.length)];
      },
      sampleSize: <T>(arr: T[], count: number): T[] => {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
      },
      
      // Object manipulation methods
      pick: <T extends Record<string, any>>(obj: T, keys: (keyof T)[]): Partial<T> => {
        const result: Partial<T> = {};
        for (const key of keys) {
          if (key in obj) {
            result[key] = obj[key];
          }
        }
        return result;
      },
      omit: <T extends Record<string, any>>(obj: T, keys: (keyof T)[]): Partial<T> => {
        const result: Partial<T> = { ...obj };
        for (const key of keys) {
          delete result[key];
        }
        return result;
      },
      keys: (obj: Record<string, any>): string[] => Object.keys(obj),
      values: (obj: Record<string, any>): any[] => Object.values(obj),
      entries: (obj: Record<string, any>): [string, any][] => Object.entries(obj),
      fromPairs: (pairs: [string, any][]): Record<string, any> => {
        const result: Record<string, any> = {};
        for (const [key, value] of pairs) {
          result[key] = value;
        }
        return result;
      },
      invert: (obj: Record<string, any>): Record<string, string> => {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(obj)) {
          result[String(value)] = key;
        }
        return result;
      },
      merge: (...objects: Record<string, any>[]): Record<string, any> => {
        return Object.assign({}, ...objects);
      },
      defaults: (obj: Record<string, any>, ...sources: Record<string, any>[]): Record<string, any> => {
        const result = { ...obj };
        for (const source of sources) {
          for (const [key, value] of Object.entries(source)) {
            if (!(key in result)) {
              result[key] = value;
            }
          }
        }
        return result;
      },
      
      // Collection methods (work with both arrays and objects)
      size: (collection: any[] | Record<string, any>): number => {
        return Array.isArray(collection) ? collection.length : Object.keys(collection).length;
      },
      isEmpty: (value: any): boolean => {
        if (value == null) return true;
        if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
      },
      includes: (collection: any[] | Record<string, any>, value: any): boolean => {
        if (Array.isArray(collection)) {
          return collection.includes(value);
        }
        return Object.values(collection).includes(value);
      },
      countBy: <T>(arr: T[], keyFn: (item: T) => string): Record<string, number> => {
        return arr.reduce((counts, item) => {
          const key = keyFn(item);
          counts[key] = (counts[key] || 0) + 1;
          return counts;
        }, {} as Record<string, number>);
      },
      keyBy: <T>(arr: T[], keyFn: (item: T) => string): Record<string, T> => {
        return arr.reduce((result, item) => {
          result[keyFn(item)] = item;
          return result;
        }, {} as Record<string, T>);
      },
      
      // Mathematical/statistical methods
      sum: (arr: number[]): number => arr.reduce((sum, num) => sum + num, 0),
      mean: (arr: number[]): number => arr.length ? arr.reduce((sum, num) => sum + num, 0) / arr.length : 0,
      min: (arr: number[]): number => Math.min(...arr),
      max: (arr: number[]): number => Math.max(...arr),
      minBy: <T>(arr: T[], keyFn: (item: T) => number): T | undefined => {
        if (arr.length === 0) return undefined;
        return arr.reduce((min, item) => keyFn(item) < keyFn(min) ? item : min);
      },
      maxBy: <T>(arr: T[], keyFn: (item: T) => number): T | undefined => {
        if (arr.length === 0) return undefined;
        return arr.reduce((max, item) => keyFn(item) > keyFn(max) ? item : max);
      },
      
      // String manipulation methods
      camelCase: (str: string): string => {
        return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
      },
      kebabCase: (str: string): string => {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
      },
      snakeCase: (str: string): string => {
        return str.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toLowerCase();
      },
      startCase: (str: string): string => {
        return str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_\s]+/g, ' ')
          .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
      },
      upperFirst: (str: string): string => str.charAt(0).toUpperCase() + str.slice(1),
      lowerFirst: (str: string): string => str.charAt(0).toLowerCase() + str.slice(1),
      capitalize: (str: string): string => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
      
      // Utility methods
      identity: <T>(value: T): T => value,
      constant: <T>(value: T): () => T => () => value,
      noop: (): void => {},
      times: <T>(n: number, fn: (index: number) => T): T[] => Array.from({ length: n }, (_, i) => fn(i)),
      range: (start: number, end?: number, step?: number): number[] => {
        if (end === undefined) {
          end = start;
          start = 0;
        }
        step = step || 1;
        const result: number[] = [];
        if (step > 0) {
          for (let i = start; i < end; i += step) {
            result.push(i);
          }
        } else {
          for (let i = start; i > end; i += step) {
            result.push(i);
          }
        }
        return result;
      },
      clamp: (num: number, min: number, max: number): number => Math.max(min, Math.min(max, num)),
      random: (min = 0, max = 1): number => Math.random() * (max - min) + min,
      
      // Function utilities
      debounce: <T extends (...args: any[]) => any>(fn: T, wait: number): T => {
        let timeout: NodeJS.Timeout;
        return ((...args: any[]) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => fn(...args), wait);
        }) as T;
      },
      throttle: <T extends (...args: any[]) => any>(fn: T, wait: number): T => {
        let inThrottle: boolean;
        return ((...args: any[]) => {
          if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, wait);
          }
        }) as T;
      },
    };
  }
}
