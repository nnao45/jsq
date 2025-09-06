/**
 * Helper utilities for VM testing
 */
import { describe, test } from 'vitest';

/**
 * Check if QuickJS is available for testing
 */
export function isQuickJSAvailable(): boolean {
  try {
    // TODO: Check for QuickJS availability
    // For now, always return true since we're using QuickJS
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Skip test if VM is not available
 */
export function skipIfNoVM(testName: string): void {
  if (!isQuickJSAvailable()) {
    test.skip(`${testName} (VM not available)`, () => {});
  }
}

/**
 * Conditional test that only runs if VM is available
 */
export function testWithVM(
  testName: string,
  testFn: (() => void) | (() => Promise<void>),
  timeout?: number
): void {
  if (isQuickJSAvailable()) {
    test(testName, testFn, timeout);
  } else {
    test.skip(`${testName} (VM not available)`, () => {});
  }
}

/**
 * Skip test regardless of VM availability
 */
testWithVM.skip = (
  testName: string,
  _testFn: (() => void) | (() => Promise<void>),
  _timeout?: number
): void => {
  test.skip(testName, () => {});
};

/**
 * Conditional describe that only runs if VM is available
 */
export function describeWithVM(suiteName: string, suiteFn: () => void): void {
  if (isQuickJSAvailable()) {
    describe(suiteName, suiteFn);
  } else {
    describe.skip(`${suiteName} (VM not available)`, () => {
      test('VM not available', () => {
        console.log('Skipping VM tests: VM not available');
      });
    });
  }
}
