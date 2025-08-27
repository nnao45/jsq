#!/usr/bin/env node
import { VMSandboxQuickJS } from './core/vm/vm-sandbox-quickjs.js';

async function test() {
  console.log('Testing VMSandboxQuickJS directly...');
  
  const sandbox = new VMSandboxQuickJS({
    memoryLimit: 128,
    timeout: 30000,
  });
  
  try {
    console.log('\n--- Test 1: Simple math ---');
    const result1 = await sandbox.execute('1 + 1', {});
    console.log('Result:', result1);
  } catch (error) {
    console.error('Test 1 failed:', error);
  }
  
  try {
    console.log('\n--- Test 2: $ method ---');
    const result2 = await sandbox.execute('$.length', { $: [1, 2, 3] });
    console.log('Result:', result2);
  } catch (error) {
    console.error('Test 2 failed:', error);
  }
  
  await sandbox.dispose();
  console.log('\nTests completed!');
}

test().catch(console.error);