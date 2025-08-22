/**
 * Helper utilities for VM testing
 */

/**
 * Check if isolated-vm is available for testing
 */
export function isIsolatedVMAvailable(): boolean {
  try {
    const ivm = require('isolated-vm');
    // Test that we can actually create an isolate
    const test = new ivm.Isolate();
    test.dispose();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Skip test if isolated-vm is not available
 */
export function skipIfNoVM(testName: string): void {
  if (!isIsolatedVMAvailable()) {
    test.skip(`${testName} (isolated-vm not available)`, () => {});
  }
}

/**
 * Conditional test that only runs if isolated-vm is available
 */
export function testWithVM(
  testName: string,
  testFn: () => void | Promise<void>,
  timeout?: number
): void {
  if (isIsolatedVMAvailable()) {
    test(testName, testFn, timeout);
  } else {
    test.skip(`${testName} (isolated-vm not available)`, () => {});
  }
}

/**
 * Conditional describe that only runs if isolated-vm is available
 */
export function describeWithVM(suiteName: string, suiteFn: () => void): void {
  if (isIsolatedVMAvailable()) {
    describe(suiteName, suiteFn);
  } else {
    describe.skip(`${suiteName} (isolated-vm not available)`, () => {
      test('isolated-vm not available', () => {
        console.log('Skipping VM tests: isolated-vm not available');
      });
    });
  }
}
