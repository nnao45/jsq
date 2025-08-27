#!/usr/bin/env node
import { VMEngineFactory } from './core/vm/VMEngineFactory.js';

async function testQuickJS() {
  console.log('Testing QuickJS Engine directly...');
  console.log('JSQ_VM_ENGINE:', process.env.JSQ_VM_ENGINE);

  try {
    const factory = new VMEngineFactory();
    const engine = factory.create('quickjs');
    console.log('Created QuickJS engine');
    
    await engine.initialize({
      memoryLimit: 128 * 1024 * 1024, // 128MB
    });
    console.log('Initialized engine');

    const context = await engine.createContext();
    console.log('Created context');

    // Test 1: Simple evaluation
    try {
      console.log('\n--- Test 1: Simple evaluation ---');
      await context.setGlobal('x', 5);
      const result1 = await context.eval('x * 2');
      console.log('Result:', result1);
    } catch (error) {
      console.error('Test 1 failed:', error);
    }

    // Test 2: Array operations
    try {
      console.log('\n--- Test 2: Array operations ---');
      await context.setGlobal('arr', [1, 2, 3, 4, 5]);
      const result2 = await context.eval('arr.map(x => x * 2)');
      console.log('Result:', result2);
    } catch (error) {
      console.error('Test 2 failed:', error);
    }

    // Test 3: Object operations
    try {
      console.log('\n--- Test 3: Object operations ---');
      await context.setGlobal('obj', { name: 'Alice', age: 25 });
      const result3 = await context.eval('obj.name + " is " + obj.age');
      console.log('Result:', result3);
    } catch (error) {
      console.error('Test 3 failed:', error);
    }

    context.release();
    await engine.dispose();
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

testQuickJS().catch(console.error);