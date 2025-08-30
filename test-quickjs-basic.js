#!/usr/bin/env node

// Basic QuickJS test to isolate the GC issue
async function testBasicQuickJS() {
  try {
    // Dynamically import quickjs-emscripten
    const { getQuickJS } = await import('quickjs-emscripten');
    const QuickJS = await getQuickJS();
    
    console.log('Testing basic QuickJS operations...\n');
    
    // Test 1: Simple evaluation
    {
      console.log('Test 1: Simple evaluation');
      const runtime = QuickJS.newRuntime();
      const context = runtime.newContext();
      
      const result = context.evalCode('1 + 2');
      console.log('Result:', context.dump(result.value));
      result.value.dispose();
      
      context.dispose();
      runtime.dispose();
      console.log('✅ Test 1 passed\n');
    }
    
    // Test 2: Setting global variable
    {
      console.log('Test 2: Setting global variable');
      const runtime = QuickJS.newRuntime();
      const context = runtime.newContext();
      
      const strHandle = context.newString('Hello QuickJS');
      context.setProp(context.global, 'message', strHandle);
      strHandle.dispose();
      
      const result = context.evalCode('message');
      console.log('Result:', context.dump(result.value));
      result.value.dispose();
      
      context.dispose();
      runtime.dispose();
      console.log('✅ Test 2 passed\n');
    }
    
    // Test 3: JSON parsing
    {
      console.log('Test 3: JSON parsing');
      const runtime = QuickJS.newRuntime();
      const context = runtime.newContext();
      
      const jsonStr = '{"test": "value"}';
      const code = `JSON.parse('${jsonStr}')`;
      const result = context.evalCode(code);
      
      if (result.error) {
        console.log('Error:', context.dump(result.error));
        result.error.dispose();
      } else {
        console.log('Result:', context.dump(result.value));
        result.value.dispose();
      }
      
      context.dispose();
      runtime.dispose();
      console.log('✅ Test 3 passed\n');
    }
    
    // Test 4: Complex object with methods
    {
      console.log('Test 4: Complex object with methods');
      const runtime = QuickJS.newRuntime();
      const context = runtime.newContext();
      
      // Create a complex object
      const code = `
        const obj = {
          value: [1, 2, 3],
          map: function(fn) {
            return this.value.map(fn);
          }
        };
        obj.map(x => x * 2);
      `;
      
      const result = context.evalCode(code);
      
      if (result.error) {
        console.log('Error:', context.dump(result.error));
        result.error.dispose();
      } else {
        console.log('Result:', context.dump(result.value));
        result.value.dispose();
      }
      
      // Execute pending jobs
      const jobResult = runtime.executePendingJobs();
      if (!jobResult.error) {
        console.log('Pending jobs executed:', jobResult.value);
      }
      jobResult.dispose();
      
      context.dispose();
      runtime.dispose();
      console.log('✅ Test 4 passed\n');
    }
    
    console.log('All basic tests completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testBasicQuickJS();