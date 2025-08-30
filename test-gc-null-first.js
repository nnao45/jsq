#!/usr/bin/env node

// Test with null assignment before delete
const { getQuickJS } = require('quickjs-emscripten');

async function test() {
  const quickjs = await getQuickJS();
  const runtime = quickjs.newRuntime();
  const context = runtime.newContext();
  
  // Set some globals like SmartDollar does
  context.evalCode(`
    globalThis.myGlobal = {
      test: function() { return 42; }
    };
  `);
  
  // Use the global
  const result = context.evalCode('myGlobal.test()');
  console.log('Result:', context.dump(result.value));
  result.value.dispose();
  
  // NULL first, then delete
  context.evalCode(`
    globalThis.myGlobal = null;
    delete globalThis.myGlobal;
  `);
  
  // Force GC
  runtime.executePendingJobs();
  
  // Proper cleanup
  context.dispose();
  runtime.dispose();
}

test().catch(console.error);