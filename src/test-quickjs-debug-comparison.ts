import { 
  newQuickJSWASMModule,
  RELEASE_SYNC,
  QuickJSContext
} from 'quickjs-emscripten';

async function testComparison() {
  console.log('=== Debug Comparison Test ===');
  
  try {
    // Create QuickJS module
    const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
    console.log('1. QuickJS module created');
    
    // Create runtime
    const runtime = quickjs.newRuntime();
    console.log('2. Runtime created');
    
    // Set memory limits like our implementation
    const memoryLimit = 128 * 1024 * 1024;
    runtime.setMemoryLimit(memoryLimit);
    runtime.setMaxStackSize(memoryLimit / 4);
    console.log('3. Memory limits set');
    
    // Create context
    const context = runtime.newContext();
    console.log('4. Context created');
    console.log('   Context type:', typeof context);
    console.log('   Context constructor:', context.constructor.name);
    
    // Test evalCode directly
    console.log('\n5. Testing evalCode directly');
    const testCode = '"hello"';
    console.log('   Code:', testCode);
    
    const result = context.evalCode(testCode);
    console.log('   Result:', result);
    console.log('   Has error:', 'error' in result);
    console.log('   Has value:', 'value' in result);
    
    if ('value' in result) {
      const value = context.dump(result.value);
      console.log('   Dumped value:', value);
      result.value.dispose();
    } else if ('error' in result) {
      console.log('   Error detected');
      const errorDump = context.dump(result.error);
      console.log('   Error dump:', errorDump);
      result.error.dispose();
    }
    
    // Now test with our wrapper class
    console.log('\n6. Testing with QuickJSExecutionContext wrapper');
    const { QuickJSExecutionContext } = await import('./core/vm/engines/quickjs/QuickJSEngine');
    const { QuickJSMarshaller } = await import('./core/vm/engines/quickjs/QuickJSMarshaller');
    
    const marshaller = new QuickJSMarshaller();
    const execContext = new QuickJSExecutionContext(context, marshaller);
    
    console.log('   Wrapper created');
    console.log('   About to call eval on wrapper');
    
    try {
      const wrapperResult = await execContext.eval(testCode);
      console.log('   Wrapper result:', wrapperResult);
    } catch (e) {
      console.log('   Wrapper error:', e);
      console.log('   Error message:', e.message);
    }
    
    // Clean up
    context.dispose();
    runtime.dispose();
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testComparison().catch(console.error);