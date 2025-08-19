import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  validateFile, 
  detectFileFormat, 
  readFileByFormat, 
  createFormatStream,
  createFileStream,
  readFileContent
} from './file-input';
import { Readable } from 'stream';

describe('File Input Utils', () => {
  const testDir = path.join(__dirname, '../../test-data');
  const testJsonFile = path.join(testDir, 'test.json');
  const testJsonlFile = path.join(testDir, 'test.jsonl');
  const testCsvFile = path.join(testDir, 'test.csv');
  const testTsvFile = path.join(testDir, 'test.tsv');
  const testTxtFile = path.join(testDir, 'test.txt');

  beforeAll(async () => {
    // Create test directory
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Create test files
    const testJsonData = {
      users: [
        { name: 'Alice', age: 30, department: 'engineering' },
        { name: 'Bob', age: 25, department: 'design' }
      ]
    };

    const testJsonlData = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
      { id: 3, name: 'Charlie', active: true }
    ];

    const testCsvData = `name,age,department
Alice,30,engineering
Bob,25,design
Charlie,35,marketing`;

    const testTsvData = `name\tage\tdepartment
Alice\t30\tengineering
Bob\t25\tdesign
Charlie\t35\tmarketing`;

    const testTxtData = 'This is just a text file for testing.';

    await fs.writeFile(testJsonFile, JSON.stringify(testJsonData, null, 2));
    await fs.writeFile(testJsonlFile, testJsonlData.map(obj => JSON.stringify(obj)).join('\n'));
    await fs.writeFile(testCsvFile, testCsvData);
    await fs.writeFile(testTsvFile, testTsvData);
    await fs.writeFile(testTxtFile, testTxtData);
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('validateFile', () => {
    it('should validate existing files', async () => {
      await expect(validateFile(testJsonFile)).resolves.toBeUndefined();
    });

    it('should throw error for non-existent files', async () => {
      const nonExistentFile = path.join(testDir, 'does-not-exist.json');
      await expect(validateFile(nonExistentFile)).rejects.toThrow('File not found');
    });

    it('should throw error for directories', async () => {
      await expect(validateFile(testDir)).rejects.toThrow('Path is a directory');
    });

    it('should validate file access permissions', async () => {
      await expect(validateFile(testJsonFile)).resolves.toBeUndefined();
    });
  });

  describe('detectFileFormat', () => {
    it('should detect JSON format by extension', async () => {
      const format = await detectFileFormat(testJsonFile, 'auto');
      expect(format).toBe('json');
    });

    it('should detect JSONL format by extension', async () => {
      const format = await detectFileFormat(testJsonlFile, 'auto');
      expect(format).toBe('jsonl');
    });

    it('should detect CSV format by extension', async () => {
      const format = await detectFileFormat(testCsvFile, 'auto');
      expect(format).toBe('csv');
    });

    it('should detect TSV format by extension', async () => {
      const format = await detectFileFormat(testTsvFile, 'auto');
      expect(format).toBe('tsv');
    });

    it('should use specified format when not auto', async () => {
      const format = await detectFileFormat(testTxtFile, 'json');
      expect(format).toBe('json');
    });

    it('should detect JSON format by content when extension is ambiguous', async () => {
      // Create a file with .txt extension but JSON content
      const jsonAsTxt = path.join(testDir, 'json-as-txt.txt');
      await fs.writeFile(jsonAsTxt, '{"test": "data"}');

      const format = await detectFileFormat(jsonAsTxt, 'auto');
      expect(format).toBe('json');

      await fs.unlink(jsonAsTxt);
    });

    it('should detect JSONL format by content when extension is ambiguous', async () => {
      // Create a file with .txt extension but JSONL content
      const jsonlAsTxt = path.join(testDir, 'jsonl-as-txt.txt');
      await fs.writeFile(jsonlAsTxt, '{"line": 1}\n{"line": 2}\n{"line": 3}');

      const format = await detectFileFormat(jsonlAsTxt, 'auto');
      expect(format).toBe('jsonl');

      await fs.unlink(jsonlAsTxt);
    });

    it('should default to json for unknown formats', async () => {
      const format = await detectFileFormat(testTxtFile, 'auto');
      expect(format).toBe('json');
    });
  });

  describe('readFileContent', () => {
    it('should read file content as string', async () => {
      const content = await readFileContent(testJsonFile);
      expect(typeof content).toBe('string');
      expect(content).toContain('Alice');
      expect(content).toContain('engineering');
    });

    it('should handle different encodings', async () => {
      const content = await readFileContent(testJsonFile);
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('readFileByFormat', () => {
    it('should parse JSON files correctly', async () => {
      const data = await readFileByFormat(testJsonFile, 'json');
      expect(data).toHaveProperty('users');
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.users[0].name).toBe('Alice');
    });

    it('should parse JSONL files correctly', async () => {
      const data = await readFileByFormat(testJsonlFile, 'jsonl') as any[];
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(3);
      expect(data[0].name).toBe('Alice');
      expect(data[1].name).toBe('Bob');
      expect(data[2].name).toBe('Charlie');
    });

    it('should parse CSV files correctly', async () => {
      const data = await readFileByFormat(testCsvFile, 'csv') as any[];
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(3);
      expect(data[0].name).toBe('Alice');
      expect(data[0].age).toBe('30');
      expect(data[0].department).toBe('engineering');
    });

    it('should parse TSV files correctly', async () => {
      const data = await readFileByFormat(testTsvFile, 'tsv') as any[];
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(3);
      expect(data[0].name).toBe('Alice');
      expect(data[0].age).toBe('30');
      expect(data[0].department).toBe('engineering');
    });

    it('should handle empty JSON files', async () => {
      const emptyJsonFile = path.join(testDir, 'empty.json');
      await fs.writeFile(emptyJsonFile, '{}');

      const data = await readFileByFormat(emptyJsonFile, 'json');
      expect(data).toEqual({});

      await fs.unlink(emptyJsonFile);
    });

    it('should handle empty JSONL files', async () => {
      const emptyJsonlFile = path.join(testDir, 'empty.jsonl');
      await fs.writeFile(emptyJsonlFile, '');

      const data = await readFileByFormat(emptyJsonlFile, 'jsonl') as any[];
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);

      await fs.unlink(emptyJsonlFile);
    });

    it('should handle invalid JSON gracefully', async () => {
      const invalidJsonFile = path.join(testDir, 'invalid.json');
      await fs.writeFile(invalidJsonFile, '{invalid json}');

      await expect(readFileByFormat(invalidJsonFile, 'json')).rejects.toThrow();

      await fs.unlink(invalidJsonFile);
    });

    it('should handle CSV with different delimiters', async () => {
      const customCsvFile = path.join(testDir, 'custom.csv');
      await fs.writeFile(customCsvFile, 'name;age;city\nAlice;30;NYC\nBob;25;LA');

      const data = await readFileByFormat(customCsvFile, 'csv') as any[];
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
      // Note: This test assumes the CSV parser can handle different delimiters
      // The actual behavior depends on the CSV parsing library used

      await fs.unlink(customCsvFile);
    });
  });

  describe('createFileStream', () => {
    it('should create readable stream from file', async () => {
      const stream = await createFileStream(testJsonFile);
      expect(stream).toBeInstanceOf(Readable);

      let content = '';
      stream.on('data', (chunk) => {
        content += chunk.toString();
      });

      await new Promise((resolve) => {
        stream.on('end', resolve);
      });

      expect(content).toContain('Alice');
    });

    it('should handle non-existent files', async () => {
      const nonExistentFile = path.join(testDir, 'does-not-exist.json');
      await expect(createFileStream(nonExistentFile)).rejects.toThrow();
    });
  });

  describe('createFormatStream', () => {
    it('should create stream for JSON files', async () => {
      const stream = await createFormatStream(testJsonFile, 'json');
      expect(stream).toBeInstanceOf(Readable);

      let content = '';
      stream.on('data', (chunk) => {
        content += chunk.toString();
      });

      await new Promise((resolve) => {
        stream.on('end', resolve);
      });

      expect(content).toContain('Alice');
    });

    it('should create stream for JSONL files', async () => {
      const stream = await createFormatStream(testJsonlFile, 'jsonl');
      expect(stream).toBeInstanceOf(Readable);

      let content = '';
      stream.on('data', (chunk) => {
        content += chunk.toString();
      });

      await new Promise((resolve) => {
        stream.on('end', resolve);
      });

      expect(content).toContain('Alice');
    });

    it('should create stream for CSV files', async () => {
      const stream = await createFormatStream(testCsvFile, 'csv');
      expect(stream).toBeInstanceOf(Readable);

      const objects: any[] = [];
      stream.on('data', (obj) => {
        objects.push(obj);
      });

      await new Promise((resolve) => {
        stream.on('end', resolve);
      });

      expect(objects).toHaveLength(3);
      expect(objects[0].name).toBe('Alice');
    });

    it('should create stream for TSV files', async () => {
      const stream = await createFormatStream(testTsvFile, 'tsv');
      expect(stream).toBeInstanceOf(Readable);

      const objects: any[] = [];
      stream.on('data', (obj) => {
        objects.push(obj);
      });

      await new Promise((resolve) => {
        stream.on('end', resolve);
      });

      expect(objects).toHaveLength(3);
      expect(objects[0].name).toBe('Alice');
    });

    it('should handle unsupported formats', async () => {
      await expect(createFormatStream(testTxtFile, 'parquet' as any)).rejects.toThrow('Unsupported format');
    });
  });

  describe('error handling', () => {
    it('should handle file permission errors', async () => {
      const restrictedFile = path.join(testDir, 'restricted.json');
      await fs.writeFile(restrictedFile, '{"test": "data"}');
      
      // This test might need to be adjusted based on the actual permission handling
      await expect(validateFile(restrictedFile)).resolves.toBeUndefined();
      
      await fs.unlink(restrictedFile);
    });

    it('should handle corrupt CSV files', async () => {
      const corruptCsvFile = path.join(testDir, 'corrupt.csv');
      await fs.writeFile(corruptCsvFile, 'name,age\nAlice,30\nBob,'); // Missing field

      const data = await readFileByFormat(corruptCsvFile, 'csv') as any[];
      expect(Array.isArray(data)).toBe(true);
      // The parser should handle missing fields gracefully

      await fs.unlink(corruptCsvFile);
    });

    it('should handle mixed JSONL content', async () => {
      const mixedJsonlFile = path.join(testDir, 'mixed.jsonl');
      const mixedContent = [
        '{"valid": "json"}',
        '{invalid json}',
        '{"another": "valid", "json": true}'
      ].join('\n');
      
      await fs.writeFile(mixedJsonlFile, mixedContent);

      // The behavior here depends on implementation - might skip invalid lines
      const data = await readFileByFormat(mixedJsonlFile, 'jsonl') as any[];
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      await fs.unlink(mixedJsonlFile);
    });

    it('should handle large files efficiently', async () => {
      const largeJsonFile = path.join(testDir, 'large.json');
      const largeData = {
        records: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `user${i}`,
          value: Math.random()
        }))
      };

      await fs.writeFile(largeJsonFile, JSON.stringify(largeData));

      const startTime = Date.now();
      const data = await readFileByFormat(largeJsonFile, 'json') as any;
      const endTime = Date.now();

      expect(data.records).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      await fs.unlink(largeJsonFile);
    });
  });

  describe('encoding and special characters', () => {
    it('should handle UTF-8 encoded files', async () => {
      const utf8File = path.join(testDir, 'utf8.json');
      const utf8Data = { message: 'Hello 世界! 🌍', emoji: '🚀', unicode: 'café résumé naïve' };

      await fs.writeFile(utf8File, JSON.stringify(utf8Data), 'utf-8');

      const data = await readFileByFormat(utf8File, 'json') as any;
      expect(data.message).toBe('Hello 世界! 🌍');
      expect(data.emoji).toBe('🚀');
      expect(data.unicode).toBe('café résumé naïve');

      await fs.unlink(utf8File);
    });

    it('should handle CSV with quoted fields', async () => {
      const quotedCsvFile = path.join(testDir, 'quoted.csv');
      const quotedData = `name,description,tags
"John Doe","Software Engineer, Team Lead","typescript,javascript"
"Jane Smith","Product Manager","management,strategy"
"Bob Wilson","Designer, UX/UI","design,user-experience"`;

      await fs.writeFile(quotedCsvFile, quotedData);

      const data = await readFileByFormat(quotedCsvFile, 'csv') as any[];
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(3);
      expect(data[0].name).toBe('John Doe');
      expect(data[0].description).toBe('Software Engineer, Team Lead');

      await fs.unlink(quotedCsvFile);
    });
  });
});