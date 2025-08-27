import { 
  newQuickJSWASMModule,
  RELEASE_SYNC
} from 'quickjs-emscripten';

async function testQuickJSMinimal() {
  console.log('=== Testing QuickJS Directly ===');
  
  try {
    // Create QuickJS module directly
    const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
    console.log('QuickJS module created');
    
    // Create runtime
    const runtime = quickjs.newRuntime();
    console.log('Runtime created');
    
    // Create context
    const context = runtime.newContext();
    console.log('Context created');
    
    // Test 1: Simple number
    console.log('\n--- Test 1: Simple number ---');
    const result1 = context.evalCode('42');
    console.log('Result 1:', result1);
    
    if ('value' in result1) {
      const value1 = context.dump(result1.value);
      console.log('Value 1:', value1);
      result1.value.dispose();
    } else if ('error' in result1) {
      console.log('Error 1:', context.dump(result1.error));
      result1.error.dispose();
    }
    
    // Test 2: Simple expression
    console.log('\n--- Test 2: Simple expression ---');
    const result2 = context.evalCode('1 + 2');
    console.log('Result 2:', result2);
    
    if ('value' in result2) {
      const value2 = context.dump(result2.value);
      console.log('Value 2:', value2);
      result2.value.dispose();
    } else if ('error' in result2) {
      console.log('Error 2:', context.dump(result2.error));
      result2.error.dispose();
    }
    
    // Test 3: Function call
    console.log('\n--- Test 3: Function call ---');
    const result3 = context.evalCode('(function() { return 3; })()');
    console.log('Result 3:', result3);
    
    if ('value' in result3) {
      const value3 = context.dump(result3.value);
      console.log('Value 3:', value3);
      result3.value.dispose();
    } else if ('error' in result3) {
      console.log('Error 3:', context.dump(result3.error));
      result3.error.dispose();
    }
    
    // Clean up
    context.dispose();
    runtime.dispose();
    
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testQuickJSMinimal().catch(console.error);