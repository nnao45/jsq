import type { JsqOptions } from '@/types/cli';
import type { ChainableWrapper } from './chainable';
import { ExpressionTransformer } from './expression-transformer';
import { createSmartDollar } from './jquery-wrapper';
import { LibraryManager } from './library-manager';
import { SecurityManager } from './security-manager';
// Conditional VM imports to avoid issues in test environments
let VMSandboxSimple: any;
let VMOptions: any;
let VMContext: any;

try {
  // Only import VM modules when actually needed
  const vmModule = require('./vm-sandbox-simple');
  VMSandboxSimple = vmModule.VMSandboxSimple;

  const sandboxTypes = require('@/types/sandbox');
  VMOptions = sandboxTypes.VMOptions;
  VMContext = sandboxTypes.VMContext;
} catch (vmError) {
  // VM modules not available, sandbox functionality will be disabled
  console.debug('VM modules not available:', vmError.message);
}

// Import fetch for Node.js environments
let fetchFunction: typeof fetch;
try {
  // Try to use built-in fetch (Node.js 18+)
  fetchFunction = globalThis.fetch;
  if (!fetchFunction) {
    throw new Error('No built-in fetch');
  }
} catch {
  try {
    // Fallback to node-fetch for older Node.js versions
    const nodeFetch = require('node-fetch');
    fetchFunction = nodeFetch.default || nodeFetch;
  } catch {
    // If neither is available, provide a stub function
    fetchFunction = (() => {
      throw new Error('fetch is not available. Please use Node.js 18+ or install node-fetch');
    }) as typeof fetch;
  }
}

export class ExpressionEvaluator {
  private options: JsqOptions;
  private libraryManager: LibraryManager;
  private securityManager: SecurityManager;
  private vmSandbox: VMSandboxSimple | null = null;
  private static warningShown = false;

  constructor(options: JsqOptions) {
    this.options = options;
    this.libraryManager = new LibraryManager(options);
    this.securityManager = new SecurityManager(options);

    // Initialize VM sandbox if needed
    if (this.securityManager.shouldUseVM()) {
      const vmConfig = this.securityManager.getVMConfig();
      if (vmConfig && VMSandboxSimple) {
        this.vmSandbox = new VMSandboxSimple(vmConfig);
      }
    }

    // Show warning if --safe flag is used (no longer supported) - only once
    if (options.safe && !ExpressionEvaluator.warningShown) {
      console.warn(
        '⚠️  Warning: --safe mode has been deprecated. All evaluations now run in optimized mode.'
      );
      ExpressionEvaluator.warningShown = true;
    }
  }

  async dispose(): Promise<void> {
    // Clean up VM sandbox if it exists
    if (this.vmSandbox) {
      await this.vmSandbox.dispose();
      this.vmSandbox = null;
    }
  }

  async evaluate(expression: string, data: unknown): Promise<unknown> {
    try {
      // Show security warnings
      const warnings = this.securityManager.getWarnings();
      for (const warning of warnings) {
        console.error(warning);
      }

      const transformedExpression = this.transformExpression(expression);

      // Validate expression security
      const validation = this.securityManager.validateExpression(transformedExpression);
      if (!validation.valid) {
        throw new Error(`Security validation failed: ${validation.errors.join(', ')}`);
      }

      const loadedLibraries = await this.loadExternalLibraries();

      // Special case: if expression is exactly '$' and data is null/undefined, return the raw data
      if (transformedExpression.trim() === '$' && (data === null || data === undefined)) {
        return data;
      }

      const $ = createSmartDollar(data);
      const baseContext = await this.createEvaluationContext($, loadedLibraries, data);
      const secureContext = this.securityManager.createEvaluationContext(baseContext);
      const result = await this.executeExpression(transformedExpression, secureContext);
      return this.unwrapResult(result);
    } catch (error) {
      // Re-throw VM/security errors as-is, wrap others
      if (
        error instanceof Error &&
        (error.message.includes('isolated-vm package not found') ||
          error.message.includes('Security validation failed'))
      ) {
        throw error;
      }
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
      fetch: fetchFunction,
      createSmartDollar,
      _: await this.loadUtilities(),
      ...loadedLibraries,
      data,
    };

    this.setupLibraryAliases(context, loadedLibraries);
    return context;
  }

  private createConsoleObject(): Record<string, unknown> {
    // Always provide console.log for user expressions
    // console.error is stderr output, so always allow it
    return {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: this.options.verbose ? console.debug : () => {},
      trace: this.options.verbose ? console.trace : () => {},
      table: console.table,
      time: console.time,
      timeEnd: console.timeEnd,
      group: console.group,
      groupEnd: console.groupEnd,
      clear: console.clear,
      count: console.count,
      assert: console.assert,
      dir: console.dir,
    };
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
    if (this.securityManager.shouldUseVM()) {
      if (this.options.verbose) {
        console.error('🔒 Running in secure VM isolation mode');
      }
      return await this.executeInVMSandbox(transformedExpression, context);
    } else {
      // This path should not be reached in normal operation since VM is default
      if (this.options.verbose) {
        console.error('⚡ Running in non-VM mode (should not happen)');
      }
      return await this.safeEval(transformedExpression, context);
    }
  }

  private async unwrapResult(result: unknown): Promise<unknown> {
    this.debugResult(result);

    // Handle promises first
    if (result instanceof Promise) {
      const awaitedResult = await result;
      // After awaiting promise, recursively process the result
      return this.unwrapResult(awaitedResult);
    }

    // Handle async generators
    if (this.isAsyncGenerator(result)) {
      return this.handleAsyncGenerator(result);
    }

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

  private isAsyncGenerator(result: unknown): result is AsyncGenerator<unknown> {
    return (
      result !== null &&
      typeof result === 'object' &&
      'next' in result &&
      typeof (result as Record<string, unknown>).next === 'function' &&
      Symbol.asyncIterator in result &&
      typeof (result as Record<symbol, unknown>)[Symbol.asyncIterator] === 'function'
    );
  }

  private async handleAsyncGenerator(generator: AsyncGenerator<unknown>): Promise<unknown[]> {
    const results: unknown[] = [];
    for await (const value of generator) {
      // Unwrap ChainableWrapper if needed
      const unwrapped = this.isChainableWrapper(value) ? this.unwrapChainableWrapper(value) : value;
      results.push(unwrapped);
    }
    return results;
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

  private async safeEval(expression: string, context: Record<string, unknown>): Promise<unknown> {
    // Create a safe evaluation environment
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    try {
      // Use AsyncFunction constructor to support await keyword
      const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
      const func = new AsyncFunction(
        ...contextKeys,
        `
        "use strict";
        return (${expression});
      `
      );

      return await func(...contextValues);
    } catch (error) {
      throw new Error(
        `Invalid expression: ${error instanceof Error ? error.message : 'Syntax error'}`
      );
    }
  }

  private unwrapValue(value: unknown): unknown {
    // Unwrap ChainableWrapper objects to get their raw values
    if (value && typeof value === 'object' && 'value' in value) {
      return (value as { value: unknown }).value;
    }
    if (
      value &&
      typeof value === 'object' &&
      'valueOf' in value &&
      typeof (value as { valueOf: () => unknown }).valueOf === 'function'
    ) {
      return (value as { valueOf: () => unknown }).valueOf();
    }
    return value;
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
      orderBy: <T>(
        arr: T[],
        keys: string[] | ((item: T) => unknown)[],
        orders: ('asc' | 'desc')[] = []
      ): T[] => {
        const createComparator =
          (keys: string[] | ((item: T) => unknown)[], orders: ('asc' | 'desc')[]) =>
          // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex sorting logic required for multi-key orderBy
          (a: T, b: T): number => {
            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              const order = orders[i] || 'asc';

              let aVal: unknown, bVal: unknown;
              if (typeof key === 'function') {
                aVal = key(a);
                bVal = key(b);
              } else {
                aVal = (a as Record<string, unknown>)[key];
                bVal = (b as Record<string, unknown>)[key];
              }

              let comparison = 0;
              if (aVal !== null && bVal !== null && aVal !== undefined && bVal !== undefined) {
                if (aVal < bVal) comparison = -1;
                else if (aVal > bVal) comparison = 1;
              }

              if (comparison !== 0) {
                return order === 'desc' ? -comparison : comparison;
              }
            }
            return 0;
          };

        return [...arr].sort(createComparator(keys, orders));
      },
      uniq: <T>(arr: T[]): T[] => [...new Set(arr)],
      uniqBy: <T>(arr: T[], keyFn: (item: T) => unknown): T[] => {
        const seen = new Set<unknown>();
        return arr.filter(item => {
          const key = keyFn(item);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      },
      flatten: <T>(arr: unknown): T[] => {
        const unwrapped = this.unwrapValue(arr) as (T | T[])[];
        return unwrapped.flat() as T[];
      },
      flattenDeep: (arr: unknown): unknown[] => {
        const unwrapped = this.unwrapValue(arr) as unknown[];
        const flatten = (a: unknown[]): unknown[] =>
          a.reduce(
            (acc: unknown[], val: unknown) =>
              Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val),
            []
          );
        return flatten(unwrapped);
      },
      compact: <T>(arr: unknown): T[] => {
        const unwrapped = this.unwrapValue(arr) as (T | null | undefined | false | 0 | '')[];
        return unwrapped.filter(Boolean) as T[];
      },
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
      pick: <T extends Record<string, unknown>>(obj: unknown, keys: (keyof T)[]): Partial<T> => {
        const unwrapped = this.unwrapValue(obj) as T;
        const result: Partial<T> = {};
        for (const key of keys) {
          if (key in unwrapped) {
            result[key] = unwrapped[key];
          }
        }
        return result;
      },
      omit: <T extends Record<string, unknown>>(obj: unknown, keys: (keyof T)[]): Partial<T> => {
        const unwrapped = this.unwrapValue(obj) as T;
        const result: Partial<T> = { ...unwrapped };
        for (const key of keys) {
          delete result[key];
        }
        return result;
      },
      keys: (obj: unknown): string[] => {
        const unwrapped = this.unwrapValue(obj) as Record<string, unknown>;
        return Object.keys(unwrapped);
      },
      values: (obj: unknown): unknown[] => {
        const unwrapped = this.unwrapValue(obj) as Record<string, unknown>;
        return Object.values(unwrapped);
      },
      entries: (obj: unknown): [string, unknown][] => {
        const unwrapped = this.unwrapValue(obj) as Record<string, unknown>;
        return Object.entries(unwrapped);
      },
      fromPairs: (pairs: [string, unknown][]): Record<string, unknown> => {
        const result: Record<string, unknown> = {};
        for (const [key, value] of pairs) {
          result[key] = value;
        }
        return result;
      },
      invert: (obj: Record<string, unknown>): Record<string, string> => {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(obj)) {
          result[String(value)] = key;
        }
        return result;
      },
      merge: (...objects: Record<string, unknown>[]): Record<string, unknown> => {
        return Object.assign({}, ...objects);
      },
      defaults: (
        obj: Record<string, unknown>,
        ...sources: Record<string, unknown>[]
      ): Record<string, unknown> => {
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
      size: (collection: unknown[] | Record<string, unknown>): number => {
        return Array.isArray(collection) ? collection.length : Object.keys(collection).length;
      },
      isEmpty: (value: unknown): boolean => {
        if (value == null) return true;
        if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
      },
      includes: (collection: unknown[] | Record<string, unknown>, value: unknown): boolean => {
        if (Array.isArray(collection)) {
          return collection.includes(value);
        }
        return Object.values(collection).includes(value);
      },
      countBy: <T>(arr: T[], keyFn: (item: T) => string): Record<string, number> => {
        return arr.reduce(
          (counts, item) => {
            const key = keyFn(item);
            counts[key] = (counts[key] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>
        );
      },
      keyBy: <T>(arr: T[], keyFn: (item: T) => string): Record<string, T> => {
        return arr.reduce(
          (result, item) => {
            result[keyFn(item)] = item;
            return result;
          },
          {} as Record<string, T>
        );
      },

      // Mathematical/statistical methods
      sum: (arr: unknown): number => {
        const unwrapped = this.unwrapValue(arr) as number[];
        return unwrapped.reduce((sum, num) => sum + num, 0);
      },
      mean: (arr: unknown): number => {
        const unwrapped = this.unwrapValue(arr) as number[];
        return unwrapped.length
          ? unwrapped.reduce((sum, num) => sum + num, 0) / unwrapped.length
          : 0;
      },
      min: (arr: unknown): number => {
        const unwrapped = this.unwrapValue(arr) as number[];
        return Math.min(...unwrapped);
      },
      max: (arr: unknown): number => {
        const unwrapped = this.unwrapValue(arr) as number[];
        return Math.max(...unwrapped);
      },
      minBy: <T>(arr: unknown, keyFn: (item: T) => number): T | undefined => {
        const unwrapped = this.unwrapValue(arr) as T[];
        if (unwrapped.length === 0) return undefined;
        return unwrapped.reduce((min, item) => (keyFn(item) < keyFn(min) ? item : min));
      },
      maxBy: <T>(arr: unknown, keyFn: (item: T) => number): T | undefined => {
        const unwrapped = this.unwrapValue(arr) as T[];
        if (unwrapped.length === 0) return undefined;
        return unwrapped.reduce((max, item) => (keyFn(item) > keyFn(max) ? item : max));
      },

      // String manipulation methods
      camelCase: (str: unknown): string => {
        const unwrapped = this.unwrapValue(str) as string;
        return unwrapped.replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''));
      },
      kebabCase: (str: unknown): string => {
        const unwrapped = this.unwrapValue(str) as string;
        return unwrapped
          .replace(/([a-z])([A-Z])/g, '$1-$2')
          .replace(/[\s_]+/g, '-')
          .toLowerCase();
      },
      snakeCase: (str: unknown): string => {
        const unwrapped = this.unwrapValue(str) as string;
        return unwrapped
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .replace(/[\s-]+/g, '_')
          .toLowerCase();
      },
      startCase: (str: unknown): string => {
        const unwrapped = this.unwrapValue(str) as string;
        return unwrapped
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/[-_\s]+/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      },
      upperFirst: (str: unknown): string => {
        const unwrapped = this.unwrapValue(str) as string;
        return unwrapped.charAt(0).toUpperCase() + unwrapped.slice(1);
      },
      lowerFirst: (str: unknown): string => {
        const unwrapped = this.unwrapValue(str) as string;
        return unwrapped.charAt(0).toLowerCase() + unwrapped.slice(1);
      },
      capitalize: (str: unknown): string => {
        const unwrapped = this.unwrapValue(str) as string;
        return unwrapped.charAt(0).toUpperCase() + unwrapped.slice(1).toLowerCase();
      },

      // Utility methods
      identity: <T>(value: T): T => value,
      constant:
        <T>(value: T): (() => T) =>
        () =>
          value,
      noop: (): void => {},
      times: <T>(n: number, fn: (index: number) => T): T[] =>
        Array.from({ length: n }, (_, i) => fn(i)),
      range: (start: number, end?: number, step?: number): number[] => {
        let actualStart = start;
        let actualEnd = end;
        let actualStep = step;

        if (actualEnd === undefined) {
          actualEnd = actualStart;
          actualStart = 0;
        }
        actualStep = actualStep || 1;

        const result: number[] = [];
        if (actualStep > 0) {
          for (let i = actualStart; i < actualEnd; i += actualStep) {
            result.push(i);
          }
        } else {
          for (let i = actualStart; i > actualEnd; i += actualStep) {
            result.push(i);
          }
        }
        return result;
      },
      clamp: (num: number, min: number, max: number): number => Math.max(min, Math.min(max, num)),
      random: (min = 0, max = 1): number => Math.random() * (max - min) + min,

      // Function utilities
      debounce: <T extends (...args: unknown[]) => unknown>(fn: T, wait: number): T => {
        let timeout: NodeJS.Timeout;
        return ((...args: unknown[]) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => fn(...args), wait);
        }) as T;
      },
      throttle: <T extends (...args: unknown[]) => unknown>(fn: T, wait: number): T => {
        let inThrottle: boolean;
        return ((...args: unknown[]) => {
          if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => {
              inThrottle = false;
            }, wait);
          }
        }) as T;
      },
    };
  }

  private async executeInVMSandbox(
    expression: string,
    context: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.vmSandbox) {
      // Create VM sandbox on demand if not already created
      const vmConfig = this.securityManager.getVMConfig();
      if (!vmConfig) {
        throw new Error('VM configuration not available');
      }
      if (!VMSandboxSimple) {
        throw new Error('VM sandbox not available - isolated-vm module not found');
      }
      this.vmSandbox = new VMSandboxSimple(vmConfig);
    }

    try {
      const vmOptions: VMOptions = {
        timeout: this.securityManager.getTimeout(),
        memoryLimit: this.securityManager.getMemoryLimit(),
        allowedGlobals: this.securityManager.getSecurityContext().level.allowedGlobals,
      };

      const vmContext: VMContext = { ...context };
      const result = await this.vmSandbox.execute(expression, vmContext, vmOptions);
      return result.value;
    } catch (error) {
      // Re-throw VM errors with more context
      if (error instanceof Error) {
        if (error.message.includes('Cannot find module')) {
          throw new Error(
            'isolated-vm package not found. Please install isolated-vm for sandbox support: npm install isolated-vm'
          );
        }
        throw new Error(`VM execution failed: ${error.message}`);
      }
      throw error;
    }
  }
}
