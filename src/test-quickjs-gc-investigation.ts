import { 
  newQuickJSWASMModule,
  RELEASE_SYNC
} from 'quickjs-emscripten';

async function testGCAssertion() {
  console.log('=== Testing GC Assertion Issues ===');
  
  // Test 1: Simple create and dispose
  console.log('\n--- Test 1: Simple create and dispose ---');
  try {
    const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
    const runtime = quickjs.newRuntime();
    const context = runtime.newContext();
    
    // Do some work
    const result = context.evalCode('"hello"');
    if ('value' in result) {
      console.log('Value:', context.dump(result.value));
      result.value.dispose();
    }
    
    // Proper cleanup order
    context.dispose();
    runtime.dispose();
    console.log('✓ Test 1 passed');
  } catch (error) {
    console.error('✗ Test 1 failed:', error);
  }
  
  // Test 2: Multiple contexts from same runtime
  console.log('\n--- Test 2: Multiple contexts from same runtime ---');
  try {
    const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
    const runtime = quickjs.newRuntime();
    
    // Create multiple contexts
    const contexts = [];
    for (let i = 0; i < 5; i++) {
      contexts.push(runtime.newContext());
    }
    
    // Use them
    for (let i = 0; i < contexts.length; i++) {
      const result = contexts[i].evalCode(`"context ${i}"`);
      if ('value' in result) {
        console.log(`Context ${i}:`, contexts[i].dump(result.value));
        result.value.dispose();
      }
    }
    
    // Dispose in reverse order
    for (let i = contexts.length - 1; i >= 0; i--) {
      contexts[i].dispose();
    }
    
    runtime.dispose();
    console.log('✓ Test 2 passed');
  } catch (error) {
    console.error('✗ Test 2 failed:', error);
  }
  
  // Test 3: Create and dispose multiple times (simulating worker pool)
  console.log('\n--- Test 3: Create and dispose multiple times ---');
  try {
    for (let i = 0; i < 10; i++) {
      const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
      const runtime = quickjs.newRuntime();
      runtime.setMemoryLimit(128 * 1024 * 1024);
      runtime.setMaxStackSize(1024 * 1024);
      
      const context = runtime.newContext();
      
      // Do some work
      const result = context.evalCode(`Math.pow(2, ${i})`);
      if ('value' in result) {
        console.log(`Iteration ${i}:`, context.dump(result.value));
        result.value.dispose();
      }
      
      context.dispose();
      runtime.dispose();
    }
    console.log('✓ Test 3 passed');
  } catch (error) {
    console.error('✗ Test 3 failed:', error);
  }
  
  // Test 4: Concurrent operations (simulating parallel workers)
  console.log('\n--- Test 4: Concurrent operations ---');
  try {
    const promises = [];
    
    for (let i = 0; i < 4; i++) {
      const promise = (async (workerNum: number) => {
        const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
        const runtime = quickjs.newRuntime();
        runtime.setMemoryLimit(128 * 1024 * 1024);
        runtime.setMaxStackSize(1024 * 1024);
        
        const context = runtime.newContext();
        
        // Simulate some work
        for (let j = 0; j < 5; j++) {
          const result = context.evalCode(`"worker ${workerNum} iteration ${j}"`);
          if ('value' in result) {
            result.value.dispose();
          }
          
          // Small delay to simulate processing
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        context.dispose();
        runtime.dispose();
        console.log(`Worker ${workerNum} completed`);
      })(i);
      
      promises.push(promise);
    }
    
    await Promise.all(promises);
    console.log('✓ Test 4 passed');
  } catch (error) {
    console.error('✗ Test 4 failed:', error);
  }
  
  // Test 5: Error handling and cleanup
  console.log('\n--- Test 5: Error handling and cleanup ---');
  try {
    const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
    const runtime = quickjs.newRuntime();
    const context = runtime.newContext();
    
    // Cause an error
    const result = context.evalCode('throw new Error("test error")');
    if ('error' in result) {
      console.log('Error caught:', context.dump(result.error));
      result.error.dispose();
    }
    
    // Clean up after error
    context.dispose();
    runtime.dispose();
    console.log('✓ Test 5 passed');
  } catch (error) {
    console.error('✗ Test 5 failed:', error);
  }
  
  // Test 6: Memory pressure test
  console.log('\n--- Test 6: Memory pressure test ---');
  try {
    const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
    const runtime = quickjs.newRuntime();
    runtime.setMemoryLimit(8 * 1024 * 1024); // Small limit
    
    const context = runtime.newContext();
    
    // Try to allocate a lot
    const result = context.evalCode(`
      const arr = [];
      for (let i = 0; i < 1000; i++) {
        arr.push(new Array(1000).fill(i));
      }
      arr.length
    `);
    
    if ('value' in result) {
      console.log('Array length:', context.dump(result.value));
      result.value.dispose();
    } else if ('error' in result) {
      console.log('Memory error (expected):', context.dump(result.error));
      result.error.dispose();
    }
    
    context.dispose();
    runtime.dispose();
    console.log('✓ Test 6 passed');
  } catch (error) {
    console.error('✗ Test 6 failed:', error);
  }
}

// Add global error handler to catch assertion errors
process.on('uncaughtException', (error) => {
  console.error('\n!!! Uncaught exception (possible GC assertion):', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n!!! Unhandled rejection:', reason);
  process.exit(1);
});

// Run the test
testGCAssertion().catch(console.error);