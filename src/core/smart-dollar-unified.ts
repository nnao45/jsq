import { SmartDollarMethods, MethodImplementation } from '../types/common-methods';
import { asyncMethods } from './async-methods';

/**
 * $記法の統一実装
 * VM環境とnon-VM環境の両方で動作する実装を提供
 */

// 共通のメソッド実装
const commonMethods = {
  // 基本的な配列操作
  filter(data: unknown[], predicate: (value: unknown, index: number, array: unknown[]) => boolean) {
    return data.filter(predicate);
  },
  
  map<U>(data: unknown[], mapper: (value: unknown, index: number, array: unknown[]) => U) {
    return data.map(mapper);
  },
  
  find(data: unknown[], predicate: (value: unknown, index: number, array: unknown[]) => boolean) {
    return data.find(predicate);
  },
  
  reduce<U>(data: unknown[], reducer: (acc: U, value: unknown, index: number, array: unknown[]) => U, initial?: U) {
    return initial !== undefined ? data.reduce(reducer, initial) : data.reduce(reducer as any);
  },
  
  // 高度な配列操作
  where(data: unknown[], properties: Record<string, unknown>) {
    return data.filter(item => {
      if (typeof item !== 'object' || item === null) return false;
      return Object.entries(properties).every(([key, value]) => 
        (item as Record<string, unknown>)[key] === value
      );
    });
  },
  
  pluck(data: unknown[], key: string) {
    return data
      .map(item => {
        if (typeof item === 'object' && item !== null && key in item) {
          return (item as Record<string, unknown>)[key];
        }
        return undefined;
      })
      .filter(val => val !== undefined);
  },
  
  sortBy(data: unknown[], key: string | ((item: unknown) => unknown)) {
    return [...data].sort((a, b) => {
      let aVal: unknown, bVal: unknown;
      
      if (typeof key === 'function') {
        aVal = key(a);
        bVal = key(b);
      } else if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
        aVal = (a as Record<string, unknown>)[key];
        bVal = (b as Record<string, unknown>)[key];
      } else {
        return 0;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }
      return 0;
    });
  },
  
  orderBy(data: unknown[], keys: string | string[] | ((item: unknown) => unknown) | ((item: unknown) => unknown)[], orders?: ('asc' | 'desc') | ('asc' | 'desc')[]) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    const ordersArray = Array.isArray(orders) ? orders : orders ? [orders] : keysArray.map(() => 'asc' as const);
    
    return [...data].sort((a, b) => {
      for (let i = 0; i < keysArray.length; i++) {
        const key = keysArray[i];
        const order = ordersArray[i] || 'asc';
        
        let aVal: unknown, bVal: unknown;
        
        if (typeof key === 'function') {
          aVal = key(a);
          bVal = key(b);
        } else if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
          aVal = (a as Record<string, unknown>)[key];
          bVal = (b as Record<string, unknown>)[key];
        } else {
          continue;
        }
        
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
  
  groupBy(data: unknown[], key: string | ((item: unknown) => unknown)) {
    return data.reduce((acc, item) => {
      const groupKey = typeof key === 'function' 
        ? key(item) 
        : (typeof item === 'object' && item !== null ? (item as Record<string, unknown>)[key] : undefined);
      const groupKeyStr = String(groupKey);
      
      if (!acc[groupKeyStr]) {
        acc[groupKeyStr] = [];
      }
      acc[groupKeyStr].push(item);
      return acc;
    }, {} as Record<string, unknown[]>);
  },
  
  countBy(data: unknown[], key: string | ((item: unknown) => unknown)) {
    return data.reduce((acc, item) => {
      const countKey = typeof key === 'function'
        ? key(item)
        : (typeof item === 'object' && item !== null ? (item as Record<string, unknown>)[key] : undefined);
      const countKeyStr = String(countKey);
      
      acc[countKeyStr] = (acc[countKeyStr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  },
  
  keyBy(data: unknown[], key: string | ((item: unknown) => unknown)) {
    return data.reduce((acc, item) => {
      const keyValue = typeof key === 'function'
        ? key(item)
        : (typeof item === 'object' && item !== null ? (item as Record<string, unknown>)[key] : undefined);
      if (keyValue !== undefined) {
        acc[String(keyValue)] = item;
      }
      return acc;
    }, {} as Record<string, unknown>);
  },
  
  // セレクタ系
  take(data: unknown[], n: number) {
    return data.slice(0, n);
  },
  
  skip(data: unknown[], n: number) {
    return data.slice(n);
  },
  
  takeWhile(data: unknown[], predicate: (value: unknown, index: number, array: unknown[]) => boolean) {
    const result: unknown[] = [];
    for (let i = 0; i < data.length; i++) {
      if (!predicate(data[i], i, data)) break;
      result.push(data[i]);
    }
    return result;
  },
  
  dropWhile(data: unknown[], predicate: (value: unknown, index: number, array: unknown[]) => boolean) {
    let dropIndex = 0;
    for (let i = 0; i < data.length; i++) {
      if (!predicate(data[i], i, data)) break;
      dropIndex++;
    }
    return data.slice(dropIndex);
  },
  
  // ユニーク・サンプリング
  uniqBy(data: unknown[], key: string | ((item: unknown) => unknown)) {
    const seen = new Set<unknown>();
    return data.filter(item => {
      const keyValue = typeof key === 'function'
        ? key(item)
        : (typeof item === 'object' && item !== null ? (item as Record<string, unknown>)[key] : undefined);
      
      if (seen.has(keyValue)) return false;
      seen.add(keyValue);
      return true;
    });
  },
  
  sample(data: unknown[]) {
    return data.length > 0 ? data[Math.floor(Math.random() * data.length)] : undefined;
  },
  
  sampleSize(data: unknown[], n: number) {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  },
  
  shuffle(data: unknown[]) {
    return [...data].sort(() => Math.random() - 0.5);
  },
  
  // 変換系
  flatten(data: unknown[]) {
    return data.flat();
  },
  
  flattenDeep(data: unknown[]) {
    const flattenDeep = (arr: unknown[]): unknown[] =>
      arr.reduce(
        (acc: unknown[], val: unknown) =>
          Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val),
        []
      );
    return flattenDeep(data);
  },
  
  compact(data: unknown[]) {
    return data.filter(Boolean);
  },
  
  chunk(data: unknown[], size: number) {
    const result: unknown[][] = [];
    for (let i = 0; i < data.length; i += size) {
      result.push(data.slice(i, i + size));
    }
    return result;
  },
  
  reverse(data: unknown[]) {
    return [...data].reverse();
  },
  
  // 数学・統計系
  sum(data: unknown[]) {
    return data.reduce((acc: number, val: unknown) => {
      const num = typeof val === 'number' ? val : 0;
      return acc + num;
    }, 0);
  },
  
  mean(data: unknown[]) {
    if (data.length === 0) return 0;
    return commonMethods.sum(data) / data.length;
  },
  
  min(data: unknown[]) {
    return data.length > 0 ? Math.min(...data.filter(v => typeof v === 'number') as number[]) : undefined;
  },
  
  max(data: unknown[]) {
    return data.length > 0 ? Math.max(...data.filter(v => typeof v === 'number') as number[]) : undefined;
  },
  
  minBy(data: unknown[], key: string | ((item: unknown) => unknown)) {
    if (data.length === 0) return undefined;
    
    return data.reduce((min, item) => {
      const minVal = typeof key === 'function'
        ? key(min)
        : (typeof min === 'object' && min !== null ? (min as Record<string, unknown>)[key] : undefined);
      const itemVal = typeof key === 'function'
        ? key(item)
        : (typeof item === 'object' && item !== null ? (item as Record<string, unknown>)[key] : undefined);
      
      if (typeof minVal === 'number' && typeof itemVal === 'number') {
        return itemVal < minVal ? item : min;
      }
      return min;
    });
  },
  
  maxBy(data: unknown[], key: string | ((item: unknown) => unknown)) {
    if (data.length === 0) return undefined;
    
    return data.reduce((max, item) => {
      const maxVal = typeof key === 'function'
        ? key(max)
        : (typeof max === 'object' && max !== null ? (max as Record<string, unknown>)[key] : undefined);
      const itemVal = typeof key === 'function'
        ? key(item)
        : (typeof item === 'object' && item !== null ? (item as Record<string, unknown>)[key] : undefined);
      
      if (typeof maxVal === 'number' && typeof itemVal === 'number') {
        return itemVal > maxVal ? item : max;
      }
      return max;
    });
  },
  
  // ユーティリティ
  size(data: unknown[]) {
    return data.length;
  },
  
  isEmpty(data: unknown[]) {
    return data.length === 0;
  },
  
  includes(data: unknown[], value: unknown) {
    return data.includes(value);
  },
  
  // オブジェクト系
  entries(data: unknown[]) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      return Object.entries(data[0]);
    }
    return [];
  },
  
  keys(data: unknown[]) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      return Object.keys(data[0]);
    }
    return [];
  },
  
  values(data: unknown[]) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      return Object.values(data[0]);
    }
    return [];
  }
};

/**
 * ChainableWrapper - non-VM環境用の実装
 */
export class ChainableWrapper implements MethodImplementation<SmartDollarMethods<unknown>> {
  private data: unknown;
  private static methodCache = new WeakMap<ChainableWrapper, Map<string, Function>>();

  constructor(data: unknown) {
    this.data = data;
    
    // プロキシを使用してプロパティアクセスを有効化
    // biome-ignore lint/correctness/noConstructorReturn: Proxy pattern
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) {
          const value = Reflect.get(target, prop, receiver);
          if (typeof value === 'function') {
            let cache = ChainableWrapper.methodCache.get(target);
            if (!cache) {
              cache = new Map();
              ChainableWrapper.methodCache.set(target, cache);
            }
            
            const propStr = String(prop);
            let boundMethod = cache.get(propStr);
            if (!boundMethod) {
              boundMethod = value.bind(target);
              cache.set(propStr, boundMethod);
            }
            return boundMethod;
          }
          return value;
        }
        
        // データプロパティアクセス
        if (typeof prop === 'string' && target.isObject(target.data) && prop in target.data) {
          return new ChainableWrapper((target.data as Record<string, unknown>)[prop]);
        }
        
        return new ChainableWrapper(undefined);
      },
    });
  }
  
  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
  
  private isArray(): boolean {
    return Array.isArray(this.data);
  }
  
  // SmartDollarMethods implementation
  filter(predicate: (value: unknown, index: number, array: unknown[]) => boolean): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.filter(this.data as unknown[], predicate));
    }
    return new ChainableWrapper([]);
  }
  
  map<U>(mapper: (value: unknown, index: number, array: unknown[]) => U): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.map(this.data as unknown[], mapper));
    }
    return new ChainableWrapper([]);
  }
  
  find(predicate: (value: unknown, index: number, array: unknown[]) => boolean): unknown {
    if (this.isArray()) {
      return commonMethods.find(this.data as unknown[], predicate);
    }
    return undefined;
  }
  
  reduce<U>(reducer: (acc: U, value: unknown, index: number, array: unknown[]) => U, initial?: U): U {
    if (this.isArray()) {
      return commonMethods.reduce(this.data as unknown[], reducer, initial);
    }
    return initial as U;
  }
  
  where(properties: Record<string, unknown>): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.where(this.data as unknown[], properties));
    }
    return new ChainableWrapper([]);
  }
  
  pluck(key: string): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.pluck(this.data as unknown[], key));
    }
    return new ChainableWrapper([]);
  }
  
  sortBy(key: string | ((item: unknown) => unknown)): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.sortBy(this.data as unknown[], key));
    }
    return new ChainableWrapper([]);
  }
  
  orderBy(keys: string | string[] | ((item: unknown) => unknown) | ((item: unknown) => unknown)[], orders?: ('asc' | 'desc') | ('asc' | 'desc')[]): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.orderBy(this.data as unknown[], keys, orders));
    }
    return new ChainableWrapper([]);
  }
  
  groupBy(key: string | ((item: unknown) => unknown)): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.groupBy(this.data as unknown[], key));
    }
    return new ChainableWrapper({});
  }
  
  countBy(key: string | ((item: unknown) => unknown)): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.countBy(this.data as unknown[], key));
    }
    return new ChainableWrapper({});
  }
  
  keyBy(key: string | ((item: unknown) => unknown)): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.keyBy(this.data as unknown[], key));
    }
    return new ChainableWrapper({});
  }
  
  take(n: number): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.take(this.data as unknown[], n));
    }
    return new ChainableWrapper([]);
  }
  
  skip(n: number): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.skip(this.data as unknown[], n));
    }
    return new ChainableWrapper([]);
  }
  
  takeWhile(predicate: (value: unknown, index: number, array: unknown[]) => boolean): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.takeWhile(this.data as unknown[], predicate));
    }
    return new ChainableWrapper([]);
  }
  
  dropWhile(predicate: (value: unknown, index: number, array: unknown[]) => boolean): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.dropWhile(this.data as unknown[], predicate));
    }
    return new ChainableWrapper([]);
  }
  
  uniqBy(key: string | ((item: unknown) => unknown)): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.uniqBy(this.data as unknown[], key));
    }
    return new ChainableWrapper([]);
  }
  
  sample(): unknown {
    if (this.isArray()) {
      return commonMethods.sample(this.data as unknown[]);
    }
    return undefined;
  }
  
  sampleSize(n: number): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.sampleSize(this.data as unknown[], n));
    }
    return new ChainableWrapper([]);
  }
  
  shuffle(): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.shuffle(this.data as unknown[]));
    }
    return new ChainableWrapper([]);
  }
  
  flatten(): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.flatten(this.data as unknown[]));
    }
    return new ChainableWrapper([]);
  }
  
  flattenDeep(): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.flattenDeep(this.data as unknown[]));
    }
    return new ChainableWrapper([]);
  }
  
  compact(): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.compact(this.data as unknown[]));
    }
    return new ChainableWrapper([]);
  }
  
  chunk(size: number): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.chunk(this.data as unknown[], size));
    }
    return new ChainableWrapper([]);
  }
  
  reverse(): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.reverse(this.data as unknown[]));
    }
    return new ChainableWrapper([]);
  }
  
  sum(): number {
    if (this.isArray()) {
      return commonMethods.sum(this.data as unknown[]);
    }
    return 0;
  }
  
  mean(): number {
    if (this.isArray()) {
      return commonMethods.mean(this.data as unknown[]);
    }
    return 0;
  }
  
  min(): unknown {
    if (this.isArray()) {
      return commonMethods.min(this.data as unknown[]);
    }
    return undefined;
  }
  
  max(): unknown {
    if (this.isArray()) {
      return commonMethods.max(this.data as unknown[]);
    }
    return undefined;
  }
  
  minBy(key: string | ((item: unknown) => unknown)): unknown {
    if (this.isArray()) {
      return commonMethods.minBy(this.data as unknown[], key);
    }
    return undefined;
  }
  
  maxBy(key: string | ((item: unknown) => unknown)): unknown {
    if (this.isArray()) {
      return commonMethods.maxBy(this.data as unknown[], key);
    }
    return undefined;
  }
  
  size(): number {
    if (this.isArray()) {
      return commonMethods.size(this.data as unknown[]);
    }
    return 0;
  }
  
  isEmpty(): boolean {
    if (this.isArray()) {
      return commonMethods.isEmpty(this.data as unknown[]);
    }
    return true;
  }
  
  includes(value: unknown): boolean {
    if (this.isArray()) {
      return commonMethods.includes(this.data as unknown[], value);
    }
    return false;
  }
  
  entries(): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.entries(this.data as unknown[]));
    }
    return new ChainableWrapper([]);
  }
  
  keys(): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.keys(this.data as unknown[]));
    }
    return new ChainableWrapper([]);
  }
  
  values(): ChainableWrapper {
    if (this.isArray()) {
      return new ChainableWrapper(commonMethods.values(this.data as unknown[]));
    }
    return new ChainableWrapper([]);
  }
  
  // 非同期メソッド
  async mapAsync<U>(mapper: (value: unknown, index: number, array: unknown[]) => Promise<U>): Promise<ChainableWrapper> {
    if (this.isArray()) {
      const result = await asyncMethods.mapAsync(this.data as unknown[], mapper);
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([]);
  }
  
  async mapAsyncSeq<U>(mapper: (value: unknown, index: number, array: unknown[]) => Promise<U>): Promise<ChainableWrapper> {
    if (this.isArray()) {
      const result = await asyncMethods.mapAsyncSeq(this.data as unknown[], mapper);
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([]);
  }
  
  async forEachAsync(callback: (value: unknown, index: number, array: unknown[]) => Promise<void>): Promise<void> {
    if (this.isArray()) {
      await asyncMethods.forEachAsync(this.data as unknown[], callback);
    }
  }
  
  async forEachAsyncSeq(callback: (value: unknown, index: number, array: unknown[]) => Promise<void>): Promise<void> {
    if (this.isArray()) {
      await asyncMethods.forEachAsyncSeq(this.data as unknown[], callback);
    }
  }
  
  // $記法特有のメソッド
  chain(): ChainableWrapper {
    return this; // 既にチェーン可能なので自身を返す
  }
  
  // value()メソッドで生の値を取得
  value(): unknown {
    return this.data;
  }
  
  valueOf(): unknown {
    return this.data;
  }
  
  toArray(): unknown[] {
    if (this.isArray()) {
      return this.data as unknown[];
    }
    return [];
  }
}

/**
 * VM環境用のスマートドル生成コード
 * createSmartDollarCode をエクスポートして、VM内で評価できるようにする
 */
export const createVMSmartDollarCode = `
// VM内での非同期メソッド定義
globalThis.asyncMethods = {
  mapAsync: async function(array, fn) {
    return Promise.all(array.map((item, index) => fn(item, index, array)));
  },
  mapAsyncSeq: async function(array, fn) {
    const results = [];
    for (let i = 0; i < array.length; i++) {
      results.push(await fn(array[i], i, array));
    }
    return results;
  },
  forEachAsync: async function(array, fn) {
    await Promise.all(array.map((item, index) => fn(item, index, array)));
  },
  forEachAsyncSeq: async function(array, fn) {
    for (let i = 0; i < array.length; i++) {
      await fn(array[i], i, array);
    }
  }
};

// 共通メソッドの実装
const commonMethods = ${JSON.stringify(commonMethods.toString()).slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"')};

// createSmartDollar関数の定義
globalThis.createSmartDollar = function(data) {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (data && data._isSmartDollar) {
    return data;
  }
  
  if (Array.isArray(data)) {
    // 共通メソッドを使用して実装
    const methods = {
      _isSmartDollar: { value: true, enumerable: false },
      
      // 基本メソッド
      filter: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.filter(this, ...args));
        }
      },
      map: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.map(this, ...args));
        }
      },
      find: {
        value: function(...args) {
          return commonMethods.find(this, ...args);
        }
      },
      reduce: {
        value: function(...args) {
          return commonMethods.reduce(this, ...args);
        }
      },
      
      // 高度なメソッド
      where: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.where(this, ...args));
        }
      },
      pluck: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.pluck(this, ...args));
        }
      },
      sortBy: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.sortBy(this, ...args));
        }
      },
      orderBy: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.orderBy(this, ...args));
        }
      },
      groupBy: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.groupBy(this, ...args));
        }
      },
      countBy: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.countBy(this, ...args));
        }
      },
      keyBy: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.keyBy(this, ...args));
        }
      },
      
      // セレクタ系
      take: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.take(this, ...args));
        }
      },
      skip: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.skip(this, ...args));
        }
      },
      takeWhile: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.takeWhile(this, ...args));
        }
      },
      dropWhile: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.dropWhile(this, ...args));
        }
      },
      
      // ユニーク・サンプリング
      uniqBy: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.uniqBy(this, ...args));
        }
      },
      sample: {
        value: function() {
          return commonMethods.sample(this);
        }
      },
      sampleSize: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.sampleSize(this, ...args));
        }
      },
      shuffle: {
        value: function() {
          return globalThis.createSmartDollar(commonMethods.shuffle(this));
        }
      },
      
      // 変換系
      flatten: {
        value: function() {
          return globalThis.createSmartDollar(commonMethods.flatten(this));
        }
      },
      flattenDeep: {
        value: function() {
          return globalThis.createSmartDollar(commonMethods.flattenDeep(this));
        }
      },
      compact: {
        value: function() {
          return globalThis.createSmartDollar(commonMethods.compact(this));
        }
      },
      chunk: {
        value: function(...args) {
          return globalThis.createSmartDollar(commonMethods.chunk(this, ...args));
        }
      },
      reverse: {
        value: function() {
          return globalThis.createSmartDollar(commonMethods.reverse(this));
        }
      },
      
      // 数学・統計系
      sum: {
        value: function() {
          return commonMethods.sum(this);
        }
      },
      mean: {
        value: function() {
          return commonMethods.mean(this);
        }
      },
      min: {
        value: function() {
          return commonMethods.min(this);
        }
      },
      max: {
        value: function() {
          return commonMethods.max(this);
        }
      },
      minBy: {
        value: function(...args) {
          return commonMethods.minBy(this, ...args);
        }
      },
      maxBy: {
        value: function(...args) {
          return commonMethods.maxBy(this, ...args);
        }
      },
      
      // ユーティリティ
      size: {
        value: function() {
          return commonMethods.size(this);
        }
      },
      isEmpty: {
        value: function() {
          return commonMethods.isEmpty(this);
        }
      },
      includes: {
        value: function(...args) {
          return commonMethods.includes(this, ...args);
        }
      },
      
      // オブジェクト系
      entries: {
        value: function() {
          return globalThis.createSmartDollar(commonMethods.entries(this));
        }
      },
      keys: {
        value: function() {
          return globalThis.createSmartDollar(commonMethods.keys(this));
        }
      },
      values: {
        value: function() {
          return globalThis.createSmartDollar(commonMethods.values(this));
        }
      },
      
      // 非同期メソッド
      mapAsync: {
        value: async function(fn) {
          const result = await globalThis.asyncMethods.mapAsync(this, fn);
          return globalThis.createSmartDollar(result);
        }
      },
      mapAsyncSeq: {
        value: async function(fn) {
          const result = await globalThis.asyncMethods.mapAsyncSeq(this, fn);
          return globalThis.createSmartDollar(result);
        }
      },
      forEachAsync: {
        value: function(fn) {
          return globalThis.asyncMethods.forEachAsync(this, fn);
        }
      },
      forEachAsyncSeq: {
        value: function(fn) {
          return globalThis.asyncMethods.forEachAsyncSeq(this, fn);
        }
      },
      
      // チェーン
      chain: {
        value: function() {
          return this;
        }
      },
      
      // 値の取得
      value: {
        value: function() {
          return [...this];
        }
      },
      valueOf: {
        value: function() {
          return [...this];
        }
      },
      toArray: {
        value: function() {
          return [...this];
        }
      }
    };
    
    Object.defineProperties(data, methods);
    return data;
  }
  
  // 配列以外はそのまま返す
  return data;
};
`;

// デフォルトのエクスポート
export function createSmartDollar(data: unknown): ChainableWrapper {
  return new ChainableWrapper(data);
}