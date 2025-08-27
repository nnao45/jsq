import { 
  newQuickJSWASMModule,
  RELEASE_SYNC
} from 'quickjs-emscripten';

async function testErrorDetail() {
  console.log('=== Testing Error Details in QuickJS ===');
  
  try {
    const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
    const runtime = quickjs.newRuntime();
    const context = runtime.newContext();
    
    // Test various problematic statements
    const testCases = [
      'globalThis.console = {}',
      'var console = {}',
      'let console = {}',
      'console = {}',
      '{}',
      'undefined',
      'let globalThis = {}',  // This might be problematic
      'var x = 1',
      'x = 1',
    ];
    
    for (const code of testCases) {
      console.log(`\nTesting: "${code}"`);
      const result = context.evalCode(code);
      
      if ('value' in result) {
        const value = context.dump(result.value);
        console.log('  Success, value:', value);
        result.value.dispose();
      } else if ('error' in result) {
        // Try different ways to get the error message
        let errorMsg = 'Unknown error';
        
        try {
          errorMsg = context.dump(result.error);
          console.log('  Error (dump):', errorMsg);
        } catch (e) {
          console.log('  Could not dump error');
        }
        
        try {
          const msgProp = context.getProp(result.error, 'message');
          if (context.typeof(msgProp) === 'string') {
            errorMsg = context.getString(msgProp);
            console.log('  Error (message prop):', errorMsg);
          }
          msgProp.dispose();
        } catch (e) {
          console.log('  Could not get message property');
        }
        
        try {
          const stackProp = context.getProp(result.error, 'stack');
          if (context.typeof(stackProp) === 'string') {
            const stack = context.getString(stackProp);
            console.log('  Error (stack):', stack);
          }
          stackProp.dispose();
        } catch (e) {
          console.log('  Could not get stack property');
        }
        
        result.error.dispose();
      }
    }
    
    // Clean up
    context.dispose();
    runtime.dispose();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testErrorDetail().catch(console.error);