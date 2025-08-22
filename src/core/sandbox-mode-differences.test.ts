import { SecurityManager } from './security-manager';
import type { JsqOptions } from '@/types/cli';

describe('VM Sandbox Mode (Default) - Key Features', () => {
  describe('Security Configuration', () => {
    it('should always use VM isolation', () => {
      const defaultManager = new SecurityManager({} as JsqOptions);
      const explicitSandboxManager = new SecurityManager({ sandbox: true } as JsqOptions);

      // Both should use VM since it's the default
      expect(defaultManager.shouldUseVM()).toBe(true);
      expect(explicitSandboxManager.shouldUseVM()).toBe(true);
    });

    it('should enforce resource limits by default', () => {
      const defaultManager = new SecurityManager({} as JsqOptions);

      // Default VM mode has resource limits
      expect(defaultManager.getTimeout()).toBe(30000);
      expect(defaultManager.getMemoryLimit()).toBe(128);
    });

    it('should have VM configuration by default', () => {
      const defaultManager = new SecurityManager({} as JsqOptions);

      const vmConfig = defaultManager.getVMConfig();
      expect(vmConfig).toMatchObject({
        memoryLimit: 128,
        timeout: 30000,
        enableProxies: false,
        maxContextSize: 10 * 1024 * 1024,
      });
    });
  });

  describe('Expression Validation', () => {
    it('should block dangerous patterns by default', () => {
      const defaultManager = new SecurityManager({} as JsqOptions);

      const dangerousPatterns = [
        'eval("code")',
        'new Function("return 1")',
        'setTimeout(() => {}, 0)',
        'process.exit(0)',
        'global.foo = 1',
        'Buffer.from("test")',
        'fetch("https://example.com")',
        'require("fs")',
        'import("child_process")',
      ];

      for (const pattern of dangerousPatterns) {
        const validation = defaultManager.validateExpression(pattern);

        // VM mode blocks dangerous patterns by default
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      }
    });

    it('should allow safe expressions', () => {
      const defaultManager = new SecurityManager({} as JsqOptions);

      const safePatterns = [
        '1 + 1',
        '[1, 2, 3].map(x => x * 2)',
        'Math.max(1, 2, 3)',
        '"hello".toUpperCase()',
        'JSON.stringify({a: 1})',
        '[1, 2, 3].filter(x => x > 1)',
      ];

      for (const pattern of safePatterns) {
        const validation = defaultManager.validateExpression(pattern);
        expect(validation.valid).toBe(true);
      }
    });
  });

  describe('Security Context Creation', () => {
    it('should remove fetch in VM mode by default', () => {
      const defaultManager = new SecurityManager({} as JsqOptions);

      const baseContext = {
        $: {},
        console: {},
        fetch: () => {},
        Math,
        JSON,
      };

      const secureContext = defaultManager.createEvaluationContext(baseContext);

      // In VM mode (default), fetch should be removed and warning added
      expect(secureContext.fetch).toBeUndefined();
      expect(defaultManager.getWarnings()).toContain(
        'Network access disabled - fetch API unavailable'
      );
    });

    it('should apply VM restrictions by default', () => {
      const defaultManager = new SecurityManager({} as JsqOptions);

      const baseContext = {
        $: {},
        console: {},
        fetch: () => {},
        Math,
        JSON,
      };

      const secureContext = defaultManager.createEvaluationContext(baseContext);

      // VM mode restrictions apply by default
      expect(secureContext.fetch).toBeUndefined();
      expect(defaultManager.getWarnings().length).toBeGreaterThan(0);
    });
  });

  describe('Security Warnings', () => {
    it('should show VM isolation warning by default', () => {
      const defaultManager = new SecurityManager({} as JsqOptions);
      const warnings = defaultManager.getWarnings();

      expect(warnings).toContain('🔒 Running in secure VM isolation mode');
    });

    it('should show warning that individual flags are ignored in VM mode', () => {
      const manager = new SecurityManager({
        noNetwork: true,
        noShell: true,
        noFs: true,
      } as JsqOptions);

      const warnings = manager.getWarnings();

      expect(warnings).toContain('⚠️  Individual security flags are ignored in VM isolation mode');
    });
  });

  describe('Capabilities', () => {
    it('should have limited capabilities by default', () => {
      const defaultManager = new SecurityManager({} as JsqOptions);
      const capabilities = defaultManager.getCapabilities();

      expect(capabilities).toMatchObject({
        console: true,
        timers: false,
        promises: true,
        proxy: false,
        buffer: false,
        url: false,
        crypto: false,
      });
    });

    it('should have VM capabilities by default', () => {
      const defaultManager = new SecurityManager({} as JsqOptions);
      const capabilities = defaultManager.getCapabilities();

      // Default mode uses VM, so has capabilities object
      expect(capabilities).toMatchObject({
        console: true,
        timers: false,
        promises: true,
        proxy: false,
        buffer: false,
        url: false,
        crypto: false,
      });
    });
  });

  describe('Individual Security Flags', () => {
    it('should ignore individual flags in VM mode', () => {
      const noShellManager = new SecurityManager({ noShell: true } as JsqOptions);
      const noFsManager = new SecurityManager({ noFs: true } as JsqOptions);

      // In VM mode, these patterns are blocked because of VM security, not individual flags
      const shellValidation = noShellManager.validateExpression('require("child_process")');
      expect(shellValidation.valid).toBe(false);
      expect(shellValidation.errors[0]).toContain('potentially dangerous patterns');

      const fsValidation = noFsManager.validateExpression('require("fs")');
      expect(fsValidation.valid).toBe(false);
      expect(fsValidation.errors[0]).toContain('potentially dangerous patterns');
    });
  });
});
