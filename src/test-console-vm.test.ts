import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ApplicationContext } from './core/application-context';
import { createApplicationContext } from './core/application-context';
import { VMSandboxQuickJS } from './core/vm/vm-sandbox-quickjs';

describe('Console in VMSandboxQuickJS', () => {
  let appContext: ApplicationContext;
  let sandbox: VMSandboxQuickJS;

  beforeEach(() => {
    appContext = createApplicationContext();
    sandbox = new VMSandboxQuickJS(appContext);
  });

  afterEach(async () => {
    await sandbox.dispose();
    await appContext.dispose();
  });

  it('should check console availability', async () => {
    const result = await sandbox.execute('typeof console', {});
    console.log('typeof console:', result.value);
    expect(result.value).toBe('object'); // QuickJS has console object
  });

  it('should work when using console.log', async () => {
    const result = await sandbox.execute('console.log("test")', {});
    console.log('Result when using console.log:', result.value);
    expect(result.value).toBe(undefined); // console.log returns undefined
  });

  it('should work with custom console implementation', async () => {
    // Test if we can add console manually
    const code = `
      globalThis.console = {
        log: function(...args) {
          return "logged: " + args.join(" ");
        }
      };
      console.log("hello", "world");
    `;
    const result = await sandbox.execute(code, {});
    console.log('Result with custom console:', result.value);
    expect(result.value).toBe('logged: hello world');
  });
});
