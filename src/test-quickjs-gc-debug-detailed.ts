import { getQuickJS } from 'quickjs-emscripten';

async function testDetailedGC() {
  console.log('=== Detailed GC Debug Test ===');
  
  try {
    const quickjs = await getQuickJS();
    const runtime = quickjs.newRuntime();
    const context = runtime.newContext();
    
    console.log('1. Testing setProp with undisposed handles...');
    
    // Test case 1: setProp without proper disposal
    const testObj = context.newObject();
    const nameHandle = context.newString('test');
    const valueHandle = context.newString('value');
    
    // Set property
    context.setProp(testObj, 'name', valueHandle);
    
    // Critical: We need to dispose ALL handles
    console.log('Disposing handles...');
    nameHandle.dispose();
    valueHandle.dispose();
    testObj.dispose();
    
    console.log('2. Testing global object operations...');
    
    // Test case 2: Global object operations
    const globalObj = context.global;
    const propName = context.newString('testGlobal');
    const propValue = context.newNumber(42);
    
    context.setProp(globalObj, 'testGlobal', propValue);
    
    // Clean up - but note: we should NOT dispose globalObj as it's a singleton
    propName.dispose();
    propValue.dispose();
    
    console.log('3. Testing eval with object creation...');
    
    // Test case 3: Eval that creates objects
    const evalResult = context.evalCode(`
      const obj = { a: 1, b: 2 };
      JSON.stringify(obj);
    `);
    
    if ('value' in evalResult) {
      console.log('Eval result:', context.dump(evalResult.value));
      evalResult.value.dispose();
    } else if ('error' in evalResult) {
      console.error('Eval error:', context.dump(evalResult.error));
      evalResult.error.dispose();
    }
    
    console.log('4. Cleaning up context and runtime...');
    context.dispose();
    runtime.dispose();
    
    console.log('✓ All tests completed successfully!');
    
  } catch (error) {
    console.error('✗ Test failed with error:', error);
  }
}

// Catch any assertion failures
process.on('uncaughtException', (error) => {
  console.error('\n!!! CRITICAL: Uncaught exception:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('SIGABRT', () => {
  console.error('\n!!! CRITICAL: Process aborted (likely GC assertion failure)');
  process.exit(1);
});

testDetailedGC().catch(console.error);