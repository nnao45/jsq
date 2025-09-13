#!/usr/bin/env bun

import * as readline from 'node:readline';
import { Readable, Writable } from 'node:stream';

console.log('Testing process.binding(\'tty_wrap\') with stdin/stdout FDs...\n');

try {
  // process.binding('tty_wrap')を取得
  const tty_wrap = (process as any).binding('tty_wrap');
  console.log('tty_wrap available:', !!tty_wrap);
  console.log('tty_wrap.TTY available:', !!(tty_wrap && tty_wrap.TTY));
  
  if (tty_wrap && tty_wrap.TTY) {
    const TTY = tty_wrap.TTY;
    
    // stdin/stdoutのFDを使ってTTYインスタンスを作成
    console.log('\nTrying different FDs:');
    console.log('process.stdin.fd:', (process.stdin as any).fd);
    console.log('process.stdout.fd:', (process.stdout as any).fd);
    console.log('process.stderr.fd:', (process.stderr as any).fd);
    
    // stdinのFDでTTYを作成
    try {
      const stdinFd = 0; // 標準的なstdinのFD
      const ttyInput = new TTY(stdinFd);
      console.log('\nTTY input instance created with FD 0');
      
      // Node.jsのStreamとして必要なプロパティを追加
      ttyInput.isTTY = true;
      
      // readableとして動作するか確認
      console.log('TTY input readable:', ttyInput.readable);
      console.log('TTY input _read:', typeof ttyInput._read);
      console.log('TTY input read:', typeof ttyInput.read);
      
      // Streamのメソッドを確認
      const proto = Object.getPrototypeOf(ttyInput);
      console.log('\nTTY prototype chain:');
      let currentProto = proto;
      let depth = 0;
      while (currentProto && depth < 5) {
        console.log(`  [${depth}] ${currentProto.constructor.name}`);
        currentProto = Object.getPrototypeOf(currentProto);
        depth++;
      }
      
      // readlineで使ってみる
      console.log('\nCreating readline interface...');
      
      const rl = readline.createInterface({
        input: ttyInput,
        output: process.stdout,
        terminal: true
      });
      
      console.log('Readline interface created!');
      
      rl.question('Enter something: ', (answer) => {
        console.log(`You entered: ${answer}`);
        rl.close();
        process.exit(0);
      });
      
      // 5秒後にタイムアウト
      setTimeout(() => {
        console.log('\nTimeout reached');
        rl.close();
        process.exit(1);
      }, 5000);
      
    } catch (ttyError) {
      console.error('Failed to create TTY instance:', ttyError);
      console.error('Error stack:', ttyError.stack);
    }
    
  } else {
    console.log('TTY wrapper not available');
  }
  
} catch (error) {
  console.error('Error:', error);
  console.error('Stack:', error.stack);
}