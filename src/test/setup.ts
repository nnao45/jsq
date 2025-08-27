// Test setup and configuration
import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { getQuickJS } from 'quickjs-emscripten';

// Global test setup
beforeAll(async () => {
  // Setup global test environment
  
  // Always initialize QuickJS (isolated-vm is deprecated)
  try {
    await getQuickJS();
    console.log('QuickJS initialized for sync access');
  } catch (error) {
    console.warn('Failed to initialize QuickJS:', error);
  }
});

afterAll(() => {
  // Cleanup after all tests
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
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
