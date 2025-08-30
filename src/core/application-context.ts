/**
 * Application-wide context that holds all "global" instances
 * This allows proper cleanup by disposing a single context object
 */

import type { QuickJSWASMModule } from 'quickjs-emscripten';
import { LRUCache } from './lib/expression-cache';

export class ApplicationContext {
  // Expression caches
  public readonly expressionCache: LRUCache<string, string>;
  public readonly compiledFunctionCache: LRUCache<string, (...args: unknown[]) => unknown>;

  // QuickJS WASM module (singleton per context)
  private quickjsModule: QuickJSWASMModule | null = null;
  private quickjsInitialized = false;
  private quickjsInitError: Error | null = null;

  constructor() {
    // Initialize all "global" instances as instance variables
    this.expressionCache = new LRUCache<string, string>();
    this.compiledFunctionCache = new LRUCache<string, (...args: unknown[]) => unknown>();
  }

  /**
   * Get or initialize QuickJS WASM module
   */
  async getQuickJSModule(): Promise<QuickJSWASMModule> {
    if (this.quickjsInitError) {
      throw this.quickjsInitError;
    }

    if (!this.quickjsModule || !this.quickjsInitialized) {
      try {
        const { getQuickJS, getQuickJSSync } = await import('quickjs-emscripten');

        // Always initialize async version first
        this.quickjsModule = await getQuickJS();
        this.quickjsInitialized = true;

        // Try sync version for subsequent calls if available
        if (typeof getQuickJSSync === 'function') {
          try {
            // This should now work after async initialization
            const syncQuickjs = getQuickJSSync();
            if (syncQuickjs) {
              this.quickjsModule = syncQuickjs;
            }
          } catch {
            // Sync version failed, but we have async version
          }
        }
      } catch (error) {
        // Cache the error so we don't retry
        if (error instanceof Error) {
          if (
            error.message.includes('dynamic import callback') ||
            error.message.includes('experimental-vm-modules') ||
            (error as Error & { code?: string }).code ===
              'ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG'
          ) {
            this.quickjsInitError = new Error(
              'QuickJS cannot be initialized in the current environment. ' +
                'Jest tests require --experimental-vm-modules flag. ' +
                'Run with NODE_OPTIONS=--experimental-vm-modules'
            );
          } else {
            this.quickjsInitError = error;
          }
        } else {
          this.quickjsInitError = new Error(String(error));
        }
        throw this.quickjsInitError;
      }
    }
    return this.quickjsModule;
  }

  /**
   * Clean up all resources
   */
  async dispose(): Promise<void> {
    // Clear caches
    this.expressionCache.clear();
    this.compiledFunctionCache.clear();

    // QuickJS WASM module doesn't have a dispose method
    // Just clear the reference

    // Clear QuickJS module reference
    this.quickjsModule = null;
    this.quickjsInitialized = false;
    this.quickjsInitError = null;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      expressionCache: this.expressionCache.getStats(),
      compiledFunctionCache: this.compiledFunctionCache.getStats(),
    };
  }
}

/**
 * Factory function to create a new application context
 */
export function createApplicationContext(): ApplicationContext {
  return new ApplicationContext();
}
