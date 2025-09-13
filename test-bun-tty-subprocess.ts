#!/usr/bin/env bun

import { spawn } from 'child_process';

console.log('=== Bun TTY Subprocess Test ===');
console.log('Bun version:', Bun.version);

// 1. 子プロセスで/dev/ttyにアクセス
console.log('\n--- Testing subprocess TTY access ---');
const ttyProcess = spawn('sh', ['-c', 'exec < /dev/tty; cat'], {
  stdio: ['inherit', 'pipe', 'inherit'],
  shell: false,
});

if (ttyProcess.stdout) {
  console.log('✅ TTY subprocess created!');
  console.log('subprocess PID:', ttyProcess.pid);
  
  // isTTYプロパティを追加
  const stream = ttyProcess.stdout as NodeJS.ReadStream & { isTTY?: boolean };
  stream.isTTY = true;
  
  console.log('stream.isTTY:', stream.isTTY);
  console.log('stream is readable:', stream.readable);
  
  // インタラクティブなテスト
  console.log('\n--- Interactive test ---');
  console.log('Type something and press Enter (or Ctrl+C to exit):');
  
  // データを受信したら表示
  stream.on('data', (chunk) => {
    console.log('Received:', JSON.stringify(chunk.toString()));
  });
  
  stream.on('error', (err) => {
    console.error('Stream error:', err);
  });
  
  // Ctrl+Cで終了
  process.on('SIGINT', () => {
    console.log('\n\nCleaning up...');
    ttyProcess.kill();
    process.exit(0);
  });
  
  // タイムアウト設定（10秒）
  setTimeout(() => {
    console.log('\nTimeout reached, cleaning up...');
    ttyProcess.kill();
    process.exit(0);
  }, 10000);
  
} else {
  console.log('❌ Failed to create TTY subprocess stdout');
}

// 2. 別の方法：ttyコマンドでデバイス名を取得
console.log('\n--- Getting TTY device name ---');
const ttyNameProcess = spawn('tty', [], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

ttyNameProcess.stdout.on('data', (data) => {
  console.log('Current TTY device:', data.toString().trim());
});

ttyNameProcess.stderr.on('data', (data) => {
  console.error('tty command error:', data.toString());
});

// 3. lsでTTYデバイスの権限を確認
console.log('\n--- Checking /dev/tty permissions ---');
const lsProcess = spawn('ls', ['-la', '/dev/tty'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

lsProcess.stdout.on('data', (data) => {
  console.log('/dev/tty info:', data.toString().trim());
});

lsProcess.stderr.on('data', (data) => {
  console.error('ls error:', data.toString());
});