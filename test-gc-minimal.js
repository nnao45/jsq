#!/usr/bin/env node

// Minimal test to reproduce GC assertion error
const { getQuickJS } = require('quickjs-emscripten');

async function test() {
  const quickjs = await getQuickJS();
  const runtime = quickjs.newRuntime();
  const context = runtime.newContext();
  
  // Simple evaluation
  const result = context.evalCode('1 + 1');
  console.log('Result:', context.dump(result.value));
  result.value.dispose();
  
  // Proper cleanup
  context.dispose();
  runtime.dispose();
}

test().catch(console.error);