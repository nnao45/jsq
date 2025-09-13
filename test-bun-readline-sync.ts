#!/usr/bin/env bun

import readlineSync from 'readline-sync';

console.log('=== Testing readline-sync with Bun ===');
console.log('Bun version:', Bun.version);
console.log('process.stdin.isTTY:', process.stdin.isTTY);

// パイプされたデータを先に読み取る
async function readPipedData() {
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString();
  }
  return null;
}

async function main() {
  // パイプデータを読み取る
  const pipedData = await readPipedData();
  if (pipedData) {
    console.log('\nPiped data received:');
    console.log(pipedData);
  }

  // readline-syncでインタラクティブ入力を試す
  console.log('\nTrying readline-sync...');
  
  try {
    // 基本的な質問
    const answer = readlineSync.question('Enter something: ');
    console.log('You entered:', answer);
    
    // 選択肢
    const choices = ['Option 1', 'Option 2', 'Option 3'];
    const index = readlineSync.keyInSelect(choices, 'Choose an option:');
    if (index !== -1) {
      console.log('You selected:', choices[index]);
    } else {
      console.log('Cancelled');
    }
    
    // パスワード入力（非表示）
    const password = readlineSync.question('Enter password: ', {
      hideEchoBack: true
    });
    console.log('Password length:', password.length);
    
    console.log('\n✅ readline-sync works with Bun!');
    
  } catch (error) {
    console.log('\n❌ readline-sync error:', error);
  }
}

main().catch(console.error);