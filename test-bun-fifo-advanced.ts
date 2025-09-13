#!/usr/bin/env bun

import { spawn, exec } from 'child_process';
import { createReadStream, createWriteStream, unlinkSync, existsSync } from 'fs';
import { mkdtemp, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('=== Bun FIFO (Named Pipe) Test ===');
console.log('Bun version:', Bun.version);
console.log('Platform:', process.platform);

async function testBasicFIFO() {
  console.log('\n--- Test 1: Basic FIFO Creation and Communication ---');
  
  try {
    // 一時ディレクトリを作成
    const tmpDir = await mkdtemp(join(tmpdir(), 'bun-fifo-test-'));
    const fifoPath = join(tmpDir, 'test.fifo');
    console.log('Created temp dir:', tmpDir);
    console.log('FIFO path:', fifoPath);
    
    // FIFOを作成
    const mkfifoProcess = spawn('mkfifo', [fifoPath]);
    await new Promise((resolve, reject) => {
      mkfifoProcess.on('exit', (code) => {
        if (code === 0) {
          console.log('✅ FIFO created successfully');
          resolve(undefined);
        } else {
          reject(new Error(`mkfifo failed with code ${code}`));
        }
      });
    });
    
    // FIFOの情報を確認
    const { stdout } = await execAsync(`ls -la ${fifoPath}`);
    console.log('FIFO info:', stdout.trim());
    
    // 非同期でFIFOに書き込む
    console.log('\nStarting writer process...');
    const writerProcess = spawn('sh', ['-c', `echo "Hello from FIFO!" > ${fifoPath}`], {
      detached: true,
    });
    writerProcess.unref();
    
    // FIFOから読み込む
    console.log('Reading from FIFO...');
    const readStream = createReadStream(fifoPath);
    
    const dataPromise = new Promise<string>((resolve) => {
      let data = '';
      readStream.on('data', (chunk) => {
        data += chunk.toString();
      });
      readStream.on('end', () => {
        resolve(data);
      });
    });
    
    const result = await dataPromise;
    console.log('✅ Received data:', JSON.stringify(result.trim()));
    
    // クリーンアップ
    await unlink(fifoPath);
    console.log('✅ FIFO cleaned up');
    
  } catch (error) {
    console.error('❌ Basic FIFO test failed:', error);
  }
}

async function testInteractiveFIFO() {
  console.log('\n--- Test 2: Interactive FIFO with TTY Emulation ---');
  
  try {
    const tmpDir = await mkdtemp(join(tmpdir(), 'bun-fifo-interactive-'));
    const fifoPath = join(tmpDir, 'interactive.fifo');
    
    // FIFOを作成
    await execAsync(`mkfifo ${fifoPath}`);
    console.log('✅ Interactive FIFO created:', fifoPath);
    
    // バックグラウンドで/dev/ttyからFIFOに転送するプロセスを起動
    console.log('\nTrying to connect /dev/tty to FIFO...');
    const ttyToFifoProcess = spawn('sh', ['-c', `exec < /dev/tty; cat > ${fifoPath}`], {
      detached: true,
      stdio: 'ignore',
    });
    ttyToFifoProcess.unref();
    
    // FIFOから読み込むストリームを作成
    const readStream = createReadStream(fifoPath) as NodeJS.ReadStream & { isTTY?: boolean };
    readStream.isTTY = true; // TTYとしてマーク
    
    console.log('✅ Interactive stream created');
    console.log('stream.isTTY:', readStream.isTTY);
    console.log('stream.readable:', readStream.readable);
    
    // タイムアウトで終了
    setTimeout(async () => {
      console.log('\nCleaning up interactive FIFO...');
      ttyToFifoProcess.kill();
      readStream.destroy();
      await unlink(fifoPath);
      console.log('✅ Interactive FIFO cleaned up');
    }, 3000);
    
  } catch (error) {
    console.error('❌ Interactive FIFO test failed:', error);
  }
}

async function testBidirectionalFIFO() {
  console.log('\n--- Test 3: Bidirectional Communication with FIFOs ---');
  
  try {
    const tmpDir = await mkdtemp(join(tmpdir(), 'bun-fifo-bidir-'));
    const inputFifo = join(tmpDir, 'input.fifo');
    const outputFifo = join(tmpDir, 'output.fifo');
    
    // 2つのFIFOを作成
    await execAsync(`mkfifo ${inputFifo} ${outputFifo}`);
    console.log('✅ Created input FIFO:', inputFifo);
    console.log('✅ Created output FIFO:', outputFifo);
    
    // エコーサーバーをバックグラウンドで起動
    const echoServer = spawn('sh', ['-c', `while read line < ${inputFifo}; do echo "Echo: $line" > ${outputFifo}; done`], {
      detached: true,
      stdio: 'ignore',
    });
    echoServer.unref();
    console.log('✅ Echo server started');
    
    // クライアント側の処理
    console.log('\nSending message to echo server...');
    const writeStream = createWriteStream(inputFifo);
    writeStream.write('Hello, FIFO world!\n');
    writeStream.end();
    
    // レスポンスを読む
    const readStream = createReadStream(outputFifo);
    const response = await new Promise<string>((resolve) => {
      let data = '';
      readStream.on('data', (chunk) => {
        data += chunk.toString();
      });
      readStream.on('end', () => {
        resolve(data);
      });
    });
    
    console.log('✅ Received response:', JSON.stringify(response.trim()));
    
    // クリーンアップ
    echoServer.kill();
    await unlink(inputFifo);
    await unlink(outputFifo);
    console.log('✅ Bidirectional FIFOs cleaned up');
    
  } catch (error) {
    console.error('❌ Bidirectional FIFO test failed:', error);
  }
}

async function testMultipleReadersFIFO() {
  console.log('\n--- Test 4: Multiple Readers with FIFO ---');
  
  try {
    const tmpDir = await mkdtemp(join(tmpdir(), 'bun-fifo-multi-'));
    const fifoPath = join(tmpDir, 'multi.fifo');
    
    await execAsync(`mkfifo ${fifoPath}`);
    console.log('✅ Multi-reader FIFO created:', fifoPath);
    
    // 複数のリーダーを起動
    const readers = [];
    for (let i = 0; i < 3; i++) {
      const reader = spawn('sh', ['-c', `echo "Reader ${i} waiting..." && cat ${fifoPath}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      
      reader.stdout.on('data', (data) => {
        console.log(`Reader ${i} received:`, data.toString().trim());
      });
      
      readers.push(reader);
    }
    
    // 少し待ってから書き込む
    setTimeout(async () => {
      console.log('\nWriting to FIFO...');
      const writer = spawn('sh', ['-c', `echo "Message for all readers" > ${fifoPath}`]);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // クリーンアップ
      readers.forEach(r => r.kill());
      await unlink(fifoPath);
      console.log('✅ Multi-reader test completed');
    }, 1000);
    
  } catch (error) {
    console.error('❌ Multiple readers test failed:', error);
  }
}

// すべてのテストを実行
async function runAllTests() {
  await testBasicFIFO();
  await testInteractiveFIFO();
  await testBidirectionalFIFO();
  await testMultipleReadersFIFO();
  
  console.log('\n=== All FIFO tests completed ===');
}

runAllTests().catch(console.error);