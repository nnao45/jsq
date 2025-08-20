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
  fileFormat?: 'json' | 'jsonl' | 'csv' | 'tsv' | 'parquet' | 'yaml' | 'yml' | 'toml' | 'auto';
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

  // If extension is ambiguous, check file content
  return await detectFormatFromContent(filePath);
}

async function detectFormatFromContent(filePath: string): Promise<SupportedFormat> {
  try {
    const stream = createReadStream(filePath, { encoding: 'utf8' });
    let content = '';
    let linesChecked = 0;

    return new Promise(resolve => {
      stream.on('data', (chunk: string) => {
        content += chunk;
        const lines = content.split('\n');

        const result = analyzeContentLines(lines, linesChecked);
        if (result.format) {
          stream.destroy();
          resolve(result.format);
          return;
        }
        linesChecked = result.linesChecked;
      });

      stream.on('end', () => {
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

function analyzeContentLines(
  lines: string[],
  startIndex: number
): { format?: SupportedFormat; linesChecked: number } {
  let linesChecked = startIndex;

  for (let i = startIndex; i < Math.min(lines.length, 3); i++) {
    const line = lines[i].trim();
    if (line) {
      linesChecked++;
      const lineFormat = detectLineFormat(line, linesChecked);
      if (lineFormat) {
        return { format: lineFormat, linesChecked };
      }
    }
  }

  return { linesChecked };
}

function detectLineFormat(line: string, linesChecked: number): SupportedFormat | null {
  try {
    JSON.parse(line);
    // If we can parse individual lines as JSON, it's likely JSONL
    if (linesChecked >= 2) {
      return 'jsonl';
    }
  } catch {
    if (line.includes(',')) {
      return 'csv';
    }
    if (line.includes('\t')) {
      return 'tsv';
    }
    // If individual line parsing fails, it's likely a single JSON
    return 'json';
  }

  return null;
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
    case 'yaml':
    case 'yml':
    case 'toml':
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
    case 'yaml':
    case 'yml':
    case 'toml':
      // YAML and TOML files are typically smaller and loaded entirely into memory
      return createFileStream(filePath);
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
