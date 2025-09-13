#!/bin/bash

echo "=== Simple FIFO Test for Bun ==="

# テンポラリディレクトリ作成
TMPDIR=$(mktemp -d)
FIFO="$TMPDIR/test.fifo"

echo "Creating FIFO at: $FIFO"
mkfifo "$FIFO"

# テスト1: 基本的な読み書き
echo -e "\n--- Test 1: Basic Read/Write ---"
echo "Hello from FIFO!" > "$FIFO" &
WRITER_PID=$!
echo "Writer PID: $WRITER_PID"

# Bunで読み込み
echo "Reading with Bun..."
bun -e "
const fs = require('fs');
const data = fs.readFileSync('$FIFO', 'utf8');
console.log('Bun received:', data.trim());
"

# テスト2: ストリームで読み込み
echo -e "\n--- Test 2: Stream Reading ---"
echo "Testing stream..." > "$FIFO" &

bun -e "
const fs = require('fs');
try {
  const stream = fs.createReadStream('$FIFO');
  console.log('Stream created');
  
  stream.on('data', (chunk) => {
    console.log('Bun stream received:', chunk.toString().trim());
  });
  
  stream.on('error', (err) => {
    console.error('Stream error:', err.message);
  });
  
  stream.on('end', () => {
    console.log('Stream ended');
  });
} catch (err) {
  console.error('Failed to create stream:', err.message);
}
" &

# 少し待ってから書き込み
sleep 0.5
echo "Stream data from shell" > "$FIFO"

# テスト3: Bunのpipeを試す
echo -e "\n--- Test 3: Bun pipe() method ---"
echo "Testing Bun pipe..." > "$FIFO" &

bun -e "
const fs = require('fs');
const { Readable } = require('stream');

try {
  // Bunの特別なファイル読み込み
  const file = Bun.file('$FIFO');
  console.log('Bun.file created:', file);
  console.log('File size:', file.size);
  console.log('File type:', file.type);
  
  // テキストとして読み込み
  file.text().then(text => {
    console.log('Bun.file.text():', text.trim());
  }).catch(err => {
    console.error('Bun.file.text() error:', err.message);
  });
} catch (err) {
  console.error('Bun.file error:', err.message);
}
"

# クリーンアップ
sleep 1
rm -f "$FIFO"
rmdir "$TMPDIR"

echo -e "\n=== Test completed ==="