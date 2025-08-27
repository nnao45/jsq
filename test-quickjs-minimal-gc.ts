import { getQuickJS } from 'quickjs-emscripten';

async function testMinimal() {
  console.log('=== Testing Minimal QuickJS GC ===');
  
  try {
    // Test 1: Simple creation and disposal
    console.log('\n1. Testing simple creation and disposal');
    const quickjs1 = await getQuickJS();
    const runtime1 = quickjs1.newRuntime();
    const vm1 = runtime1.newContext();
    
    // Execute simple code
    const result1 = vm1.evalCode('1 + 2');
    if ('value' in result1) {
      console.log('Result:', vm1.dump(result1.value));
      result1.value.dispose();
    }
    
    // Proper disposal order
    vm1.dispose();
    runtime1.dispose();
    console.log('First test passed!');
    
    // Test 2: With global object
    console.log('\n2. Testing with global object');
    const quickjs2 = await getQuickJS();
    const runtime2 = quickjs2.newRuntime();
    const vm2 = runtime2.newContext();
    
    // Set a global object
    const objHandle = vm2.newObject();
    vm2.setProp(vm2.global, 'myObj', objHandle);
    objHandle.dispose();
    
    const result2 = vm2.evalCode('myObj');
    if ('value' in result2) {
      console.log('Result:', vm2.dump(result2.value));
      result2.value.dispose();
    }
    
    // Proper disposal order
    vm2.dispose();
    runtime2.dispose();
    console.log('Second test passed!');
    
    // Test 3: With complex operations
    console.log('\n3. Testing with complex operations');
    const quickjs3 = await getQuickJS();
    const runtime3 = quickjs3.newRuntime();
    const vm3 = runtime3.newContext();
    
    // Create console object
    const code = `
      globalThis.console = {};
      globalThis.console.log = function() {};
      globalThis.data = {a: 1, b: 2};
      globalThis.result = globalThis.data.a + globalThis.data.b;
      globalThis.result;
    `;
    
    const result3 = vm3.evalCode(code);
    if ('value' in result3) {
      console.log('Result:', vm3.dump(result3.value));
      result3.value.dispose();
    } else if ('error' in result3) {
      console.error('Error:', vm3.dump(result3.error));
      result3.error.dispose();
    }
    
    // Try to clear globals before disposal
    vm3.evalCode('delete globalThis.console; delete globalThis.data; delete globalThis.result;');
    
    // Proper disposal order
    vm3.dispose();
    runtime3.dispose();
    console.log('Third test passed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMinimal().catch(console.error);