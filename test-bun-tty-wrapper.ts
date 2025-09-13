#!/usr/bin/env bun

import { Readable } from 'node:stream';
import * as readline from 'node:readline';
import { openSync } from 'node:fs';

console.log('Testing TTY wrapper with Node.js compatible stream...\n');

const tty_wrap = (process as any).binding('tty_wrap');

if (tty_wrap && tty_wrap.TTY) {
  const TTY = tty_wrap.TTY;
  
  // TTYをNode.js互換のReadableStreamでラップするクラス
  class TTYReadableWrapper extends Readable {
    private ttyInstance: any;
    isTTY = true;
    
    constructor(fd: number) {
      super();
      try {
        // TTYインスタンスを作成
        this.ttyInstance = new TTY(fd);
        console.log('TTY instance created for FD:', fd);
        
        // TTYからデータを読み取る処理を設定
        this._bindTTYEvents();
      } catch (e) {
        console.error('Failed to create TTY instance:', e.message);
        throw e;
      }
    }
    
    _bindTTYEvents() {
      // TTYインスタンスからデータを読み取る
      // BunのTTYがどのようにデータを提供するか探る
      if (this.ttyInstance.on) {
        console.log('TTY has event emitter interface');
        this.ttyInstance.on('data', (chunk: any) => {
          this.push(chunk);
        });
      } else if (this.ttyInstance.read) {
        console.log('TTY has read method');
        // ポーリングでデータを読み取る
        const pollRead = () => {
          try {
            const data = this.ttyInstance.read();
            if (data) {
              this.push(data);
            }
            setImmediate(pollRead);
          } catch (e) {
            // エラーは無視
          }
        };
        pollRead();
      }
    }
    
    _read(size: number) {
      // Readableストリームの実装
      // TTYから直接読み取る処理はbindTTYEventsで行う
    }
    
    setRawMode(mode: boolean) {
      if (this.ttyInstance.setRawMode) {
        this.ttyInstance.setRawMode(mode);
      }
      return this;
    }
    
    getWindowSize() {
      if (this.ttyInstance.getWindowSize) {
        return this.ttyInstance.getWindowSize();
      }
      return [80, 24];
    }
    
    // readlineが期待するメソッドを追加
    resume() {
      return super.resume();
    }
    
    pause() {
      return super.pause();
    }
  }
  
  // 各FDでTTYラッパーを試す
  console.log('Trying to create TTY wrapper for different FDs...\n');
  
  for (let fd = 0; fd <= 2; fd++) {
    try {
      // FDがTTYかチェック
      if (tty_wrap.isTTY && !tty_wrap.isTTY(fd)) {
        console.log(`FD ${fd} is not a TTY, skipping...`);
        continue;
      }
      
      console.log(`\nTrying FD ${fd}...`);
      const ttyWrapper = new TTYReadableWrapper(fd);
      
      // readlineで使ってみる
      const rl = readline.createInterface({
        input: ttyWrapper,
        output: process.stdout,
        terminal: true
      });
      
      console.log(`Readline created successfully for FD ${fd}!`);
      
      rl.question('Enter text: ', (answer) => {
        console.log('You entered:', answer);
        rl.close();
        process.exit(0);
      });
      
      // 成功したらループを抜ける
      break;
      
    } catch (e) {
      console.error(`Failed for FD ${fd}:`, e.message);
    }
  }
  
  // すべて失敗した場合、別の方法を試す
  console.log('\n\nTrying alternative: Direct stdin manipulation...');
  
  // process.stdinをTTY化する
  const stdin = process.stdin as any;
  stdin.isTTY = true;
  stdin.setRawMode = function(mode: boolean) { return this; };
  stdin.resume = stdin.resume || function() { return this; };
  stdin.pause = stdin.pause || function() { return this; };
  
  try {
    const rl = readline.createInterface({
      input: stdin,
      output: process.stdout,
      terminal: true
    });
    
    console.log('Readline created with modified stdin!');
    
    rl.question('Enter text: ', (answer) => {
      console.log('You entered:', answer);
      rl.close();
      process.exit(0);
    });
    
  } catch (e) {
    console.error('Alternative method failed:', e.message);
  }
  
}