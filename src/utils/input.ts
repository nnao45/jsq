import { stdin } from 'node:process';
import type { Readable } from 'node:stream';

export const readStdin = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    let data = '';

    // Try to read data with a short timeout to detect if there's input available
    let hasReceivedData = false;
    const timeout = setTimeout(() => {
      if (!hasReceivedData) {
        resolve('null');
      }
    }, 100); // 100ms timeout

    stdin.setEncoding('utf8');

    stdin.on('data', chunk => {
      hasReceivedData = true;
      clearTimeout(timeout);
      data += chunk;
    });

    stdin.on('end', () => {
      if (hasReceivedData) {
        resolve(data.trim());
      }
    });

    stdin.on('error', err => {
      clearTimeout(timeout);
      reject(new Error(`Failed to read from stdin: ${err.message}`));
    });
  });
};

export const parseJson = (input: string): unknown => {
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(
      `Invalid JSON input: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export const getStdinStream = (): Readable => {
  return stdin;
};

export const isStdinAvailable = (): boolean => {
  return !stdin.isTTY;
};
