import { createReadStream, promises as fs, constants as fsConstants } from 'node:fs';
import type { Readable } from 'node:stream';
import {
  createCSVStream,
  createParquetStream,
  createTSVStream,
  detectFormatFromExtension,
  parseFile,
  type SupportedFormat,
} from './format-parsers';

export interface FileInputOptions {
  fileFormat?: 'json' | 'jsonl' | 'csv' | 'tsv' | 'parquet' | 'auto';
}

/**
 * Create a readable stream from a file
 */
export function createFileStream(filePath: string): Readable {
  return createReadStream(filePath, { encoding: 'utf8' });
}

/**
 * Read entire file content as string
 */
export async function readFileContent(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Detect file format based on extension and content
 */
export async function detectFileFormat(
  filePath: string,
  format: string = 'auto'
): Promise<SupportedFormat> {
  if (format !== 'auto') {
    return format as SupportedFormat;
  }

  // Check file extension first
  const detectedFormat = detectFormatFromExtension(filePath);
  if (detectedFormat) {
    return detectedFormat;
  }

  // If extension is ambiguous, check file content (first few lines for JSON/JSONL)
  try {
    const stream = createReadStream(filePath, { encoding: 'utf8' });
    let content = '';
    let linesChecked = 0;

    return new Promise(resolve => {
      stream.on('data', (chunk: string) => {
        content += chunk;
        const lines = content.split('\n');

        // Check first few lines to determine format
        for (let i = linesChecked; i < Math.min(lines.length, 3); i++) {
          const line = lines[i].trim();
          if (line) {
            linesChecked++;
            try {
              JSON.parse(line);
              // If we can parse individual lines as JSON, it's likely JSONL
              if (linesChecked >= 2) {
                stream.destroy();
                resolve('jsonl');
                return;
              }
            } catch {
              // Check if it looks like CSV (contains commas)
              if (line.includes(',')) {
                stream.destroy();
                resolve('csv');
                return;
              }
              // Check if it looks like TSV (contains tabs)
              if (line.includes('\t')) {
                stream.destroy();
                resolve('tsv');
                return;
              }
              // If individual line parsing fails, it's likely a single JSON
              stream.destroy();
              resolve('json');
              return;
            }
          }
        }
      });

      stream.on('end', () => {
        // Default to JSON if we can't determine
        resolve('json');
      });

      stream.on('error', () => {
        resolve('json');
      });
    });
  } catch {
    return 'json';
  }
}

/**
 * Read file content based on format
 */
export async function readFileByFormat(
  filePath: string,
  format: SupportedFormat
): Promise<string | unknown[]> {
  switch (format) {
    case 'json':
    case 'jsonl':
      return readFileContent(filePath);
    case 'csv':
    case 'tsv':
    case 'parquet':
      // For structured formats, return parsed data
      return parseFile(filePath, format);
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}

/**
 * Create streaming reader based on format
 */
export async function createFormatStream(
  filePath: string,
  format: SupportedFormat
): Promise<Readable> {
  switch (format) {
    case 'json':
    case 'jsonl':
      return createFileStream(filePath);
    case 'csv':
      return createCSVStream(filePath);
    case 'tsv':
      return createTSVStream(filePath);
    case 'parquet':
      return createParquetStream(filePath);
    default:
      throw new Error(`Unsupported file format for streaming: ${format}`);
  }
}

/**
 * Check if file exists and is readable
 */
export async function validateFile(filePath: string): Promise<void> {
  try {
    await fs.access(filePath, fsConstants.R_OK);
  } catch (error) {
    throw new Error(
      `File not accessible: ${filePath}. ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
