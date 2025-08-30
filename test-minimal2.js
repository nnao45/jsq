#!/usr/bin/env node

// Direct test of VMSandboxQuickJS
const { getQuickJS } = require('quickjs-emscripten');

async function testVMSandboxQuickJS() {
  // First, just test creating and disposing an engine
  console.log('Test 1: Create and dispose QuickJS runtime');
  try {
    const QuickJS = await getQuickJS();
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    // Don't do anything, just dispose
    context.dispose();
    runtime.dispose();
    console.log('✅ Test 1 passed\n');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  // Test with console setup
  console.log('Test 2: Setup console object');
  try {
    const QuickJS = await getQuickJS();
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    // Setup console like in vm-sandbox-quickjs.ts
    const consoleCode = `
      globalThis.__consoleCalls = [];
      globalThis.console = {
        log: function(...args) {
          globalThis.__consoleCalls.push({ method: 'log', args: args });
        }
      };
    `;
    
    const result = context.evalCode(consoleCode);
    if (result.value) result.value.dispose();
    if (result.error) {
      console.error('Console setup error:', context.dump(result.error));
      result.error.dispose();
    }
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  // Test with $ setup
  console.log('Test 3: Setup $ with data');
  try {
    const QuickJS = await getQuickJS();
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    // Set up data
    const data = { test: 'value' };
    const jsonString = JSON.stringify(data);
    const parseCode = `JSON.parse('${jsonString}')`;
    const result = context.evalCode(parseCode);
    
    if (result.error) {
      console.error('Parse error:', context.dump(result.error));
      result.error.dispose();
    } else {
      context.setProp(context.global, '$', result.value);
      // Don't dispose result.value after setProp
    }
    
    // Try to access $
    const accessResult = context.evalCode('$');
    if (accessResult.value) {
      console.log('$ value:', context.dump(accessResult.value));
      accessResult.value.dispose();
    }
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test 3 passed\n');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
  }
  
  // Test with executePendingJobs
  console.log('Test 4: Execute pending jobs');
  try {
    const QuickJS = await getQuickJS();
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    // Simple evaluation
    const result = context.evalCode('1 + 1');
    if (result.value) result.value.dispose();
    
    // Execute pending jobs
    const jobResult = runtime.executePendingJobs();
    jobResult.dispose();
    
    // Collect garbage
    if (typeof runtime.collectGarbage === 'function') {
      runtime.collectGarbage();
    }
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test 4 passed\n');
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message);
  }
}

testVMSandboxQuickJS().catch(console.error);