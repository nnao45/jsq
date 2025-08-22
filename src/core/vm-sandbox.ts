const isolatedVM = require('isolated-vm');
const ivm = isolatedVM;
import type {
  VMOptions,
  VMContext,
  VMResult,
  SerializedValue,
  VMSandboxConfig,
  IsolatePool,
  ExecutionMetrics,
  TransferableValue,
  SandboxCapabilities,
  SandboxError,
} from '@/types/sandbox';
import { VMAdvancedFeatures } from './vm-advanced-features';
import { VMResourceManager } from './vm-resource-manager';

export class VMSandbox {
  private config: VMSandboxConfig;
  private isolatePool: IsolatePool;
  private capabilities: SandboxCapabilities;
  private resourceManager: VMResourceManager;

  constructor(options: Partial<VMSandboxConfig> = {}) {
    this.config = this.createConfig(options);
    this.isolatePool = this.createIsolatePool();
    this.capabilities = this.createCapabilities(options);
    this.resourceManager = new VMResourceManager({
      memoryLimit: this.config.memoryLimit,
      wallTimeLimit: this.config.timeout,
      maxContextSize: this.config.maxContextSize,
    });
  }

  private createConfig(options: Partial<VMSandboxConfig>): VMSandboxConfig {
    return {
      memoryLimit: options.memoryLimit ?? 128, // MB
      timeout: options.timeout ?? 30000, // ms
      cpuLimit: options.cpuLimit,
      heapSnapshotLimit: options.heapSnapshotLimit,
      enableAsync: options.enableAsync ?? true,
      enableGenerators: options.enableGenerators ?? true,
      enableProxies: options.enableProxies ?? false,
      enableSymbols: options.enableSymbols ?? true,
      maxContextSize: options.maxContextSize ?? 10 * 1024 * 1024, // 10MB
      recycleIsolates: options.recycleIsolates ?? true,
      isolatePoolSize: options.isolatePoolSize ?? 3,
    };
  }

  private createIsolatePool(): IsolatePool {
    return {
      available: [],
      maxSize: this.config.isolatePoolSize,
      maxUseCount: 100,
      maxAge: 5 * 60 * 1000, // 5 minutes
    };
  }

  private createCapabilities(options: Partial<VMSandboxConfig>): SandboxCapabilities {
    const strictMode = options.memoryLimit && options.memoryLimit < 64;

    return {
      console: true,
      timers: !strictMode,
      promises: true,
      json: true,
      math: true,
      date: true,
      array: true,
      object: true,
      string: true,
      number: true,
      boolean: true,
      regexp: true,
      error: true,
      map: true,
      set: true,
      weakmap: !strictMode,
      weakset: !strictMode,
      proxy: this.config.enableProxies,
      reflect: true,
      symbol: this.config.enableSymbols,
      bigint: true,
      intl: !strictMode,
      buffer: false, // Never allow Buffer in sandbox
      url: false, // URL parsing could be a security risk
      crypto: false, // Crypto should be explicitly provided if needed
    };
  }

  async execute<T = unknown>(
    code: string,
    context: VMContext = {},
    options: VMOptions = {}
  ): Promise<VMResult<T>> {
    const startTime = Date.now();
    const metrics: ExecutionMetrics = {
      startTime,
      memoryBefore: process.memoryUsage().heapUsed,
      success: false,
    };

    let isolate: ivm.Isolate | null = null;
    let vmContext: ivm.Context | null = null;
    let executionId: string | null = null;

    try {
      // Validate context size before proceeding
      for (const [key, value] of Object.entries(context)) {
        const validation = this.resourceManager.validateValueSize(value, key);
        if (!validation.valid) {
          throw new Error(`Context validation failed: ${validation.error}`);
        }
      }

      // Get or create isolate with resource management
      isolate = this.config.recycleIsolates
        ? await this.getOrCreateIsolate(options)
        : this.resourceManager.createManagedIsolate();

      // Start resource monitoring
      executionId = this.resourceManager.startExecution(isolate);

      vmContext = await isolate.createContext();

      // Set up the sandbox environment
      await this.setupSandboxEnvironment(vmContext, context, isolate);

      // Compile and run the script with resource monitoring
      const script = await isolate.compileScript(this.wrapCode(code), { produceCachedData: false });

      const timeout = options.timeout ?? this.config.timeout;

      // Execute with resource checking
      const result = await this.executeWithResourceMonitoring(
        script,
        vmContext,
        timeout,
        executionId
      );

      // Deserialize the result
      const deserializedResult = await this.deserializeValue(result, isolate);

      // Get final metrics
      const resourceMetrics = this.resourceManager.endExecution(executionId);
      if (resourceMetrics) {
        Object.assign(metrics, resourceMetrics);
      } else {
        metrics.endTime = Date.now();
        metrics.memoryAfter = process.memoryUsage().heapUsed;
        metrics.wallTime = metrics.endTime - metrics.startTime;
      }

      metrics.success = true;

      return {
        value: deserializedResult as T,
        executionTime: metrics.wallTime || metrics.endTime! - metrics.startTime,
        memoryUsed: (metrics.memoryAfter || 0) - metrics.memoryBefore,
      };
    } catch (error) {
      metrics.endTime = Date.now();
      metrics.success = false;
      metrics.error = error instanceof Error ? error.message : String(error);

      // End resource monitoring if it was started
      if (executionId) {
        this.resourceManager.endExecution(executionId);
      }

      throw this.createSandboxError(error, metrics);
    } finally {
      // Clean up context
      if (vmContext) {
        vmContext.release();
      }

      // Return isolate to pool or dispose
      if (isolate && this.config.recycleIsolates) {
        this.returnIsolateToPool(isolate);
      } else if (isolate) {
        isolate.dispose();
      }
    }
  }

  private async getOrCreateIsolate(options: VMOptions): Promise<ivm.Isolate> {
    // Try to get from pool if recycling is enabled
    if (this.config.recycleIsolates) {
      const pooled = this.getFromPool();
      if (pooled) {
        return pooled;
      }
    }

    // Create new isolate
    const memoryLimit = options.memoryLimit ?? this.config.memoryLimit;
    return new isolatedVM.Isolate({
      memoryLimit,
      inspector: false, // Never enable inspector in production
    });
  }

  private getFromPool(): ivm.Isolate | null {
    const now = Date.now();
    const pool = this.isolatePool.available;

    // Find a suitable isolate
    for (let i = 0; i < pool.length; i++) {
      const item = pool[i];
      if (!item) continue;

      const age = now - item.lastUsed;
      if (age < this.isolatePool.maxAge && item.useCount < this.isolatePool.maxUseCount) {
        // Remove from pool and return
        pool.splice(i, 1);
        item.useCount++;
        return item.isolate;
      }
    }

    return null;
  }

  private returnIsolateToPool(isolate: ivm.Isolate): void {
    if (this.isolatePool.available.length >= this.isolatePool.maxSize) {
      // Pool is full, dispose the isolate
      isolate.dispose();
      return;
    }

    // Add to pool
    this.isolatePool.available.push({
      isolate,
      lastUsed: Date.now(),
      useCount: 1,
    });
  }

  private async setupSandboxEnvironment(
    context: ivm.Context,
    userContext: VMContext,
    isolate: ivm.Isolate
  ): Promise<void> {
    const jail = context.global;

    // Set up console if enabled
    if (this.capabilities.console) {
      await this.setupConsole(jail, isolate);
    }

    // Set up standard globals
    await this.setupGlobals(jail, isolate);

    // Set up advanced features based on configuration
    // TODO: Fix VMAdvancedFeatures setup - temporarily disabled
    /*
    await VMAdvancedFeatures.setupAllFeatures(jail, isolate, {
      enableAsync: this.config.enableAsync,
      enableGenerators: this.config.enableGenerators,
      enableProxies: this.config.enableProxies,
      enableSymbols: this.config.enableSymbols,
      enableWeakCollections: this.capabilities.weakmap || this.capabilities.weakset,
      enableTypedArrays: true, // Always enable typed arrays
      enableIntl: this.capabilities.intl,
      enableBigInt: this.capabilities.bigint,
      enableIterators: true, // Always enable iterators
      enableErrorHandling: this.capabilities.error,
    });
    */

    // Add user-provided context
    await this.addUserContext(jail, userContext, isolate);
  }

  private async setupConsole(jail: ivm.Reference, isolate: ivm.Isolate): Promise<void> {
    // TODO: Fix console setup - temporarily disabled
    // Console is not available by default in isolated-vm
    // For now, skip console setup to avoid errors
  }

  private async setupGlobals(jail: ivm.Reference, isolate: ivm.Isolate): Promise<void> {
    // JSON - Native object is already available
    if (this.capabilities.json) {
      // JSON is natively available in isolated-vm
      // No need to set it up manually
    }

    // Math - Native object is already available
    if (this.capabilities.math) {
      // Math is natively available in isolated-vm
      // No need to set it up manually
    }

    // Date - Native constructor is already available in isolated-vm
    if (this.capabilities.date) {
      // Date is natively available in isolated-vm, no need to set it up
    }

    // Array - Native constructor is already available with all static methods
    if (this.capabilities.array) {
      // Array constructor and its static methods are natively available
      // No need to add them manually
    }

    // Object - Native constructor is already available with all static methods
    if (this.capabilities.object) {
      // Object constructor and its static methods are natively available
      // No need to add them manually
    }

    // String - Native constructor is already available with all static methods
    if (this.capabilities.string) {
      // String constructor and its static methods are natively available
      // No need to add them manually
    }

    // Number - Native constructor is already available with all static methods and constants
    if (this.capabilities.number) {
      // Number constructor and its static methods/constants are natively available
      // No need to add them manually
    }

    // Boolean - Native constructor is already available
    if (this.capabilities.boolean) {
      // Boolean is natively available in isolated-vm
    }

    // Set and Map - Native constructors are already available
    if (this.capabilities.set) {
      // Set is natively available in isolated-vm
    }
    if (this.capabilities.map) {
      // Map is natively available in isolated-vm
    }

    // Error types - Native constructors are already available
    if (this.capabilities.error) {
      // Error, TypeError, ReferenceError, SyntaxError, RangeError are natively available
    }

    // RegExp - Native constructor is already available
    if (this.capabilities.regexp) {
      // RegExp is natively available in isolated-vm
    }

    // Symbol - Skip for now as Symbols don't transfer well across VM boundary
    if (this.capabilities.symbol) {
      // Symbol support is limited in isolated-vm
    }

    // Reflect - Native object is already available
    if (this.capabilities.reflect) {
      // Reflect is natively available in isolated-vm
      // No need to set it up manually
    }

    // Promise - Skip for now as Promise support is built-in
    if (this.capabilities.promises) {
      // Promises are handled by the VM natively
    }
  }

  private async addUserContext(
    jail: ivm.Reference,
    context: VMContext,
    isolate: ivm.Isolate
  ): Promise<void> {
    for (const [key, value] of Object.entries(context)) {
      const serialized = await this.serializeValue(value, isolate);
      await jail.set(key, serialized);
    }
  }

  private async serializeValue(value: unknown, isolate: ivm.Isolate): Promise<any> {
    // Handle primitives
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    // Handle dates
    if (value instanceof Date) {
      return new isolatedVM.ExternalCopy(value.toISOString()).copyInto();
    }

    // Handle regular expressions
    if (value instanceof RegExp) {
      return new isolatedVM.ExternalCopy({
        __regexp: true,
        source: value.source,
        flags: value.flags,
      }).copyInto();
    }

    // Handle arrays
    if (Array.isArray(value)) {
      const serializedArray: unknown[] = [];
      for (const item of value) {
        serializedArray.push(await this.serializeValue(item, isolate));
      }
      return new isolatedVM.ExternalCopy(serializedArray).copyInto();
    }

    // Handle functions
    if (typeof value === 'function') {
      // Functions need special handling - create a reference
      return new isolatedVM.Reference(value);
    }

    // Handle objects
    if (typeof value === 'object' && value !== null) {
      try {
        // Check if object is too large
        const size = JSON.stringify(value).length;
        if (size > this.config.maxContextSize) {
          throw new Error(`Object too large for sandbox context: ${size} bytes`);
        }

        return new isolatedVM.ExternalCopy(value).copyInto();
      } catch (error) {
        // If serialization fails, try to create a simpler representation
        const simplified: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
          try {
            simplified[key] = await this.serializeValue(val, isolate);
          } catch {
            simplified[key] = '[Unserializable]';
          }
        }
        return new isolatedVM.ExternalCopy(simplified).copyInto();
      }
    }

    return new isolatedVM.ExternalCopy(value).copyInto();
  }

  private async deserializeValue(value: unknown, isolate: ivm.Isolate): Promise<unknown> {
    // Handle ivm References
    if (value instanceof isolatedVM.Reference) {
      try {
        return await value.copy();
      } catch {
        return '[Reference]';
      }
    }

    // Handle special serialized types
    if (value && typeof value === 'object' && '__regexp' in value) {
      const regexpData = value as { source: string; flags: string };
      return new RegExp(regexpData.source, regexpData.flags);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      for (const item of value) {
        result.push(await this.deserializeValue(item, isolate));
      }
      return result;
    }

    // Handle objects
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = await this.deserializeValue(val, isolate);
      }
      return result;
    }

    return value;
  }

  private wrapCode(code: string): string {
    // Wrap code to support both sync and async execution
    // Check if the code looks like an expression or statements
    const trimmedCode = code.trim();
    const isExpression =
      !trimmedCode.includes(';') &&
      !trimmedCode.includes('\n') &&
      !trimmedCode.startsWith('const ') &&
      !trimmedCode.startsWith('let ') &&
      !trimmedCode.startsWith('var ');

    if (isExpression) {
      // Single expression - wrap with return
      return `
        (async function() {
          'use strict';
          try {
            const __result = await (async function() {
              return (${code});
            })();
            return __result;
          } catch (error) {
            if (error instanceof Error) {
              throw new Error(error.message);
            }
            throw error;
          }
        })()
      `;
    } else {
      // Multiple statements - need to capture the last expression
      // Try to extract the last expression
      const lines = code
        .trim()
        .split('\n')
        .filter(line => line.trim());
      const lastLine = lines[lines.length - 1]?.trim();

      if (lastLine && lastLine.endsWith(';')) {
        // Remove the semicolon from the last line to make it an expression
        const lastExpression = lastLine.slice(0, -1).trim();
        const otherLines = lines.slice(0, -1).join('\n');

        return `
          (async function() {
            'use strict';
            try {
              ${otherLines}
              return ${lastExpression};
            } catch (error) {
              if (error instanceof Error) {
                throw new Error(error.message);
              }
              throw error;
            }
          })()
        `;
      } else {
        // Can't determine what to return
        return `
          (async function() {
            'use strict';
            try {
              ${code}
            } catch (error) {
              if (error instanceof Error) {
                throw new Error(error.message);
              }
              throw error;
            }
          })()
        `;
      }
    }
  }

  private createSandboxError(error: unknown, metrics: ExecutionMetrics): SandboxError {
    let code: SandboxError['code'] = 'EXECUTION_ERROR';
    let message = 'Unknown error';
    let details: unknown;

    if (error instanceof Error) {
      message = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
      // Handle error-like objects from VM boundary
      message = String((error as any).message);

      if (message.includes('timeout') || message.includes('timed out')) {
        code = 'TIMEOUT';
        message = `Execution timeout after ${metrics.wallTime || this.config.timeout}ms`;
      } else if (
        message.includes('memory') ||
        message.includes('disposed during execution') ||
        message.includes('memory limit')
      ) {
        code = 'MEMORY_LIMIT';
        message = `Memory limit exceeded (limit: ${this.config.memoryLimit}MB)`;
      } else if (message.includes('Security')) {
        code = 'SECURITY_VIOLATION';
      }
    }

    const sandboxError = new Error(message) as SandboxError;
    sandboxError.code = code;
    sandboxError.details = details || metrics;
    sandboxError.name = 'SandboxError';

    return sandboxError;
  }

  async dispose(): Promise<void> {
    // Dispose all pooled isolates
    for (const item of this.isolatePool.available) {
      try {
        item.isolate.dispose();
      } catch {
        // Ignore disposal errors
      }
    }
    this.isolatePool.available = [];

    // Clean up resource manager
    this.resourceManager.cleanup();
  }

  private async executeWithResourceMonitoring(
    script: ivm.Script,
    vmContext: ivm.Context,
    timeout: number,
    executionId: string
  ): Promise<any> {
    const monitoringInterval = 100; // Check every 100ms
    let resourceError: Error | null = null;

    // Set up monitoring interval
    const monitor = setInterval(() => {
      const check = this.resourceManager.checkResourceLimits(executionId);
      if (check.shouldTerminate) {
        clearInterval(monitor);
        resourceError = new Error(check.reason || 'Resource limit exceeded');
      }
    }, monitoringInterval);

    try {
      // Execute the script
      const resultPromise = script.run(vmContext, {
        timeout,
        promise: true,
      });

      // Race between script execution and resource monitoring
      const checkInterval = 10; // Check more frequently
      while (!resourceError) {
        // Check if result is ready
        const raceResult = await Promise.race([
          resultPromise,
          new Promise(resolve => setTimeout(resolve, checkInterval))
        ]);
        
        if (raceResult !== undefined) {
          clearInterval(monitor);
          return raceResult;
        }
      }

      // If we get here, resource limit was exceeded
      clearInterval(monitor);
      throw resourceError;
    } catch (error) {
      clearInterval(monitor);
      if (resourceError) {
        throw resourceError;
      }
      throw error;
    }
  }

  cleanPool(): void {
    const now = Date.now();
    const pool = this.isolatePool.available;

    for (let i = pool.length - 1; i >= 0; i--) {
      const item = pool[i];
      if (!item) continue;

      const age = now - item.lastUsed;
      if (age > this.isolatePool.maxAge || item.useCount >= this.isolatePool.maxUseCount) {
        try {
          item.isolate.dispose();
        } catch {
          // Ignore disposal errors
        }
        pool.splice(i, 1);
      }
    }
  }

  getPoolStatus(): { size: number; maxSize: number } {
    return {
      size: this.isolatePool.available.length,
      maxSize: this.isolatePool.maxSize,
    };
  }

  getResourceStatistics() {
    return this.resourceManager.getStatistics();
  }

  validateContextValue(value: unknown, path?: string) {
    return this.resourceManager.validateValueSize(value, path);
  }

  getConfig(): Readonly<VMSandboxConfig> {
    return { ...this.config };
  }

  getCapabilities(): Readonly<SandboxCapabilities> {
    return { ...this.capabilities };
  }
}
