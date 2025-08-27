import { getQuickJS } from 'quickjs-emscripten';
import { QuickJSEngine } from './core/vm/engines/quickjs/QuickJSEngine.js';

async function reproduceGCError() {
  console.log('=== Reproducing GC Error ===\n');
  
  // Test 1: Direct QuickJS usage
  console.log('Test 1: Direct QuickJS usage');
  try {
    const quickjs = await getQuickJS();
    const runtime = quickjs.newRuntime();
    runtime.setMemoryLimit(128 * 1024 * 1024);
    runtime.setMaxStackSize(1024 * 1024);
    
    const context = runtime.newContext();
    
    // Multiple setProp operations with global
    for (let i = 0; i < 10; i++) {
      const name = context.newString(`var${i}`);
      const value = context.newNumber(i);
      context.setProp(context.global, `var${i}`, value);
      name.dispose();
      value.dispose();
    }
    
    // Create and dispose multiple handles
    for (let i = 0; i < 10; i++) {
      const result = context.evalCode(`var${i} * 2`);
      if ('value' in result) {
        console.log(`var${i} * 2 =`, context.dump(result.value));
        result.value.dispose();
      }
    }
    
    context.dispose();
    runtime.dispose();
    console.log('✓ Test 1 passed\n');
  } catch (error) {
    console.error('✗ Test 1 failed:', error, '\n');
  }
  
  // Test 2: Using QuickJSEngine wrapper
  console.log('Test 2: Using QuickJSEngine wrapper');
  try {
    const engine = new QuickJSEngine();
    await engine.initialize({ memoryLimit: 128 * 1024 * 1024 });
    
    const context = await engine.createContext();
    
    // Set multiple globals
    for (let i = 0; i < 10; i++) {
      await context.setGlobal(`test${i}`, `value${i}`);
    }
    
    // Set different types
    await context.setGlobal('nullVar', null);
    await context.setGlobal('undefinedVar', undefined);
    await context.setGlobal('boolVar', true);
    await context.setGlobal('numVar', 42);
    await context.setGlobal('strVar', 'hello');
    await context.setGlobal('objVar', { a: 1, b: 2 });
    await context.setGlobal('arrVar', [1, 2, 3]);
    
    // Evaluate multiple times
    for (let i = 0; i < 5; i++) {
      const result = await context.eval(`test${i}`);
      console.log(`test${i} =`, result);
    }
    
    // Release context
    context.release();
    
    // Dispose engine
    await engine.dispose();
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('✗ Test 2 failed:', error, '\n');
  }
  
  // Test 3: Stress test with many operations
  console.log('Test 3: Stress test');
  try {
    for (let j = 0; j < 5; j++) {
      console.log(`  Iteration ${j + 1}/5`);
      const engine = new QuickJSEngine();
      await engine.initialize({ memoryLimit: 128 * 1024 * 1024 });
      
      const context = await engine.createContext();
      
      // Many operations
      for (let i = 0; i < 100; i++) {
        await context.setGlobal(`x${i}`, i);
      }
      
      const result = await context.eval('x0 + x1 + x2');
      console.log(`  Result: ${result}`);
      
      context.release();
      await engine.dispose();
    }
    console.log('✓ Test 3 passed\n');
  } catch (error) {
    console.error('✗ Test 3 failed:', error, '\n');
  }
  
  console.log('=== All tests completed ===');
}

// Catch GC assertion
process.on('uncaughtException', (error) => {
  console.error('\n!!! CRITICAL: Uncaught exception (GC assertion?):', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('SIGABRT', () => {
  console.error('\n!!! CRITICAL: Process aborted (GC assertion failure)');
  process.exit(1);
});

reproduceGCError().catch(console.error);