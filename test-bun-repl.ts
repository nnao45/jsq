#!/usr/bin/env bun
import { spawn } from 'child_process';
import * as fs from 'fs';

console.log('🧪 Testing Bun JSQ REPL with piped input');

// Test data
const testData = JSON.stringify({ name: "test", value: 42 });

// Create a test script that will send commands to REPL
const testScript = `
echo '${testData}' | bun dist/index-bun.js --verbose &
PID=$!
sleep 1
echo "$.name"
sleep 0.5
echo "$.value"
sleep 0.5
echo ".exit"
wait $PID
`;

// Write test script to a file
fs.writeFileSync('test-repl.sh', testScript);

// Execute the test
const testProcess = spawn('bash', ['test-repl.sh'], {
  stdio: 'inherit'
});

testProcess.on('exit', (code) => {
  console.log(`\nTest completed with code: ${code}`);
  fs.unlinkSync('test-repl.sh');
});

// Alternative test using direct node-pty if available
try {
  // Try to use node-pty if installed
  const pty = require('node-pty');
  
  console.log('\n🧪 Using node-pty for interactive test');
  
  const ptyProcess = pty.spawn('bash', ['-c', `echo '${testData}' | bun dist/index-bun.js`], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
  });

  ptyProcess.on('data', (data: any) => {
    process.stdout.write(data);
  });

  // Send commands after a delay
  setTimeout(() => {
    ptyProcess.write('$.name\r');
  }, 1000);

  setTimeout(() => {
    ptyProcess.write('$.value\r');
  }, 1500);

  setTimeout(() => {
    ptyProcess.write('.exit\r');
  }, 2000);

  setTimeout(() => {
    ptyProcess.kill();
  }, 2500);
} catch (e) {
  console.log('\nℹ️  node-pty not available, skipping PTY test');
}