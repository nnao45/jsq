// Test setup and configuration

import { getQuickJS } from 'quickjs-emscripten';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

// We'll initialize QuickJS in beforeAll hook since sync initialization is not working

// Global test setup
beforeAll(async () => {
  // Setup global test environment

  // Always initialize QuickJS
  try {
    await getQuickJS();
    console.log('QuickJS initialized for sync access');
  } catch (error) {
    console.warn('Failed to initialize QuickJS:', error);
  }
});

afterAll(() => {
  // Cleanup after all tests
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Force garbage collection after each test to prevent memory leaks
  if (global.gc) {
    global.gc();
  }
});

// Mock console methods in tests to avoid noise
global.console = {
  ...console,
  // Uncomment to silence console logs in tests
  // log: vi.fn(),
  // error: vi.fn(),
  // warn: vi.fn(),
  // info: vi.fn(),
};
