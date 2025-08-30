/**
 * QuickJS GC assertion error workaround utilities
 */

let isExiting = false;
let quickjsCleanupScheduled = false;

/**
 * Mark the process as exiting to skip QuickJS cleanup
 */
export function markProcessExiting(): void {
  isExiting = true;
}

/**
 * Check if process is exiting
 */
export function isProcessExiting(): boolean {
  return isExiting || process.exitCode !== undefined;
}

/**
 * Schedule QuickJS cleanup with proper timing
 */
export function scheduleQuickJSCleanup(cleanup: () => Promise<void>): void {
  if (quickjsCleanupScheduled || isProcessExiting()) {
    return;
  }

  quickjsCleanupScheduled = true;

  // In test environment, skip cleanup to avoid GC assertion
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  // Schedule cleanup but don't wait for it
  setImmediate(async () => {
    try {
      await cleanup();
    } catch {
      // Ignore cleanup errors
    }
  });
}

/**
 * Setup process exit handlers to prevent QuickJS GC issues
 */
export function setupProcessExitHandlers(): void {
  const handleExit = () => {
    markProcessExiting();
  };

  process.on('beforeExit', handleExit);
  process.on('exit', handleExit);
  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
  process.on('SIGHUP', handleExit);

  // In test environment, we'll handle cleanup differently
  if (process.env.NODE_ENV === 'test') {
    // Tests should handle their own cleanup timing
    // We don't set JSQ_SKIP_DISPOSE here to avoid memory leaks
  }
}
