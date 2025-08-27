import { getQuickJS } from 'quickjs-emscripten';

async function finalTest() {
  console.log('🚀 Final QuickJS Test...\n');
  
  const QuickJS = await getQuickJS();
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(64 * 1024 * 1024);
  
  const vm = runtime.newContext();
  
  try {
    // Test 1: Basic math
    console.log('Test 1: Basic math');
    const result1 = vm.evalCode('40 + 2');
    if ('value' in result1) {
      console.log('✓ Result:', vm.dump(result1.value));
      result1.value.dispose();
    } else {
      console.log('✗ Error:', vm.dump(result1.error));
      result1.error.dispose();
    }
    
    // Test 2: With global variable  
    console.log('\nTest 2: With global variable');
    const dataHandle = vm.newString(JSON.stringify({ x: 10, y: 20 }));
    vm.setProp(vm.global, 'jsonData', dataHandle);
    dataHandle.dispose();
    
    const result2 = vm.evalCode('const data = JSON.parse(jsonData); data.x + data.y');
    if ('value' in result2) {
      console.log('✓ Result:', vm.dump(result2.value));
      result2.value.dispose();
    } else {
      console.log('✗ Error:', vm.dump(result2.error));
      result2.error.dispose();
    }
    
    // Test 3: With $ syntax
    console.log('\nTest 3: With $ syntax');
    const $handle = vm.newString(JSON.stringify({ users: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }] }));
    vm.setProp(vm.global, '$json', $handle);
    $handle.dispose();
    
    const result3 = vm.evalCode('const $ = JSON.parse($json); $.users.filter(u => u.age > 25).map(u => u.name).join(", ")');
    if ('value' in result3) {
      console.log('✓ Result:', vm.dump(result3.value));
      result3.value.dispose();
    } else {
      console.log('✗ Error:', vm.dump(result3.error));
      result3.error.dispose();
    }
    
    // Test 4: Error case
    console.log('\nTest 4: Error handling');
    const result4 = vm.evalCode('undefinedVariable.property');
    if ('error' in result4) {
      console.log('✓ Expected error:', vm.dump(result4.error));
      result4.error.dispose();
    } else {
      console.log('✗ Unexpected success');
      result4.value.dispose();
    }
    
    // Test 5: Get context state
    console.log('\nTest 5: Context state');
    console.log('Context alive:', vm.alive);
    const memUsage = runtime.computeMemoryUsage();
    console.log('Runtime memory:', {
      used: memUsage.memory_used_size,
      allocated: memUsage.malloc_size,
      limit: memUsage.memory_limit
    });
    memUsage.dispose();
    
  } finally {
    vm.dispose();
    runtime.dispose();
  }
  
  console.log('\n✨ Final test completed!');
}

finalTest().catch(console.error);