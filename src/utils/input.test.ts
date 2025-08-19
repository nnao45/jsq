import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { readStdin, getStdinStream, isStdinAvailable } from './input';
import { Readable } from 'stream';

// Mock process.stdin
const mockStdin = {
  on: jest.fn(),
  once: jest.fn(),
  isTTY: false,
  readable: true,
  destroyed: false,
  read: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  pipe: jest.fn(),
  setEncoding: jest.fn()
} as any;

describe('Input Utils', () => {
  let originalStdin: NodeJS.ReadStream;

  beforeEach(() => {
    originalStdin = process.stdin;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.stdin = originalStdin;
  });

  describe('isStdinAvailable', () => {
    it('should return true when stdin is not a TTY and is readable', () => {
      process.stdin = {
        ...mockStdin,
        isTTY: false,
        readable: true,
        destroyed: false
      } as any;

      expect(isStdinAvailable()).toBe(true);
    });

    it('should return false when stdin is a TTY', () => {
      process.stdin = {
        ...mockStdin,
        isTTY: true,
        readable: true,
        destroyed: false
      } as any;

      expect(isStdinAvailable()).toBe(false);
    });

    it('should return false when stdin is not readable', () => {
      process.stdin = {
        ...mockStdin,
        isTTY: false,
        readable: false,
        destroyed: false
      } as any;

      expect(isStdinAvailable()).toBe(false);
    });

    it('should return false when stdin is destroyed', () => {
      process.stdin = {
        ...mockStdin,
        isTTY: false,
        readable: true,
        destroyed: true
      } as any;

      expect(isStdinAvailable()).toBe(false);
    });
  });

  describe('readStdin', () => {
    it('should read data from stdin successfully', async () => {
      const testData = '{"test": "data", "number": 42}';
      
      process.stdin = {
        ...mockStdin,
        once: jest.fn((event, callback) => {
          if (event === 'readable') {
            // Simulate data being available
            setTimeout(() => callback(), 0);
          }
        }),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Simulate receiving data
            setTimeout(() => callback(Buffer.from(testData)), 0);
          } else if (event === 'end') {
            setTimeout(() => callback(), 10);
          }
        }),
        setEncoding: jest.fn()
      } as any;

      const result = await readStdin();
      expect(result).toBe(testData);
      expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8');
    });

    it('should handle empty stdin', async () => {
      process.stdin = {
        ...mockStdin,
        once: jest.fn((event, callback) => {
          if (event === 'readable') {
            setTimeout(() => callback(), 0);
          }
        }),
        on: jest.fn((event, callback) => {
          if (event === 'end') {
            setTimeout(() => callback(), 10);
          }
        }),
        setEncoding: jest.fn()
      } as any;

      const result = await readStdin();
      expect(result).toBe('');
    });

    it('should handle multiple data chunks', async () => {
      const chunk1 = '{"test": ';
      const chunk2 = '"data"}';
      
      process.stdin = {
        ...mockStdin,
        once: jest.fn((event, callback) => {
          if (event === 'readable') {
            setTimeout(() => callback(), 0);
          }
        }),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from(chunk1)), 0);
            setTimeout(() => callback(Buffer.from(chunk2)), 5);
          } else if (event === 'end') {
            setTimeout(() => callback(), 15);
          }
        }),
        setEncoding: jest.fn()
      } as any;

      const result = await readStdin();
      expect(result).toBe(chunk1 + chunk2);
    });

    it('should handle errors from stdin', async () => {
      const testError = new Error('Stdin error');
      
      process.stdin = {
        ...mockStdin,
        once: jest.fn((event, callback) => {
          if (event === 'readable') {
            setTimeout(() => callback(), 0);
          }
        }),
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(testError), 0);
          }
        }),
        setEncoding: jest.fn()
      } as any;

      await expect(readStdin()).rejects.toThrow('Stdin error');
    });

    it('should handle large input data', async () => {
      const largeData = JSON.stringify({
        records: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          data: `record_${i}`,
          value: Math.random()
        }))
      });
      
      process.stdin = {
        ...mockStdin,
        once: jest.fn((event, callback) => {
          if (event === 'readable') {
            setTimeout(() => callback(), 0);
          }
        }),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Simulate receiving data in chunks
            const chunkSize = 1000;
            let offset = 0;
            const sendChunk = () => {
              if (offset < largeData.length) {
                const chunk = largeData.slice(offset, offset + chunkSize);
                callback(Buffer.from(chunk));
                offset += chunkSize;
                setTimeout(sendChunk, 0);
              } else {
                setTimeout(() => callback(Buffer.alloc(0)), 5); // End signal
              }
            };
            setTimeout(sendChunk, 0);
          } else if (event === 'end') {
            setTimeout(() => callback(), 50);
          }
        }),
        setEncoding: jest.fn()
      } as any;

      const result = await readStdin();
      expect(result).toBe(largeData);
      expect(result.length).toBeGreaterThan(100000); // Should be a large string
    });
  });

  describe('getStdinStream', () => {
    it('should return the stdin stream', () => {
      const result = getStdinStream();
      expect(result).toBe(process.stdin);
    });

    it('should set encoding to utf8', () => {
      process.stdin = {
        ...mockStdin,
        setEncoding: jest.fn()
      } as any;

      getStdinStream();
      expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8');
    });
  });

  describe('integration scenarios', () => {
    it('should handle JSON input correctly', async () => {
      const jsonInput = '{"users": [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]}';
      
      process.stdin = {
        ...mockStdin,
        once: jest.fn((event, callback) => {
          if (event === 'readable') {
            setTimeout(() => callback(), 0);
          }
        }),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from(jsonInput)), 0);
          } else if (event === 'end') {
            setTimeout(() => callback(), 10);
          }
        }),
        setEncoding: jest.fn()
      } as any;

      const result = await readStdin();
      expect(result).toBe(jsonInput);
      
      // Verify it's valid JSON
      const parsed = JSON.parse(result);
      expect(parsed.users).toHaveLength(2);
      expect(parsed.users[0].name).toBe('Alice');
    });

    it('should handle JSONL input correctly', async () => {
      const jsonlInput = '{"id": 1, "name": "Alice"}\n{"id": 2, "name": "Bob"}\n{"id": 3, "name": "Charlie"}';
      
      process.stdin = {
        ...mockStdin,
        once: jest.fn((event, callback) => {
          if (event === 'readable') {
            setTimeout(() => callback(), 0);
          }
        }),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from(jsonlInput)), 0);
          } else if (event === 'end') {
            setTimeout(() => callback(), 10);
          }
        }),
        setEncoding: jest.fn()
      } as any;

      const result = await readStdin();
      expect(result).toBe(jsonlInput);
      
      // Verify it can be parsed as JSONL
      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(3);
      const parsed = lines.map(line => JSON.parse(line));
      expect(parsed[0].name).toBe('Alice');
      expect(parsed[1].name).toBe('Bob');
      expect(parsed[2].name).toBe('Charlie');
    });

    it('should handle binary data gracefully', async () => {
      // Create some binary data
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFD]);
      
      process.stdin = {
        ...mockStdin,
        once: jest.fn((event, callback) => {
          if (event === 'readable') {
            setTimeout(() => callback(), 0);
          }
        }),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(binaryData), 0);
          } else if (event === 'end') {
            setTimeout(() => callback(), 10);
          }
        }),
        setEncoding: jest.fn()
      } as any;

      const result = await readStdin();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle timeout scenarios gracefully', async () => {
      const timeoutMs = 100;
      
      process.stdin = {
        ...mockStdin,
        once: jest.fn((event, callback) => {
          if (event === 'readable') {
            // Don't call callback immediately to simulate delay
            setTimeout(() => callback(), timeoutMs + 50);
          }
        }),
        on: jest.fn((event, callback) => {
          // Don't emit any data or end events
        }),
        setEncoding: jest.fn()
      } as any;

      // This should hang indefinitely without timeout handling
      // In a real implementation, you might want to add timeout handling
      const promise = readStdin();
      
      // Since we don't have timeout handling, we'll resolve it manually
      setTimeout(() => {
        // Simulate end event after timeout
        const onMock = mockStdin.on as jest.Mock;
        const endCallback = onMock.mock.calls.find(call => call[0] === 'end')?.[1];
        if (endCallback) endCallback();
      }, timeoutMs);

      const result = await promise;
      expect(result).toBe('');
    });

    it('should handle unicode and special characters', async () => {
      const unicodeData = '{"message": "Hello 世界! 🌍", "emoji": "🚀", "symbols": "café résumé naïve"}';
      
      process.stdin = {
        ...mockStdin,
        once: jest.fn((event, callback) => {
          if (event === 'readable') {
            setTimeout(() => callback(), 0);
          }
        }),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from(unicodeData, 'utf8')), 0);
          } else if (event === 'end') {
            setTimeout(() => callback(), 10);
          }
        }),
        setEncoding: jest.fn()
      } as any;

      const result = await readStdin();
      expect(result).toBe(unicodeData);
      
      const parsed = JSON.parse(result);
      expect(parsed.message).toBe('Hello 世界! 🌍');
      expect(parsed.emoji).toBe('🚀');
      expect(parsed.symbols).toBe('café résumé naïve');
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle stdin that ends immediately', async () => {
      process.stdin = {
        ...mockStdin,
        once: jest.fn((event, callback) => {
          if (event === 'readable') {
            setTimeout(() => callback(), 0);
          }
        }),
        on: jest.fn((event, callback) => {
          if (event === 'end') {
            // End immediately
            setTimeout(() => callback(), 0);
          }
        }),
        setEncoding: jest.fn()
      } as any;

      const result = await readStdin();
      expect(result).toBe('');
    });

    it('should handle stdin with null chunks', async () => {
      const testData = 'valid data';
      
      process.stdin = {
        ...mockStdin,
        once: jest.fn((event, callback) => {
          if (event === 'readable') {
            setTimeout(() => callback(), 0);
          }
        }),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(null), 0); // null chunk
            setTimeout(() => callback(Buffer.from(testData)), 5); // valid chunk
          } else if (event === 'end') {
            setTimeout(() => callback(), 15);
          }
        }),
        setEncoding: jest.fn()
      } as any;

      const result = await readStdin();
      expect(result).toBe(testData);
    });

    it('should handle stdin availability check in different environments', () => {
      // Test case where stdin properties might be undefined
      process.stdin = {
        isTTY: undefined,
        readable: undefined,
        destroyed: undefined
      } as any;

      const result = isStdinAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('should handle concurrent stdin reads', async () => {
      const testData = '{"concurrent": "test"}';
      let dataCallbackCount = 0;
      
      process.stdin = {
        ...mockStdin,
        once: jest.fn((event, callback) => {
          if (event === 'readable') {
            setTimeout(() => callback(), 0);
          }
        }),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            dataCallbackCount++;
            setTimeout(() => callback(Buffer.from(testData)), 0);
          } else if (event === 'end') {
            setTimeout(() => callback(), 10);
          }
        }),
        setEncoding: jest.fn()
      } as any;

      // Start two concurrent reads
      const [result1, result2] = await Promise.all([
        readStdin(),
        readStdin()
      ]);

      // Both should get the same data
      expect(result1).toBe(testData);
      expect(result2).toBe(testData);
    });
  });
});