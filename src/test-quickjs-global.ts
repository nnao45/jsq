import { 
  newQuickJSWASMModule,
  RELEASE_SYNC
} from 'quickjs-emscripten';

async function testGlobalThis() {
  console.log('=== Testing globalThis in QuickJS ===');
  
  try {
    const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
    const runtime = quickjs.newRuntime();
    const context = runtime.newContext();
    
    // Test 1: Check if globalThis exists
    console.log('\n--- Test 1: Check globalThis ---');
    const result1 = context.evalCode('typeof globalThis');
    if ('value' in result1) {
      console.log('typeof globalThis:', context.dump(result1.value));
      result1.value.dispose();
    }
    
    // Test 2: Try to access globalThis
    console.log('\n--- Test 2: Access globalThis ---');
    const result2 = context.evalCode('globalThis');
    if ('value' in result2) {
      console.log('globalThis:', context.dump(result2.value));
      result2.value.dispose();
    } else if ('error' in result2) {
      console.log('Error accessing globalThis:', context.dump(result2.error));
      result2.error.dispose();
    }
    
    // Test 3: Try to set a property on globalThis
    console.log('\n--- Test 3: Set property on globalThis ---');
    const result3 = context.evalCode('globalThis.test = 42; globalThis.test');
    if ('value' in result3) {
      console.log('Set and retrieved test:', context.dump(result3.value));
      result3.value.dispose();
    } else if ('error' in result3) {
      console.log('Error:', context.dump(result3.error));
      result3.error.dispose();
    }
    
    // Test 4: Try using window or global
    console.log('\n--- Test 4: Check window/global ---');
    const result4 = context.evalCode('typeof window');
    if ('value' in result4) {
      console.log('typeof window:', context.dump(result4.value));
      result4.value.dispose();
    }
    
    const result5 = context.evalCode('typeof global');
    if ('value' in result5) {
      console.log('typeof global:', context.dump(result5.value));
      result5.value.dispose();
    }
    
    // Test 5: Try setting console directly
    console.log('\n--- Test 5: Set console directly ---');
    const result6 = context.evalCode('console = {}');
    if ('value' in result6) {
      console.log('Set console:', context.dump(result6.value));
      result6.value.dispose();
    } else if ('error' in result6) {
      console.log('Error setting console:', context.dump(result6.error));
      result6.error.dispose();
    }
    
    // Clean up
    context.dispose();
    runtime.dispose();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testGlobalThis().catch(console.error);