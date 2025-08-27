import { getQuickJS } from 'quickjs-emscripten';

async function testLifetime() {
  console.log('Testing QuickJS handle lifetime...');
  
  const quickjs = await getQuickJS();
  const runtime = quickjs.newRuntime();
  const context = runtime.newContext();
  
  try {
    // Test 1: Create and immediately dispose a handle
    console.log('\n--- Test 1: Basic handle lifetime ---');
    const str1 = context.newString('test1');
    console.log('String created, alive:', str1.alive);
    str1.dispose();
    console.log('String disposed, alive:', str1.alive);
    
    // Test 2: Use a disposed handle (should error)
    console.log('\n--- Test 2: Using disposed handle ---');
    const str2 = context.newString('test2');
    str2.dispose();
    try {
      // This should throw "Lifetime not alive"
      context.getString(str2);
    } catch (e) {
      console.log('Expected error:', e.message);
    }
    
    // Test 3: Promise handling
    console.log('\n--- Test 3: Promise and async ---');
    
    // First, create a simple promise
    const promiseCode = `Promise.resolve(42)`;
    const result1 = context.evalCode(promiseCode);
    
    if ('value' in result1) {
      console.log('Promise created, type:', context.typeof(result1.value));
      console.log('Handle alive:', result1.value.alive);
      
      // Try to dump it
      const dumped = context.dump(result1.value);
      console.log('Promise dump:', dumped);
      
      // Dispose the handle
      result1.value.dispose();
      console.log('Promise handle disposed');
    }
    
    // Test 4: Async function execution
    console.log('\n--- Test 4: Async function execution ---');
    
    // Create an async function that returns immediately
    const asyncCode = `
      (async () => {
        return 42;
      })()
    `;
    
    const result2 = context.evalCode(asyncCode);
    
    if ('value' in result2) {
      console.log('Async result type:', context.typeof(result2.value));
      console.log('Handle alive before dump:', result2.value.alive);
      
      // This might be where the issue is - dumping a promise
      try {
        const dumped = context.dump(result2.value);
        console.log('Async result dump:', dumped);
      } catch (e) {
        console.error('Dump failed:', e.message);
      }
      
      // Check if handle is still alive
      console.log('Handle alive after dump:', result2.value.alive);
      
      // Dispose
      result2.value.dispose();
    }
    
    // Test 5: Complex async with Promise.all
    console.log('\n--- Test 5: Complex async with Promise.all ---');
    
    const complexCode = `
      (async () => {
        const promises = [1, 2, 3].map(x => Promise.resolve(x * 2));
        return await Promise.all(promises);
      })()
    `;
    
    const result3 = context.evalCode(complexCode);
    
    if ('value' in result3) {
      console.log('Complex async type:', context.typeof(result3.value));
      console.log('Handle alive:', result3.value.alive);
      
      // Try different approaches to handle the promise
      
      // Approach 1: Direct dump (might fail)
      try {
        const dumped = context.dump(result3.value);
        console.log('Direct dump:', dumped);
      } catch (e) {
        console.error('Direct dump failed:', e.message);
      }
      
      // Approach 2: Check if we can use getProp
      try {
        const thenProp = context.getProp(result3.value, 'then');
        console.log('Has then property:', context.typeof(thenProp));
        thenProp.dispose();
      } catch (e) {
        console.error('getProp failed:', e.message);
      }
      
      result3.value.dispose();
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    context.dispose();
    runtime.dispose();
    console.log('\nCleaned up');
  }
}

testLifetime().catch(console.error);