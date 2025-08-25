import type ivm from 'isolated-vm';

import type { ExecutionMetrics } from '@/types/sandbox';

export interface ResourceLimits {
  memoryLimit: number; // MB
  cpuTimeLimit?: number; // ms
  wallTimeLimit: number; // ms
  heapSnapshotLimit?: number; // bytes
  maxContextSize: number; // bytes
  maxStringLength: number; // characters
  maxArrayLength: number; // elements
}

export interface ResourceUsage {
  memoryUsed: number;
  cpuTime?: number;
  wallTime: number;
  heapSize?: number;
  contextSize: number;
}

export class VMResourceManager {
  private limits: ResourceLimits;
  private activeExecutions = new Map<
    string,
    {
      startTime: number;
      startMemory: number;
      isolate: ivm.Isolate;
      executionId: string;
    }
  >();

  constructor(limits: Partial<ResourceLimits> = {}) {
    this.limits = {
      memoryLimit: limits.memoryLimit ?? 128,
      cpuTimeLimit: limits.cpuTimeLimit,
      wallTimeLimit: limits.wallTimeLimit ?? 30000,
      heapSnapshotLimit: limits.heapSnapshotLimit,
      maxContextSize: limits.maxContextSize ?? 10 * 1024 * 1024,
      maxStringLength: limits.maxStringLength ?? 1024 * 1024,
      maxArrayLength: limits.maxArrayLength ?? 100000,
    };
  }

  /**
   * Create a monitored isolate with resource limits
   */
  createManagedIsolate(): ivm.Isolate {
    // biome-ignore lint/suspicious/noExplicitAny: isolateOptions type varies by isolated-vm version
    const isolateOptions: any = {
      memoryLimit: this.limits.memoryLimit,
      inspector: false, // Never enable inspector for security
    };

    // Add CPU limit if available (requires newer isolated-vm versions)
    if (this.limits.cpuTimeLimit) {
      isolateOptions.cpuTimeLimit = this.limits.cpuTimeLimit;
    }

    const isolate = new isolatedVM.Isolate(isolateOptions);

    // Set up memory monitoring
    this.setupMemoryMonitoring(isolate);

    return isolate;
  }

  /**
   * Start monitoring an execution
   */
  startExecution(isolate: ivm.Isolate): string {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    this.activeExecutions.set(executionId, {
      startTime,
      startMemory,
      isolate,
      executionId,
    });

    return executionId;
  }

  /**
   * End monitoring and get metrics
   */
  endExecution(executionId: string): ExecutionMetrics | null {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return null;
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    const metrics: ExecutionMetrics = {
      startTime: execution.startTime,
      endTime,
      memoryBefore: execution.startMemory,
      memoryAfter: endMemory,
      wallTime: endTime - execution.startTime,
      success: true,
    };

    // Clean up
    this.activeExecutions.delete(executionId);

    return metrics;
  }

  /**
   * Check if execution should be terminated due to resource limits
   */
  checkResourceLimits(executionId: string): { shouldTerminate: boolean; reason?: string } {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return { shouldTerminate: false };
    }

    const currentTime = Date.now();
    const wallTime = currentTime - execution.startTime;

    // Check wall time limit
    if (wallTime > this.limits.wallTimeLimit) {
      return {
        shouldTerminate: true,
        reason: `Execution timeout: ${wallTime}ms > ${this.limits.wallTimeLimit}ms`,
      };
    }

    // Check memory usage
    const currentMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (currentMemory - execution.startMemory) / (1024 * 1024); // Convert to MB

    if (memoryUsed > this.limits.memoryLimit * 1.2) {
      // Allow 20% overhead
      return {
        shouldTerminate: true,
        reason: `Memory limit exceeded: ${memoryUsed.toFixed(2)}MB > ${this.limits.memoryLimit}MB`,
      };
    }

    return { shouldTerminate: false };
  }

  /**
   * Validate value size before transferring to VM
   */
  validateValueSize(value: unknown, path = 'root'): { valid: boolean; error?: string } {
    try {
      const size = this.calculateValueSize(value, new Set<unknown>());

      if (size > this.limits.maxContextSize) {
        return {
          valid: false,
          error: `Value at '${path}' is too large: ${size} bytes > ${this.limits.maxContextSize} bytes`,
        };
      }

      // Check string length
      if (typeof value === 'string' && value.length > this.limits.maxStringLength) {
        return {
          valid: false,
          error: `String at '${path}' is too long: ${value.length} chars > ${this.limits.maxStringLength} chars`,
        };
      }

      // Check array length
      if (Array.isArray(value) && value.length > this.limits.maxArrayLength) {
        return {
          valid: false,
          error: `Array at '${path}' is too large: ${value.length} elements > ${this.limits.maxArrayLength} elements`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to validate value size at '${path}': ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get current resource usage for an execution
   */
  getResourceUsage(executionId: string): ResourceUsage | null {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return null;
    }

    const currentTime = Date.now();
    const currentMemory = process.memoryUsage().heapUsed;

    return {
      memoryUsed: Math.max(0, currentMemory - execution.startMemory),
      wallTime: currentTime - execution.startTime,
      contextSize: this.estimateContextSize(execution.isolate),
    };
  }

  /**
   * Clean up stale executions
   */
  cleanup(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [id, execution] of this.activeExecutions.entries()) {
      if (!execution) {
        // Handle corrupted execution data
        this.activeExecutions.delete(id);
        continue;
      }

      if (now - execution.startTime > staleThreshold) {
        console.warn(`Cleaning up stale execution: ${id}`);
        try {
          execution.isolate.dispose();
        } catch {
          // Ignore disposal errors
        }
        this.activeExecutions.delete(id);
      }
    }
  }

  /**
   * Get statistics about active executions
   */
  getStatistics(): {
    activeExecutions: number;
    totalMemoryUsed: number;
    averageWallTime: number;
    longestRunning: number;
  } {
    const now = Date.now();
    let totalMemory = 0;
    let totalWallTime = 0;
    let longestRunning = 0;

    for (const execution of this.activeExecutions.values()) {
      const currentMemory = process.memoryUsage().heapUsed;
      // Ensure memory delta is non-negative (GC can cause memory to decrease)
      const memoryDelta = Math.max(0, currentMemory - execution.startMemory);
      totalMemory += memoryDelta;

      const wallTime = now - execution.startTime;
      totalWallTime += wallTime;
      longestRunning = Math.max(longestRunning, wallTime);
    }

    const count = this.activeExecutions.size;

    return {
      activeExecutions: count,
      totalMemoryUsed: totalMemory,
      averageWallTime: count > 0 ? totalWallTime / count : 0,
      longestRunning,
    };
  }

  /**
   * Create resource-limited context wrapper
   */
  createResourceLimitedWrapper<T>(value: T): T {
    if (typeof value === 'string') {
      // Truncate strings that are too long
      if (value.length > this.limits.maxStringLength) {
        const truncated = `${value.substring(0, this.limits.maxStringLength - 3)}...`;
        console.warn(`String truncated from ${value.length} to ${truncated.length} characters`);
        return truncated as T;
      }
    }

    if (Array.isArray(value)) {
      // Truncate arrays that are too long
      if (value.length > this.limits.maxArrayLength) {
        const truncated = value.slice(0, this.limits.maxArrayLength);
        console.warn(`Array truncated from ${value.length} to ${truncated.length} elements`);
        return truncated as T;
      }
    }

    return value;
  }

  private setupMemoryMonitoring(isolate: ivm.Isolate): void {
    // Set up periodic memory monitoring
    const monitoringInterval = 1000; // 1 second

    const monitor = setInterval(async () => {
      try {
        // Get heap statistics if available
        const heapStats = await this.getHeapStatistics(isolate);
        if (heapStats && heapStats.used_heap_size > this.limits.memoryLimit * 1024 * 1024) {
          console.warn(
            `Isolate approaching memory limit: ${heapStats.used_heap_size / 1024 / 1024}MB`
          );
        }
      } catch {
        // Monitoring failed, probably because isolate was disposed
        clearInterval(monitor);
      }
    }, monitoringInterval);

    // Clean up monitor when isolate is disposed
    // Note: This is a simplified approach; in production, you'd want better lifecycle management
    setTimeout(() => clearInterval(monitor), this.limits.wallTimeLimit + 5000);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Heap statistics structure varies
  private async getHeapStatistics(_isolate: ivm.Isolate): Promise<any> {
    try {
      // Try to get heap statistics from the isolate
      // This is a simplified version - real implementation would use V8 APIs
      return {
        used_heap_size: process.memoryUsage().heapUsed,
        heap_size_limit: this.limits.memoryLimit * 1024 * 1024,
      };
    } catch {
      return null;
    }
  }

  private calculatePrimitiveSize(value: unknown): number | null {
    if (value === null || value === undefined) {
      return 8; // Rough estimate
    }

    if (typeof value === 'boolean') {
      return 4;
    }

    if (typeof value === 'number') {
      return 8;
    }

    if (typeof value === 'string') {
      return value.length * 2; // UTF-16 encoding
    }

    return null;
  }

  private calculateObjectSize(value: object, seen: Set<unknown>): number {
    // Prevent circular reference infinite loop
    if (seen.has(value)) {
      return 16; // Reference size
    }
    seen.add(value);

    let size = 32; // Object overhead

    if (Array.isArray(value)) {
      for (const item of value) {
        size += this.calculateValueSize(item, seen);
      }
    } else {
      for (const [key, val] of Object.entries(value)) {
        size += key.length * 2; // Key size
        size += this.calculateValueSize(val, seen);
      }
    }

    seen.delete(value);
    return size;
  }

  private calculateValueSize(value: unknown, seen: Set<unknown>): number {
    const primitiveSize = this.calculatePrimitiveSize(value);
    if (primitiveSize !== null) {
      return primitiveSize;
    }

    if (typeof value === 'object' && value !== null) {
      return this.calculateObjectSize(value, seen);
    }

    return 16; // Default size for unknown types
  }

  private estimateContextSize(_isolate: ivm.Isolate): number {
    // This is a simplified estimation
    // In a real implementation, you'd use V8 APIs to get actual context size
    return process.memoryUsage().heapUsed;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Dispose of the resource manager and clean up all resources
   */
  dispose(): void {
    // Clean up all active executions
    for (const [_id, execution] of this.activeExecutions.entries()) {
      try {
        execution.isolate.dispose();
      } catch {
        // Ignore disposal errors
      }
    }
    this.activeExecutions.clear();
  }
}
