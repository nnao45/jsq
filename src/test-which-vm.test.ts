import { describe, expect, it, vi } from 'vitest';
import { createJsqEvaluator } from './index';

describe('Which VM is being used', () => {
  it('should identify which VM implementation is used', async () => {
    const evaluator = createJsqEvaluator({ sandbox: true, verbose: true });

    // Spy on console.error to capture verbose output
    const consoleSpy = vi.spyOn(console, 'error');

    // This should trigger VM creation
    const result = await evaluator.evaluate('1 + 1', null);
    expect(result).toBe(2);

    // Check console output
    const calls = consoleSpy.mock.calls;
    console.log('Console error calls:', calls);

    // Look for VM engine messages
    const vmMessages = calls.filter(call =>
      call.some(
        arg => typeof arg === 'string' && (arg.includes('VM engine') || arg.includes('QuickJS'))
      )
    );

    console.log('VM-related messages:', vmMessages);

    consoleSpy.mockRestore();
  });
});
