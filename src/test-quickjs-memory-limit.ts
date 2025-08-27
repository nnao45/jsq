import { 
  newQuickJSWASMModule,
  RELEASE_SYNC
} from 'quickjs-emscripten';

async function testMemoryLimit() {
  console.log('=== Testing Memory Limit Impact ===');
  
  try {
    // Test 1: Without memory limits
    console.log('\n--- Test 1: Without memory limits ---');
    const quickjs1 = await newQuickJSWASMModule(RELEASE_SYNC);
    const runtime1 = quickjs1.newRuntime();
    const context1 = runtime1.newContext();
    
    const result1 = context1.evalCode('"hello"');
    console.log('Result:', result1);
    if ('value' in result1) {
      console.log('Success! Value:', context1.dump(result1.value));
      result1.value.dispose();
    } else if ('error' in result1) {
      console.log('Error:', context1.dump(result1.error));
      result1.error.dispose();
    }
    
    context1.dispose();
    runtime1.dispose();
    
    // Test 2: With memory limits BEFORE context creation
    console.log('\n--- Test 2: With memory limits BEFORE context ---');
    const quickjs2 = await newQuickJSWASMModule(RELEASE_SYNC);
    const runtime2 = quickjs2.newRuntime();
    
    // Set limits like our implementation
    const memoryLimit = 128 * 1024 * 1024;
    runtime2.setMemoryLimit(memoryLimit);
    runtime2.setMaxStackSize(memoryLimit / 4);
    
    const context2 = runtime2.newContext();
    
    const result2 = context2.evalCode('"hello"');
    console.log('Result:', result2);
    if ('value' in result2) {
      console.log('Success! Value:', context2.dump(result2.value));
      result2.value.dispose();
    } else if ('error' in result2) {
      console.log('Error:', context2.dump(result2.error));
      result2.error.dispose();
    }
    
    context2.dispose();
    runtime2.dispose();
    
    // Test 3: With smaller memory limit
    console.log('\n--- Test 3: With small memory limit ---');
    const quickjs3 = await newQuickJSWASMModule(RELEASE_SYNC);
    const runtime3 = quickjs3.newRuntime();
    
    // Try smaller limit
    runtime3.setMemoryLimit(1024 * 1024); // 1MB
    runtime3.setMaxStackSize(256 * 1024); // 256KB
    
    const context3 = runtime3.newContext();
    
    const result3 = context3.evalCode('"hello"');
    console.log('Result:', result3);
    if ('value' in result3) {
      console.log('Success! Value:', context3.dump(result3.value));
      result3.value.dispose();
    } else if ('error' in result3) {
      console.log('Error:', context3.dump(result3.error));
      result3.error.dispose();
    }
    
    context3.dispose();
    runtime3.dispose();
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testMemoryLimit().catch(console.error);