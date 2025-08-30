#!/usr/bin/env node

// Test script to verify memory leak fix
const { spawn } = require('child_process');
const path = require('path');

const jsqPath = path.join(__dirname, 'dist', 'index.js');
const testInput = '{"message": "Hello, jsq!"}';
const testExpression = '$.message';

let iteration = 0;
const maxIterations = 50;

function runTest() {
  return new Promise((resolve) => {
    const child = spawn('node', [jsqPath, testExpression], {
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
      iteration++;
      const memUsage = process.memoryUsage();
      console.log(`Iteration ${iteration}: RSS=${(memUsage.rss / 1024 / 1024).toFixed(2)}MB, Heap=${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      if (error && !error.includes('[VMSandboxQuickJS]')) {
        console.error('Error:', error);
      }
      
      resolve();
    });

    // Send input
    child.stdin.write(testInput);
    child.stdin.end();
  });
}

async function runTests() {
  console.log('Testing for memory leaks...\n');
  console.log('Initial memory:', process.memoryUsage());
  
  for (let i = 0; i < maxIterations; i++) {
    await runTest();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\nFinal memory:', process.memoryUsage());
  console.log('\nIf RSS memory grows significantly, there might be a memory leak.');
}

runTests().catch(console.error);