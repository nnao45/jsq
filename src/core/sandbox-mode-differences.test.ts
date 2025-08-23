import type { JsqOptions } from '@/types/cli';
import { SecurityManager } from './security-manager';

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

  // Security warnings are now handled differently and not shown by default
  // Tests for warnings have been removed

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
});
