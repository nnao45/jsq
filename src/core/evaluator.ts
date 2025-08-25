import type { JsqOptions } from '@/types/cli';
import type { VMContext, VMOptions } from '@/types/sandbox';
import { ErrorFormatter } from '@/utils/error-formatter';
import type { ChainableWrapper } from './chainable/chainable';
import { ExpressionTransformer } from './expression-transformer';
import { createSmartDollar } from './jquery-wrapper';
import { createLodashDollar } from './lodash/lodash-unified';
import { SecurityManager } from './security/security-manager';

// Conditional VM imports to avoid issues in test environments
// biome-ignore lint/suspicious/noExplicitAny: Dynamic imports require any type
let VMSandboxSimple: any;
// biome-ignore lint/suspicious/noExplicitAny: Dynamic imports require any type
let VMSandboxSimpleClass: any;

try {
  // Only import VM modules when actually needed
  const vmModule = require('./vm/vm-sandbox-simple');
  VMSandboxSimpleClass = vmModule.VMSandboxSimple;
  VMSandboxSimple = VMSandboxSimpleClass;
} catch (vmError) {
  // VM modules not available, sandbox functionality will be disabled
  console.debug('VM modules not available:', (vmError as Error).message);
}

export class ExpressionEvaluator {
  private options: JsqOptions;
  private securityManager: SecurityManager;
  private vmSandbox: typeof VMSandboxSimple | null = null;
  private static warningShown = false;

  constructor(options: JsqOptions) {
    this.options = options;
    this.securityManager = new SecurityManager(options);

    // Initialize VM sandbox if needed
    if (this.securityManager.shouldUseVM()) {
      const vmConfig = this.securityManager.getVMConfig();
      if (vmConfig && VMSandboxSimple) {
        this.vmSandbox = new VMSandboxSimple(vmConfig);
      }
    }

    // Show warning if --safe flag is used (no longer supported) - only once
    if (options.safe && !ExpressionEvaluator.warningShown) {
      console.warn(
        '⚠️  Warning: --safe mode has been deprecated. All evaluations now run in optimized mode.'
      );
      ExpressionEvaluator.warningShown = true;
    }
  }

  async dispose(): Promise<void> {
    // Clean up VM sandbox if it exists
    if (this.vmSandbox) {
      await this.vmSandbox.dispose();
      this.vmSandbox = null;
    }
  }

  private showSecurityWarnings(): void {
    const warnings = this.securityManager.getWarnings();
    const shouldShowWarnings =
      process.env.NODE_ENV !== 'test' || process.env.SHOW_SECURITY_WARNINGS === 'true';
    if (shouldShowWarnings) {
      for (const warning of warnings) {
        console.error(warning);
      }
    }
  }

  async evaluate(expression: string, data: unknown): Promise<unknown> {
    try {
      this.showSecurityWarnings();

      const transformedExpression = this.transformExpression(expression);

      // Validate expression security
      const validation = this.securityManager.validateExpression(transformedExpression);
      if (!validation.valid) {
        if (validation.formattedError) {
          throw new Error(validation.formattedError);
        }
        throw new Error(`Security validation failed: ${validation.errors.join(', ')}`);
      }

      // Special case: if expression is exactly '$' and data is null/undefined, return the raw data
      if (transformedExpression.trim() === '$' && (data === null || data === undefined)) {
        return data;
      }

      // Special case: if expression is exactly '_' and we're using data directly
      if (transformedExpression.trim() === '_' && !this.securityManager.shouldUseVM()) {
        // In non-VM mode, _ is lodash utilities, so need to load and wrap data
        const lodashUtils = await this.loadUtilities();
        return lodashUtils(data);
      }

      // For VM mode, don't create the smart dollar - just use data
      const $ = this.securityManager.shouldUseVM() ? data : createSmartDollar(data);
      const baseContext = await this.createEvaluationContext($, data);
      const secureContext = this.securityManager.createEvaluationContext(baseContext);
      const result = await this.executeExpression(transformedExpression, secureContext);
      return this.unwrapResult(result);
    } catch (error) {
      // Re-throw VM/security errors as-is, wrap others
      if (
        error instanceof Error &&
        (error.message.includes('isolated-vm package not found') ||
          error.message.includes('Security validation failed'))
      ) {
        throw error;
      }
      throw new Error(
        `Expression evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private transformExpression(expression: string): string {
    const transformedExpression = ExpressionTransformer.transform(expression);

    if (this.options.verbose && transformedExpression !== expression) {
      console.error('Transformed expression:', transformedExpression);
    }

    return transformedExpression;
  }

  private async createEvaluationContext(
    $: unknown,
    data: unknown
  ): Promise<Record<string, unknown>> {
    // For VM mode, only pass minimal context - VM will set up the rest
    if (this.securityManager.shouldUseVM()) {
      const vmContext: Record<string, unknown> = {
        // Don't pass console - VM will set up its own
        // VM sandbox will set up its own native constructors and objects
        data,
        // Pass the raw data or the $ passed in (which should be data in VM mode)
        // $ is already set to data in VM mode from line 107
        $: $,
        // Pass a marker for _ to trigger setupLodashUtilities in VM
        _: null, // Marker for VM to set up lodash utilities
      };
      return vmContext;
    }

    // For non-VM mode, pass full context
    const context: Record<string, unknown> = {
      $,
      console: this.createConsoleObject(),
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Set,
      Map,
      Reflect,
      Symbol,
      _: await this.loadUtilities(),
      data,
    };

    return context;
  }

  private createConsoleObject(): Record<string, unknown> {
    // Always provide console.log for user expressions
    // console.error is stderr output, so always allow it
    return {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: this.options.verbose ? console.debug : () => {},
      trace: this.options.verbose ? console.trace : () => {},
      table: console.table,
      time: console.time,
      timeEnd: console.timeEnd,
      group: console.group,
      groupEnd: console.groupEnd,
      clear: console.clear,
      count: console.count,
      assert: console.assert,
      dir: console.dir,
    };
  }

  private async executeExpression(
    transformedExpression: string,
    context: Record<string, unknown>
  ): Promise<unknown> {
    if (this.securityManager.shouldUseVM()) {
      if (this.options.verbose) {
        console.error('🔒 Running in secure VM isolation mode');
      }
      return await this.executeInVMSandbox(transformedExpression, context);
    } else {
      // This path should not be reached in normal operation since VM is default
      if (this.options.verbose) {
        console.error('⚡ Running in non-VM mode (should not happen)');
      }
      return await this.safeEval(transformedExpression, context);
    }
  }

  private async unwrapResult(result: unknown): Promise<unknown> {
    this.debugResult(result);

    // Handle promises first
    if (result instanceof Promise) {
      const awaitedResult = await result;
      // After awaiting promise, recursively process the result
      return this.unwrapResult(awaitedResult);
    }

    // Handle async generators
    if (this.isAsyncGenerator(result)) {
      return this.handleAsyncGenerator(result);
    }

    if (this.isChainableWrapper(result)) {
      return this.unwrapChainableWrapper(result);
    }

    return result;
  }

  private debugResult(result: unknown): void {
    if (this.options.verbose) {
      console.error('Debug: Result type:', typeof result, 'isArray:', Array.isArray(result));
      if (result && typeof result === 'object') {
        console.error('Debug: Result has value:', 'value' in result);
        console.error('Debug: Result constructor:', (result as object).constructor?.name);
      }
    }
  }

  private isChainableWrapper(result: unknown): boolean {
    return (
      result !== null &&
      typeof result === 'object' &&
      !Array.isArray(result) &&
      'value' in result &&
      ((result as object).constructor.name.includes('ChainableWrapper') ||
        (result as object).constructor.name.includes('_ChainableWrapper'))
    );
  }

  private isAsyncGenerator(result: unknown): result is AsyncGenerator<unknown> {
    return (
      result !== null &&
      typeof result === 'object' &&
      'next' in result &&
      typeof (result as Record<string, unknown>).next === 'function' &&
      Symbol.asyncIterator in result &&
      typeof (result as Record<symbol, unknown>)[Symbol.asyncIterator] === 'function'
    );
  }

  private async handleAsyncGenerator(generator: AsyncGenerator<unknown>): Promise<unknown[]> {
    const results: unknown[] = [];
    for await (const value of generator) {
      // Unwrap ChainableWrapper if needed
      const unwrapped = this.isChainableWrapper(value) ? this.unwrapChainableWrapper(value) : value;
      results.push(unwrapped);
    }
    return results;
  }

  private unwrapChainableWrapper(result: unknown): unknown {
    if (this.options.verbose) {
      console.error('Debug: Unwrapping result with .value');
    }
    const wrapped = result as ChainableWrapper;
    const unwrapped = wrapped.value;
    if (this.options.verbose) {
      console.error('Debug: Unwrapped value type:', typeof unwrapped);
    }
    return unwrapped;
  }

  private async safeEval(expression: string, context: Record<string, unknown>): Promise<unknown> {
    // Create a safe evaluation environment
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    try {
      // Use AsyncFunction constructor to support await keyword
      const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
      const func = new AsyncFunction(
        ...contextKeys,
        `
        "use strict";
        return (${expression});
      `
      );

      return await func(...contextValues);
    } catch (error) {
      if (error instanceof Error) {
        const formattedError = ErrorFormatter.parseExpressionError(error, expression);
        const errorMessage = ErrorFormatter.formatError(formattedError, expression);
        throw new Error(errorMessage);
      }
      throw new Error(`Invalid expression: Syntax error`);
    }
  }

  private async loadUtilities(): Promise<(value: unknown) => unknown> {
    // Return createLodashDollar function to wrap data
    return createLodashDollar;
  }
  private async executeInVMSandbox(
    expression: string,
    context: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.vmSandbox) {
      // Create VM sandbox on demand if not already created
      const vmConfig = this.securityManager.getVMConfig();
      if (!vmConfig) {
        throw new Error('VM configuration not available');
      }
      if (!VMSandboxSimple) {
        throw new Error('VM sandbox not available - isolated-vm module not found');
      }
      this.vmSandbox = new VMSandboxSimple(vmConfig);
    }

    try {
      const vmOptions: VMOptions = {
        timeout: this.securityManager.getTimeout(),
        memoryLimit: this.securityManager.getMemoryLimit(),
        allowedGlobals: this.securityManager.getSecurityContext().level.allowedGlobals,
        allowNetwork: this.securityManager.getSecurityContext().level.allowNetwork,
      };

      // Debug: Log context keys and types
      if (this.options.verbose) {
        console.error('VM Context keys:', Object.keys(context));
        for (const [key, value] of Object.entries(context)) {
          console.error(
            `  ${key}: ${typeof value}${typeof value === 'function' ? ` (${value.name || 'anonymous'})` : ''}`
          );
        }
      }

      // Create a copy of context but handle $ specially
      const vmContext: VMContext = {};
      for (const [key, value] of Object.entries(context)) {
        if (key === '$') {
          // The VM sandbox will handle $ specially, extracting data and recreating it
          // We still need to pass it, but the VM knows how to handle it
          vmContext[key] = value;
        } else {
          vmContext[key] = value;
        }
      }

      const result = await this.vmSandbox.execute(expression, vmContext, vmOptions);
      return result.value;
    } catch (error) {
      // Re-throw VM errors with more context
      if (error instanceof Error) {
        if (error.message.includes('Cannot find module')) {
          throw new Error(
            'isolated-vm package not found. Please install isolated-vm for sandbox support: npm install isolated-vm'
          );
        }
        // Format VM errors with detailed position if possible
        const formattedError = ErrorFormatter.parseExpressionError(error, expression);
        formattedError.type = 'runtime';
        formattedError.message = 'VM execution failed';
        formattedError.detail = error.message;
        const errorMessage = ErrorFormatter.formatError(formattedError, expression);
        throw new Error(errorMessage);
      }
      throw error;
    }
  }
}
