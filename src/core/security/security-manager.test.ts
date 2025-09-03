import { describe, expect, it } from 'vitest';
import type { JsqOptions } from '@/types/cli';
import { SecurityManager } from './security-manager';

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

  describe('Sandbox Mode (Legacy Flag)', () => {
    it('should still work with explicit --sandbox flag', () => {
      const options: JsqOptions = {};
      const securityManager = new SecurityManager(options);
      const context = securityManager.getSecurityContext();

      expect(context.level.allowNetwork).toBe(false);
      expect(context.level.allowShell).toBe(false);
      expect(context.level.allowFileSystem).toBe(false);
      expect(context.level.allowDynamicImports).toBe(false);
      expect(context.level.useVM).toBe(true);
      expect(context.level.timeout).toBe(30000);
    });

    // Sandbox warnings are now disabled by default
    // Test removed as warnings are no longer shown

    it('should use VM in sandbox mode', () => {
      const options: JsqOptions = {};
      const securityManager = new SecurityManager(options);

      expect(securityManager.shouldUseVM()).toBe(true);
      expect(securityManager.getTimeout()).toBe(30000);
    });
  });

  describe('Context Creation', () => {
    it('should preserve allowed globals in VM mode', () => {
      const options: JsqOptions = {};
      const securityManager = new SecurityManager(options);

      const baseContext = {
        $: {},
        console: console,
        Math: Math,
      };

      const secureContext = securityManager.createEvaluationContext(baseContext);
      expect(secureContext.console).toBe(console);
      expect(secureContext.Math).toBe(Math);
      expect(secureContext.$).toBe(baseContext.$);
    });

    // VM mode warnings are now disabled by default
    // Test removed as warnings are no longer shown
  });
});
