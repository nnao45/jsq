import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFileStream,
  createFormatStream,
  detectFileFormat,
  readFileByFormat,
  readFileContent,
  validateFile,
} from './file-input';

// Mock fs and other modules
vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
}));
vi.mock('node:fs', () => ({
  createReadStream: vi.fn(),
  constants: {
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
    F_OK: 0,
  },
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    stat: vi.fn(),
    constants: {
      R_OK: 4,
      W_OK: 2,
      X_OK: 1,
      F_OK: 0,
    },
  },
}));
vi.mock('node:path', () => ({
  extname: vi.fn((filePath: string) => {
    const parts = filePath.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  }),
  resolve: vi.fn((...args) => args.join('/')),
}));

const mockFs = fs as vi.Mocked<typeof fs>;
const _mockPath = path as vi.Mocked<typeof path>;

describe('File Input Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateFile', () => {
    it.skip('should validate existing files', async () => {
      mockFs.access.mockResolvedValue(undefined);

      await expect(validateFile('/path/to/file.json')).resolves.not.toThrow();
      expect(mockFs.access).toHaveBeenCalledWith('/path/to/file.json', expect.anything());
    });

    it.skip('should throw error for non-existent files', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      await expect(validateFile('/path/to/nonexistent.json')).rejects.toThrow(
        'File not accessible'
      );
    });

    it.skip('should throw error for directories', async () => {
      mockFs.access.mockRejectedValue(new Error('EISDIR: illegal operation on a directory'));

      await expect(validateFile('/path/to/directory')).rejects.toThrow('File not accessible');
    });

    it.skip('should validate file access permissions', async () => {
      mockFs.access.mockResolvedValue(undefined);

      await expect(validateFile('/path/to/accessible.json')).resolves.not.toThrow();
      expect(mockFs.access).toHaveBeenCalledWith('/path/to/accessible.json', expect.any(Number));
    });
  });

  describe.skip('detectFileFormat', () => {
    it('should detect JSON format by extension', () => {
      expect(detectFileFormat('/path/to/file.json')).toBe('json');
      expect(detectFileFormat('/path/to/file.JSON')).toBe('json');
    });

    it('should detect JSONL format by extension', () => {
      expect(detectFileFormat('/path/to/file.jsonl')).toBe('jsonl');
      expect(detectFileFormat('/path/to/file.ndjson')).toBe('jsonl');
    });

    it('should detect CSV format by extension', () => {
      expect(detectFileFormat('/path/to/file.csv')).toBe('csv');
      expect(detectFileFormat('/path/to/file.CSV')).toBe('csv');
    });

    it('should detect TSV format by extension', () => {
      expect(detectFileFormat('/path/to/file.tsv')).toBe('tsv');
      expect(detectFileFormat('/path/to/file.TSV')).toBe('tsv');
    });

    it('should use specified format when not auto', () => {
      expect(detectFileFormat('/path/to/file.unknown', 'json')).toBe('json');
      expect(detectFileFormat('/path/to/file.txt', 'csv')).toBe('csv');
    });

    it('should detect JSON format by content when extension is ambiguous', async () => {
      const jsonContent = '{"test": "data"}';
      mockFs.readFile.mockResolvedValue(jsonContent);

      const result = await detectFileFormat('/path/to/file.unknown', 'auto');
      expect(result).toBe('json');
    });

    it('should detect JSONL format by content when extension is ambiguous', async () => {
      const jsonlContent = '{"line": 1}\n{"line": 2}';
      mockFs.readFile.mockResolvedValue(jsonlContent);

      const result = await detectFileFormat('/path/to/file.unknown', 'auto');
      expect(result).toBe('jsonl');
    });

    it('should default to json for unknown formats', async () => {
      const unknownContent = 'some random content';
      mockFs.readFile.mockResolvedValue(unknownContent);

      const result = await detectFileFormat('/path/to/file.unknown', 'auto');
      expect(result).toBe('json');
    });
  });

  describe.skip('readFileContent', () => {
    it('should read file content as string', async () => {
      const mockContent = '{"test": "data"}';
      mockFs.readFile.mockResolvedValue(mockContent);

      const result = await readFileContent('/path/to/file.json');
      expect(result).toBe(mockContent);
      expect(mockFs.readFile).toHaveBeenCalledWith('/path/to/file.json', 'utf8');
    });

    it('should handle different encodings', async () => {
      const mockContent = 'content with encoding';
      mockFs.readFile.mockResolvedValue(mockContent);

      const result = await readFileContent('/path/to/file.txt', 'latin1');
      expect(result).toBe(mockContent);
      expect(mockFs.readFile).toHaveBeenCalledWith('/path/to/file.txt', 'latin1');
    });
  });

  describe.skip('readFileByFormat', () => {
    it('should parse JSON files correctly', async () => {
      const jsonData = { test: 'data', numbers: [1, 2, 3] };
      const jsonContent = JSON.stringify(jsonData);
      mockFs.readFile.mockResolvedValue(jsonContent);

      const result = await readFileByFormat('/path/to/file.json', 'json');
      expect(result).toEqual(jsonData);
    });

    it('should parse JSONL files correctly', async () => {
      const jsonlContent = '{"id": 1, "name": "Alice"}\n{"id": 2, "name": "Bob"}';
      mockFs.readFile.mockResolvedValue(jsonlContent);

      const result = await readFileByFormat('/path/to/file.jsonl', 'jsonl');
      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('should parse CSV files correctly', async () => {
      const csvContent = 'name,age,city\nAlice,30,New York\nBob,25,Los Angeles';
      mockFs.readFile.mockResolvedValue(csvContent);

      const result = await readFileByFormat('/path/to/file.csv', 'csv');
      expect(result).toEqual([
        { name: 'Alice', age: '30', city: 'New York' },
        { name: 'Bob', age: '25', city: 'Los Angeles' },
      ]);
    });

    it('should parse TSV files correctly', async () => {
      const tsvContent = 'name\tage\tcity\nAlice\t30\tNew York\nBob\t25\tLos Angeles';
      mockFs.readFile.mockResolvedValue(tsvContent);

      const result = await readFileByFormat('/path/to/file.tsv', 'tsv');
      expect(result).toEqual([
        { name: 'Alice', age: '30', city: 'New York' },
        { name: 'Bob', age: '25', city: 'Los Angeles' },
      ]);
    });

    it('should handle empty JSON files', async () => {
      mockFs.readFile.mockResolvedValue('{}');

      const result = await readFileByFormat('/path/to/empty.json', 'json');
      expect(result).toEqual({});
    });

    it('should handle empty JSONL files', async () => {
      mockFs.readFile.mockResolvedValue('');

      const result = await readFileByFormat('/path/to/empty.jsonl', 'jsonl');
      expect(result).toEqual([]);
    });

    it('should handle invalid JSON gracefully', async () => {
      mockFs.readFile.mockResolvedValue('invalid json {');

      await expect(readFileByFormat('/path/to/invalid.json', 'json')).rejects.toThrow(
        'Failed to parse JSON'
      );
    });

    it('should handle CSV with different delimiters', async () => {
      const csvContent = 'name;age;city\nAlice;30;New York\nBob;25;Los Angeles';
      mockFs.readFile.mockResolvedValue(csvContent);

      // Mock CSV parser to handle semicolon delimiter
      const result = await readFileByFormat('/path/to/file.csv', 'csv');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe.skip('createFileStream', () => {
    it('should create readable stream from file', () => {
      const mockStream = new Readable();
      const mockCreateReadStream = vi.fn().mockReturnValue(mockStream);

      // Mock fs.createReadStream
      vi.doMock('fs', () => ({
        createReadStream: mockCreateReadStream,
      }));

      const result = createFileStream('/path/to/file.json');
      expect(result).toBeDefined();
    });

    it('should handle non-existent files', () => {
      const mockStream = new Readable();
      mockStream._read = () => {
        mockStream.emit('error', new Error('ENOENT: no such file or directory'));
      };

      const mockCreateReadStream = vi.fn().mockReturnValue(mockStream);

      vi.doMock('fs', () => ({
        createReadStream: mockCreateReadStream,
      }));

      const stream = createFileStream('/path/to/nonexistent.json');
      expect(stream).toBeDefined();
    });
  });

  describe.skip('createFormatStream', () => {
    it('should create stream for JSON files', async () => {
      const stream = await createFormatStream('/path/to/file.json', 'json');
      expect(stream).toBeDefined();
    });

    it('should create stream for JSONL files', async () => {
      const stream = await createFormatStream('/path/to/file.jsonl', 'jsonl');
      expect(stream).toBeDefined();
    });

    it('should create stream for CSV files', async () => {
      const stream = await createFormatStream('/path/to/file.csv', 'csv');
      expect(stream).toBeDefined();
    });

    it('should create stream for TSV files', async () => {
      const stream = await createFormatStream('/path/to/file.tsv', 'tsv');
      expect(stream).toBeDefined();
    });

    it('should handle unsupported formats', async () => {
      await expect(createFormatStream('/path/to/file.unknown', 'unknown' as never)).rejects.toThrow(
        'Unsupported file format'
      );
    });
  });

  describe.skip('error handling', () => {
    it('should handle file permission errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('EACCES: permission denied'));

      await expect(readFileByFormat('/path/to/restricted.json', 'json')).rejects.toThrow(
        'EACCES: permission denied'
      );
    });

    it('should handle corrupt CSV files', async () => {
      const corruptCsv = 'name,age\n"Alice,30\nBob,25'; // Missing closing quote
      mockFs.readFile.mockResolvedValue(corruptCsv);

      // CSV parser should handle this gracefully
      const result = await readFileByFormat('/path/to/corrupt.csv', 'csv');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle mixed JSONL content', async () => {
      const mixedContent = '{"valid": "json"}\ninvalid json line\n{"another": "valid"}';
      mockFs.readFile.mockResolvedValue(mixedContent);

      // Should parse valid lines and skip invalid ones
      const result = await readFileByFormat('/path/to/mixed.jsonl', 'jsonl');
      expect(result).toEqual([{ valid: 'json' }, { another: 'valid' }]);
    });

    it('should handle large files efficiently', async () => {
      const largeJsonData = {
        items: Array.from({ length: 10000 }, (_, i) => ({ id: i, value: `item${i}` })),
      };
      const largeContent = JSON.stringify(largeJsonData);
      mockFs.readFile.mockResolvedValue(largeContent);

      const startTime = Date.now();
      const result = await readFileByFormat('/path/to/large.json', 'json');
      const endTime = Date.now();

      expect(result.items).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe.skip('encoding and special characters', () => {
    it('should handle UTF-8 encoded files', async () => {
      const unicodeContent = '{"message": "Hello 世界! 🌍", "emoji": "🚀"}';
      mockFs.readFile.mockResolvedValue(unicodeContent);

      const result = await readFileByFormat('/path/to/unicode.json', 'json');
      expect(result.message).toContain('世界');
      expect(result.emoji).toBe('🚀');
    });

    it('should handle CSV with quoted fields', async () => {
      const csvContent =
        'name,description\n"Alice","She said, ""Hello"""\n"Bob","He likes ""quotes"""';
      mockFs.readFile.mockResolvedValue(csvContent);

      const result = await readFileByFormat('/path/to/quoted.csv', 'csv');
      expect(result).toEqual([
        { name: 'Alice', description: 'She said, "Hello"' },
        { name: 'Bob', description: 'He likes "quotes"' },
      ]);
    });
  });
});
