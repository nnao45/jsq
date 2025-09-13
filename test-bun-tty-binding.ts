#!/usr/bin/env bun

console.log('=== Bun TTY Binding Test ===');
console.log('Bun version:', Bun.version);

// 1. process.binding('tty_wrap')を試す
console.log('\n--- Testing process.binding("tty_wrap") ---');
try {
  const tty_wrap = (process as any).binding('tty_wrap');
  console.log('✅ process.binding("tty_wrap") succeeded!');
  console.log('tty_wrap object:', tty_wrap);
  
  if (tty_wrap && tty_wrap.TTY) {
    console.log('✅ tty_wrap.TTY exists!');
    console.log('TTY constructor:', typeof tty_wrap.TTY);
    
    // TTYインスタンスを作成してみる
    try {
      const ttyInstance = new tty_wrap.TTY(0); // stdinのfd
      console.log('✅ TTY instance created!');
      console.log('TTY instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(ttyInstance)));
    } catch (e) {
      console.log('❌ Failed to create TTY instance:', e);
    }
  } else {
    console.log('❌ tty_wrap.TTY does not exist');
  }
} catch (error) {
  console.log('❌ process.binding("tty_wrap") failed:', error);
}

// process.stdinの状態を確認
console.log('\n--- process.stdin state ---');
console.log('process.stdin.isTTY:', process.stdin.isTTY);
console.log('process.stdin.setRawMode:', typeof process.stdin.setRawMode);

// /dev/ttyに直接アクセスしてみる
console.log('\n--- Direct /dev/tty access ---');
try {
  const fs = require('fs');
  const tty = require('tty');
  
  const fd = fs.openSync('/dev/tty', 'r+');
  console.log('✅ /dev/tty opened! fd:', fd);
  
  // ReadStreamを作成
  const stream = new tty.ReadStream(fd);
  console.log('✅ tty.ReadStream created!');
  console.log('stream.isTTY:', stream.isTTY);
  console.log('stream.setRawMode:', typeof stream.setRawMode);
  
  // テスト用にrawモードをオン/オフしてみる
  if (typeof stream.setRawMode === 'function') {
    console.log('Testing setRawMode...');
    stream.setRawMode(true);
    console.log('✅ setRawMode(true) succeeded');
    stream.setRawMode(false);
    console.log('✅ setRawMode(false) succeeded');
  }
  
  fs.closeSync(fd);
  console.log('✅ /dev/tty closed');
} catch (error) {
  console.log('❌ Direct /dev/tty access failed:', error);
}

console.log('\n=== Test completed ===');