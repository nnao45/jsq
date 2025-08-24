/**
 * VM Instance Pool for isolated-vm isolates
 */

import ivm from 'isolated-vm';

interface PooledIsolate {
  isolate: unknown; // ivm.Isolate
  context: unknown; // ivm.Context
  lastUsed: number;
  useCount: number;
}

export class VMIsolatePool {
  private pool: PooledIsolate[] = [];
  private maxSize: number;
  private memoryLimit: number;
  private maxReuseCount: number;
  private maxIdleTime: number;
  private createdCount = 0;
  private reusedCount = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    maxSize: number = 5,
    memoryLimit: number = 128,
    maxReuseCount: number = 100,
    maxIdleTime: number = 5 * 60 * 1000 // 5 minutes
  ) {
    this.maxSize = maxSize;
    this.memoryLimit = memoryLimit;
    this.maxReuseCount = maxReuseCount;
    this.maxIdleTime = maxIdleTime;

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Pre-warm the pool with isolates
   */
  async prewarm(count: number = 2): Promise<void> {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < Math.min(count, this.maxSize); i++) {
      promises.push(this.createAndAddToPool());
    }
    await Promise.all(promises);
  }

  /**
   * Create a new isolate and add to pool
   */
  private async createAndAddToPool(): Promise<void> {
    try {
      const isolate = new ivm.Isolate({
        memoryLimit: this.memoryLimit,
        snapshot: ivm.Isolate.createSnapshot([{ code: 'undefined' }]),
      });
      const context = await isolate.createContext();

      this.pool.push({
        isolate,
        context,
        lastUsed: Date.now(),
        useCount: 0,
      });
      this.createdCount++;
    } catch (error) {
      console.error('Failed to create isolate for pool:', error);
    }
  }

  /**
   * Acquire an isolate from the pool
   */
  async acquire(): Promise<{ isolate: unknown; context: unknown } | null> {
    // Try to find a reusable isolate
    const now = Date.now();
    const index = this.pool.findIndex(
      item => item.useCount < this.maxReuseCount && now - item.lastUsed < this.maxIdleTime
    );

    if (index !== -1) {
      const pooled = this.pool.splice(index, 1)[0];
      this.reusedCount++;
      return {
        isolate: pooled.isolate,
        context: pooled.context,
      };
    }

    // Create new isolate if pool is not at max capacity
    if (this.pool.length + 1 <= this.maxSize) {
      try {
        const isolate = new ivm.Isolate({
          memoryLimit: this.memoryLimit,
          snapshot: ivm.Isolate.createSnapshot([{ code: 'undefined' }]),
        });
        const context = await isolate.createContext();
        this.createdCount++;
        return { isolate, context };
      } catch (error) {
        console.error('Failed to create new isolate:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Release an isolate back to the pool
   */
  release(isolate: unknown, context: unknown): void {
    // Find if this isolate is already being tracked
    const existing = this.pool.find(item => item.isolate === isolate);

    if (existing) {
      existing.useCount++;
      existing.lastUsed = Date.now();
      return;
    }

    // Add to pool if there's space and it's still valid
    if (this.pool.length < this.maxSize && !isolate.isDisposed) {
      this.pool.push({
        isolate,
        context,
        lastUsed: Date.now(),
        useCount: 1,
      });
    } else {
      // Dispose if we can't pool it
      try {
        isolate.dispose();
      } catch (_) {
        // Ignore disposal errors
      }
    }
  }

  /**
   * Clean up idle or overused isolates
   */
  private cleanup(): void {
    const now = Date.now();
    const toRemove: number[] = [];

    this.pool.forEach((item, index) => {
      if (item.useCount >= this.maxReuseCount || now - item.lastUsed > this.maxIdleTime) {
        toRemove.push(index);
      }
    });

    // Remove from end to beginning to maintain indices
    toRemove.reverse().forEach(index => {
      const removed = this.pool.splice(index, 1)[0];
      try {
        removed.isolate.dispose();
      } catch (_) {
        // Ignore disposal errors
      }
    });
  }

  /**
   * Clear all isolates from the pool
   */
  clear(): void {
    this.pool.forEach(item => {
      try {
        item.isolate.dispose();
      } catch (_) {
        // Ignore disposal errors
      }
    });
    this.pool = [];
  }

  /**
   * Dispose of the pool
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      poolSize: this.pool.length,
      maxSize: this.maxSize,
      created: this.createdCount,
      reused: this.reusedCount,
      reuseRate:
        this.createdCount > 0 ? this.reusedCount / (this.createdCount + this.reusedCount) : 0,
      isolates: this.pool.map(item => ({
        useCount: item.useCount,
        idleTime: Date.now() - item.lastUsed,
      })),
    };
  }
}

// Global pool instance
export const vmPool = new VMIsolatePool();
