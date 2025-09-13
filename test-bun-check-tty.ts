#!/usr/bin/env bun

console.log('Checking TTY status in Bun...\n');

// process.binding('tty_wrap')を取得
const tty_wrap = (process as any).binding('tty_wrap');

console.log('Standard streams TTY status:');
console.log('process.stdin.isTTY:', process.stdin.isTTY);
console.log('process.stdout.isTTY:', process.stdout.isTTY);
console.log('process.stderr.isTTY:', process.stderr.isTTY);

if (tty_wrap && tty_wrap.isTTY) {
  console.log('\nChecking FDs with tty_wrap.isTTY():');
  for (let fd = 0; fd <= 10; fd++) {
    try {
      const isTTY = tty_wrap.isTTY(fd);
      if (isTTY) {
        console.log(`FD ${fd}: is TTY`);
      }
    } catch (e) {
      // FDが無効な場合はスキップ
    }
  }
}

// パイプ経由で実行されているか確認
console.log('\nExecution context:');
console.log('Piped input detected:', !process.stdin.isTTY);

// TTYを作成できるFDを探す
if (tty_wrap && tty_wrap.TTY) {
  console.log('\nTrying to create TTY instances:');
  const TTY = tty_wrap.TTY;
  
  for (let fd = 0; fd <= 2; fd++) {
    try {
      // まずFDがTTYかチェック
      if (tty_wrap.isTTY && tty_wrap.isTTY(fd)) {
        console.log(`\nFD ${fd} is TTY, trying to create instance...`);
        const ttyInstance = new TTY(fd);
        console.log(`  Success! Created TTY instance for FD ${fd}`);
        console.log(`  Instance:`, ttyInstance);
      }
    } catch (e) {
      console.log(`  Failed for FD ${fd}:`, e.message);
    }
  }
}