#!/usr/bin/env node

// Test with Proxy like SmartDollar
const { getQuickJS } = require('quickjs-emscripten');

async function test() {
  const quickjs = await getQuickJS();
  const runtime = quickjs.newRuntime();
  const context = runtime.newContext();
  
  // Create a proxy like SmartDollar does
  context.evalCode(`
    const target = { value: 42 };
    globalThis.myProxy = new Proxy(target, {
      get(obj, prop) {
        if (prop === 'test') {
          return function() { return obj.value; };
        }
        return obj[prop];
      }
    });
  `);
  
  // Use the proxy
  const result = context.evalCode('myProxy.test()');
  console.log('Result:', context.dump(result.value));
  result.value.dispose();
  
  // Try to clean up
  context.evalCode('delete globalThis.myProxy');
  
  // Proper cleanup
  context.dispose();
  runtime.dispose();
}

test().catch(console.error);