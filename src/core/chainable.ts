export class ChainableWrapper {
  private data: unknown;

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
            return value.bind(target);
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
      const seen = new Set();
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
        arr.reduce(
          (acc: unknown[], val: unknown) =>
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
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex sorting logic required for multi-key orderBy
    return (a: unknown, b: unknown): number => {
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
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

  // Make ChainableWrapper iterable when wrapping arrays for spread operator support
  [Symbol.iterator](): Iterator<unknown> {
    if (Array.isArray(this.data)) {
      return this.data[Symbol.iterator]();
    }
    // For non-arrays, return empty iterator
    return [][Symbol.iterator]();
  }
}
