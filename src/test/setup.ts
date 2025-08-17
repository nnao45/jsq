// Test setup and configuration
import { jest } from '@jest/globals';

// Global test setup
beforeAll(() => {
  // Setup global test environment
});

afterAll(() => {
  // Cleanup after all tests
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

// Mock console methods in tests to avoid noise
global.console = {
  ...console,
  // Uncomment to silence console logs in tests
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
  // info: jest.fn(),
};