#!/usr/bin/env bun

import { openSync } from 'node:fs';
import readlineSync from 'readline-sync';

console.log('Testing process.binding(\'tty_wrap\') in Bun...\n');

try {
  // process.binding('tty_wrap')を取得
  const tty_wrap = (process as any).binding('tty_wrap');
  console.log('tty_wrap:', tty_wrap);
  console.log('tty_wrap.TTY:', tty_wrap.TTY);
  
  if (tty_wrap && tty_wrap.TTY) {
    // /dev/ttyを開く
    const ttyFd = openSync('/dev/tty', 'r+');
    console.log('TTY file descriptor:', ttyFd);
    
    // TTYインスタンスを作成
    const TTY = tty_wrap.TTY;
    const ttyInstance = new TTY(ttyFd);
    console.log('TTY instance created:', ttyInstance);
    console.log('TTY instance constructor:', ttyInstance.constructor.name);
    
    // TTYインスタンスのメソッドを確認
    console.log('\nTTY instance methods:');
    const proto = Object.getPrototypeOf(ttyInstance);
    const methods = Object.getOwnPropertyNames(proto).filter(name => 
      typeof proto[name] === 'function' && name !== 'constructor'
    );
    methods.forEach(method => {
      console.log(`  - ${method}`);
    });
    
    // TTYストリームとして使えるか確認
    console.log('\nTTY instance properties:');
    console.log('  - readable:', ttyInstance.readable);
    console.log('  - writable:', ttyInstance.writable);
    console.log('  - isTTY:', ttyInstance.isTTY);
    
    // readlineでTTYインスタンスを使ってみる
    console.log('\nTrying to create readline interface with TTY instance...');
    
    // TTYインスタンスにisTTYを設定
    ttyInstance.isTTY = true;
    
    try {
      // const rl = readlineSync.createInterface({
      //   input: ttyInstance,
      //   output: process.stdout,
      //   terminal: true
      // });
      const rl = readlineSync
      
      console.log('Readline interface created successfully!');

      const answer = rl.question('Enter something: ');
      console.log('You entered:', answer);
      
    } catch (rlError) {
      console.error('Failed to create readline interface:', rlError);
    }
    
  } else {
    console.log('TTY wrapper not available');
  }
  
} catch (error) {
  console.error('Error:', error);
}