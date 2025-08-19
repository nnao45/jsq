import { stdin } from 'process';
import { Readable } from 'stream';

export const readStdin = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    let data = '';
    
    // Check if there's data available on stdin
    if (stdin.isTTY) {
      reject(new Error('No input data available. Please pipe JSON data to jsq.'));
      return;
    }

    stdin.setEncoding('utf8');
    
    stdin.on('data', chunk => {
      data += chunk;
    });
    
    stdin.on('end', () => {
      resolve(data.trim());
    });
    
    stdin.on('error', err => {
      reject(new Error(`Failed to read from stdin: ${err.message}`));
    });
    
    // Set a timeout for stdin reading
    const timeout = setTimeout(() => {
      reject(new Error('Timeout reading from stdin'));
    }, 10000);
    
    stdin.on('end', () => {
      clearTimeout(timeout);
    });
  });
};

export const parseJson = (input: string): unknown => {
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid JSON input: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getStdinStream = (): Readable => {
  return stdin;
};

export const isStdinAvailable = (): boolean => {
  return !stdin.isTTY;
};