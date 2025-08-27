import { getQuickJS } from 'quickjs-emscripten';

async function testReturnValue() {
  console.log('Testing QuickJS return value handling...');
  
  const quickjs = await getQuickJS();
  const runtime = quickjs.newRuntime();
  runtime.setMemoryLimit(128 * 1024 * 1024);
  runtime.setMaxStackSize(1024 * 1024);
  
  const context = runtime.newContext();
  
  try {
    // Test different wrapping strategies
    const testCases = [
      {
        name: 'Direct await expression',
        code: 'await $.mapAsync(async (x) => x * 2)'
      },
      {
        name: 'Wrapped in async function with explicit return',
        code: '(async () => { return await $.mapAsync(async (x) => x * 2) })()'
      },
      {
        name: 'Wrapped without explicit return',
        code: '(async () => { await $.mapAsync(async (x) => x * 2) })()'
      },
      {
        name: 'Double wrapped with return',
        code: '(async () => { return await (async () => { return await $.mapAsync(async (x) => x * 2) })() })()'
      },
      {
        name: 'Original wrapping from wrapCode',
        code: '(async () => { try { return await (async () => { await $.mapAsync(async (x) => x * 2) })(); } catch (error) { throw error; } })()'
      }
    ];
    
    // Set up mock $ object
    const setupCode = `
      globalThis.$ = {
        mapAsync: async function(fn) {
          const data = [1, 2, 3];
          const promises = data.map((x, i) => fn(x, i, data));
          const results = await Promise.all(promises);
          return results;
        }
      };
    `;
    
    const setupResult = context.evalCode(setupCode);
    if ('error' in setupResult) {
      console.error('Setup failed:', context.dump(setupResult.error));
      setupResult.error.dispose();
      return;
    }
    setupResult.value.dispose();
    
    // Test each case
    for (const testCase of testCases) {
      console.log(`\n--- ${testCase.name} ---`);
      console.log('Code:', testCase.code);
      
      // Create wrapper to handle async execution
      const wrapperCode = `
        (function() {
          let __result = undefined;
          let __error = undefined;
          let __done = false;
          
          const __promise = (async function() { 
            try {
              return ${testCase.code}; 
            } catch(e) {
              __error = e;
              throw e;
            }
          })();
          
          __promise.then(
            function(r) { __result = r; __done = true; },
            function(e) { __error = e; __done = true; }
          );
          
          return function() {
            return { done: __done, result: __result, error: __error };
          };
        })()
      `;
      
      const result = context.evalCode(wrapperCode);
      if ('error' in result) {
        console.error('Eval failed:', context.dump(result.error));
        result.error.dispose();
        continue;
      }
      
      const getter = result.value;
      
      // Execute pending jobs
      for (let i = 0; i < 10; i++) {
        const status = context.evalCode(`(${context.dump(getter)})()`);
        if ('value' in status) {
          const statusObj = context.dump(status.value);
          status.value.dispose();
          
          if (statusObj.done) {
            console.log('Result:', statusObj.result);
            console.log('Error:', statusObj.error);
            break;
          }
        }
        
        runtime.executePendingJobs();
      }
      
      getter.dispose();
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    context.dispose();
    runtime.dispose();
    console.log('\nCleaned up');
  }
}

testReturnValue().catch(console.error);