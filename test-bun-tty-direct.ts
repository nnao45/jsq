#!/usr/bin/env bun

import { openSync } from 'node:fs';
import * as readline from 'node:readline';
import { spawn } from 'node:child_process';

console.log('Testing direct TTY creation in Bun...\n');

const tty_wrap = (process as any).binding('tty_wrap');

// 方法1: pty経由でTTYを取得する
console.log('Method 1: Using pty allocation...');
try {
  // scriptコマンドを使ってptyを割り当てる
  const ptyProcess = spawn('script', ['-q', '-c', 'echo ready', '/dev/null'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  
  ptyProcess.stdout.on('data', (data) => {
    console.log('PTY output:', data.toString());
  });
  
  // PTYのstdinにTTYラッパーを適用してみる
  if (tty_wrap && tty_wrap.TTY) {
    const TTY = tty_wrap.TTY;
    
    // ptyProcessのstdinを使う
    const stream = ptyProcess.stdin as any;
    stream.isTTY = true;
    
    console.log('PTY stream created with isTTY=true');
    
    // readlineで使ってみる
    try {
      const rl = readline.createInterface({
        input: stream,
        output: process.stdout,
        terminal: true
      });
      
      console.log('Readline created with PTY stream');
      
      setTimeout(() => {
        ptyProcess.kill();
        console.log('PTY process killed');
      }, 1000);
      
    } catch (e) {
      console.error('Readline error:', e.message);
    }
  }
  
} catch (e) {
  console.error('PTY method failed:', e.message);
}

// 方法2: Bunの内部APIを探る
console.log('\n\nMethod 2: Exploring Bun internals...');
if (tty_wrap && tty_wrap.TTY) {
  const TTY = tty_wrap.TTY;
  
  // TTYコンストラクタのプロトタイプを調べる
  console.log('TTY constructor:', TTY);
  console.log('TTY prototype:', Object.getOwnPropertyNames(TTY.prototype));
  
  // グローバルオブジェクトを調べる
  const global_props = Object.getOwnPropertyNames(global).filter(prop => 
    prop.toLowerCase().includes('tty') || 
    prop.toLowerCase().includes('stream') ||
    prop.toLowerCase().includes('readline')
  );
  console.log('\nGlobal TTY/Stream related properties:', global_props);
}

// 方法3: カスタムStreamを作成してTTY機能を実装
console.log('\n\nMethod 3: Custom TTY-like stream...');
import { Duplex } from 'node:stream';

class FakeTTYStream extends Duplex {
  isTTY = true;
  
  constructor() {
    super();
  }
  
  _read(size: number) {
    // 実際の入力を処理
    process.stdin.on('data', (chunk) => {
      this.push(chunk);
    });
  }
  
  _write(chunk: any, encoding: string, callback: Function) {
    process.stdout.write(chunk, encoding);
    callback();
  }
  
  setRawMode(mode: boolean) {
    // 実装は空でOK
    return this;
  }
  
  getWindowSize() {
    return [80, 24]; // デフォルトサイズ
  }
}

try {
  const fakeTTY = new FakeTTYStream();
  console.log('Created fake TTY stream');
  
  const rl = readline.createInterface({
    input: fakeTTY,
    output: process.stdout,
    terminal: true
  });
  
  console.log('Readline created with fake TTY!');
  
  rl.question('Test input: ', (answer) => {
    console.log('Got answer:', answer);
    rl.close();
    process.exit(0);
  });
  
  setTimeout(() => {
    console.log('\nTimeout...');
    rl.close();
    process.exit(1);
  }, 3000);
  
} catch (e) {
  console.error('Fake TTY failed:', e.message);
}