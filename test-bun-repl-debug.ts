#!/usr/bin/env bun

console.log('Testing jsq REPL with Bun debug...\n');

// First, let's manually check the TTY stream
import { getInteractiveInputStream } from './src/utils/tty-helper.ts';

const stdinData = '["hello", "world"]';
console.log('Initial data:', stdinData);

const inputStream = await getInteractiveInputStream(stdinData, true);
console.log('\nInputStream details:');
console.log('- isTTY:', inputStream.isTTY);
console.log('- readable:', inputStream.readable);
console.log('- has resume:', typeof (inputStream as any).resume === 'function');
console.log('- has pause:', typeof (inputStream as any).pause === 'function');
console.log('- is process.stdin:', inputStream === process.stdin);

// Try reading from the stream
console.log('\nTrying to read from stream...');

inputStream.on('data', (chunk) => {
  console.log('Got data from inputStream:', chunk.toString());
});

// Also listen on process.stdin
process.stdin.on('data', (chunk) => {
  console.log('Got data from process.stdin:', chunk.toString());
});

// Try creating readline interface directly
import * as readline from 'node:readline';

console.log('\nCreating readline interface...');
const rl = readline.createInterface({
  input: inputStream,
  output: process.stdout,
  terminal: true
});

rl.on('line', (line) => {
  console.log('Got line from readline:', line);
  rl.close();
  process.exit(0);
});

rl.prompt();

setTimeout(() => {
  console.log('\nTimeout after 3 seconds');
  rl.close();
  process.exit(1);
}, 3000);