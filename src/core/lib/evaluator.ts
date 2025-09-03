import type { JsqOptions } from '@/types/cli';
import type { VMContext, VMOptions } from '@/types/sandbox';
import { ErrorFormatter } from '@/utils/error-formatter';
import type { ApplicationContext } from '../application-context';
import type { ChainableWrapper } from '../chainable/chainable';
import { _ } from '../lodash/lodash-non-vm';
import { SecurityManager } from '../security/security-manager';
import { transformExpression } from './expression-transformer';
import { createSmartDollar } from './jquery-wrapper';

// Conditional VM imports to avoid issues in test environments
// biome-ignore lint/suspicious/noExplicitAny: Dynamic imports require any type
let VMSandboxSimple: any;
// biome-ignore lint/suspicious/noExplicitAny: Dynamic imports require any type
let VMSandboxQuickJS: any;
// biome-ignore lint/suspicious/noExplicitAny: Dynamic imports require any type
let getVMEngineType: any;

// Use dynamic imports for better compatibility with test environments
let vmModulesLoaded = false;

async function loadVMModules() {
  if (vmModulesLoaded) return;

  try {
    // Only import VM modules when actually needed
    const vmModule = await import('../vm/vm-sandbox-simple');
    VMSandboxSimple = vmModule.VMSandboxSimple;
  } catch (vmError) {
    // VM modules not available, sandbox functionality will be disabled
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to load vm-sandbox-simple module:', vmError);
    }
  }

  try {
    // Import QuickJS VM module
    const quickJSModule = await import('../vm/vm-sandbox-quickjs');
    VMSandboxQuickJS = quickJSModule.VMSandboxQuickJS;
  } catch (quickJSError) {
    // QuickJS VM module not available
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to load vm-sandbox-quickjs module:', quickJSError);
    }
  }

  try {
    // Import VM engine type selector
    const vmFactoryModule = await import('../vm/VMEngineFactory');
    getVMEngineType = vmFactoryModule.getVMEngineType;
  } catch (factoryError) {
    // VM factory not available
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to load VMEngineFactory module:', factoryError);
    }
  }

  vmModulesLoaded = true;
}

export class ExpressionEvaluator {
  private options: JsqOptions;
  private appContext: ApplicationContext;
  private securityManager: SecurityManager;
  private vmSandbox: typeof VMSandboxSimple | null = null;

  constructor(options: JsqOptions, appContext: ApplicationContext) {
    this.options = options;
    this.appContext = appContext;
    this.securityManager = new SecurityManager(options);

    // Note: VM sandbox initialization moved to async methods since module loading is now async
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
    // Ensure VM modules are loaded
    await loadVMModules();

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
      const shouldUseVM = this.securityManager.shouldUseVM();
      const $ = shouldUseVM ? data : createSmartDollar(data);
      const baseContext = await this.createEvaluationContext($, data);
      const secureContext = this.securityManager.createEvaluationContext(baseContext);
      const result = await this.executeExpression(transformedExpression, secureContext);
      return this.unwrapResult(result);
    } catch (error) {
      // Re-throw security errors as-is, wrap others
      if (error instanceof Error && error.message.includes('Security validation failed')) {
        throw error;
      }
      throw new Error(
        `Expression evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private transformExpression(expression: string): string {
    const transformedExpression = transformExpression(expression, this.appContext?.expressionCache);

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
        // Pass console to enable console.log in VM mode
        console: this.createConsoleObject(),
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

    // Handle SmartDollar objects
    if (this.isSmartDollar(result)) {
      return this.unwrapSmartDollar(result);
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

  private isSmartDollar(result: unknown): boolean {
    return (
      result !== null &&
      typeof result === 'object' &&
      '__isSmartDollar' in result &&
      (result as { __isSmartDollar: boolean }).__isSmartDollar === true
    );
  }

  private unwrapSmartDollar(result: unknown): unknown {
    if (this.options.verbose) {
      console.error('Debug: Unwrapping SmartDollar object');
    }
    const smartDollar = result as { _value?: unknown; value?: unknown };
    const unwrapped = smartDollar._value !== undefined ? smartDollar._value : smartDollar.value;
    if (this.options.verbose) {
      console.error('Debug: Unwrapped SmartDollar value type:', typeof unwrapped);
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
    // Return lodash function to wrap data
    return _;
  }
  private async executeInVMSandbox(
    expression: string,
    context: Record<string, unknown>
  ): Promise<unknown> {
    // Ensure VM modules are loaded
    await loadVMModules();

    if (!this.vmSandbox) {
      // Create VM sandbox on demand if not already created
      const vmConfig = this.securityManager.getVMConfig();
      if (!vmConfig) {
        throw new Error('VM configuration not available');
      }
      // Check which VM engine to use
      const engineType = getVMEngineType ? getVMEngineType() : 'quickjs';

      if (engineType === 'quickjs' && VMSandboxQuickJS) {
        this.vmSandbox = new VMSandboxQuickJS(this.appContext, vmConfig);
        if (this.options.verbose) {
          console.error('Using QuickJS VM engine (on-demand)');
        }
      } else if (VMSandboxSimple) {
        this.vmSandbox = new VMSandboxSimple(this.appContext, vmConfig);
        if (this.options.verbose) {
          console.error('Using VM engine (on-demand)');
        }
      } else {
        throw new Error('No VM sandbox available');
      }
    }

    try {
      const timeout = this.securityManager.getTimeout();
      const memoryLimit = this.securityManager.getMemoryLimit();

      const vmOptions: VMOptions = {
        ...(timeout !== undefined && { timeout }),
        ...(memoryLimit !== undefined && { memoryLimit }),
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
        // Debug: Log the original error
        if (this.options.verbose) {
          console.error('VM execution error:', error.message);
          console.error('Expression:', expression);
          console.error('Stack:', error.stack);
        }

        if (error.message.includes('Cannot find module')) {
          throw new Error(
            'VM module not found. Please ensure all dependencies are properly installed.'
          );
        }
        // Check if it's a QuickJS initialization error
        if (error.message.includes('QuickJS initialization failed')) {
          throw error; // Re-throw the descriptive error as-is
        }

        // Extract simple error message
        let simpleMessage = error.message;
        // Try to extract the actual error from QuickJS output
        const match = simpleMessage.match(/"message":"([^"]+)"/);
        if (match) {
          simpleMessage = match[1];
        }

        throw new Error(simpleMessage);
      }
      throw error;
    }
  }
}
