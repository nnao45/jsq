/**
 * Cache for JSON.stringify results to avoid redundant operations
 */

import { LRUCache } from '../core/expression-cache';

/**
 * Weak reference based cache for JSON stringification
 * Uses WeakMap for automatic garbage collection
 */
export class JSONStringifyCache {
  private cache = new WeakMap<object, string>();
  private stats = {
    hits: 0,
    misses: 0,
  };

  /**
   * Get or compute stringified JSON
   */
  getOrCompute(
    obj: unknown,
    replacer?: (key: string, value: unknown) => unknown,
    space?: string | number
  ): string {
    // Only cache objects, not primitives
    if (typeof obj !== 'object' || obj === null) {
      this.stats.misses++;
      return JSON.stringify(obj, replacer, space);
    }

    // Check if we have a cached result
    const cached = this.cache.get(obj);
    if (cached !== undefined && replacer === undefined && space === undefined) {
      this.stats.hits++;
      return cached;
    }

    // Compute and cache
    this.stats.misses++;
    const result = JSON.stringify(obj, replacer, space);

    // Only cache simple stringifications (no replacer or spacing)
    if (replacer === undefined && space === undefined) {
      this.cache.set(obj, result);
    }

    return result;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits > 0 ? this.stats.hits / (this.stats.hits + this.stats.misses) : 0,
    };
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache = new WeakMap();
    this.stats = { hits: 0, misses: 0 };
  }
}

/**
 * Size-limited LRU cache for JSON operations
 */
export class JSONOperationCache extends LRUCache<string, unknown> {
  constructor(maxSize: number = 10 * 1024 * 1024) {
    super(maxSize, 1000);
  }

  /**
   * Parse JSON with caching
   */
  parse(json: string): unknown {
    const cached = this.get(json);
    if (cached !== undefined) {
      return cached;
    }

    const parsed = JSON.parse(json);
    this.set(json, parsed, json.length * 2); // Rough size estimate
    return parsed;
  }

  /**
   * Stringify with caching
   */
  stringify(
    obj: unknown,
    replacer?: (key: string, value: unknown) => unknown,
    space?: string | number
  ): string {
    // Create a unique key for the operation
    const key = this.createKey(obj, replacer, space);
    const cached = this.get(key);
    if (cached !== undefined && typeof cached === 'string') {
      return cached;
    }

    const stringified = JSON.stringify(obj, replacer, space);
    this.set(key, stringified, stringified.length * 2);
    return stringified;
  }

  private createKey(
    obj: unknown,
    replacer?: (key: string, value: unknown) => unknown,
    space?: string | number
  ): string {
    // Create a simple hash of the object structure
    const objKey =
      typeof obj === 'object' && obj !== null
        ? `obj:${Object.keys(obj as Record<string, unknown>).join(',')}`
        : String(obj);
    return `${objKey}:${replacer ? 'r' : ''}:${space ?? ''}`;
  }
}

// Global instances
export const jsonStringifyCache = new JSONStringifyCache();
export const jsonOperationCache = new JSONOperationCache();
