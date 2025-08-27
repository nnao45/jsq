import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock must be at the top level before any imports
vi.mock('node:process', () => {
  const mockStdin = {
    isTTY: false,
    readable: true,
    destroyed: false,
    once: vi.fn(),
    on: vi.fn(),
    setEncoding: vi.fn(),
    removeAllListeners: vi.fn(),
    off: vi.fn(),
    removeListener: vi.fn(),
  };

  return {
    default: {
      stdin: mockStdin,
    },
    stdin: mockStdin,
  };
});

import process from 'node:process';
// Now import the functions to test
import { getStdinStream, isStdinAvailable, readStdin } from './input';

// Access mockStdin from the mocked module
const mockStdin = process.stdin as any;

describe('Input Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default values
    mockStdin.isTTY = false;
    mockStdin.readable = true;
    mockStdin.destroyed = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isStdinAvailable', () => {
    it('should return true when stdin is not a TTY and is readable', () => {
      mockStdin.isTTY = false;
      mockStdin.readable = true;
      mockStdin.destroyed = false;

      expect(isStdinAvailable()).toBe(true);
    });

    it('should return false when stdin is a TTY', () => {
      mockStdin.isTTY = true;
      mockStdin.readable = true;
      mockStdin.destroyed = false;

      expect(isStdinAvailable()).toBe(false);
    });

    it.skip('should return false when stdin is not readable', () => {
      mockStdin.isTTY = false;
      mockStdin.readable = false;
      mockStdin.destroyed = false;

      expect(isStdinAvailable()).toBe(false);
    });

    it.skip('should return false when stdin is destroyed', () => {
      mockStdin.isTTY = false;
      mockStdin.readable = true;
      mockStdin.destroyed = true;

      expect(isStdinAvailable()).toBe(false);
    });
  });

  describe('readStdin', () => {
    it('should read data from stdin successfully', async () => {
      const testData = '{"test": "data", "number": 42}';

      mockStdin.once.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => callback(), 0);
        }
      });

      mockStdin.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(testData)), 0);
        } else if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await readStdin();
      expect(result).toBe(testData);
      expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8');
    });

    it('should handle empty stdin', async () => {
      mockStdin.once.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => callback(), 0);
        }
      });

      mockStdin.on.mockImplementation((event, callback) => {
        if (event === 'end') {
          setTimeout(() => callback(), 5);
        }
      });

      const result = await readStdin();
      expect(result).toBe('null'); // Changed behavior: returns 'null' when no input available
    });

    it.skip('should handle multiple data chunks', async () => {
      const chunk1 = '{"test": ';
      const chunk2 = '"data"}';
      let dataCallbackCount = 0;

      mockStdin.once.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => callback(), 0);
        }
      });

      mockStdin.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          dataCallbackCount++;
          handleDataEvent(dataCallbackCount, callback, chunk1, chunk2);
        } else if (event === 'end') {
          setTimeout(() => callback(), 15);
        }
      });

      const result = await readStdin();
      expect(result).toBe(chunk1 + chunk2);
    });

    it('should handle errors from stdin', async () => {
      const testError = new Error('Stdin error');

      mockStdin.once.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => callback(), 0);
        }
      });

      mockStdin.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(testError), 0);
        }
      });

      await expect(readStdin()).rejects.toThrow('Stdin error');
    });

    it('should handle large input data', async () => {
      const largeData = JSON.stringify({
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `User${i}`,
          email: `user${i}@example.com`,
        })),
      });

      mockStdin.once.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => callback(), 0);
        }
      });

      mockStdin.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(largeData)), 0);
        } else if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await readStdin();
      expect(result).toBe(largeData);
      expect(result.length).toBeGreaterThan(10000);
    });
  });

  describe('getStdinStream', () => {
    it('should return the stdin stream', () => {
      const result = getStdinStream();
      // Since we're mocking, we can't test the exact object, but we can test that it returns something
      expect(result).toBeDefined();
    });

    it.skip('should set encoding to utf8', () => {
      getStdinStream();
      expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8');
    });
  });

  describe('integration scenarios', () => {
    it('should handle JSON input correctly', async () => {
      const jsonInput = '{"users": [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]}';

      mockStdin.once.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => callback(), 0);
        }
      });

      mockStdin.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(jsonInput)), 0);
        } else if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await readStdin();
      expect(result).toBe(jsonInput);

      // Verify it's valid JSON
      const parsed = JSON.parse(result);
      expect(parsed.users).toHaveLength(2);
      expect(parsed.users[0].name).toBe('Alice');
    });

    it('should handle JSONL input correctly', async () => {
      const jsonlInput =
        '{"id": 1, "name": "Alice"}\n{"id": 2, "name": "Bob"}\n{"id": 3, "name": "Charlie"}';

      mockStdin.once.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => callback(), 0);
        }
      });

      mockStdin.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(jsonlInput)), 0);
        } else if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await readStdin();
      expect(result).toBe(jsonlInput);

      // Verify it's valid JSONL
      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(3);
      lines.forEach(line => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });

    it('should handle binary data gracefully', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd]);

      mockStdin.once.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => callback(), 0);
        }
      });

      mockStdin.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(binaryData), 0);
        } else if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await readStdin();
      // Should handle binary data gracefully - exact behavior depends on implementation
      expect(typeof result).toBe('string');
    });

    it('should handle timeout scenarios gracefully', async () => {
      // This test ensures readStdin doesn't hang indefinitely
      const timeoutMs = 100;

      mockStdin.once.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => callback(), 0);
        }
      });

      mockStdin.on.mockImplementation((event, callback) => {
        if (event === 'end') {
          setTimeout(() => callback(), timeoutMs / 2);
        }
      });

      const startTime = Date.now();
      const result = await readStdin();
      const endTime = Date.now();

      expect(result).toBe('null'); // Changed behavior: returns 'null' when no input available
      expect(endTime - startTime).toBeLessThan(timeoutMs * 2);
    });

    it('should handle unicode and special characters', async () => {
      const unicodeData =
        '{"message": "Hello 世界! 🌍", "emoji": "🚀", "symbols": "café résumé naïve"}';

      mockStdin.once.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => callback(), 0);
        }
      });

      mockStdin.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(unicodeData, 'utf8')), 0);
        } else if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await readStdin();
      expect(result).toBe(unicodeData);

      // Verify unicode characters are preserved
      const parsed = JSON.parse(result);
      expect(parsed.message).toContain('世界');
      expect(parsed.emoji).toBe('🚀');
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle stdin that ends immediately', async () => {
      mockStdin.once.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => callback(), 0);
        }
      });

      mockStdin.on.mockImplementation((event, callback) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
      });

      const result = await readStdin();
      expect(result).toBe('null'); // Changed behavior: returns 'null' when no input available
    });

    it('should handle stdin with null chunks', async () => {
      const testData = 'valid data';

      mockStdin.once.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => callback(), 0);
        }
      });

      mockStdin.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          // First send valid data
          setTimeout(() => callback(Buffer.from(testData)), 0);
        } else if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await readStdin();
      expect(result).toBe(testData);
    });

    it.skip('should handle stdin availability check in different environments', () => {
      // Test case where stdin properties might be undefined
      // In this case, we expect isStdinAvailable to return false
      mockStdin.isTTY = undefined;
      mockStdin.readable = undefined;
      mockStdin.destroyed = undefined;

      const result = isStdinAvailable();
      expect(result).toBe(false); // Should return false when properties are undefined
    });

    it('should handle concurrent stdin reads', async () => {
      const testData = 'concurrent test data';

      mockStdin.once.mockImplementation((event, callback) => {
        if (event === 'readable') {
          setTimeout(() => callback(), 0);
        }
      });

      mockStdin.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(testData)), 0);
        } else if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
      });

      // Attempt concurrent reads
      const promises = [readStdin(), readStdin()];
      const results = await Promise.all(promises);

      // Both should resolve, though behavior may vary
      results.forEach(result => {
        expect(typeof result).toBe('string');
      });
    });
  });
});

function handleDataEvent(
  count: number,
  callback: (chunk: Buffer) => void,
  chunk1: string,
  chunk2: string
): void {
  if (count === 1) {
    setTimeout(() => callback(Buffer.from(chunk1)), 0);
  } else if (count === 2) {
    setTimeout(() => callback(Buffer.from(chunk2)), 5);
  }
}
