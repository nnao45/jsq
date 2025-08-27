import { VMSandboxQuickJS } from './core/vm/vm-sandbox-quickjs';

async function testVMSandboxGC() {
  console.log('=== Testing VMSandboxQuickJS GC Issues ===');
  
  // Test 1: Basic usage
  console.log('\n--- Test 1: Basic usage ---');
  try {
    const sandbox = new VMSandboxQuickJS({
      memoryLimit: 128,
      timeout: 30000,
    });
    
    const result = await sandbox.execute('1 + 2');
    console.log('Result:', result);
    
    await sandbox.dispose();
    console.log('✓ Test 1 passed');
  } catch (error) {
    console.error('✗ Test 1 failed:', error);
  }
  
  // Test 2: Multiple executions
  console.log('\n--- Test 2: Multiple executions ---');
  try {
    const sandbox = new VMSandboxQuickJS({
      memoryLimit: 128,
      timeout: 30000,
    });
    
    for (let i = 0; i < 10; i++) {
      const result = await sandbox.execute(`${i} * 2`);
      console.log(`Execution ${i}:`, result.value);
    }
    
    await sandbox.dispose();
    console.log('✓ Test 2 passed');
  } catch (error) {
    console.error('✗ Test 2 failed:', error);
  }
  
  // Test 3: Complex context with lodash
  console.log('\n--- Test 3: Complex context with lodash ---');
  try {
    const sandbox = new VMSandboxQuickJS({
      memoryLimit: 128,
      timeout: 30000,
    });
    
    const result = await sandbox.execute('_.map([1,2,3], x => x * 2)', { _: null });
    console.log('Lodash result:', result.value);
    
    await sandbox.dispose();
    console.log('✓ Test 3 passed');
  } catch (error) {
    console.error('✗ Test 3 failed:', error);
  }
  
  // Test 4: Smart dollar usage
  console.log('\n--- Test 4: Smart dollar usage ---');
  try {
    const sandbox = new VMSandboxQuickJS({
      memoryLimit: 128,
      timeout: 30000,
    });
    
    const data = [1, 2, 3, 4, 5];
    const result = await sandbox.execute('$.map(x => x * 2).filter(x => x > 4)', { $: data });
    console.log('Smart dollar result:', result.value);
    
    await sandbox.dispose();
    console.log('✓ Test 4 passed');
  } catch (error) {
    console.error('✗ Test 4 failed:', error);
  }
  
  // Test 5: Concurrent sandboxes (simulating worker scenario)
  console.log('\n--- Test 5: Concurrent sandboxes ---');
  try {
    const promises = [];
    
    for (let i = 0; i < 4; i++) {
      const promise = (async (workerNum: number) => {
        const sandbox = new VMSandboxQuickJS({
          memoryLimit: 128,
          timeout: 30000,
        });
        
        for (let j = 0; j < 5; j++) {
          const result = await sandbox.execute(`"worker ${workerNum} iteration ${j}"`);
          console.log(`Worker ${workerNum}, iteration ${j}:`, result.value);
          
          // Small delay to simulate processing
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        await sandbox.dispose();
        console.log(`Worker ${workerNum} disposed`);
      })(i);
      
      promises.push(promise);
    }
    
    await Promise.all(promises);
    console.log('✓ Test 5 passed');
  } catch (error) {
    console.error('✗ Test 5 failed:', error);
  }
  
  // Test 6: Error scenario
  console.log('\n--- Test 6: Error scenario ---');
  try {
    const sandbox = new VMSandboxQuickJS({
      memoryLimit: 128,
      timeout: 30000,
    });
    
    try {
      await sandbox.execute('throw new Error("test error")');
    } catch (error) {
      console.log('Error caught as expected:', error.message);
    }
    
    // Should still be able to use sandbox after error
    const result = await sandbox.execute('"after error"');
    console.log('After error:', result.value);
    
    await sandbox.dispose();
    console.log('✓ Test 6 passed');
  } catch (error) {
    console.error('✗ Test 6 failed:', error);
  }
  
  // Test 7: Rapid create/dispose cycles
  console.log('\n--- Test 7: Rapid create/dispose cycles ---');
  try {
    for (let i = 0; i < 20; i++) {
      const sandbox = new VMSandboxQuickJS({
        memoryLimit: 128,
        timeout: 30000,
      });
      
      const result = await sandbox.execute(`${i} + 1`);
      console.log(`Cycle ${i}:`, result.value);
      
      await sandbox.dispose();
    }
    console.log('✓ Test 7 passed');
  } catch (error) {
    console.error('✗ Test 7 failed:', error);
  }
}

// Add global error handler to catch assertion errors
process.on('uncaughtException', (error) => {
  console.error('\n!!! Uncaught exception (possible GC assertion):', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n!!! Unhandled rejection:', reason);
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack);
  }
  process.exit(1);
});

// Run the test
testVMSandboxGC().catch(console.error);