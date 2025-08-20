import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  detectRuntime,
  getRuntimeInfo,
  isNode,
  isBun,
  isDeno,
  getRuntimeGlobals,
  getExecutableName,
  crossRuntimeImport,
} from './runtime';

describe('Runtime Detection', () => {
  // Store original globals
  const originalGlobals = {
    Deno: (globalThis as any).Deno,
    Bun: (globalThis as any).Bun,
    process: globalThis.process,
  };

  beforeEach(() => {
    // Reset globals before each test
    delete (globalThis as any).Deno;
    delete (globalThis as any).Bun;
    // Note: We can't easily mock process in Node.js without breaking Jest
  });

  afterEach(() => {
    // Restore original globals
    if (originalGlobals.Deno) {
      (globalThis as any).Deno = originalGlobals.Deno;
    }
    if (originalGlobals.Bun) {
      (globalThis as any).Bun = originalGlobals.Bun;
    }
  });

  describe('detectRuntime', () => {
    it('should detect Node.js when running in Node.js', () => {
      // In Jest environment, this should detect as Node.js
      const runtime = detectRuntime();
      expect(runtime).toBe('node');
    });

    it('should detect Deno when Deno global is present', () => {
      // Mock Deno global
      (globalThis as any).Deno = { version: { deno: '1.40.0' } };
      
      const runtime = detectRuntime();
      expect(runtime).toBe('deno');
    });

    it('should detect Bun when Bun global is present', () => {
      // Mock Bun global (but Deno takes precedence, so remove it)
      delete (globalThis as any).Deno;
      (globalThis as any).Bun = { version: '1.0.0' };
      
      const runtime = detectRuntime();
      expect(runtime).toBe('bun');
    });
  });

  describe('getRuntimeInfo', () => {
    it('should return Node.js info when running in Node.js', () => {
      const info = getRuntimeInfo();
      
      expect(info.type).toBe('node');
      expect(info.version).toBe(process.versions.node);
      expect(info.supportsNpm).toBe(true);
      expect(info.supportsDynamicImport).toBe(true);
    });

    it('should return Deno info when Deno is detected', () => {
      (globalThis as any).Deno = { version: { deno: '1.40.0' } };
      
      const info = getRuntimeInfo();
      
      expect(info.type).toBe('deno');
      expect(info.version).toBe('1.40.0');
      expect(info.supportsNpm).toBe(true);
      expect(info.supportsDynamicImport).toBe(true);
    });

    it('should return Bun info when Bun is detected', () => {
      delete (globalThis as any).Deno;
      (globalThis as any).Bun = { version: '1.0.0' };
      
      const info = getRuntimeInfo();
      
      expect(info.type).toBe('bun');
      expect(info.version).toBe('1.0.0');
      expect(info.supportsNpm).toBe(true);
      expect(info.supportsDynamicImport).toBe(true);
    });
  });

  describe('Runtime type checkers', () => {
    it('should correctly identify Node.js', () => {
      expect(isNode()).toBe(true);
      expect(isBun()).toBe(false);
      expect(isDeno()).toBe(false);
    });

    it('should correctly identify Deno', () => {
      (globalThis as any).Deno = { version: { deno: '1.40.0' } };
      
      expect(isNode()).toBe(false);
      expect(isBun()).toBe(false);
      expect(isDeno()).toBe(true);
    });

    it('should correctly identify Bun', () => {
      delete (globalThis as any).Deno;
      (globalThis as any).Bun = { version: '1.0.0' };
      
      expect(isNode()).toBe(false);
      expect(isBun()).toBe(true);
      expect(isDeno()).toBe(false);
    });
  });

  describe('getRuntimeGlobals', () => {
    it('should return Node.js globals', () => {
      const globals = getRuntimeGlobals();
      
      expect(globals.process).toBeDefined();
      expect(globals.env).toBeDefined();
      expect(typeof globals.cwd).toBe('function');
      expect(typeof globals.exit).toBe('function');
    });

    it('should return Deno globals when available', () => {
      const mockDeno = {
        version: { deno: '1.40.0' },
        cwd: () => '/current/dir',
        exit: (code: number) => {},
        env: {
          toObject: () => ({ TEST: 'value' }),
        },
      };
      (globalThis as any).Deno = mockDeno;
      
      const globals = getRuntimeGlobals();
      
      expect(globals.cwd()).toBe('/current/dir');
      expect(globals.env).toEqual({ TEST: 'value' });
    });
  });

  describe('getExecutableName', () => {
    it('should return "node" for Node.js', () => {
      expect(getExecutableName()).toBe('node');
    });

    it('should return "deno" for Deno', () => {
      (globalThis as any).Deno = { version: { deno: '1.40.0' } };
      expect(getExecutableName()).toBe('deno');
    });

    it('should return "bun" for Bun', () => {
      delete (globalThis as any).Deno;
      (globalThis as any).Bun = { version: '1.0.0' };
      expect(getExecutableName()).toBe('bun');
    });
  });

  describe('crossRuntimeImport', () => {
    it('should successfully import built-in modules', async () => {
      // Test with a built-in Node.js module that should work in test environment
      const pathModule = await crossRuntimeImport('path');
      expect(pathModule).toBeDefined();
      expect(typeof pathModule.join).toBe('function');
    });

    it('should throw error for non-existent modules', async () => {
      await expect(crossRuntimeImport('non-existent-module-12345')).rejects.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle unknown runtime gracefully', () => {
      // Mock a scenario with no known runtime globals
      const originalProcess = globalThis.process;
      delete (globalThis as any).process;
      delete (globalThis as any).Deno;
      delete (globalThis as any).Bun;
      
      const runtime = detectRuntime();
      expect(runtime).toBe('unknown');
      
      const info = getRuntimeInfo();
      expect(info.type).toBe('unknown');
      expect(info.supportsNpm).toBe(false);
      
      // Restore process
      globalThis.process = originalProcess;
    });

    it('should handle missing version information', () => {
      (globalThis as any).Deno = {}; // Deno without version info
      
      const info = getRuntimeInfo();
      expect(info.type).toBe('deno');
      expect(info.version).toBe('unknown');
    });
  });
});