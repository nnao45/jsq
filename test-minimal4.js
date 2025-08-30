#!/usr/bin/env node

// More thorough testing of handle lifecycle
const { getQuickJS } = require('quickjs-emscripten');

async function testHandleLifecycle() {
  const QuickJS = await getQuickJS();
  
  console.log('Test 1: Object created by evalCode, setProp, then dispose');
  try {
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    const objResult = context.evalCode('({a: 1, b: 2})');
    if (objResult.error) throw new Error('Failed to create object');
    
    context.setProp(context.global, 'myObj', objResult.value);
    objResult.value.dispose(); // Dispose after setProp
    
    // Try to access
    const accessResult = context.evalCode('myObj.a');
    console.log('Accessed value:', context.dump(accessResult.value));
    accessResult.value.dispose();
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test 1 passed\n');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message, '\n');
  }
  
  console.log('Test 2: setProp vs defineProp');
  try {
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    // Using setProp
    const obj1 = context.evalCode('({x: 1})');
    context.setProp(context.global, 'obj1', obj1.value);
    obj1.value.dispose();
    
    // Using defineProp (if available)
    const obj2 = context.evalCode('({y: 2})');
    if (typeof context.defineProp === 'function') {
      context.defineProp(context.global, 'obj2', {
        configurable: true,
        enumerable: true,
        value: obj2.value
      });
      obj2.value.dispose();
    } else {
      context.setProp(context.global, 'obj2', obj2.value);
      obj2.value.dispose();
    }
    
    // Access both
    const check = context.evalCode('JSON.stringify({obj1, obj2})');
    console.log('Result:', context.dump(check.value));
    check.value.dispose();
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message, '\n');
  }
  
  console.log('Test 3: Nested objects');
  try {
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    // Create nested structure
    const data = { users: [{ name: 'John' }, { name: 'Jane' }] };
    const code = `JSON.parse('${JSON.stringify(data)}')`;
    const result = context.evalCode(code);
    
    context.setProp(context.global, 'data', result.value);
    result.value.dispose();
    
    // Access nested property
    const nameResult = context.evalCode('data.users[0].name');
    console.log('Nested value:', context.dump(nameResult.value));
    nameResult.value.dispose();
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test 3 passed\n');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message, '\n');
  }
  
  console.log('Test 4: Circular reference (should fail gracefully)');
  try {
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    // Create circular reference
    const circular = context.evalCode(`
      const obj = { name: 'test' };
      obj.self = obj;
      obj;
    `);
    
    if (circular.value) {
      context.setProp(context.global, 'circular', circular.value);
      circular.value.dispose();
    }
    
    // Try to access
    const access = context.evalCode('circular.name');
    if (access.value) {
      console.log('Circular obj name:', context.dump(access.value));
      access.value.dispose();
    }
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test 4 passed\n');
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message, '\n');
  }
}

testHandleLifecycle().catch(console.error);