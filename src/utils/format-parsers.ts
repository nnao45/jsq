import { createReadStream, promises as fs } from 'node:fs';
import { Readable } from 'node:stream';
import * as toml from '@iarna/toml';
import { parse as csvParse } from 'csv-parse';
import * as yaml from 'js-yaml';

export type SupportedFormat =
  | 'json'
  | 'jsonl'
  | 'csv'
  | 'tsv'
  | 'parquet'
  | 'yaml'
  | 'yml'
  | 'toml';

export interface ParseOptions {
  format: SupportedFormat;
  delimiter?: string;
  headers?: boolean;
}

/**
 * Parse CSV/TSV files and convert to JSON objects
 */
export async function parseCSVToJSON(
  filePath: string,
  options: { delimiter?: string; headers?: boolean } = {}
): Promise<unknown[]> {
  const { delimiter = ',', headers = true } = options;

  return new Promise((resolve, reject) => {
    const records: unknown[] = [];
    const stream = createReadStream(filePath);

    const parser = csvParse({
      delimiter,
      columns: headers,
      skip_empty_lines: true,
      trim: true,
    });

    stream
      .pipe(parser)
      .on('data', record => {
        records.push(record);
      })
      .on('error', error => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      })
      .on('end', () => {
        resolve(records);
      });
  });
}

/**
 * Create a streaming parser for CSV/TSV files
 */
export function createCSVStream(
  filePath: string,
  options: { delimiter?: string; headers?: boolean } = {}
): Readable {
  const { delimiter = ',', headers = true } = options;

  const fileStream = createReadStream(filePath);
  const parser = csvParse({
    delimiter,
    columns: headers,
    skip_empty_lines: true,
    trim: true,
  });

  return fileStream.pipe(parser);
}

/**
 * Parse TSV files (Tab-separated values)
 */
export async function parseTSVToJSON(
  filePath: string,
  options: { headers?: boolean } = {}
): Promise<unknown[]> {
  return parseCSVToJSON(filePath, { delimiter: '\t', ...options });
}

/**
 * Create a streaming parser for TSV files
 */
export function createTSVStream(filePath: string, options: { headers?: boolean } = {}): Readable {
  return createCSVStream(filePath, { delimiter: '\t', ...options });
}

/**
 * Parse Parquet files (simplified implementation)
 * Note: This is a basic implementation. For production use, consider using a more robust Parquet library.
 */
export async function parseParquetToJSON(filePath: string): Promise<unknown[]> {
  try {
    // For now, we'll use a simple approach - in production, you'd want to use a proper Parquet reader
    const parquet = await import('parquetjs-lite');
    const reader = await parquet.ParquetReader.openFile(filePath);

    const records: unknown[] = [];
    const cursor = reader.getCursor();

    let record = await cursor.next();
    while (record) {
      records.push(record);
      record = await cursor.next();
    }

    await reader.close();
    return records;
  } catch (error) {
    throw new Error(
      `Parquet parsing error: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure the file is a valid Parquet file.`
    );
  }
}

/**
 * Create a streaming parser for Parquet files
 * Note: Parquet streaming is complex; for now, we'll read all data and emit it
 */
export async function createParquetStream(filePath: string): Promise<Readable> {
  try {
    const records = await parseParquetToJSON(filePath);

    // Create a readable stream from the parsed records
    const stream = new Readable({ objectMode: true });

    let index = 0;
    stream._read = () => {
      if (index < records.length) {
        stream.push(records[index++]);
      } else {
        stream.push(null); // End of stream
      }
    };

    return stream;
  } catch (error) {
    throw new Error(
      `Failed to create Parquet stream: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Detect file format based on extension
 */
export function detectFormatFromExtension(filePath: string): SupportedFormat | null {
  const ext = filePath.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'json':
      return 'json';
    case 'jsonl':
    case 'ndjson':
      return 'jsonl';
    case 'csv':
      return 'csv';
    case 'tsv':
      return 'tsv';
    case 'parquet':
      return 'parquet';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'toml':
      return 'toml';
    default:
      return null;
  }
}

/**
 * Parse file based on format
 */
export async function parseFile(
  filePath: string,
  format: SupportedFormat,
  options: Record<string, unknown> = {}
): Promise<unknown[] | unknown> {
  switch (format) {
    case 'json': {
      const jsonContent = await fs.readFile(filePath, 'utf8');
      return JSON.parse(jsonContent);
    }

    case 'jsonl': {
      const jsonlContent = await fs.readFile(filePath, 'utf8');
      return jsonlContent
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    }

    case 'csv':
      return parseCSVToJSON(filePath, options);

    case 'tsv':
      return parseTSVToJSON(filePath, options);

    case 'parquet':
      return parseParquetToJSON(filePath);

    case 'yaml':
    case 'yml':
      return parseYAMLToJSON(filePath);

    case 'toml':
      return parseTOMLToJSON(filePath);

    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Parse YAML files and convert to JSON objects
 */
export async function parseYAMLToJSON(filePath: string): Promise<unknown> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const data = yaml.load(content);
    return data;
  } catch (error) {
    throw new Error(
      `YAML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse TOML files and convert to JSON objects
 */
export async function parseTOMLToJSON(filePath: string): Promise<unknown> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const data = toml.parse(content);
    return data;
  } catch (error) {
    throw new Error(
      `TOML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
