#!/usr/bin/env bun

import * as readline from 'node:readline';

console.log('Testing readline events in Bun...\n');

// Prepare stdin
const stdin = process.stdin as any;
stdin.isTTY = true;
stdin.setRawMode = function(mode: boolean) { 
  console.log(`setRawMode called with: ${mode}`);
  return this; 
};
stdin.resume = stdin.resume || function() { 
  console.log('resume called');
  return this; 
};
stdin.pause = stdin.pause || function() { 
  console.log('pause called');
  return this; 
};

// Create readline interface
const rl = readline.createInterface({
  input: stdin,
  output: process.stdout,
  terminal: true
});

console.log('Readline interface created');

// Set up all event listeners
rl.on('line', (line) => {
  console.log(`\n[EVENT] line: "${line}"`);
  if (line === 'exit') {
    rl.close();
  } else {
    rl.prompt();
  }
});

rl.on('close', () => {
  console.log('\n[EVENT] close');
  process.exit(0);
});

rl.on('SIGINT', () => {
  console.log('\n[EVENT] SIGINT');
  rl.close();
});

// Try emitting keypress events
try {
  readline.emitKeypressEvents(stdin);
  console.log('Keypress events enabled');
  
  stdin.on('keypress', (str: string, key: any) => {
    console.log(`[EVENT] keypress: str="${str}", key=${JSON.stringify(key)}`);
  });
} catch (e) {
  console.error('Failed to enable keypress events:', e);
}

// Show prompt
console.log('\nShowing prompt...');
rl.prompt();

// Also listen to raw stdin data
stdin.on('data', (chunk: Buffer) => {
  console.log(`\n[EVENT] stdin data: "${chunk.toString()}" (bytes: ${chunk.length})`);
});

// Keep alive with timeout
setTimeout(() => {
  console.log('\nTimeout after 10 seconds');
  rl.close();
}, 10000);