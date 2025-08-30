#!/usr/bin/env node

// Simpler test to isolate the GC issue
const { spawn } = require('child_process');
const path = require('path');

function runTest(expression, input) {
  return new Promise((resolve) => {
    const jsqPath = path.join(__dirname, 'dist', 'index.js');
    const child = spawn('node', [jsqPath, expression, '--oneline'], {
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
      console.log(`Test: ${expression}`);
      console.log(`Input: ${input}`);
      console.log(`Output: ${output.trim()}`);
      console.log(`Exit code: ${code}`);
      if (error) {
        console.log(`Error: ${error}`);
      }
      console.log('---');
      resolve();
    });

    // Send input
    child.stdin.write(input);
    child.stdin.end();
  });
}

async function runTests() {
  console.log('Testing QuickJS GC issues with different expressions...\n');

  // Test cases - simpler to more complex
  await runTest('$', '{"message": "test"}');
  await runTest('$.message', '{"message": "test"}');
  await runTest('[1,2,3]', null);
  await runTest('[1,2,3].length', null);
  await runTest('$', '[1,2,3]');
  await runTest('$.length', '[1,2,3]');
  await runTest('$.map(x => x)', '[1,2,3]');
  await runTest('$.map(x => x * 2)', '[1,2,3]');
}

runTests().catch(console.error);