// VM-compatible ChainableWrapper without Proxy
export class VMChainableWrapper {
  private data: unknown;

  constructor(data: unknown) {
    this.data = data;
    // Add a marker for VM detection
    (this as Record<string, unknown>).__isVMChainableWrapper = true;

    // For objects, add direct property access without Proxy
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      for (const [key, value] of Object.entries(obj)) {
        if (
          key !== 'data' &&
          key !== 'value' &&
          key !== 'constructor' &&
          key !== '__isVMChainableWrapper' &&
          typeof this[key as keyof this] === 'undefined'
        ) {
          try {
            // Use a direct property instead of getter for VM compatibility
            (this as Record<string, unknown>)[key] = new VMChainableWrapper(value);
          } catch (_error) {
            // Skip properties that can't be defined
          }
        }
      }
    }
  }

  // Core data access
  get value(): unknown {
    return this.data;
  }

  // Property access for objects
  get(key: string): VMChainableWrapper {
    if (this.isObject(this.data) && key in this.data) {
      return new VMChainableWrapper((this.data as Record<string, unknown>)[key]);
    }
    return new VMChainableWrapper(undefined);
  }

  // Array-like operations
  filter(predicate: (item: unknown, index?: number) => boolean): VMChainableWrapper {
    if (Array.isArray(this.data)) {
      return new VMChainableWrapper(this.data.filter(predicate));
    }
    return new VMChainableWrapper([]);
  }

  map<T>(transform: (item: unknown, index?: number) => T): VMChainableWrapper {
    if (Array.isArray(this.data)) {
      return new VMChainableWrapper(this.data.map(transform));
    }
    return new VMChainableWrapper([]);
  }

  // jQuery-like methods
  find(predicate: (item: unknown) => boolean): VMChainableWrapper {
    if (Array.isArray(this.data)) {
      return new VMChainableWrapper(this.data.find(predicate));
    }
    return new VMChainableWrapper(undefined);
  }

  where(key: string, value: unknown): VMChainableWrapper {
    if (Array.isArray(this.data)) {
      const filtered = this.data.filter(item => {
        if (this.isObject(item) && key in item) {
          return (item as Record<string, unknown>)[key] === value;
        }
        return false;
      });
      return new VMChainableWrapper(filtered);
    }
    return new VMChainableWrapper([]);
  }

  pluck(key: string): VMChainableWrapper {
    if (Array.isArray(this.data)) {
      const values = this.data
        .map(item => {
          if (this.isObject(item) && key in item) {
            return (item as Record<string, unknown>)[key];
          }
          return undefined;
        })
        .filter(val => val !== undefined);
      return new VMChainableWrapper(values);
    }
    return new VMChainableWrapper([]);
  }

  sortBy(key: string | ((item: unknown) => number | string)): VMChainableWrapper {
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
      return new VMChainableWrapper(sorted);
    }
    return new VMChainableWrapper([]);
  }

  take(count: number): VMChainableWrapper {
    if (Array.isArray(this.data)) {
      return new VMChainableWrapper(this.data.slice(0, count));
    }
    return new VMChainableWrapper([]);
  }

  skip(count: number): VMChainableWrapper {
    if (Array.isArray(this.data)) {
      return new VMChainableWrapper(this.data.slice(count));
    }
    return new VMChainableWrapper([]);
  }

  // Aggregation methods
  length(): VMChainableWrapper {
    if (Array.isArray(this.data)) {
      return new VMChainableWrapper(this.data.length);
    }
    if (this.isObject(this.data)) {
      return new VMChainableWrapper(Object.keys(this.data as Record<string, unknown>).length);
    }
    return new VMChainableWrapper(0);
  }

  sum(key?: string): VMChainableWrapper {
    if (Array.isArray(this.data)) {
      const values = key
        ? this.data.map(item => (this.isObject(item) ? (item as Record<string, unknown>)[key] : 0))
        : this.data;

      const sum = values.reduce((acc, val) => {
        return acc + (typeof val === 'number' ? val : 0);
      }, 0);

      return new VMChainableWrapper(sum);
    }
    return new VMChainableWrapper(0);
  }

  // Utility methods
  keys(): VMChainableWrapper {
    if (this.isObject(this.data)) {
      return new VMChainableWrapper(Object.keys(this.data as Record<string, unknown>));
    }
    return new VMChainableWrapper([]);
  }

  values(): VMChainableWrapper {
    if (this.isObject(this.data)) {
      return new VMChainableWrapper(Object.values(this.data as Record<string, unknown>));
    }
    return new VMChainableWrapper([]);
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
