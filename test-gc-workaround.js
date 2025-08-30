#!/usr/bin/env node

// Test workaround - create a new runtime for each execution
const { getQuickJS } = require('quickjs-emscripten');

async function test() {
  // Test 1: with globals
  {
    const quickjs = await getQuickJS();
    const runtime = quickjs.newRuntime();
    const context = runtime.newContext();
    
    context.evalCode('globalThis.test = 42');
    const result = context.evalCode('test');
    console.log('Test 1:', context.dump(result.value));
    result.value.dispose();
    
    // Don't dispose - let it leak for now
  }
  
  // Test 2: another execution
  {
    const quickjs = await getQuickJS();
    const runtime = quickjs.newRuntime();
    const context = runtime.newContext();
    
    const result = context.evalCode('1 + 1');
    console.log('Test 2:', context.dump(result.value));
    result.value.dispose();
    
    // Clean dispose
    context.dispose();
    runtime.dispose();
  }
}

test().catch(console.error);