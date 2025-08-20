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
}
