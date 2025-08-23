import type { JsqOptions } from '@/types/cli';
import type { VMSandboxConfig, SandboxCapabilities } from '@/types/sandbox';

export interface SecurityLevel {
  allowNetwork: boolean;
  allowShell: boolean;
  allowFileSystem: boolean;
  allowDynamicImports: boolean;
  allowedGlobals: string[];
  timeout?: number;
  useVM: boolean;
  memoryLimit?: number;
  cpuLimit?: number;
  maxContextSize?: number;
}

export interface SecurityContext {
  level: SecurityLevel;
  options: JsqOptions;
  warnings: string[];
  vmConfig?: VMSandboxConfig;
  capabilities?: SandboxCapabilities;
}

export class SecurityManager {
  private context: SecurityContext;

  constructor(options: JsqOptions) {
    this.context = this.createSecurityContext(options);
  }

  getSecurityContext(): SecurityContext {
    return this.context;
  }

  createEvaluationContext(baseContext: Record<string, unknown>): Record<string, unknown> {
    const secureContext = { ...baseContext };
    const { level } = this.context;

    // Remove network capabilities if disabled
    if (!level.allowNetwork) {
      delete secureContext.fetch;
      this.addWarning('Network access disabled - fetch API unavailable');
    }

    // Filter globals based on allowedGlobals list
    if (level.allowedGlobals.length > 0) {
      const filteredContext: Record<string, unknown> = {};
      for (const key of level.allowedGlobals) {
        if (key in secureContext) {
          filteredContext[key] = secureContext[key];
        }
      }
      return filteredContext;
    }

    return secureContext;
  }

  validateExpression(expression: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { level } = this.context;

    // Skip validation in unsafe mode
    if (this.context.options.unsafe) {
      return { valid: true, errors: [] };
    }

    // In VM mode (which is the default), perform additional validation first
    if (this.shouldUseVM()) {
      // Check for potentially dangerous patterns
      const dangerousPatterns = [
        /eval\s*\(/,
        /Function\s*\(/,
        /setTimeout|setInterval/,
        /global|globalThis\./,
        /process\./,
        /__dirname|__filename/,
        /this\.constructor/,
        /constructor\.constructor/,
        /arguments\.callee/,
        /fetch\s*\(/,
        /Buffer\./,
        /while\s*\(\s*true\s*\)/,
        /for\s*\(\s*;;\s*\)/,
        /performance\.now/,
        /process\.hrtime/,
        /\[\s*['"`]constructor['"`]\s*\]/,
        /window\./,
        /document\./,
        /\[\s*['"`]eval['"`]\s*\]/, // this["eval"]
        /\(\s*\d+\s*,\s*eval\s*\)/, // (1, eval)
        /\[\s*['"`]Function['"`]\s*\]/, // this["Function"]
        /require\s*\(/,  // All require calls are dangerous in VM
        /import\s*\(/,   // All dynamic imports are dangerous in VM
        /execSync|exec|spawn|fork/,  // Child process functions
        /readFile|writeFile|readFileSync|writeFileSync|createReadStream|createWriteStream/,  // File system functions
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(expression)) {
          errors.push(
            `Expression contains potentially dangerous patterns`
          );
          break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  shouldUseVM(): boolean {
    return this.context.level.useVM;
  }

  getTimeout(): number | undefined {
    return this.context.level.timeout;
  }

  getMemoryLimit(): number | undefined {
    return this.context.level.memoryLimit;
  }

  getVMConfig(): VMSandboxConfig | undefined {
    return this.context.vmConfig;
  }

  getCapabilities(): SandboxCapabilities | undefined {
    return this.context.capabilities;
  }

  getWarnings(): string[] {
    return this.context.warnings;
  }

  private createSecurityContext(options: JsqOptions): SecurityContext {
    const warnings: string[] = [];

    // Determine security level based on options
    let level: SecurityLevel;
    let vmConfig: VMSandboxConfig | undefined;
    let capabilities: SandboxCapabilities | undefined;

    // Check if unsafe mode is requested
    if (options.unsafe) {
      level = this.createUnsafeLevel(options);
      warnings.push('⚠️  Running in unsafe mode - dangerous operations are allowed');
    } else {
      // Always use sandbox mode by default
      level = this.createSandboxLevel(options);
      vmConfig = this.createSandboxVMConfig(options);
      capabilities = this.createSandboxCapabilities();
      warnings.push('🔒 Running in secure VM isolation mode');
    }

    // Add warnings for disabled features (these don't apply in sandbox mode)
    if (options.noNetwork || options.noShell || options.noFs) {
      warnings.push('⚠️  Individual security flags are ignored in VM isolation mode');
    }

    return {
      level,
      options,
      warnings,
      vmConfig,
      capabilities,
    };
  }

  private createSandboxLevel(options: JsqOptions): SecurityLevel {
    return {
      allowNetwork: false,
      allowShell: false,
      allowFileSystem: false,
      allowDynamicImports: false,
      allowedGlobals: [], // Allow all globals but in VM
      timeout: options.cpuLimit || 30000, // 30 second default timeout in sandbox mode
      memoryLimit: options.memoryLimit || 128, // 128MB default in sandbox mode
      cpuLimit: options.cpuLimit, // Optional CPU limit
      maxContextSize: 10 * 1024 * 1024, // 10MB context size
      useVM: true,
    };
  }

  private createDefaultLevel(options: JsqOptions): SecurityLevel {
    return {
      allowNetwork: !options.noNetwork,
      allowShell: !options.noShell,
      allowFileSystem: !options.noFs,
      allowDynamicImports: !options.noShell, // Link to shell for now
      allowedGlobals: [], // Allow all globals in default mode
      timeout: undefined, // No timeout in default mode
      useVM: false,
    };
  }

  private createUnsafeLevel(options: JsqOptions): SecurityLevel {
    return {
      allowNetwork: true,
      allowShell: true,
      allowFileSystem: true,
      allowDynamicImports: true,
      allowedGlobals: [], // Allow all globals in unsafe mode
      timeout: undefined, // No timeout in unsafe mode
      useVM: false, // Don't use VM in unsafe mode
    };
  }

  private addWarning(warning: string): void {
    if (!this.context.warnings.includes(warning)) {
      this.context.warnings.push(warning);
    }
  }

  private createSandboxVMConfig(options: JsqOptions): VMSandboxConfig {
    return {
      memoryLimit: options.memoryLimit || 128,
      timeout: options.cpuLimit || 30000,
      cpuLimit: options.cpuLimit,
      enableAsync: true,
      enableGenerators: true,
      enableProxies: false,
      enableSymbols: true,
      maxContextSize: 10 * 1024 * 1024,
      recycleIsolates: true,
      isolatePoolSize: 3,
    };
  }

  private createDefaultVMConfig(options: JsqOptions): VMSandboxConfig {
    return {
      memoryLimit: 256,
      timeout: 60000,
      enableAsync: true,
      enableGenerators: true,
      enableProxies: true,
      enableSymbols: true,
      maxContextSize: 50 * 1024 * 1024,
      recycleIsolates: true,
      isolatePoolSize: 5,
    };
  }

  private createSandboxCapabilities(): SandboxCapabilities {
    return {
      console: true,
      timers: false,
      promises: true,
      json: true,
      math: true,
      date: true,
      array: true,
      object: true,
      string: true,
      number: true,
      boolean: true,
      regexp: true,
      error: true,
      map: true,
      set: true,
      weakmap: true,
      weakset: true,
      proxy: false,
      reflect: true,
      symbol: true,
      bigint: true,
      intl: false,
      buffer: false,
      url: false,
      crypto: false,
    };
  }

  private createDefaultCapabilities(): SandboxCapabilities {
    return {
      console: true,
      timers: true,
      promises: true,
      json: true,
      math: true,
      date: true,
      array: true,
      object: true,
      string: true,
      number: true,
      boolean: true,
      regexp: true,
      error: true,
      map: true,
      set: true,
      weakmap: true,
      weakset: true,
      proxy: true,
      reflect: true,
      symbol: true,
      bigint: true,
      intl: true,
      buffer: false,
      url: false,
      crypto: false,
    };
  }
}
