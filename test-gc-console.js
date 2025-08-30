#!/usr/bin/env node

// Test with console override like jsq does
const { getQuickJS } = require('quickjs-emscripten');

async function test() {
  const quickjs = await getQuickJS();
  const runtime = quickjs.newRuntime();
  const context = runtime.newContext();
  
  // Set up console like jsq
  context.evalCode(`
    globalThis.__consoleCalls = [];
    globalThis.console = {
      log: function(...args) {
        globalThis.__consoleCalls.push({ method: 'log', args: args });
      }
    };
  `);
  
  // Use console
  context.evalCode('console.log("test")');
  
  // Clean up
  context.evalCode(`
    delete globalThis.__consoleCalls;
    delete globalThis.console;
  `);
  
  // Execute pending jobs
  let jobResult = runtime.executePendingJobs();
  if (jobResult.error) {
    jobResult.error.dispose();
  }
  jobResult.dispose();
  
  // Dispose
  context.dispose();
  runtime.dispose();
}

test().catch(console.error);