#!/usr/bin/env bun
import { spawn } from 'child_process';
import * as readline from 'readline';

console.log('🧪 Testing Bun TTY Wrap Support');
console.log('Bun Version:', Bun.version);
console.log('');

// Test 1: Check if process.binding is available
console.log('Test 1: process.binding availability');
console.log('typeof process.binding:', typeof process.binding);

try {
  const tty_wrap = process.binding('tty_wrap');
  console.log('✅ process.binding("tty_wrap") exists');
  console.log('Keys:', Object.keys(tty_wrap));
  
  // Test 2: Check TTY constructor
  if (tty_wrap.TTY) {
    console.log('\nTest 2: TTY constructor');
    console.log('✅ tty_wrap.TTY exists');
    console.log('TTY constructor:', tty_wrap.TTY);
    console.log('TTY prototype:', Object.getOwnPropertyNames(tty_wrap.TTY.prototype));
  }
  
  // Test 3: Try creating TTY instance
  console.log('\nTest 3: Creating TTY instance');
  try {
    const tty = new tty_wrap.TTY(0, true); // fd=0 (stdin), readable=true
    console.log('✅ TTY instance created');
    console.log('TTY instance:', tty);
    console.log('TTY methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(tty)));
  } catch (e) {
    console.log('❌ Error creating TTY:', e);
  }
  
  // Test 4: Check process.stdin properties
  console.log('\nTest 4: process.stdin properties');
  console.log('process.stdin.isTTY:', process.stdin.isTTY);
  console.log('process.stdin.setRawMode:', typeof process.stdin.setRawMode);
  
  // Test 5: Test with piped input
  if (!process.stdin.isTTY) {
    console.log('\nTest 5: Piped input detected');
    console.log('Let me try to access TTY using tty_wrap...');
    
    try {
      // Try to create TTY for /dev/tty
      const fs = require('fs');
      const ttyFd = fs.openSync('/dev/tty', 'r');
      console.log('Opened /dev/tty, fd:', ttyFd);
      
      const ttyStream = new tty_wrap.TTY(ttyFd, true);
      console.log('✅ Created TTY stream from /dev/tty');
      
      // Test setRawMode
      if (ttyStream.setRawMode) {
        console.log('setRawMode available:', typeof ttyStream.setRawMode);
        ttyStream.setRawMode(true);
        console.log('✅ setRawMode(true) worked!');
        ttyStream.setRawMode(false);
      }
    } catch (e) {
      console.log('❌ Error:', e);
    }
  }
} catch (e) {
  console.log('❌ process.binding("tty_wrap") failed:', e);
}

// Test 6: Compare with readline
console.log('\nTest 6: Readline compatibility');
try {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  console.log('✅ readline.createInterface worked');
  rl.close();
} catch (e) {
  console.log('❌ readline error:', e);
}