import { getQuickJS } from 'quickjs-emscripten';

async function testPromiseResolution() {
  console.log('Testing QuickJS Promise resolution strategies...');
  
  const quickjs = await getQuickJS();
  const runtime = quickjs.newRuntime();
  runtime.setMemoryLimit(128 * 1024 * 1024);
  runtime.setMaxStackSize(1024 * 1024);
  
  const context = runtime.newContext();
  
  try {
    // Test 1: Check if we have executePendingJobs
    console.log('\n--- Test 1: executePendingJobs availability ---');
    console.log('Runtime methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(runtime)));
    
    // Test 2: Try to resolve a Promise synchronously
    console.log('\n--- Test 2: Synchronous Promise resolution ---');
    
    // Set up a resolved promise
    const setupCode = `
      let resolvedValue = null;
      Promise.resolve(42).then(v => { resolvedValue = v; });
      resolvedValue;
    `;
    
    const result1 = context.evalCode(setupCode);
    if ('value' in result1) {
      console.log('Before executePendingJobs:', context.dump(result1.value));
      result1.value.dispose();
    }
    
    // Execute pending jobs
    runtime.executePendingJobs();
    
    // Check if promise was resolved
    const checkCode = `resolvedValue`;
    const result2 = context.evalCode(checkCode);
    if ('value' in result2) {
      console.log('After executePendingJobs:', context.dump(result2.value));
      result2.value.dispose();
    }
    
    // Test 3: Async function with executePendingJobs
    console.log('\n--- Test 3: Async function with executePendingJobs ---');
    
    const asyncSetup = `
      let asyncResult = null;
      (async () => {
        const result = await Promise.resolve(100);
        asyncResult = result;
        return result;
      })();
      asyncResult;
    `;
    
    const result3 = context.evalCode(asyncSetup);
    if ('value' in result3) {
      console.log('Before jobs:', context.dump(result3.value));
      result3.value.dispose();
    }
    
    // Execute pending jobs multiple times
    for (let i = 0; i < 5; i++) {
      runtime.executePendingJobs();
    }
    
    // Check result
    const checkAsync = context.evalCode(`asyncResult`);
    if ('value' in checkAsync) {
      console.log('After jobs:', context.dump(checkAsync.value));
      checkAsync.value.dispose();
    }
    
    // Test 4: Complex async with multiple awaits
    console.log('\n--- Test 4: Complex async chain ---');
    
    const complexAsync = `
      let finalResult = null;
      let steps = [];
      
      (async () => {
        steps.push('start');
        const a = await Promise.resolve(1);
        steps.push('got 1');
        const b = await Promise.resolve(2);
        steps.push('got 2');
        const c = await Promise.resolve(3);
        steps.push('got 3');
        finalResult = a + b + c;
        return finalResult;
      })();
      
      { finalResult, steps }
    `;
    
    const result4 = context.evalCode(complexAsync);
    if ('value' in result4) {
      console.log('Initial state:', context.dump(result4.value));
      result4.value.dispose();
    }
    
    // Execute jobs until promise chain completes
    let maxIterations = 10;
    for (let i = 0; i < maxIterations; i++) {
      const jobResult = runtime.executePendingJobs();
      console.log(`Jobs iteration ${i + 1}:`, jobResult);
      
      if (jobResult === 0) {
        console.log('No more pending jobs');
        break;
      }
    }
    
    // Check final state
    const finalCheck = context.evalCode(`{ finalResult, steps }`);
    if ('value' in finalCheck) {
      console.log('Final state:', context.dump(finalCheck.value));
      finalCheck.value.dispose();
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    context.dispose();
    runtime.dispose();
    console.log('\nCleaned up');
  }
}

testPromiseResolution().catch(console.error);