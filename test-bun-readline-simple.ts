#!/usr/bin/env bun

import * as readline from 'node:readline';

console.log('Testing simple readline in Bun...\n');

// Prepare stdin
const stdin = process.stdin as any;
stdin.isTTY = true;
stdin.setRawMode = function(mode: boolean) { return this; };
stdin.resume = stdin.resume || function() { return this; };
stdin.pause = stdin.pause || function() { return this; };

console.log('stdin.isTTY:', stdin.isTTY);
console.log('stdin has resume:', typeof stdin.resume === 'function');
console.log('stdin has pause:', typeof stdin.pause === 'function');

// Create readline interface
const rl = readline.createInterface({
  input: stdin,
  output: process.stdout,
  terminal: true
});

console.log('\nReadline interface created');

// Set up timeout
const timeout = setTimeout(() => {
  console.log('\nTimeout reached, closing...');
  rl.close();
  process.exit(1);
}, 5000);

// Listen for line events
rl.on('line', (line) => {
  console.log(`Got line: "${line}"`);
  clearTimeout(timeout);
  rl.close();
  process.exit(0);
});

// Prompt
rl.prompt();
console.log('Waiting for input...');

// Also try reading directly from stdin
stdin.on('data', (chunk: Buffer) => {
  console.log(`Got data chunk: "${chunk.toString()}"`);
});