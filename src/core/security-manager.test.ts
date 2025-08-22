import { SecurityManager } from './security-manager';
import type { JsqOptions } from '@/types/cli';

describe('SecurityManager', () => {
  describe('Default Mode (VM Sandbox)', () => {
    it('should use VM sandbox by default', () => {
      const options: JsqOptions = {};
      const securityManager = new SecurityManager(options);
      const context = securityManager.getSecurityContext();

      expect(context.level.allowNetwork).toBe(false);
      expect(context.level.allowShell).toBe(false);
      expect(context.level.allowFileSystem).toBe(false);
      expect(context.level.allowDynamicImports).toBe(false);
      expect(context.level.useVM).toBe(true);
      expect(context.level.allowedGlobals).toEqual([]);
      expect(context.level.timeout).toBe(30000);
      expect(context.level.memoryLimit).toBe(128);
    });

    it('should validate allowed expressions in default mode', () => {
      const options: JsqOptions = {};
      const securityManager = new SecurityManager(options);

      const validation = securityManager.validateExpression('$.data.map(x => x * 2)');
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });
  });

  describe('Individual Security Flags (Deprecated)', () => {
    it('should ignore --no-network flag in VM mode', () => {
      const options: JsqOptions = { noNetwork: true };
      const securityManager = new SecurityManager(options);
      const context = securityManager.getSecurityContext();

      // All flags are false in VM mode regardless of individual flags
      expect(context.level.allowNetwork).toBe(false);
      expect(context.level.allowShell).toBe(false);
      expect(context.level.allowFileSystem).toBe(false);
      expect(context.level.useVM).toBe(true);
    });

    it('should ignore --no-shell flag in VM mode', () => {
      const options: JsqOptions = { noShell: true };
      const securityManager = new SecurityManager(options);
      const context = securityManager.getSecurityContext();

      // All flags are false in VM mode regardless of individual flags
      expect(context.level.allowNetwork).toBe(false);
      expect(context.level.allowShell).toBe(false);
      expect(context.level.allowFileSystem).toBe(false);
      expect(context.level.allowDynamicImports).toBe(false);
      expect(context.level.useVM).toBe(true);
    });

    it('should ignore --no-fs flag in VM mode', () => {
      const options: JsqOptions = { noFs: true };
      const securityManager = new SecurityManager(options);
      const context = securityManager.getSecurityContext();

      // All flags are false in VM mode regardless of individual flags
      expect(context.level.allowNetwork).toBe(false);
      expect(context.level.allowShell).toBe(false);
      expect(context.level.allowFileSystem).toBe(false);
      expect(context.level.useVM).toBe(true);
    });

    it('should reject shell commands in VM mode', () => {
      const options: JsqOptions = {};
      const securityManager = new SecurityManager(options);

      const expressions = [
        'import("child_process")',
        'require("child_process")',
        'execSync("ls")',
        'spawn("echo", ["hello"])',
      ];

      for (const expression of expressions) {
        const validation = securityManager.validateExpression(expression);
        expect(validation.valid).toBe(false);
        expect(validation.errors[0]).toContain('Expression contains potentially dangerous patterns');
      }
    });

    it('should reject filesystem access in VM mode', () => {
      const options: JsqOptions = {};
      const securityManager = new SecurityManager(options);

      const expressions = [
        'import("fs")',
        'require("fs")',
        'readFile("test.txt")',
        'writeFile("test.txt", "data")',
      ];

      for (const expression of expressions) {
        const validation = securityManager.validateExpression(expression);
        expect(validation.valid).toBe(false);
        expect(validation.errors[0]).toContain('Expression contains potentially dangerous patterns');
      }
    });
  });

  describe('Sandbox Mode (Legacy Flag)', () => {
    it('should still work with explicit --sandbox flag', () => {
      const options: JsqOptions = { sandbox: true };
      const securityManager = new SecurityManager(options);
      const context = securityManager.getSecurityContext();

      expect(context.level.allowNetwork).toBe(false);
      expect(context.level.allowShell).toBe(false);
      expect(context.level.allowFileSystem).toBe(false);
      expect(context.level.allowDynamicImports).toBe(false);
      expect(context.level.useVM).toBe(true);
      expect(context.level.timeout).toBe(30000);
    });

    it('should provide sandbox warnings', () => {
      const options: JsqOptions = { sandbox: true };
      const securityManager = new SecurityManager(options);

      const warnings = securityManager.getWarnings();
      expect(warnings).toContain('🔒 Running in secure VM isolation mode');
    });

    it('should use VM in sandbox mode', () => {
      const options: JsqOptions = { sandbox: true };
      const securityManager = new SecurityManager(options);

      expect(securityManager.shouldUseVM()).toBe(true);
      expect(securityManager.getTimeout()).toBe(30000);
    });
  });

  describe('Context Creation', () => {
    it('should remove fetch in VM mode', () => {
      const options: JsqOptions = {};
      const securityManager = new SecurityManager(options);

      const baseContext = {
        $: {},
        fetch: () => {},
        console: console,
        Math: Math,
      };

      const secureContext = securityManager.createEvaluationContext(baseContext);
      expect(secureContext.fetch).toBeUndefined();
      expect(secureContext.console).toBe(console);
      expect(secureContext.Math).toBe(Math);
    });

    it('should add VM mode warning', () => {
      const options: JsqOptions = {};
      const securityManager = new SecurityManager(options);

      const baseContext = { fetch: () => {} };
      securityManager.createEvaluationContext(baseContext);

      const warnings = securityManager.getWarnings();
      expect(warnings.some(w => w.includes('Running in secure VM isolation mode'))).toBe(true);
    });
  });

  describe('Multiple Security Options', () => {
    it('should combine multiple security flags correctly', () => {
      const options: JsqOptions = {
        noNetwork: true,
        noShell: true,
        noFs: true,
      };
      const securityManager = new SecurityManager(options);
      const context = securityManager.getSecurityContext();

      expect(context.level.allowNetwork).toBe(false);
      expect(context.level.allowShell).toBe(false);
      expect(context.level.allowFileSystem).toBe(false);
      expect(context.level.useVM).toBe(true); // VM is always enabled now
    });

    it('should reject multiple types of dangerous operations', () => {
      const options: JsqOptions = {
        noShell: true,
        noFs: true,
      };
      const securityManager = new SecurityManager(options);

      const validation = securityManager.validateExpression(
        'import("child_process"); import("fs"); readFile("test")'
      );
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
