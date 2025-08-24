/**
 * LRU Cache implementation for transformed expressions and compiled functions
 */

interface CacheEntry<T> {
  value: T;
  size: number;
  lastAccessed: number;
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private readonly maxSize: number;
  private readonly maxEntries: number;
  private currentSize = 0;

  constructor(maxSize: number = 50 * 1024 * 1024, maxEntries: number = 10000) {
    this.maxSize = maxSize;
    this.maxEntries = maxEntries;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Update last accessed time
    entry.lastAccessed = Date.now();
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V, size: number): void {
    // Remove existing entry if present
    const existing = this.cache.get(key);
    if (existing) {
      this.currentSize -= existing.size;
      this.cache.delete(key);
    }

    // Evict entries if necessary
    while (
      (this.currentSize + size > this.maxSize || this.cache.size >= this.maxEntries) &&
      this.cache.size > 0
    ) {
      const firstKey = this.cache.keys().next().value as K;
      const firstEntry = this.cache.get(firstKey);
      if (firstEntry) {
        this.currentSize -= firstEntry.size;
        this.cache.delete(firstKey);
      }
    }

    // Add new entry
    if (size <= this.maxSize) {
      this.cache.set(key, {
        value,
        size,
        lastAccessed: Date.now(),
      });
      this.currentSize += size;
    }
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  get sizeInBytes(): number {
    return this.currentSize;
  }

  getStats() {
    return {
      entries: this.cache.size,
      sizeInBytes: this.currentSize,
      maxEntries: this.maxEntries,
      maxSizeInBytes: this.maxSize,
    };
  }
}

// Global caches for expressions and compiled functions
export const expressionCache = new LRUCache<string, string>();
export const compiledFunctionCache = new LRUCache<string, (...args: unknown[]) => unknown>();

/**
 * Get size estimate for a string in bytes
 */
export function getStringSizeInBytes(str: string): number {
  // Rough estimate: each character is 2 bytes in JavaScript
  return str.length * 2;
}

/**
 * Get size estimate for a function in bytes
 */
export function getFunctionSizeInBytes(func: (...args: unknown[]) => unknown): number {
  // Rough estimate based on function string representation
  return func.toString().length * 2;
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  expressionCache.clear();
  compiledFunctionCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    expressionCache: expressionCache.getStats(),
    compiledFunctionCache: compiledFunctionCache.getStats(),
  };
}
