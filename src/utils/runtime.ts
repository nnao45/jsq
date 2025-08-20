/**
 * Runtime detection utilities for Node.js, Bun, and Deno
 */

export type RuntimeType = 'node' | 'bun' | 'deno' | 'unknown';

// Type definitions for runtime globals
interface DenoGlobal {
  version?: { deno?: string };
  process?: unknown;
  env?: { toObject?: () => Record<string, string> };
  cwd?: () => string;
  exit?: (code: number) => void;
}

interface BunGlobal {
  version?: string;
}

interface RuntimeGlobalThis extends GlobalThis {
  Deno?: DenoGlobal;
  Bun?: BunGlobal;
}

/**
 * Detect the current JavaScript runtime
 */
export function detectRuntime(): RuntimeType {
  const runtimeGlobal = globalThis as RuntimeGlobalThis;

  // Check for Deno
  if (typeof globalThis !== 'undefined' && runtimeGlobal.Deno) {
    return 'deno';
  }

  // Check for Bun
  if (typeof globalThis !== 'undefined' && runtimeGlobal.Bun) {
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
  const runtimeGlobal = globalThis as RuntimeGlobalThis;

  switch (type) {
    case 'deno':
      return {
        type,
        version: runtimeGlobal.Deno?.version?.deno || 'unknown',
        supportsNpm: true, // Deno supports npm: imports
        supportsDynamicImport: true,
      };

    case 'bun':
      return {
        type,
        version: runtimeGlobal.Bun?.version || 'unknown',
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
  const runtimeGlobal = globalThis as RuntimeGlobalThis;

  switch (runtime) {
    case 'deno':
      return {
        process: runtimeGlobal.Deno?.process || globalThis.process,
        env: runtimeGlobal.Deno?.env?.toObject() || {},
        cwd: () => runtimeGlobal.Deno?.cwd?.() || '/',
        exit: (code: number) => runtimeGlobal.Deno?.exit?.(code),
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
export async function crossRuntimeImport(specifier: string): Promise<unknown> {
  try {
    return await import(specifier);
  } catch (error) {
    // Fallback for different runtime import behaviors
    throw new Error(
      `Failed to import ${specifier}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
