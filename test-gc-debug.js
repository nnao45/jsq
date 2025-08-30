const { newQuickJSWASMModuleFromVariant, RELEASE_SYNC } = require('quickjs-emscripten');

async function main() {
  console.log('Starting test...');
  
  const QuickJS = await newQuickJSWASMModuleFromVariant(RELEASE_SYNC);
  console.log('QuickJS loaded');
  
  // Test 1: Empty VM
  console.log('\n=== Test 1: Empty VM ===');
  try {
    const vm1 = QuickJS.newContext();
    console.log('Created empty VM');
    vm1.dispose();
    console.log('Disposed empty VM successfully');
  } catch (e) {
    console.error('Failed:', e.message);
  }
  
  // Test 2: Simple eval
  console.log('\n=== Test 2: Simple eval ===');
  try {
    const vm2 = QuickJS.newContext();
    console.log('Created VM');
    
    const result = vm2.evalCode('1 + 1');
    if (result.error) {
      console.error('Eval error:', vm2.dump(result.error));
      result.error.dispose();
    } else {
      console.log('Eval result:', vm2.dump(result.value));
      result.value.dispose();
    }
    
    vm2.dispose();
    console.log('Disposed VM successfully');
  } catch (e) {
    console.error('Failed:', e.message);
  }
  
  // Test 3: Set global property
  console.log('\n=== Test 3: Set global property ===');
  try {
    const vm3 = QuickJS.newContext();
    console.log('Created VM');
    
    // Create a value
    const val = vm3.evalCode('"hello"');
    if (!val.error) {
      vm3.setProp(vm3.global, 'myString', val.value);
      val.value.dispose();
      console.log('Set global property');
    }
    
    // Check what's on globalThis
    const checkCode = `
      const props = Object.getOwnPropertyNames(globalThis);
      props.filter(p => !['JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'undefined', 'null', 'globalThis'].includes(p));
    `;
    
    const checkResult = vm3.evalCode(checkCode);
    if (!checkResult.error) {
      console.log('Custom properties:', vm3.dump(checkResult.value));
      checkResult.value.dispose();
    }
    
    vm3.dispose();
    console.log('Disposed VM successfully');
  } catch (e) {
    console.error('Failed:', e.message);
  }
  
  // Test 4: Simple object creation
  console.log('\n=== Test 4: Simple object creation ===');
  try {
    const vm4 = QuickJS.newContext();
    console.log('Created VM');
    
    // Create an object
    const objCode = `
      const obj = { name: 'test' };
      obj;
    `;
    
    const objResult = vm4.evalCode(objCode);
    if (!objResult.error) {
      console.log('Created object:', vm4.dump(objResult.value));
      objResult.value.dispose();
    }
    
    vm4.dispose();
    console.log('Disposed VM successfully');
  } catch (e) {
    console.error('Failed:', e.message);
  }
  
  console.log('\n=== All tests completed ===');
}

main().catch(console.error);