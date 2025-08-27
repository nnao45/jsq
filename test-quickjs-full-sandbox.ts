import { VMSandboxQuickJS } from './src/core/vm/vm-sandbox-quickjs';

async function testFullSandbox() {
  console.log('=== Testing Full VMSandboxQuickJS ===');
  
  // Create multiple sandboxes like in tests
  for (let i = 0; i < 3; i++) {
    console.log(`\n--- Test ${i + 1} ---`);
    const sandbox = new VMSandboxQuickJS({ verbose: true });
    
    try {
      const data = { a: 1, b: 2, c: 3 };
      const result = await sandbox.execute('$.a; $.b; $.c', { $: data });
      console.log('Result:', result.value);
      console.log('Execution time:', result.executionTime, 'ms');
      console.log('Memory used:', result.memoryUsed, 'bytes');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      await sandbox.dispose();
    }
  }
  
  console.log('\n--- All tests completed ---');
}

// Run with timeout to catch hanging issues
const timeout = setTimeout(() => {
  console.error('Test timed out!');
  process.exit(1);
}, 10000);

testFullSandbox()
  .then(() => {
    clearTimeout(timeout);
    console.log('Test completed successfully');
    // Give some time for GC to run
    setTimeout(() => {
      console.log('Exiting...');
      process.exit(0);
    }, 100);
  })
  .catch(error => {
    clearTimeout(timeout);
    console.error('Test failed:', error);
    process.exit(1);
  });