#!/usr/bin/env node

// Test without global variables
const { getQuickJS } = require('quickjs-emscripten');

async function test() {
  const quickjs = await getQuickJS();
  const runtime = quickjs.newRuntime();
  const context = runtime.newContext();
  
  // Create objects without setting them as globals
  const result = context.evalCode(`
    const myObject = {
      test: function() { return 42; }
    };
    myObject.test();
  `);
  
  console.log('Result:', context.dump(result.value));
  result.value.dispose();
  
  // Proper cleanup
  context.dispose();
  runtime.dispose();
}

test().catch(console.error);