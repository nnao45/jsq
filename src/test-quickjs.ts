#!/usr/bin/env node

import { VMSandboxQuickJS } from './core/vm/vm-sandbox-quickjs';

async function runTests() {
  console.log('🚀 Testing QuickJS VM Sandbox...\n');
  
  const sandbox = new VMSandboxQuickJS({
    memoryLimit: 64 * 1024 * 1024, // 64MB
    timeout: 3000,
  });
  
  try {
    // Test 1: Basic expression
    console.log('Test 1: Basic math expression');
    const result1 = await sandbox.execute('40 + 2');
    console.log(`Result: ${result1.value}`);
    console.log(`Execution time: ${result1.executionTime.toFixed(2)}ms\n`);
    
    // Test 2: JSON processing
    console.log('Test 2: JSON data processing');
    const result2 = await sandbox.execute(
      `
      const filtered = $.users.filter(u => u.active);
      const names = filtered.map(u => u.name);
      names.join(', ')
      `,
      {
        $: {
          users: [
            { name: 'Alice', active: true },
            { name: 'Bob', active: false },
            { name: 'Charlie', active: true },
            { name: 'David', active: false },
          ]
        }
      }
    );
    console.log(`Result: ${result2.value}`);
    console.log(`Execution time: ${result2.executionTime.toFixed(2)}ms`);
    console.log(`Memory used: ${(result2.memoryUsed! / 1024).toFixed(2)}KB\n`);
    
    // Test 3: Complex data transformation
    console.log('Test 3: Complex data transformation');
    const result3 = await sandbox.execute(
      `
      const stats = data.reduce((acc, item) => {
        acc.total += item.value;
        acc.count++;
        if (item.value > acc.max) acc.max = item.value;
        if (item.value < acc.min) acc.min = item.value;
        return acc;
      }, { total: 0, count: 0, max: -Infinity, min: Infinity });
      
      stats.average = stats.total / stats.count;
      stats
      `,
      {
        data: [
          { name: 'A', value: 10 },
          { name: 'B', value: 25 },
          { name: 'C', value: 15 },
          { name: 'D', value: 30 },
          { name: 'E', value: 20 },
        ]
      }
    );
    console.log('Result:', JSON.stringify(result3.value, null, 2));
    console.log(`Execution time: ${result3.executionTime.toFixed(2)}ms\n`);
    
    // Test 4: Error handling
    console.log('Test 4: Error handling');
    try {
      await sandbox.execute('throw new Error("Custom error")');
    } catch (error) {
      console.log(`Caught error: ${error.message}\n`);
    }
    
    // Test 5: Memory limit test
    console.log('Test 5: Memory usage');
    const result5 = await sandbox.execute(
      `
      // Create a large array
      const arr = new Array(1000).fill(0).map((_, i) => ({
        index: i,
        value: Math.random(),
        text: 'Sample text for memory test'
      }));
      arr.length
      `
    );
    console.log(`Created array with ${result5.value} elements`);
    console.log(`Memory used: ${(result5.memoryUsed! / 1024 / 1024).toFixed(2)}MB\n`);
    
    // Show capabilities
    console.log('QuickJS Capabilities:');
    const caps = sandbox.getCapabilities();
    Object.entries(caps).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await sandbox.dispose();
    console.log('\n✨ Tests completed!');
  }
}

// Run tests
runTests().catch(console.error);