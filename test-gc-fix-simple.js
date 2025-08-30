#!/usr/bin/env node

// Test with simple object (no functions)
const { getQuickJS } = require('quickjs-emscripten');

async function test() {
  const quickjs = await getQuickJS();
  const runtime = quickjs.newRuntime();
  const context = runtime.newContext();
  
  // Set a simple object without functions
  context.evalCode(`
    globalThis.$ = { message: "Hello, jsq!" };
  `);
  
  // Use it
  const result = context.evalCode('$.message');
  console.log('Result:', context.dump(result.value));
  result.value.dispose();
  
  // Clean up
  context.evalCode(`
    globalThis.$ = null;
    delete globalThis.$;
  `);
  
  // Proper cleanup
  context.dispose();
  runtime.dispose();
}

test().catch(console.error);