import { getQuickJS } from 'quickjs-emscripten';

async function testQuickJSPromise() {
  console.log('Testing QuickJS Promise handling...');
  
  const quickjs = await getQuickJS();
  const runtime = quickjs.newRuntime();
  runtime.setMemoryLimit(128 * 1024 * 1024);
  runtime.setMaxStackSize(1024 * 1024);
  
  const context = runtime.newContext();
  
  try {
    // Test 1: Check if Promise is available
    console.log('\n--- Test 1: Promise availability ---');
    const checkPromise = context.evalCode(`typeof Promise`);
    if ('value' in checkPromise) {
      const value = context.getString(checkPromise.value);
      checkPromise.value.dispose();
      console.log('Promise type:', value);
    }
    
    // Test 2: Simple Promise
    console.log('\n--- Test 2: Simple Promise ---');
    const promise1 = context.evalCode(`Promise.resolve(42)`);
    if ('error' in promise1) {
      console.error('Promise creation failed:', context.dump(promise1.error));
      promise1.error.dispose();
    } else {
      console.log('Promise created, type:', context.typeof(promise1.value));
      const dumped = context.dump(promise1.value);
      console.log('Promise dump:', dumped);
      promise1.value.dispose();
    }
    
    // Test 3: Async function return type
    console.log('\n--- Test 3: Async function ---');
    const asyncFn = context.evalCode(`(async () => 42)`);
    if ('value' in asyncFn) {
      console.log('Async function type:', context.typeof(asyncFn.value));
      asyncFn.value.dispose();
    }
    
    // Test 4: Calling async function
    console.log('\n--- Test 4: Calling async function ---');
    const asyncCall = context.evalCode(`(async () => 42)()`);
    if ('error' in asyncCall) {
      console.error('Async call failed:', context.dump(asyncCall.error));
      asyncCall.error.dispose();
    } else {
      console.log('Async call result type:', context.typeof(asyncCall.value));
      const dumped = context.dump(asyncCall.value);
      console.log('Async call dump:', dumped);
      
      // Try to check if it's a promise
      const isPromise = context.evalCode(`
        const p = (async () => 42)();
        p instanceof Promise
      `);
      if ('value' in isPromise) {
        console.log('Is Promise?:', context.dump(isPromise.value));
        isPromise.value.dispose();
      }
      
      asyncCall.value.dispose();
    }
    
    // Test 5: Test unwrapResult to handle promises
    console.log('\n--- Test 5: Using unwrapResult ---');
    const asyncUnwrap = context.evalCode(`(async () => 42)()`);
    if ('value' in asyncUnwrap) {
      try {
        const unwrapped = context.unwrapResult(asyncUnwrap);
        const value = context.dump(unwrapped.value);
        console.log('Unwrapped value:', value);
        unwrapped.value.dispose();
      } catch (e) {
        console.error('Unwrap failed:', e);
        asyncUnwrap.value.dispose();
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    context.dispose();
    runtime.dispose();
    console.log('\nCleaned up');
  }
}

testQuickJSPromise().catch(console.error);