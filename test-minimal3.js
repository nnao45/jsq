#!/usr/bin/env node

// Test setProp behavior
const { getQuickJS } = require('quickjs-emscripten');

async function testSetProp() {
  const QuickJS = await getQuickJS();
  
  console.log('Test A: setProp with immediate dispose');
  try {
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    const str = context.newString('hello');
    context.setProp(context.global, 'test', str);
    str.dispose(); // Dispose immediately after setProp
    
    const result = context.evalCode('test');
    console.log('Value:', context.dump(result.value));
    result.value.dispose();
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test A passed\n');
  } catch (error) {
    console.error('❌ Test A failed:', error.message, '\n');
  }
  
  console.log('Test B: setProp without dispose');
  try {
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    const str = context.newString('hello');
    context.setProp(context.global, 'test', str);
    // Don't dispose str
    
    const result = context.evalCode('test');
    console.log('Value:', context.dump(result.value));
    result.value.dispose();
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test B passed\n');
  } catch (error) {
    console.error('❌ Test B failed:', error.message, '\n');
  }
  
  console.log('Test C: Complex object with setProp');
  try {
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    // Create object via evalCode
    const objResult = context.evalCode('({a: 1, b: 2})');
    if (objResult.error) throw new Error('Failed to create object');
    
    context.setProp(context.global, 'obj', objResult.value);
    // Try not disposing objResult.value
    
    const accessResult = context.evalCode('obj');
    console.log('Value:', context.dump(accessResult.value));
    accessResult.value.dispose();
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test C passed\n');
  } catch (error) {
    console.error('❌ Test C failed:', error.message, '\n');
  }
  
  console.log('Test D: Multiple handles');
  try {
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    // Create multiple values
    const values = [];
    for (let i = 0; i < 5; i++) {
      const num = context.newNumber(i);
      context.setProp(context.global, `num${i}`, num);
      values.push(num);
    }
    
    // Dispose all after setting
    values.forEach(v => v.dispose());
    
    // Access one
    const result = context.evalCode('num3');
    console.log('Value:', context.dump(result.value));
    result.value.dispose();
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test D passed\n');
  } catch (error) {
    console.error('❌ Test D failed:', error.message, '\n');
  }
}

testSetProp().catch(console.error);