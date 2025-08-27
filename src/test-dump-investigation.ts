import { 
  newQuickJSWASMModule,
  RELEASE_SYNC
} from 'quickjs-emscripten';

async function testDump() {
  console.log('=== Testing QuickJS dump() behavior ===');
  
  try {
    const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
    const runtime = quickjs.newRuntime();
    const context = runtime.newContext();
    
    // Test 1: Create a valid error and dump it
    console.log('\n--- Test 1: Valid error ---');
    const errorResult = context.evalCode('throw new Error("test error")');
    if ('error' in errorResult) {
      const dumpResult = context.dump(errorResult.error);
      console.log('Dump result:', dumpResult);
      console.log('Dump result type:', typeof dumpResult);
      console.log('Dump result === "":', dumpResult === '');
      console.log('Dump result === null:', dumpResult === null);
      console.log('Dump result === undefined:', dumpResult === undefined);
      console.log('Dump result length:', dumpResult?.length);
      errorResult.error.dispose();
    }
    
    // Test 2: Create a syntax error
    console.log('\n--- Test 2: Syntax error ---');
    const syntaxResult = context.evalCode('{{');
    if ('error' in syntaxResult) {
      const dumpResult = context.dump(syntaxResult.error);
      console.log('Dump result:', dumpResult);
      console.log('Dump result type:', typeof dumpResult);
      console.log('Dump result === "":', dumpResult === '');
      console.log('Dump result length:', dumpResult?.length);
      syntaxResult.error.dispose();
    }
    
    // Test 3: Test with undefined global
    console.log('\n--- Test 3: Undefined reference ---');
    const undefResult = context.evalCode('nonexistent');
    if ('error' in undefResult) {
      const dumpResult = context.dump(undefResult.error);
      console.log('Dump result:', dumpResult);
      console.log('Dump result type:', typeof dumpResult);
      undefResult.error.dispose();
    }
    
    // Clean up
    context.dispose();
    runtime.dispose();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testDump().catch(console.error);