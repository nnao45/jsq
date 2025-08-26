import type { LodashMethods, MethodImplementation } from '../types/common-methods';

/**
 * lodash記法の統一実装
 * VM環境とnon-VM環境の両方で動作する実装を提供
 */

// Helper function to create methods for both VM and non-VM environments
function createMethods<T>(value: T, ctor: any) {
  const methods = {
    _value: value,
    constructor: ctor,
  };

  // Bind all methods from the prototype to the instance with proper context
  const proto = ctor.prototype;
  Object.getOwnPropertyNames(proto).forEach(name => {
    if (name !== 'constructor' && typeof proto[name] === 'function') {
      (methods as any)[name] = proto[name].bind(methods);
    }
  });

  return methods;
}

// 共通のメソッド実装（配列操作）
const arrayMethods = {
  // 基本的な配列操作
  filter<T>(arr: T[], predicate: (value: T, index: number, array: T[]) => boolean): T[] {
    return arr.filter(predicate);
  },

  map<T, U>(arr: T[], mapper: (value: T, index: number, array: T[]) => U): U[] {
    return arr.map(mapper);
  },

  find<T>(arr: T[], predicate: (value: T, index: number, array: T[]) => boolean): T | undefined {
    return arr.find(predicate);
  },

  findIndex<T>(arr: T[], predicate: (value: T, index: number, array: T[]) => boolean): number {
    return arr.findIndex(predicate);
  },

  reduce<T, U>(
    arr: T[],
    reducer: (acc: U, value: T, index: number, array: T[]) => U,
    initial?: U
  ): U {
    return initial !== undefined ? arr.reduce(reducer, initial) : arr.reduce(reducer as any);
  },

  // 高度な配列操作
  where<T>(arr: T[], properties: Partial<T>): T[] {
    return arr.filter(item => {
      if (typeof item !== 'object' || item === null) return false;
      return Object.entries(properties).every(([key, value]) => (item as any)[key] === value);
    });
  },

  pluck<T, K extends keyof T>(arr: T[], key: K): Array<T[K]> {
    return arr
      .map(item => {
        if (typeof item === 'object' && item !== null && key in item) {
          return item[key];
        }
        return undefined;
      })
      .filter((val): val is T[K] => val !== undefined);
  },

  sortBy<T>(arr: T[], keyFn: keyof T | ((item: T) => number | string)): T[] {
    return [...arr].sort((a, b) => {
      const aVal = typeof keyFn === 'function' ? keyFn(a) : (a as any)[keyFn];
      const bVal = typeof keyFn === 'function' ? keyFn(b) : (b as any)[keyFn];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }
      return 0;
    });
  },

  orderBy<T>(arr: T[], keys: (keyof T | ((item: T) => any))[], orders?: ('asc' | 'desc')[]): T[] {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    const ordersArray = Array.isArray(orders)
      ? orders
      : orders
        ? [orders]
        : keysArray.map(() => 'asc' as const);

    return [...arr].sort((a, b) => {
      for (let i = 0; i < keysArray.length; i++) {
        const key = keysArray[i];
        const order = ordersArray[i] || 'asc';

        const aVal = typeof key === 'function' ? key(a) : (a as any)[key];
        const bVal = typeof key === 'function' ? key(b) : (b as any)[key];

        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        }

        if (comparison !== 0) {
          return order === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  },

  groupBy<T>(arr: T[], keyFn: keyof T | ((item: T) => string)): Record<string, T[]> {
    return arr.reduce(
      (groups, item) => {
        const key = typeof keyFn === 'function' ? keyFn(item) : String((item as any)[keyFn]);

        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(item);
        return groups;
      },
      {} as Record<string, T[]>
    );
  },

  countBy<T>(arr: T[], keyFn: keyof T | ((item: T) => string)): Record<string, number> {
    return arr.reduce(
      (counts, item) => {
        const key = typeof keyFn === 'function' ? keyFn(item) : String((item as any)[keyFn]);
        counts[key] = (counts[key] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );
  },

  keyBy<T>(arr: T[], keyFn: keyof T | ((item: T) => string)): Record<string, T> {
    return arr.reduce(
      (obj, item) => {
        const key = typeof keyFn === 'function' ? keyFn(item) : String((item as any)[keyFn]);
        obj[key] = item;
        return obj;
      },
      {} as Record<string, T>
    );
  },

  // セレクタ系
  take<T>(arr: T[], n: number): T[] {
    return arr.slice(0, n);
  },

  takeWhile<T>(arr: T[], predicate: (value: T, index: number, array: T[]) => boolean): T[] {
    const result: T[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (!predicate(arr[i], i, arr)) break;
      result.push(arr[i]);
    }
    return result;
  },

  drop<T>(arr: T[], n: number): T[] {
    return arr.slice(n);
  },

  dropWhile<T>(arr: T[], predicate: (value: T, index: number, array: T[]) => boolean): T[] {
    let dropIndex = 0;
    for (let i = 0; i < arr.length; i++) {
      if (!predicate(arr[i], i, arr)) break;
      dropIndex++;
    }
    return arr.slice(dropIndex);
  },

  // ユニーク・サンプリング
  uniq<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  },

  uniqBy<T>(arr: T[], keyFn: keyof T | ((item: T) => unknown)): T[] {
    const seen = new Set<unknown>();
    return arr.filter(item => {
      const key = typeof keyFn === 'function' ? keyFn(item) : (item as any)[keyFn];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  sample<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined;
  },

  sampleSize<T>(arr: T[], n: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, arr.length));
  },

  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },

  // 変換系
  flatten<T>(arr: (T | T[])[]): T[] {
    return arr.reduce<T[]>((acc, val) => acc.concat(Array.isArray(val) ? val : [val]), []);
  },

  flattenDeep<T>(arr: any[]): T[] {
    const flattenDeep = (arr: any[]): T[] =>
      arr.reduce(
        (acc: T[], val: any) =>
          Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val),
        []
      );
    return flattenDeep(arr);
  },

  compact<T>(arr: T[]): T[] {
    return arr.filter(Boolean) as T[];
  },

  chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },

  reverse<T>(arr: T[]): T[] {
    return arr.reverse();
  },

  // 数学・統計系
  sum(arr: (number | unknown)[]): number {
    return arr.reduce((sum: number, val: unknown) => {
      const num = typeof val === 'number' ? val : 0;
      return sum + num;
    }, 0);
  },

  mean(arr: (number | unknown)[]): number {
    const nums = arr.filter((n): n is number => typeof n === 'number');
    return nums.length ? nums.reduce((sum, n) => sum + n, 0) / nums.length : NaN;
  },

  min(arr: (number | unknown)[]): number | undefined {
    const nums = arr.filter((n): n is number => typeof n === 'number');
    return nums.length > 0 ? Math.min(...nums) : undefined;
  },

  max(arr: (number | unknown)[]): number | undefined {
    const nums = arr.filter((n): n is number => typeof n === 'number');
    return nums.length > 0 ? Math.max(...nums) : undefined;
  },

  minBy<T>(arr: T[], keyFn: keyof T | ((item: T) => number)): T | undefined {
    if (arr.length === 0) return undefined;

    return arr.reduce((min, item) => {
      const minVal = typeof keyFn === 'function' ? keyFn(min) : (min as any)[keyFn];
      const itemVal = typeof keyFn === 'function' ? keyFn(item) : (item as any)[keyFn];

      if (typeof minVal === 'number' && typeof itemVal === 'number') {
        return itemVal < minVal ? item : min;
      }
      return min;
    });
  },

  maxBy<T>(arr: T[], keyFn: keyof T | ((item: T) => number)): T | undefined {
    if (arr.length === 0) return undefined;

    return arr.reduce((max, item) => {
      const maxVal = typeof keyFn === 'function' ? keyFn(max) : (max as any)[keyFn];
      const itemVal = typeof keyFn === 'function' ? keyFn(item) : (item as any)[keyFn];

      if (typeof maxVal === 'number' && typeof itemVal === 'number') {
        return itemVal > maxVal ? item : max;
      }
      return max;
    });
  },

  // ユーティリティ
  size<T>(collection: T[] | Record<string, unknown> | string): number {
    if (Array.isArray(collection)) return collection.length;
    if (typeof collection === 'string') return collection.length;
    if (typeof collection === 'object' && collection !== null) {
      return Object.keys(collection).length;
    }
    return 0;
  },

  isEmpty<T>(collection: T[] | Record<string, unknown> | string | null | undefined): boolean {
    if (collection == null) return true;
    if (Array.isArray(collection) || typeof collection === 'string') {
      return collection.length === 0;
    }
    if (typeof collection === 'object') {
      return Object.keys(collection).length === 0;
    }
    return true;
  },

  includes<T>(
    collection: T[] | string | Record<string, unknown>,
    value: T | string | unknown,
    fromIndex?: number
  ): boolean {
    if (Array.isArray(collection)) {
      return collection.includes(value as T, fromIndex);
    }
    if (typeof collection === 'string' && typeof value === 'string') {
      return collection.includes(value, fromIndex);
    }
    if (typeof collection === 'object' && collection !== null) {
      return Object.values(collection).includes(value);
    }
    return false;
  },
};

// オブジェクト操作メソッド
const objectMethods = {
  pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    return result;
  },

  omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
    const result = { ...obj };
    for (const key of keys) {
      delete result[key];
    }
    return result as Omit<T, K>;
  },

  keys<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
    return Object.keys(obj) as (keyof T)[];
  },

  values<T extends Record<string, unknown>>(obj: T): T[keyof T][] {
    return Object.values(obj);
  },

  entries<T extends Record<string, unknown>>(obj: T): [keyof T, T[keyof T]][] {
    return Object.entries(obj) as [keyof T, T[keyof T]][];
  },

  fromPairs<T = unknown>(pairs: [string, T][]): Record<string, T> {
    return pairs.reduce(
      (obj, [key, value]) => {
        obj[key] = value;
        return obj;
      },
      {} as Record<string, T>
    );
  },

  invert<T extends Record<string, string | number>>(obj: T): Record<string, keyof T> {
    const result: Record<string, keyof T> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[String(value)] = key as keyof T;
    }
    return result;
  },

  merge<T extends Record<string, unknown>>(...objects: Partial<T>[]): T {
    return Object.assign({}, ...objects) as T;
  },

  defaults<T extends Record<string, unknown>>(obj: T, ...sources: Partial<T>[]): T {
    const result = { ...obj };
    for (const source of sources) {
      if (source && typeof source === 'object') {
        for (const [key, value] of Object.entries(source)) {
          if (!(key in result)) {
            (result as any)[key] = value;
          }
        }
      }
    }
    return result;
  },
};

// 文字列操作メソッド
const stringMethods = {
  camelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/^./, chr => chr.toLowerCase());
  },

  kebabCase(str: string): string {
    return (
      str
        // Insert hyphens before uppercase letters that follow lowercase letters
        .replace(/([a-z\d])([A-Z])/g, '$1-$2')
        // Insert hyphens between multiple uppercase letters
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        // Replace spaces, underscores, etc. with hyphens
        .replace(/[\s_]+/g, '-')
        // Remove non-alphanumeric characters except hyphens
        .replace(/[^a-zA-Z0-9-]+/g, '')
        // Remove multiple consecutive hyphens
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-|-$/g, '')
        .toLowerCase()
    );
  },

  snakeCase(str: string): string {
    return (
      str
        // Insert underscores before uppercase letters that follow lowercase letters
        .replace(/([a-z\d])([A-Z])/g, '$1_$2')
        // Insert underscores between multiple uppercase letters
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        // Replace spaces, hyphens, etc. with underscores
        .replace(/[\s-]+/g, '_')
        // Remove non-alphanumeric characters except underscores
        .replace(/[^a-zA-Z0-9_]+/g, '')
        // Remove multiple consecutive underscores
        .replace(/_+/g, '_')
        // Remove leading/trailing underscores
        .replace(/^_|_$/g, '')
        .toLowerCase()
    );
  },

  startCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  upperFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  lowerFirst(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  },

  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
};

// ユーティリティメソッド
const utilityMethods = {
  identity<T>(value: T): T {
    return value;
  },

  constant<T>(value: T): () => T {
    return () => value;
  },

  noop(): void {
    // Do nothing
  },

  times<T>(n: number, iteratee: (index: number) => T): T[] {
    const result: T[] = [];
    for (let i = 0; i < n; i++) {
      result.push(iteratee(i));
    }
    return result;
  },

  range(start: number, end?: number, step?: number): number[] {
    if (end === undefined) {
      end = start;
      start = 0;
    }
    if (step === undefined) {
      step = start < end ? 1 : -1;
    }

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

  clamp(number: number, lower: number, upper: number): number {
    return Math.max(lower, Math.min(upper, number));
  },

  random(lower: number = 0, upper: number = 1, floating?: boolean): number {
    if (floating || lower % 1 || upper % 1) {
      const rand = Math.random();
      return lower + rand * (upper - lower);
    }
    return lower + Math.floor(Math.random() * (upper - lower + 1));
  },
};

// 関数ユーティリティ
const functionMethods = {
  debounce<T extends (...args: any[]) => any>(func: T, wait: number): T & { cancel: () => void } {
    let timeoutId: NodeJS.Timeout | null = null;

    const debounced = ((...args: Parameters<T>) => {
      if (timeoutId) clearTimeout(timeoutId);

      return new Promise(resolve => {
        timeoutId = setTimeout(() => {
          timeoutId = null;
          resolve(func(...args));
        }, wait);
      });
    }) as T & { cancel: () => void };

    debounced.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    return debounced;
  },

  throttle<T extends (...args: any[]) => any>(func: T, wait: number): T & { cancel: () => void } {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastCallTime = 0;

    const throttled = ((...args: Parameters<T>) => {
      const now = Date.now();
      const remaining = wait - (now - lastCallTime);

      if (remaining <= 0) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        lastCallTime = now;
        return func(...args);
      }

      if (!timeoutId) {
        return new Promise(resolve => {
          timeoutId = setTimeout(() => {
            lastCallTime = Date.now();
            timeoutId = null;
            resolve(func(...args));
          }, remaining);
        });
      }
    }) as T & { cancel: () => void };

    throttled.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCallTime = 0;
    };

    return throttled;
  },
};

// チェーン可能なラッパークラス
class LodashChain<T> {
  constructor(private _value: T) {}

  // Chainable array methods
  map<U>(
    iteratee: (value: T extends (infer E)[] ? E : never, index: number) => U
  ): LodashChain<U[]> {
    if (Array.isArray(this._value)) {
      return new LodashChain(arrayMethods.map(this._value, iteratee as any));
    }
    return new LodashChain([] as U[]);
  }

  filter(
    predicate: (value: T extends (infer E)[] ? E : never, index: number) => boolean
  ): LodashChain<T> {
    if (Array.isArray(this._value)) {
      return new LodashChain(arrayMethods.filter(this._value, predicate as any) as T);
    }
    return new LodashChain([] as T);
  }

  sortBy(
    keyFn:
      | keyof (T extends (infer E)[] ? E : never)
      | ((item: T extends (infer E)[] ? E : never) => number | string)
  ): LodashChain<T> {
    if (Array.isArray(this._value)) {
      return new LodashChain(arrayMethods.sortBy(this._value, keyFn as any) as T);
    }
    return new LodashChain([] as T);
  }

  take(n: number): LodashChain<T> {
    if (Array.isArray(this._value)) {
      return new LodashChain(arrayMethods.take(this._value, n) as T);
    }
    return new LodashChain([] as T);
  }

  // ... 他のチェーン可能なメソッドも同様に実装

  value(): T {
    return this._value;
  }
}

/**
 * lodashユーティリティの実装
 */
export class LodashUtilities implements MethodImplementation<LodashMethods<unknown>> {
  // Expose all methods
  filter = arrayMethods.filter;
  map = arrayMethods.map;
  find = arrayMethods.find;
  reduce = arrayMethods.reduce;
  where = arrayMethods.where;
  pluck = arrayMethods.pluck;
  sortBy = arrayMethods.sortBy;
  orderBy = arrayMethods.orderBy;
  groupBy = arrayMethods.groupBy;
  countBy = arrayMethods.countBy;
  keyBy = arrayMethods.keyBy;
  take = arrayMethods.take;
  skip = arrayMethods.drop;
  takeWhile = arrayMethods.takeWhile;
  dropWhile = arrayMethods.dropWhile;
  uniqBy = arrayMethods.uniqBy;
  sample = arrayMethods.sample;
  sampleSize = arrayMethods.sampleSize;
  shuffle = arrayMethods.shuffle;
  flatten = arrayMethods.flatten;
  flattenDeep = arrayMethods.flattenDeep;
  compact = arrayMethods.compact;
  chunk = arrayMethods.chunk;
  reverse = arrayMethods.reverse;
  sum = arrayMethods.sum;
  mean = arrayMethods.mean;
  min = arrayMethods.min;
  max = arrayMethods.max;
  minBy = arrayMethods.minBy;
  maxBy = arrayMethods.maxBy;
  size = arrayMethods.size;
  isEmpty = arrayMethods.isEmpty;
  includes = arrayMethods.includes;
  entries = objectMethods.entries;
  keys = objectMethods.keys;
  values = objectMethods.values;
  pick = objectMethods.pick;
  omit = objectMethods.omit;
  invert = objectMethods.invert;
  merge = objectMethods.merge;
  defaults = objectMethods.defaults;
  camelCase = stringMethods.camelCase;
  kebabCase = stringMethods.kebabCase;
  snakeCase = stringMethods.snakeCase;
  startCase = stringMethods.startCase;
  upperFirst = stringMethods.upperFirst;
  lowerFirst = stringMethods.lowerFirst;
  capitalize = stringMethods.capitalize;
  identity = utilityMethods.identity;
  constant = utilityMethods.constant;
  noop = utilityMethods.noop;
  times = utilityMethods.times;
  range = utilityMethods.range;
  clamp = utilityMethods.clamp;
  random = utilityMethods.random;
  debounce = functionMethods.debounce;
  throttle = functionMethods.throttle;
  fromPairs = objectMethods.fromPairs;

  // Additional array methods not in common interface but in lodash
  findIndex = arrayMethods.findIndex;
  uniq = arrayMethods.uniq;
  drop = arrayMethods.drop;

  // Chain method
  chain<T>(value: T): LodashChain<T> {
    return new LodashChain(value);
  }
}

/**
 * VM環境用のlodashユーティリティコード
 */
export const createVMLodashCode = `
globalThis._ = {
  // Array methods
  filter: ${arrayMethods.filter.toString()},
  map: ${arrayMethods.map.toString()},
  find: ${arrayMethods.find.toString()},
  findIndex: ${arrayMethods.findIndex.toString()},
  reduce: ${arrayMethods.reduce.toString()},
  where: ${arrayMethods.where.toString()},
  pluck: ${arrayMethods.pluck.toString()},
  sortBy: ${arrayMethods.sortBy.toString()},
  orderBy: ${arrayMethods.orderBy.toString()},
  groupBy: ${arrayMethods.groupBy.toString()},
  countBy: ${arrayMethods.countBy.toString()},
  keyBy: ${arrayMethods.keyBy.toString()},
  take: ${arrayMethods.take.toString()},
  takeWhile: ${arrayMethods.takeWhile.toString()},
  drop: ${arrayMethods.drop.toString()},
  dropWhile: ${arrayMethods.dropWhile.toString()},
  uniq: ${arrayMethods.uniq.toString()},
  uniqBy: ${arrayMethods.uniqBy.toString()},
  sample: ${arrayMethods.sample.toString()},
  sampleSize: ${arrayMethods.sampleSize.toString()},
  shuffle: ${arrayMethods.shuffle.toString()},
  flatten: ${arrayMethods.flatten.toString()},
  flattenDeep: ${arrayMethods.flattenDeep.toString()},
  compact: ${arrayMethods.compact.toString()},
  chunk: ${arrayMethods.chunk.toString()},
  reverse: ${arrayMethods.reverse.toString()},
  sum: ${arrayMethods.sum.toString()},
  mean: ${arrayMethods.mean.toString()},
  min: ${arrayMethods.min.toString()},
  max: ${arrayMethods.max.toString()},
  minBy: ${arrayMethods.minBy.toString()},
  maxBy: ${arrayMethods.maxBy.toString()},
  size: ${arrayMethods.size.toString()},
  isEmpty: ${arrayMethods.isEmpty.toString()},
  includes: ${arrayMethods.includes.toString()},
  
  // Object methods
  pick: ${objectMethods.pick.toString()},
  omit: ${objectMethods.omit.toString()},
  keys: ${objectMethods.keys.toString()},
  values: ${objectMethods.values.toString()},
  entries: ${objectMethods.entries.toString()},
  fromPairs: ${objectMethods.fromPairs.toString()},
  invert: ${objectMethods.invert.toString()},
  merge: ${objectMethods.merge.toString()},
  defaults: ${objectMethods.defaults.toString()},
  
  // String methods
  camelCase: ${stringMethods.camelCase.toString()},
  kebabCase: ${stringMethods.kebabCase.toString()},
  snakeCase: ${stringMethods.snakeCase.toString()},
  startCase: ${stringMethods.startCase.toString()},
  upperFirst: ${stringMethods.upperFirst.toString()},
  lowerFirst: ${stringMethods.lowerFirst.toString()},
  capitalize: ${stringMethods.capitalize.toString()},
  
  // Utility methods
  identity: ${utilityMethods.identity.toString()},
  constant: ${utilityMethods.constant.toString()},
  noop: ${utilityMethods.noop.toString()},
  times: ${utilityMethods.times.toString()},
  range: ${utilityMethods.range.toString()},
  clamp: ${utilityMethods.clamp.toString()},
  random: ${utilityMethods.random.toString()},
  
  // Chain method
  chain: function(value) {
    const wrapped = {
      __value: value,
      map: function(fn) {
        this.__value = globalThis._.map(this.__value, fn);
        return this;
      },
      filter: function(fn) {
        this.__value = globalThis._.filter(this.__value, fn);
        return this;
      },
      sortBy: function(fn) {
        this.__value = globalThis._.sortBy(this.__value, fn);
        return this;
      },
      take: function(n) {
        this.__value = globalThis._.take(this.__value, n);
        return this;
      },
      value: function() {
        return this.__value;
      }
    };
    return wrapped;
  }
};
`;

// Create LodashDollar class for runtime usage (similar to SmartDollar)
class LodashDollar<T> {
  _value: T;
  value: T;
  __isLodashDollar = true;

  constructor(value: T) {
    this._value = value;
    this.value = value;
  }

  // All methods will be attached dynamically
  [key: string]: any;
}

// Attach all lodash methods to LodashDollar prototype
const lodashMethods = {
  ...arrayMethods,
  ...objectMethods,
  ...stringMethods,
  ...utilityMethods,
  // Add chainable wrapper
  chain() {
    return this;
  },
  value() {
    this.value = this._value;
    return this._value;
  },
  valueOf() {
    return this._value;
  },
};

// Apply methods to prototype
Object.entries(lodashMethods).forEach(([name, method]) => {
  (LodashDollar.prototype as any)[name] = function (...args: any[]) {
    const result = method.call(this, ...args);
    // If the method returns an array or object, wrap it in LodashDollar
    if (
      result !== undefined &&
      result !== null &&
      (Array.isArray(result) || typeof result === 'object')
    ) {
      if (result instanceof LodashDollar) {
        return result;
      }
      // Check if this is a method that should return raw value
      const rawValueMethods = [
        'find',
        'sample',
        'min',
        'max',
        'minBy',
        'maxBy',
        'sum',
        'mean',
        'size',
        'clamp',
        'random',
        'isEmpty',
        'includes',
        'some',
        'every',
        'indexOf',
        'lastIndexOf',
        'findIndex',
      ];
      if (rawValueMethods.includes(name)) {
        return result;
      }
      return new LodashDollar(result);
    }
    return result;
  };
});

// Export createLodashDollar function for VM environment
export function createLodashDollar<T>(value: T) {
  if (typeof globalThis !== 'undefined' && globalThis.LodashDollar) {
    return new globalThis.LodashDollar(value);
  }
  return createMethods(value, LodashDollar);
}

// デフォルトエクスポート
const _ = new LodashUtilities();
export default _;
