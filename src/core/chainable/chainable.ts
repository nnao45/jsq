import { asyncMethods } from '../lib/async-methods';

export class ChainableWrapper {
  private data: unknown;

  // Cache for bound methods to avoid recreating them
  private static methodCache = new WeakMap<
    ChainableWrapper,
    Map<string, (...args: unknown[]) => unknown>
  >();

  constructor(data: unknown) {
    this.data = data;

    // Return a Proxy to enable direct property access
    // biome-ignore lint/correctness/noConstructorReturn: This is intentional for proxy pattern
    return new Proxy(this, {
      get(target, prop, receiver) {
        // If it's a method or property on the wrapper, return it bound to the target
        if (prop in target) {
          const value = Reflect.get(target, prop, receiver);
          if (typeof value === 'function') {
            // Check method cache first
            let cache = ChainableWrapper.methodCache.get(target);
            if (!cache) {
              cache = new Map();
              ChainableWrapper.methodCache.set(target, cache);
            }

            const propStr = String(prop);
            let boundMethod = cache.get(propStr);
            if (!boundMethod && value) {
              boundMethod = value.bind(target);
            }
            if (boundMethod) {
              cache.set(propStr, boundMethod);
            }
            return boundMethod;
          }
          return value;
        }

        // For data property access, return a new wrapped instance
        if (typeof prop === 'string' && target.isObject(target.data) && prop in target.data) {
          return new ChainableWrapper((target.data as Record<string, unknown>)[prop]);
        }

        return new ChainableWrapper(undefined);
      },
    });
  }

  // Core data access
  get value(): unknown {
    return this.data;
  }

  // Property access for objects
  get(key: string): ChainableWrapper {
    if (this.isObject(this.data) && key in this.data) {
      return new ChainableWrapper((this.data as Record<string, unknown>)[key]);
    }
    return new ChainableWrapper(undefined);
  }

  // Array-like operations
  filter(predicate: (item: unknown, index?: number) => boolean): ChainableWrapper {
    if (Array.isArray(this.data)) {
      return new ChainableWrapper(this.data.filter(predicate));
    }
    return new ChainableWrapper([]);
  }

  map<T>(transform: (item: unknown, index?: number) => T): ChainableWrapper {
    if (Array.isArray(this.data)) {
      return new ChainableWrapper(this.data.map(transform));
    }
    return new ChainableWrapper([]);
  }

  // jQuery-like methods
  find(predicate: (item: unknown) => boolean): ChainableWrapper {
    if (Array.isArray(this.data)) {
      return new ChainableWrapper(this.data.find(predicate));
    }
    return new ChainableWrapper(undefined);
  }

  where(key: string, value: unknown): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const filtered = this.data.filter(item => {
        if (this.isObject(item) && key in item) {
          return (item as Record<string, unknown>)[key] === value;
        }
        return false;
      });
      return new ChainableWrapper(filtered);
    }
    return new ChainableWrapper([]);
  }

  pluck(key: string): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const values = this.data
        .map(item => {
          if (this.isObject(item) && key in item) {
            return (item as Record<string, unknown>)[key];
          }
          return undefined;
        })
        .filter(val => val !== undefined);
      return new ChainableWrapper(values);
    }
    return new ChainableWrapper([]);
  }

  sortBy(key: string | ((item: unknown) => number | string)): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const sorted = [...this.data].sort((a, b) => {
        let aVal: unknown, bVal: unknown;

        if (typeof key === 'function') {
          aVal = key(a);
          bVal = key(b);
        } else if (this.isObject(a) && this.isObject(b)) {
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
      return new ChainableWrapper(sorted);
    }
    return new ChainableWrapper([]);
  }

  take(count: number): ChainableWrapper {
    if (Array.isArray(this.data)) {
      return new ChainableWrapper(this.data.slice(0, count));
    }
    return new ChainableWrapper([]);
  }

  skip(count: number): ChainableWrapper {
    if (Array.isArray(this.data)) {
      return new ChainableWrapper(this.data.slice(count));
    }
    return new ChainableWrapper([]);
  }

  // Advanced array methods
  uniqBy(keyFn: (item: unknown) => unknown): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const seen = new Set<unknown>();
      const result = this.data.filter(item => {
        const key = keyFn(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([]);
  }

  flatten(): ChainableWrapper {
    if (Array.isArray(this.data)) {
      return new ChainableWrapper(this.data.flat());
    }
    return new ChainableWrapper([]);
  }

  flattenDeep(): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const flattenDeep = (arr: unknown[]): unknown[] =>
        arr.reduce<unknown[]>(
          (acc, val) =>
            Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val),
          []
        );
      return new ChainableWrapper(flattenDeep(this.data));
    }
    return new ChainableWrapper([]);
  }

  compact(): ChainableWrapper {
    if (Array.isArray(this.data)) {
      return new ChainableWrapper(this.data.filter(Boolean));
    }
    return new ChainableWrapper([]);
  }

  chunk(size: number): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const chunks: unknown[][] = [];
      for (let i = 0; i < this.data.length; i += size) {
        chunks.push(this.data.slice(i, i + size));
      }
      return new ChainableWrapper(chunks);
    }
    return new ChainableWrapper([]);
  }

  takeWhile(predicate: (item: unknown) => boolean): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const result: unknown[] = [];
      for (const item of this.data) {
        if (!predicate(item)) break;
        result.push(item);
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([]);
  }

  drop(count: number): ChainableWrapper {
    if (Array.isArray(this.data)) {
      return new ChainableWrapper(this.data.slice(count));
    }
    return new ChainableWrapper([]);
  }

  dropWhile(predicate: (item: unknown) => boolean): ChainableWrapper {
    if (Array.isArray(this.data)) {
      let index = 0;
      while (index < this.data.length && predicate(this.data[index])) {
        index++;
      }
      return new ChainableWrapper(this.data.slice(index));
    }
    return new ChainableWrapper([]);
  }

  reverse(): ChainableWrapper {
    if (Array.isArray(this.data)) {
      return new ChainableWrapper([...this.data].reverse());
    }
    return new ChainableWrapper(this.data);
  }

  shuffle(): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const result = [...this.data];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper(this.data);
  }

  sample(): ChainableWrapper {
    if (Array.isArray(this.data) && this.data.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.data.length);
      return new ChainableWrapper(this.data[randomIndex]);
    }
    return new ChainableWrapper(undefined);
  }

  sampleSize(count: number): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const shuffled = [...this.data].sort(() => 0.5 - Math.random());
      return new ChainableWrapper(shuffled.slice(0, count));
    }
    return new ChainableWrapper([]);
  }

  orderBy(
    keys: string[] | ((item: unknown) => unknown)[],
    orders: ('asc' | 'desc')[] = []
  ): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const sorted = [...this.data].sort(this.createOrderByComparator(keys, orders));
      return new ChainableWrapper(sorted);
    }
    return new ChainableWrapper([]);
  }

  private createOrderByComparator(
    keys: string[] | ((item: unknown) => unknown)[],
    orders: ('asc' | 'desc')[]
  ): (a: unknown, b: unknown) => number {
    return (a: unknown, b: unknown): number => {
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!key) continue;
        const order = orders[i] || 'asc';

        let aVal: unknown, bVal: unknown;
        if (typeof key === 'function') {
          aVal = key(a);
          bVal = key(b);
        } else if (this.isObject(a) && this.isObject(b)) {
          aVal = (a as Record<string, unknown>)[key];
          bVal = (b as Record<string, unknown>)[key];
        } else {
          continue;
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
  }

  groupBy(keyFn: (item: unknown) => string): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const groups: Record<string, unknown[]> = {};
      for (const item of this.data) {
        const key = keyFn(item);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
      return new ChainableWrapper(groups);
    }
    return new ChainableWrapper({});
  }

  countBy(keyFn: (item: unknown) => string): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const counts: Record<string, number> = {};
      for (const item of this.data) {
        const key = keyFn(item);
        counts[key] = (counts[key] || 0) + 1;
      }
      return new ChainableWrapper(counts);
    }
    return new ChainableWrapper({});
  }

  keyBy(keyFn: (item: unknown) => string): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const result: Record<string, unknown> = {};
      for (const item of this.data) {
        result[keyFn(item)] = item;
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper({});
  }

  // Object methods
  pick(keys: string[]): ChainableWrapper {
    if (this.isObject(this.data)) {
      const obj = this.data as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        if (key in obj) {
          result[key] = obj[key];
        }
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper({});
  }

  omit(keys: string[]): ChainableWrapper {
    if (this.isObject(this.data)) {
      const obj = this.data as Record<string, unknown>;
      const result: Record<string, unknown> = { ...obj };
      for (const key of keys) {
        delete result[key];
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper({});
  }

  invert(): ChainableWrapper {
    if (this.isObject(this.data)) {
      const obj = this.data as Record<string, unknown>;
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[String(value)] = key;
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper({});
  }

  // Statistical methods
  mean(): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const numbers = this.data.filter((item): item is number => typeof item === 'number');
      if (numbers.length === 0) return new ChainableWrapper(0);
      const sum = numbers.reduce((acc, num) => acc + num, 0);
      return new ChainableWrapper(sum / numbers.length);
    }
    return new ChainableWrapper(0);
  }

  min(): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const numbers = this.data.filter((item): item is number => typeof item === 'number');
      return new ChainableWrapper(numbers.length > 0 ? Math.min(...numbers) : undefined);
    }
    return new ChainableWrapper(undefined);
  }

  max(): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const numbers = this.data.filter((item): item is number => typeof item === 'number');
      return new ChainableWrapper(numbers.length > 0 ? Math.max(...numbers) : undefined);
    }
    return new ChainableWrapper(undefined);
  }

  minBy(keyFn: (item: unknown) => number): ChainableWrapper {
    if (Array.isArray(this.data) && this.data.length > 0) {
      const min = this.data.reduce((minItem, item) =>
        keyFn(item) < keyFn(minItem) ? item : minItem
      );
      return new ChainableWrapper(min);
    }
    return new ChainableWrapper(undefined);
  }

  maxBy(keyFn: (item: unknown) => number): ChainableWrapper {
    if (Array.isArray(this.data) && this.data.length > 0) {
      const max = this.data.reduce((maxItem, item) =>
        keyFn(item) > keyFn(maxItem) ? item : maxItem
      );
      return new ChainableWrapper(max);
    }
    return new ChainableWrapper(undefined);
  }

  // Collection methods
  size(): ChainableWrapper {
    if (Array.isArray(this.data)) {
      return new ChainableWrapper(this.data.length);
    }
    if (this.isObject(this.data)) {
      return new ChainableWrapper(Object.keys(this.data as Record<string, unknown>).length);
    }
    return new ChainableWrapper(0);
  }

  isEmpty(): ChainableWrapper {
    if (this.data == null) return new ChainableWrapper(true);
    if (Array.isArray(this.data) || typeof this.data === 'string') {
      return new ChainableWrapper(this.data.length === 0);
    }
    if (this.isObject(this.data)) {
      return new ChainableWrapper(Object.keys(this.data as Record<string, unknown>).length === 0);
    }
    return new ChainableWrapper(false);
  }

  includes(value: unknown): ChainableWrapper {
    if (Array.isArray(this.data)) {
      return new ChainableWrapper(this.data.includes(value));
    }
    if (this.isObject(this.data)) {
      return new ChainableWrapper(
        Object.values(this.data as Record<string, unknown>).includes(value)
      );
    }
    return new ChainableWrapper(false);
  }

  // Aggregation methods
  length(): ChainableWrapper {
    if (Array.isArray(this.data)) {
      return new ChainableWrapper(this.data.length);
    }
    if (this.isObject(this.data)) {
      return new ChainableWrapper(Object.keys(this.data as Record<string, unknown>).length);
    }
    return new ChainableWrapper(0);
  }

  sum(key?: string): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const values = key
        ? this.data.map(item => (this.isObject(item) ? (item as Record<string, unknown>)[key] : 0))
        : this.data;

      const sum = values.reduce((acc, val) => {
        return acc + (typeof val === 'number' ? val : 0);
      }, 0);

      return new ChainableWrapper(sum);
    }
    return new ChainableWrapper(0);
  }

  // Utility methods
  keys(): ChainableWrapper {
    if (this.isObject(this.data)) {
      return new ChainableWrapper(Object.keys(this.data as Record<string, unknown>));
    }
    return new ChainableWrapper([]);
  }

  values(): ChainableWrapper {
    if (this.isObject(this.data)) {
      return new ChainableWrapper(Object.values(this.data as Record<string, unknown>));
    }
    return new ChainableWrapper([]);
  }

  entries(): ChainableWrapper {
    if (this.isObject(this.data)) {
      return new ChainableWrapper(Object.entries(this.data as Record<string, unknown>));
    }
    return new ChainableWrapper([]);
  }

  flatMap(transform: (item: unknown, index?: number) => unknown[]): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const result: unknown[] = [];
      for (let i = 0; i < this.data.length; i++) {
        const mapped = transform(this.data[i], i);
        if (Array.isArray(mapped)) {
          result.push(...mapped);
        } else {
          result.push(mapped);
        }
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([]);
  }

  mapValues(transform: (value: unknown, key?: string) => unknown): ChainableWrapper {
    if (this.isObject(this.data)) {
      const obj = this.data as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = transform(value, key);
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper({});
  }

  // Type checking utilities
  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  // Convert back to plain value for final output
  valueOf(): unknown {
    return this.data;
  }

  toString(): string {
    return JSON.stringify(this.data, null, 2);
  }

  toJSON(): unknown {
    return this.data;
  }

  [Symbol.toPrimitive](hint: string): unknown {
    if (hint === 'default' || hint === 'string') {
      return this.data;
    }
    if (hint === 'number') {
      return typeof this.data === 'number' ? this.data : Number(this.data);
    }
    return this.data;
  }

  // Advanced collection methods (Tier 1)

  /**
   * Split array into two arrays based on predicate: [truthy, falsy]
   */
  partition(predicate: (item: unknown, index?: number) => boolean): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const truthy: unknown[] = [];
      const falsy: unknown[] = [];
      for (let i = 0; i < this.data.length; i++) {
        if (predicate(this.data[i], i)) {
          truthy.push(this.data[i]);
        } else {
          falsy.push(this.data[i]);
        }
      }
      return new ChainableWrapper([truthy, falsy]);
    }
    return new ChainableWrapper([[], []]);
  }

  /**
   * Sliding window over array elements
   */
  windowed(size: number, step = 1): ChainableWrapper {
    if (Array.isArray(this.data)) {
      if (size <= 0) return new ChainableWrapper([]);
      const result: unknown[][] = [];
      for (let i = 0; i <= this.data.length - size; i += step) {
        result.push(this.data.slice(i, i + size));
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([]);
  }

  /**
   * Enhanced chunked method (alias for chunk for consistency)
   */
  chunked(size: number): ChainableWrapper {
    return this.chunk(size);
  }

  /**
   * Split array at first false predicate: [prefix, suffix]
   */
  span(predicate: (item: unknown, index?: number) => boolean): ChainableWrapper {
    if (Array.isArray(this.data)) {
      let splitIndex = this.data.length;
      for (let i = 0; i < this.data.length; i++) {
        if (!predicate(this.data[i], i)) {
          splitIndex = i;
          break;
        }
      }
      const prefix = this.data.slice(0, splitIndex);
      const suffix = this.data.slice(splitIndex);
      return new ChainableWrapper([prefix, suffix]);
    }
    return new ChainableWrapper([[], []]);
  }

  /**
   * Take elements until predicate is true (exclusive)
   */
  takeUntil(predicate: (item: unknown, index?: number) => boolean): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const result: unknown[] = [];
      for (let i = 0; i < this.data.length; i++) {
        if (predicate(this.data[i], i)) break;
        result.push(this.data[i]);
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([]);
  }

  /**
   * Drop elements until predicate is true (exclusive)
   */
  dropUntil(predicate: (item: unknown, index?: number) => boolean): ChainableWrapper {
    if (Array.isArray(this.data)) {
      let index = 0;
      while (index < this.data.length && !predicate(this.data[index], index)) {
        index++;
      }
      return new ChainableWrapper(this.data.slice(index));
    }
    return new ChainableWrapper([]);
  }

  // Advanced collection methods (Tier 2)

  /**
   * Count occurrences {value: count}
   */
  frequencies(): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const freq: Record<string, number> = {};
      for (const item of this.data) {
        const key = String(item);
        freq[key] = (freq[key] || 0) + 1;
      }
      return new ChainableWrapper(freq);
    }
    return new ChainableWrapper({});
  }

  /**
   * Group and transform values simultaneously
   */
  groupWith<T>(keyFn: (item: unknown) => string, valueFn: (item: unknown) => T): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const groups: Record<string, T[]> = {};
      for (const item of this.data) {
        const key = keyFn(item);
        const value = valueFn(item);
        if (!groups[key]) groups[key] = [];
        groups[key].push(value);
      }
      return new ChainableWrapper(groups);
    }
    return new ChainableWrapper({});
  }

  /**
   * Reduce grouped values
   */
  reduceBy<T>(
    keyFn: (item: unknown) => string,
    reducerFn: (acc: T, item: unknown) => T,
    initialValue: T
  ): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const result: Record<string, T> = {};
      for (const item of this.data) {
        const key = keyFn(item);
        result[key] = result[key] ? reducerFn(result[key], item) : reducerFn(initialValue, item);
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper({});
  }

  /**
   * Cumulative reduce (running totals/accumulation)
   */
  scanLeft<T>(fn: (acc: T, item: unknown, index?: number) => T, initial: T): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const result: T[] = [initial];
      let acc = initial;
      for (let i = 0; i < this.data.length; i++) {
        acc = fn(acc, this.data[i], i);
        result.push(acc);
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([initial]);
  }

  /**
   * Remove duplicates by computed key
   */
  distinctBy(keyFn: (item: unknown) => unknown): ChainableWrapper {
    if (Array.isArray(this.data)) {
      // Use array-based deduplication instead of Set to avoid VM issues
      const seen: unknown[] = [];
      const result: unknown[] = [];
      for (const item of this.data) {
        const key = keyFn(item);
        if (!seen.includes(key)) {
          seen.push(key);
          result.push(item);
        }
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([]);
  }

  /**
   * Intersection with key function
   */
  intersectBy(other: unknown[], keyFn: (item: unknown) => unknown): ChainableWrapper {
    if (Array.isArray(this.data)) {
      // Use array-based intersection instead of Set to avoid VM issues
      const otherKeys = other.map(keyFn);
      const result = this.data.filter(item => otherKeys.includes(keyFn(item)));
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([]);
  }

  // Advanced collection methods (Tier 3)

  /**
   * Peek at elements without changing stream
   */
  spy(fn: (item: unknown, index?: number) => void): ChainableWrapper {
    if (Array.isArray(this.data)) {
      for (let i = 0; i < this.data.length; i++) {
        fn(this.data[i], i);
      }
    }
    return new ChainableWrapper(this.data);
  }

  /**
   * Combined filter + map (skip nulls/undefined)
   */
  filterMap<T>(fn: (item: unknown, index?: number) => T | null | undefined): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const result: T[] = [];
      for (let i = 0; i < this.data.length; i++) {
        const mapped = fn(this.data[i], i);
        if (mapped != null) {
          result.push(mapped);
        }
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([]);
  }

  /**
   * Find last matching element
   */
  findLast(predicate: (item: unknown, index?: number) => boolean): ChainableWrapper {
    if (Array.isArray(this.data)) {
      for (let i = this.data.length - 1; i >= 0; i--) {
        if (predicate(this.data[i], i)) {
          return new ChainableWrapper(this.data[i]);
        }
      }
    }
    return new ChainableWrapper(undefined);
  }

  /**
   * Count elements matching predicate
   */
  quantify(predicate: (item: unknown, index?: number) => boolean): ChainableWrapper {
    if (Array.isArray(this.data)) {
      let count = 0;
      for (let i = 0; i < this.data.length; i++) {
        if (predicate(this.data[i], i)) count++;
      }
      return new ChainableWrapper(count);
    }
    return new ChainableWrapper(0);
  }

  /**
   * Pairs of consecutive elements: [a,b], [b,c], [c,d]
   */
  pairwise(): ChainableWrapper {
    if (Array.isArray(this.data) && this.data.length >= 2) {
      const result: [unknown, unknown][] = [];
      for (let i = 0; i < this.data.length - 1; i++) {
        result.push([this.data[i], this.data[i + 1]]);
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([]);
  }

  /**
   * Insert separator between all elements
   */
  intersperse(separator: unknown): ChainableWrapper {
    if (Array.isArray(this.data)) {
      if (this.data.length <= 1) return new ChainableWrapper(this.data);
      const result: unknown[] = [this.data[0]];
      for (let i = 1; i < this.data.length; i++) {
        result.push(separator, this.data[i]);
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([]);
  }

  // Advanced collection methods (Tier 4)

  /**
   * Iterator that can peek ahead one element (returns special object with next/peek)
   */
  peekable(): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const dataArray = this.data as unknown[];
      let index = 0;
      const peekableIterator = {
        hasNext: () => index < dataArray.length,
        next: () => (index < dataArray.length ? dataArray[index++] : undefined),
        peek: () => (index < dataArray.length ? dataArray[index] : undefined),
        remaining: () => dataArray.slice(index),
      };
      return new ChainableWrapper(peekableIterator);
    }
    return new ChainableWrapper({
      hasNext: () => false,
      next: () => undefined,
      peek: () => undefined,
      remaining: () => [],
    });
  }

  /**
   * Similar to chunked but with padding control
   */
  batched(size: number, padValue?: unknown): ChainableWrapper {
    if (Array.isArray(this.data)) {
      if (size <= 0) return new ChainableWrapper([]);
      const result: unknown[][] = [];
      for (let i = 0; i < this.data.length; i += size) {
        const batch = this.data.slice(i, i + size);
        // Pad the last batch if needed and padValue is provided
        if (padValue !== undefined && batch.length < size && i + size > this.data.length) {
          while (batch.length < size) {
            batch.push(padValue);
          }
        }
        result.push(batch);
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper([]);
  }

  // Functional programming methods

  /**
   * Left fold (reduce from left to right)
   */
  foldLeft<T>(initial: T, fn: (acc: T, item: unknown, index?: number) => T): ChainableWrapper {
    if (Array.isArray(this.data)) {
      let result = initial;
      for (let i = 0; i < this.data.length; i++) {
        result = fn(result, this.data[i], i);
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper(initial);
  }

  /**
   * Right fold (reduce from right to left)
   */
  foldRight<T>(initial: T, fn: (item: unknown, acc: T, index?: number) => T): ChainableWrapper {
    if (Array.isArray(this.data)) {
      let result = initial;
      for (let i = this.data.length - 1; i >= 0; i--) {
        result = fn(this.data[i], result, i);
      }
      return new ChainableWrapper(result);
    }
    return new ChainableWrapper(initial);
  }

  /**
   * Traverse with effect (map with accumulating state)
   */
  traverse<T, S>(
    initial: S,
    fn: (state: S, item: unknown, index?: number) => { value: T; state: S }
  ): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const result: T[] = [];
      let state = initial;
      for (let i = 0; i < this.data.length; i++) {
        const { value, state: newState } = fn(state, this.data[i], i);
        result.push(value);
        state = newState;
      }
      return new ChainableWrapper({ values: result, finalState: state });
    }
    return new ChainableWrapper({ values: [], finalState: initial });
  }

  // Reactive/Async Methods (RxJS-style operators)

  // Time-based operators

  /**
   * Delay emission by specified milliseconds
   */
  delay(ms: number): Promise<ChainableWrapper> {
    return new Promise(resolve => {
      setTimeout(() => resolve(new ChainableWrapper(this.data)), ms);
    });
  }

  /**
   * Debounce rapid emissions - only emit after silence period
   */
  debounceTime(ms: number): Promise<ChainableWrapper> {
    return new Promise(resolve => {
      // For single values, just delay
      if (!Array.isArray(this.data)) {
        setTimeout(() => resolve(new ChainableWrapper(this.data)), ms);
        return;
      }

      // For arrays, debounce means taking the last value after the specified time
      const array = this.data as unknown[];
      if (array.length === 0) {
        resolve(new ChainableWrapper([]));
        return;
      }

      setTimeout(() => {
        resolve(new ChainableWrapper(array[array.length - 1]));
      }, ms);
    });
  }

  /**
   * Throttle emission rate - emit at most once per interval
   */
  throttleTime(ms: number): Promise<ChainableWrapper> {
    return new Promise(resolve => {
      // For throttling, we take the first value immediately, then ignore subsequent ones
      if (!Array.isArray(this.data)) {
        resolve(new ChainableWrapper(this.data));
        return;
      }

      const array = this.data as unknown[];
      if (array.length === 0) {
        resolve(new ChainableWrapper([]));
        return;
      }

      // Take first value, then wait for the throttle period
      setTimeout(() => {
        resolve(new ChainableWrapper(array[0]));
      }, ms);
    });
  }

  /**
   * Add timeout to operation
   */
  timeout(ms: number): Promise<ChainableWrapper> {
    return Promise.race([
      new Promise<ChainableWrapper>(resolve => {
        resolve(new ChainableWrapper(this.data));
      }),
      new Promise<ChainableWrapper>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
      }),
    ]);
  }

  /**
   * Create timed intervals for streaming data
   */
  async *interval(ms: number): AsyncGenerator<ChainableWrapper> {
    if (!Array.isArray(this.data)) {
      yield new ChainableWrapper(this.data);
      return;
    }

    const array = this.data as unknown[];
    for (const item of array) {
      yield new ChainableWrapper(item);
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  /**
   * Timer-based emissions with optional period
   */
  async *timer(delay: number, period?: number): AsyncGenerator<ChainableWrapper> {
    // Initial delay
    await new Promise(resolve => setTimeout(resolve, delay));

    if (!Array.isArray(this.data)) {
      yield new ChainableWrapper(this.data);
      return;
    }

    const array = this.data as unknown[];
    let index = 0;

    while (index < array.length) {
      yield new ChainableWrapper(array[index++]);

      if (period && index < array.length) {
        await new Promise(resolve => setTimeout(resolve, period));
      }
    }
  }

  // Advanced transformation operators

  /**
   * Sequential async mapping - wait for each to complete before next
   */
  async concatMap<T>(
    fn: (item: unknown, index?: number) => Promise<T> | T
  ): Promise<ChainableWrapper> {
    if (!Array.isArray(this.data)) {
      const result = await Promise.resolve(fn(this.data, 0));
      return new ChainableWrapper(result);
    }

    const array = this.data as unknown[];
    const results: T[] = [];

    for (let i = 0; i < array.length; i++) {
      const result = await Promise.resolve(fn(array[i], i));
      if (Array.isArray(result)) {
        results.push(...result);
      } else {
        results.push(result);
      }
    }

    return new ChainableWrapper(results);
  }

  /**
   * Concurrent async mapping - execute all simultaneously
   */
  async mergeMap<T>(
    fn: (item: unknown, index?: number) => Promise<T> | T
  ): Promise<ChainableWrapper> {
    if (!Array.isArray(this.data)) {
      const result = await Promise.resolve(fn(this.data, 0));
      return new ChainableWrapper(result);
    }

    const array = this.data as unknown[];
    const promises = array.map((item, index) => Promise.resolve(fn(item, index)));
    const results = await Promise.all(promises);

    // Flatten results if they are arrays
    const flattened: T[] = [];
    for (const result of results) {
      if (Array.isArray(result)) {
        flattened.push(...result);
      } else {
        flattened.push(result);
      }
    }

    return new ChainableWrapper(flattened);
  }

  /**
   * Switch to new mapping, cancelling previous
   */
  async switchMap<T>(
    fn: (item: unknown, index?: number) => Promise<T> | T
  ): Promise<ChainableWrapper> {
    if (!Array.isArray(this.data)) {
      const result = await Promise.resolve(fn(this.data, 0));
      return new ChainableWrapper(result);
    }

    const array = this.data as unknown[];
    if (array.length === 0) {
      return new ChainableWrapper([]);
    }

    // Only process the last item (switch behavior)
    const lastItem = array[array.length - 1];
    const result = await Promise.resolve(fn(lastItem, array.length - 1));

    return new ChainableWrapper(Array.isArray(result) ? result : [result]);
  }

  /**
   * Ignore new values while inner operation is active
   */
  async exhaustMap<T>(
    fn: (item: unknown, index?: number) => Promise<T> | T
  ): Promise<ChainableWrapper> {
    if (!Array.isArray(this.data)) {
      const result = await Promise.resolve(fn(this.data, 0));
      return new ChainableWrapper(result);
    }

    const array = this.data as unknown[];
    if (array.length === 0) {
      return new ChainableWrapper([]);
    }

    // Only process the first item (exhaust behavior)
    const firstItem = array[0];
    const result = await Promise.resolve(fn(firstItem, 0));

    return new ChainableWrapper(Array.isArray(result) ? result : [result]);
  }

  // Enhanced filtering operators

  /**
   * Only emit when value changes from previous
   */
  distinctUntilChanged(keyFn?: (item: unknown) => unknown): ChainableWrapper {
    if (!Array.isArray(this.data)) {
      return new ChainableWrapper(this.data);
    }

    const array = this.data as unknown[];
    if (array.length === 0) {
      return new ChainableWrapper([]);
    }

    const result: unknown[] = [array[0]];
    let previous = keyFn ? keyFn(array[0]) : array[0];

    for (let i = 1; i < array.length; i++) {
      const current = keyFn ? keyFn(array[i]) : array[i];
      if (current !== previous) {
        result.push(array[i]);
        previous = current;
      }
    }

    return new ChainableWrapper(result);
  }

  /**
   * Skip last n items
   */
  skipLast(count: number): ChainableWrapper {
    if (!Array.isArray(this.data)) {
      return count > 0 ? new ChainableWrapper(undefined) : new ChainableWrapper(this.data);
    }

    const array = this.data as unknown[];
    if (count <= 0) {
      return new ChainableWrapper(array);
    }

    const result = array.slice(0, Math.max(0, array.length - count));
    return new ChainableWrapper(result);
  }

  /**
   * Take last n items
   */
  takeLast(count: number): ChainableWrapper {
    if (!Array.isArray(this.data)) {
      return count > 0 ? new ChainableWrapper(this.data) : new ChainableWrapper(undefined);
    }

    const array = this.data as unknown[];
    if (count <= 0) {
      return new ChainableWrapper([]);
    }

    const result = array.slice(Math.max(0, array.length - count));
    return new ChainableWrapper(result);
  }

  // Stream combination operators

  /**
   * Combine latest values from multiple arrays
   */
  combineLatest(others: unknown[][]): ChainableWrapper {
    if (!Array.isArray(this.data)) {
      return new ChainableWrapper([this.data, ...others.map(arr => arr[arr.length - 1] || null)]);
    }

    const thisArray = this.data as unknown[];
    const maxLength = Math.max(thisArray.length, ...others.map(arr => arr.length));
    const result: unknown[][] = [];

    for (let i = 0; i < maxLength; i++) {
      const combined: unknown[] = [
        i < thisArray.length ? thisArray[i] : thisArray[thisArray.length - 1] || null,
      ];

      for (const other of others) {
        combined.push(i < other.length ? other[i] : other[other.length - 1] || null);
      }

      result.push(combined);
    }

    return new ChainableWrapper(result);
  }

  /**
   * Zip multiple arrays together
   */
  zip(others: unknown[][]): ChainableWrapper {
    if (!Array.isArray(this.data)) {
      return new ChainableWrapper([this.data, ...others.map(arr => arr[0] || null)]);
    }

    const thisArray = this.data as unknown[];
    const minLength = Math.min(thisArray.length, ...others.map(arr => arr.length));
    const result: unknown[][] = [];

    for (let i = 0; i < minLength; i++) {
      const zipped = [thisArray[i]];
      for (const other of others) {
        zipped.push(other[i]);
      }
      result.push(zipped);
    }

    return new ChainableWrapper(result);
  }

  /**
   * Merge multiple arrays
   */
  merge(others: unknown[][]): ChainableWrapper {
    if (!Array.isArray(this.data)) {
      const allItems = [this.data];
      for (const other of others) {
        allItems.push(...other);
      }
      return new ChainableWrapper(allItems);
    }

    const thisArray = this.data as unknown[];
    const result: unknown[] = [...thisArray];

    for (const other of others) {
      result.push(...other);
    }

    return new ChainableWrapper(result);
  }

  // Error handling operators

  /**
   * Retry operations on failure
   */
  async retry(count: number, operation?: () => Promise<unknown>): Promise<ChainableWrapper> {
    let attempts = 0;
    const maxAttempts = count + 1; // Initial attempt + retries

    while (attempts < maxAttempts) {
      try {
        if (operation) {
          const result = await operation();
          return new ChainableWrapper(result);
        } else {
          // If no operation provided, just return current data
          return new ChainableWrapper(this.data);
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** (attempts - 1)));
      }
    }

    return new ChainableWrapper(this.data);
  }

  /**
   * Handle errors gracefully
   */
  async catchError<T>(errorHandler: (error: Error) => T | Promise<T>): Promise<ChainableWrapper> {
    try {
      return new ChainableWrapper(this.data);
    } catch (error) {
      const handled = await Promise.resolve(errorHandler(error as Error));
      return new ChainableWrapper(handled);
    }
  }

  // Utility operators

  /**
   * Execute a function for each element (standard forEach)
   */
  forEach(fn: (item: unknown, index?: number, array?: unknown[]) => void): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const array = this.data as unknown[];
      array.forEach((item, index) => {
        fn(item, index, array);
      });
    } else {
      fn(this.data, 0, [this.data]);
    }
    return new ChainableWrapper(this.data);
  }

  /**
   * Execute a function for each element (alias for forEach)
   */
  each(fn: (item: unknown, index?: number, array?: unknown[]) => void): ChainableWrapper {
    return this.forEach(fn);
  }

  /**
   * Execute an async function for each element in parallel
   */
  async forEachAsync(
    fn: (item: unknown, index?: number, array?: unknown[]) => Promise<void>
  ): Promise<ChainableWrapper> {
    if (Array.isArray(this.data)) {
      await asyncMethods.forEachAsync(this.data as unknown[], fn);
    } else {
      await fn(this.data, 0, [this.data]);
    }
    return new ChainableWrapper(this.data);
  }

  /**
   * Execute an async function for each element sequentially
   */
  async forEachAsyncSeq(
    fn: (item: unknown, index?: number, array?: unknown[]) => Promise<void>
  ): Promise<ChainableWrapper> {
    if (Array.isArray(this.data)) {
      await asyncMethods.forEachAsyncSeq(this.data as unknown[], fn);
    } else {
      await fn(this.data, 0, [this.data]);
    }
    return new ChainableWrapper(this.data);
  }

  /**
   * Map with async function in parallel
   */
  async mapAsync<T>(
    transform: (item: unknown, index?: number) => Promise<T>
  ): Promise<ChainableWrapper> {
    if (Array.isArray(this.data)) {
      const results = await asyncMethods.mapAsync(
        this.data as unknown[],
        transform as (item: unknown, index: number, array: unknown[]) => Promise<unknown>
      );
      return new ChainableWrapper(results);
    }
    const result = await transform(this.data, 0);
    return new ChainableWrapper([result]);
  }

  /**
   * Map with async function sequentially
   */
  async mapAsyncSeq<T>(
    transform: (item: unknown, index?: number) => Promise<T>
  ): Promise<ChainableWrapper> {
    if (Array.isArray(this.data)) {
      const results = await asyncMethods.mapAsyncSeq(
        this.data as unknown[],
        transform as (item: unknown, index: number, array: unknown[]) => Promise<unknown>
      );
      return new ChainableWrapper(results);
    }
    const result = await transform(this.data, 0);
    return new ChainableWrapper([result]);
  }

  /**
   * Side effects without changing the stream (RxJS-style)
   */
  tap(fn: (item: unknown, index?: number) => void): ChainableWrapper {
    if (Array.isArray(this.data)) {
      const array = this.data as unknown[];
      array.forEach((item, index) => {
        fn(item, index);
      });
    } else {
      fn(this.data, 0);
    }
    return new ChainableWrapper(this.data);
  }

  /**
   * Prepend initial value
   */
  startWith(value: unknown): ChainableWrapper {
    if (Array.isArray(this.data)) {
      return new ChainableWrapper([value, ...this.data]);
    } else {
      return new ChainableWrapper([value, this.data]);
    }
  }

  // Make ChainableWrapper iterable when wrapping arrays for spread operator support
  [Symbol.iterator](): Iterator<unknown> {
    if (Array.isArray(this.data)) {
      return this.data[Symbol.iterator]();
    }
    // For non-arrays, return empty iterator
    return [][Symbol.iterator]();
  }
}
