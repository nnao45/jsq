// Test that simulates the actual VM execution flow
const path = require('path');
const { VMSandboxQuickJS } = require(path.join(__dirname, 'src/core/vm/vm-sandbox-quickjs.ts'));
const { createApplicationContext } = require(path.join(__dirname, 'src/core/application-context.ts'));

async function main() {
  console.log('Testing actual VM execution flow...');
  
  const appContext = createApplicationContext();
  
  console.log('\n=== Test 1: Simple eval ===');
  try {
    const sandbox = new VMSandboxQuickJS({
      memoryLimit: 50,
      timeout: 5000
    }, appContext);
    
    const result = await sandbox.execute('1 + 1');
    console.log('Result:', result.value);
    console.log('Execution time:', result.executionTime, 'ms');
  } catch (e) {
    console.error('Failed:', e.message);
  }
  
  console.log('\n=== Test 2: With $ variable ===');
  try {
    const sandbox = new VMSandboxQuickJS({
      memoryLimit: 50,
      timeout: 5000
    }, appContext);
    
    const result = await sandbox.execute('$.length', { $: [1, 2, 3] });
    console.log('Result:', result.value);
  } catch (e) {
    console.error('Failed:', e.message);
  }
  
  console.log('\n=== Test 3: Multiple executions ===');
  try {
    const sandbox = new VMSandboxQuickJS({
      memoryLimit: 50,
      timeout: 5000
    }, appContext);
    
    for (let i = 0; i < 3; i++) {
      console.log(`Execution ${i + 1}:`);
      const result = await sandbox.execute(`${i} * 2`);
      console.log('Result:', result.value);
    }
  } catch (e) {
    console.error('Failed:', e.message);
  }
  
  console.log('\n=== Test 4: Complex $ operations ===');
  try {
    const sandbox = new VMSandboxQuickJS({
      memoryLimit: 50,
      timeout: 5000
    }, appContext);
    
    const data = {
      users: [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 }
      ]
    };
    
    const result = await sandbox.execute('$.users.map(u => u.name)', { $: data });
    console.log('Result:', result.value);
  } catch (e) {
    console.error('Failed:', e.message);
  }
  
  // Clean up application context
  await appContext.dispose();
  
  console.log('\n=== All tests completed ===');
  
  // Give a moment for any pending operations
  setTimeout(() => {
    console.log('Exiting...');
  }, 100);
}

main().catch(console.error);