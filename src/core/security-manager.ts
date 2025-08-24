import type { JsqOptions } from '@/types/cli';
import type { SandboxCapabilities, VMSandboxConfig } from '@/types/sandbox';
import { ErrorFormatter } from '@/utils/error-formatter';

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

  validateExpression(expression: string): {
    valid: boolean;
    errors: string[];
    formattedError?: string;
  } {
    const errors: string[] = [];
    let formattedError: string | undefined;

    // Skip validation in unsafe mode
    if (this.context.options.unsafe) {
      return { valid: true, errors: [] };
    }

    // In VM mode (which is the default), perform additional validation first
    if (this.shouldUseVM()) {
      // Check for potentially dangerous patterns
      const dangerousPatterns: Array<{ pattern: RegExp; name: string }> = [
        { pattern: /eval\s*\(/, name: 'eval' },
        { pattern: /Function\s*\(/, name: 'Function' },
        { pattern: /setTimeout/, name: 'setTimeout' },
        { pattern: /setInterval/, name: 'setInterval' },
        { pattern: /global\./, name: 'global' },
        { pattern: /globalThis\./, name: 'globalThis' },
        { pattern: /process\./, name: 'process' },
        { pattern: /__dirname/, name: '__dirname' },
        { pattern: /__filename/, name: '__filename' },
        { pattern: /this\.constructor/, name: 'this.constructor' },
        { pattern: /constructor\.constructor/, name: 'constructor.constructor' },
        { pattern: /arguments\.callee/, name: 'arguments.callee' },
        { pattern: /Buffer\./, name: 'Buffer' },
        { pattern: /while\s*\(\s*true\s*\)/, name: 'while(true)' },
        { pattern: /for\s*\(\s*;;\s*\)/, name: 'for(;;)' },
        { pattern: /performance\.now/, name: 'performance.now' },
        { pattern: /process\.hrtime/, name: 'process.hrtime' },
        { pattern: /\[\s*['"`]constructor['"`]\s*\]/, name: '["constructor"]' },
        { pattern: /window\./, name: 'window' },
        { pattern: /document\./, name: 'document' },
        { pattern: /\[\s*['"`]eval['"`]\s*\]/, name: '["eval"]' },
        { pattern: /\(\s*\d+\s*,\s*eval\s*\)/, name: '(1, eval)' },
        { pattern: /\[\s*['"`]Function['"`]\s*\]/, name: '["Function"]' },
        { pattern: /require\s*\(/, name: 'require' },
        { pattern: /import\s*\(/, name: 'import' },
        { pattern: /execSync/, name: 'execSync' },
        { pattern: /exec/, name: 'exec' },
        { pattern: /spawn/, name: 'spawn' },
        { pattern: /fork/, name: 'fork' },
        { pattern: /readFile/, name: 'readFile' },
        { pattern: /writeFile/, name: 'writeFile' },
        { pattern: /readFileSync/, name: 'readFileSync' },
        { pattern: /writeFileSync/, name: 'writeFileSync' },
        { pattern: /createReadStream/, name: 'createReadStream' },
        { pattern: /createWriteStream/, name: 'createWriteStream' },
      ];

      const foundPatterns: string[] = [];
      for (const { pattern, name } of dangerousPatterns) {
        if (pattern.test(expression)) {
          foundPatterns.push(name);
        }
      }

      if (foundPatterns.length > 0) {
        errors.push(`Expression contains potentially dangerous patterns`);
        const error = ErrorFormatter.parseSecurityError(foundPatterns, expression);
        formattedError = ErrorFormatter.formatError(error, expression);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      formattedError,
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
      // warnings.push('⚠️  Running in unsafe mode - dangerous operations are allowed');
    } else {
      // Always use sandbox mode by default
      level = this.createSandboxLevel(options);
      vmConfig = this.createSandboxVMConfig(options);
      capabilities = this.createSandboxCapabilities();
      // warnings.push('🔒 Running in secure VM isolation mode');
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
      allowNetwork: false, // Network access disabled by default in sandbox mode
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

  private createUnsafeLevel(_options: JsqOptions): SecurityLevel {
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
}
