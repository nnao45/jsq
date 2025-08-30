#!/usr/bin/env node

// Test script to verify QuickJS GC fix
const { spawn } = require('child_process');
const path = require('path');

const testCases = [
  { input: '{"message": "Hello, jsq!"}', expression: '$.message', expected: '"Hello, jsq!"' },
  { input: '[1, 2, 3, 4, 5]', expression: '$.map(x => x * 2)', expected: '[2,4,6,8,10]' },
  { input: '{"users": [{"name": "John"}, {"name": "Jane"}]}', expression: '$.users.map(u => u.name)', expected: '["John","Jane"]' },
];

let passed = 0;
let failed = 0;

function runTest(testCase, index) {
  return new Promise((resolve) => {
    const jsqPath = path.join(__dirname, 'dist', 'index.js');
    const child = spawn('node', [jsqPath, testCase.expression], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      error += data.toString();
    });

    child.on('close', (code) => {
      const result = output.trim();
      const success = code === 0 && result === testCase.expected;
      
      if (success) {
        console.log(`✅ Test ${index + 1} passed: ${testCase.expression}`);
        passed++;
      } else {
        console.log(`❌ Test ${index + 1} failed: ${testCase.expression}`);
        console.log(`   Expected: ${testCase.expected}`);
        console.log(`   Got: ${result}`);
        if (error) {
          console.log(`   Error: ${error}`);
        }
        failed++;
      }
      
      resolve();
    });

    // Send input
    child.stdin.write(testCase.input);
    child.stdin.end();
  });
}

async function runTests() {
  console.log('Running QuickJS GC fix tests...\n');

  for (let i = 0; i < testCases.length; i++) {
    await runTest(testCases[i], i);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);