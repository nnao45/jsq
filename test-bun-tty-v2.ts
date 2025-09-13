#!/usr/bin/env bun
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as readline from 'readline';
import { Socket } from 'net';

console.log('🧪 Testing Bun TTY Wrap Support V2');
console.log('Bun Version:', Bun.version);
console.log('Platform:', process.platform);
console.log('Is TTY:', process.stdin.isTTY);
console.log('');

// Test 1: Try different file descriptors
console.log('Test 1: Testing different file descriptors');
const tty_wrap = process.binding('tty_wrap');

const fdTests = [
  { fd: 0, name: 'stdin (0)' },
  { fd: 1, name: 'stdout (1)' },
  { fd: 2, name: 'stderr (2)' },
];

for (const { fd, name } of fdTests) {
  try {
    console.log(`\nTrying ${name}:`);
    const tty = new tty_wrap.TTY(fd, fd === 0);
    console.log(`✅ Created TTY for ${name}`);
    console.log('  Has setRawMode:', typeof tty.setRawMode === 'function');
    
    if (fd === 0 && tty.setRawMode) {
      try {
        tty.setRawMode(true);
        console.log('  ✅ setRawMode(true) worked');
        tty.setRawMode(false);
      } catch (e) {
        console.log('  ❌ setRawMode failed:', e.message);
      }
    }
  } catch (e) {
    console.log(`❌ Failed for ${name}:`, e.message);
  }
}

// Test 2: Try opening TTY devices directly
console.log('\n\nTest 2: Opening TTY devices directly');
const ttyDevices = ['/dev/tty', '/dev/stdin', '/dev/stdout', '/dev/stderr'];

for (const device of ttyDevices) {
  try {
    const fd = fs.openSync(device, 'r+');
    console.log(`\n✅ Opened ${device}, fd: ${fd}`);
    
    try {
      const tty = new tty_wrap.TTY(fd, true);
      console.log('  ✅ Created TTY wrapper');
      
      if (tty.setRawMode) {
        tty.setRawMode(true);
        console.log('  ✅ setRawMode worked');
        tty.setRawMode(false);
      }
      
      fs.closeSync(fd);
    } catch (e) {
      console.log('  ❌ TTY wrapper failed:', e.message);
      fs.closeSync(fd);
    }
  } catch (e) {
    console.log(`❌ Failed to open ${device}:`, e.message);
  }
}

// Test 3: Monkey-patch process.stdin with setRawMode
console.log('\n\nTest 3: Monkey-patching process.stdin');
if (!process.stdin.isTTY) {
  console.log('Adding setRawMode to process.stdin...');
  
  // Try to add setRawMode method
  (process.stdin as any).setRawMode = function(mode: boolean) {
    console.log(`  setRawMode(${mode}) called`);
    return this;
  };
  
  // Mark as TTY
  (process.stdin as any).isTTY = true;
  
  console.log('✅ Monkey-patched process.stdin');
  console.log('  isTTY:', process.stdin.isTTY);
  console.log('  setRawMode:', typeof (process.stdin as any).setRawMode);
}

// Test 4: Using Socket to wrap stdin
console.log('\n\nTest 4: Using Socket wrapper');
try {
  const socket = new Socket({ fd: 0, readable: true, writable: false });
  console.log('✅ Created Socket wrapper for stdin');
  console.log('  readable:', socket.readable);
  console.log('  writable:', socket.writable);
  
  // Try to add TTY-like methods
  (socket as any).isTTY = true;
  (socket as any).setRawMode = function(mode: boolean) {
    console.log(`  Socket.setRawMode(${mode}) called`);
    return this;
  };
  
  console.log('✅ Added TTY methods to Socket');
} catch (e) {
  console.log('❌ Socket wrapper failed:', e.message);
}

// Test 5: Check process.binding internals
console.log('\n\nTest 5: Process binding internals');
console.log('tty_wrap keys:', Object.keys(tty_wrap));
console.log('tty_wrap.isTTY:', typeof tty_wrap.isTTY);

if (tty_wrap.TTY) {
  console.log('\nTTY constructor properties:');
  console.log('  name:', tty_wrap.TTY.name);
  console.log('  length:', tty_wrap.TTY.length);
  
  const instance = Object.create(tty_wrap.TTY.prototype);
  console.log('\nTTY prototype methods:');
  for (const key of Object.getOwnPropertyNames(tty_wrap.TTY.prototype)) {
    console.log(`  ${key}:`, typeof instance[key]);
  }
}

// Test 6: Check if we can use readline with custom input
console.log('\n\nTest 6: Readline with custom stream');
try {
  // Create a custom stream
  const customStream = new (require('stream').Readable)({
    read() {}
  });
  
  // Add TTY methods
  (customStream as any).isTTY = true;
  (customStream as any).setRawMode = function(mode: boolean) {
    console.log(`  customStream.setRawMode(${mode}) called`);
    return this;
  };
  
  const rl = readline.createInterface({
    input: customStream,
    output: process.stdout,
  });
  
  console.log('✅ Created readline with custom stream');
  console.log('  terminal:', rl.terminal);
  
  rl.close();
} catch (e) {
  console.log('❌ Custom readline failed:', e.message);
}