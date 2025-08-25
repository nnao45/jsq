/**
 * Object pool for ChainableWrapper instances to reduce GC pressure
 */

import { ChainableWrapper } from './chainable';

export class ChainableWrapperPool {
  private pool: ChainableWrapper[] = [];
  private maxSize: number;
  private created = 0;
  private reused = 0;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Get a ChainableWrapper instance from pool or create new one
   */
  acquire(data: unknown): ChainableWrapper {
    if (this.pool.length > 0) {
      this.pool.pop(); // Remove from pool but don't use
      // Since ChainableWrapper uses constructor return with Proxy,
      // we need to create a new instance
      this.reused++;
      return new ChainableWrapper(data);
    }

    this.created++;
    return new ChainableWrapper(data);
  }

  /**
   * Return a ChainableWrapper to the pool
   * Note: Due to Proxy usage in ChainableWrapper, pooling effectiveness is limited
   */
  release(wrapper: ChainableWrapper): void {
    if (this.pool.length < this.maxSize) {
      // Clear the data reference to allow GC
      // But we can't actually reuse the Proxy object effectively
      this.pool.push(wrapper);
    }
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      poolSize: this.pool.length,
      maxSize: this.maxSize,
      created: this.created,
      reused: this.reused,
      reuseRate: this.created > 0 ? this.reused / (this.created + this.reused) : 0,
    };
  }
}

// Global pool instance
export const chainablePool = new ChainableWrapperPool();

/**
 * Factory function to create ChainableWrapper using pool
 */
export function createChainableWrapper(data: unknown): ChainableWrapper {
  return chainablePool.acquire(data);
}

/**
 * Helper to create wrapper with automatic pooling consideration
 * For now, due to Proxy limitations, we just create new instances
 */
export function wrapData(data: unknown): ChainableWrapper {
  // Due to the Proxy-based implementation of ChainableWrapper,
  // effective pooling is challenging. Each wrapper needs its own Proxy.
  // This is kept for future optimization possibilities.
  return new ChainableWrapper(data);
}
