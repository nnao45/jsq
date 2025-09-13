#!/usr/bin/env bun

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { mkdtemp, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

console.log('=== Bun FIFO Workaround Test ===');
console.log('Bun version:', Bun.version);

async function testFIFOWorkarounds() {
  const tmpDir = await mkdtemp(join(tmpdir(), 'bun-fifo-workaround-'));
  const fifoPath = join(tmpDir, 'test.fifo');
  
  // FIFO作成
  const mkfifo = spawn('mkfifo', [fifoPath]);
  await new Promise(resolve => mkfifo.on('exit', resolve));
  console.log('✅ FIFO created:', fifoPath);
  
  console.log('\n--- Workaround 1: Using readFileSync in a loop ---');
  // バックグラウンドで書き込み
  setTimeout(() => {
    spawn('sh', ['-c', `echo "Message 1" > ${fifoPath}`]);
    setTimeout(() => {
      spawn('sh', ['-c', `echo "Message 2" > ${fifoPath}`]);
    }, 1000);
  }, 500);
  
  // 読み込みループ
  let count = 0;
  const interval = setInterval(() => {
    try {
      if (existsSync(fifoPath)) {
        const data = readFileSync(fifoPath, 'utf8');
        console.log(`Received: ${JSON.stringify(data.trim())}`);
        count++;
        if (count >= 2) {
          clearInterval(interval);
        }
      }
    } catch (err) {
      // FIFOが空の場合はブロックされる
    }
  }, 100);
  
  // 3秒後に次のテストへ
  await new Promise(resolve => setTimeout(resolve, 3000));
  clearInterval(interval);
  
  console.log('\n--- Workaround 2: Using child process with cat ---');
  // catプロセスを使ってFIFOを読む
  const catProcess = spawn('cat', [fifoPath], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  catProcess.stdout.on('data', (data) => {
    console.log(`Cat received: ${JSON.stringify(data.toString().trim())}`);
  });
  
  // データを送信
  setTimeout(() => {
    spawn('sh', ['-c', `echo "Via cat process" > ${fifoPath}`]);
  }, 500);
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  catProcess.kill();
  
  console.log('\n--- Workaround 3: Using Bun.spawn ---');
  // Bun.spawnを使ってみる
  const bunCat = Bun.spawn(['cat', fifoPath], {
    stdout: 'pipe'
  });
  
  // データを送信
  setTimeout(() => {
    spawn('sh', ['-c', `echo "Via Bun.spawn" > ${fifoPath}`]);
  }, 500);
  
  // Bun.spawnの出力を読む
  const reader = bunCat.stdout.getReader();
  const decoder = new TextDecoder();
  
  try {
    const { value } = await reader.read();
    if (value) {
      console.log(`Bun.spawn received: ${JSON.stringify(decoder.decode(value).trim())}`);
    }
  } catch (err) {
    console.error('Bun.spawn error:', err);
  }
  
  bunCat.kill();
  
  // クリーンアップ
  await unlink(fifoPath);
  console.log('\n✅ All workarounds tested!');
}

testFIFOWorkarounds().catch(console.error);