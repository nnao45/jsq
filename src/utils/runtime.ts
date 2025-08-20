/**
 * Runtime detection utilities for Node.js, Bun, and Deno
 */

export type RuntimeType = 'node' | 'bun' | 'deno' | 'unknown';

/**
 * Detect the current JavaScript runtime
 */
export function detectRuntime(): RuntimeType {
  // Check for Deno
  if (typeof globalThis !== 'undefined' && 'Deno' in globalThis) {
    return 'deno';
  }
  
  // Check for Bun
  if (typeof globalThis !== 'undefined' && 'Bun' in globalThis) {
    return 'bun';
  }
  
  // Check for Node.js
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return 'node';
  }
  
  return 'unknown';
}

/**
 * Get runtime-specific information
 */
export function getRuntimeInfo(): {
  type: RuntimeType;
  version: string;
  supportsNpm: boolean;
  supportsDynamicImport: boolean;
} {
  const type = detectRuntime();
  
  switch (type) {
    case 'deno':
      return {
        type,
        version: (globalThis as any).Deno?.version?.deno || 'unknown',
        supportsNpm: true, // Deno supports npm: imports
        supportsDynamicImport: true,
      };
      
    case 'bun':
      return {
        type,
        version: (globalThis as any).Bun?.version || 'unknown',
        supportsNpm: true, // Bun has excellent npm compatibility
        supportsDynamicImport: true,
      };
      
    case 'node':
      return {
        type,
        version: process.versions.node,
        supportsNpm: true,
        supportsDynamicImport: true,
      };
      
    default:
      return {
        type,
        version: 'unknown',
        supportsNpm: false,
        supportsDynamicImport: false,
      };
  }
}

/**
 * Check if running in a specific runtime
 */
export function isNode(): boolean {
  return detectRuntime() === 'node';
}

export function isBun(): boolean {
  return detectRuntime() === 'bun';
}

export function isDeno(): boolean {
  return detectRuntime() === 'deno';
}

/**
 * Get runtime-specific globals
 */
export function getRuntimeGlobals() {
  const runtime = detectRuntime();
  
  switch (runtime) {
    case 'deno':
      return {
        process: (globalThis as any).Deno?.process || globalThis.process,
        env: (globalThis as any).Deno?.env?.toObject() || {},
        cwd: () => (globalThis as any).Deno?.cwd?.() || '/',
        exit: (code: number) => (globalThis as any).Deno?.exit?.(code),
      };
      
    case 'bun':
    case 'node':
      return {
        process: globalThis.process || process,
        env: process.env || {},
        cwd: () => process.cwd(),
        exit: (code: number) => process.exit(code),
      };
      
    default:
      return {
        process: null,
        env: {},
        cwd: () => '/',
        exit: () => {},
      };
  }
}

/**
 * Runtime-specific path helpers
 */
export function getExecutableName(): string {
  const runtime = detectRuntime();
  
  switch (runtime) {
    case 'deno':
      return 'deno';
    case 'bun':
      return 'bun';
    case 'node':
      return 'node';
    default:
      return 'unknown';
  }
}

/**
 * Cross-runtime compatible dynamic import
 */
export async function crossRuntimeImport(specifier: string): Promise<any> {
  try {
    return await import(specifier);
  } catch (error) {
    // Fallback for different runtime import behaviors
    throw new Error(`Failed to import ${specifier}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}