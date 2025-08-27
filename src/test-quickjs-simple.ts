import { getQuickJS } from 'quickjs-emscripten';

async function simpleTest() {
  console.log('Testing basic QuickJS...\n');
  
  const QuickJS = await getQuickJS();
  const vm = QuickJS.newContext();
  
  try {
    // Test 1: Simple eval
    console.log('Test 1: Simple math');
    const result1 = vm.evalCode('2 + 2');
    if ('error' in result1) {
      console.log('Error:', vm.dump(result1.error));
      result1.error.dispose();
    } else {
      console.log('Result:', vm.dump(result1.value));
      result1.value.dispose();
    }
    
    // Test 2: With variable
    console.log('\nTest 2: With global variable');
    const world = vm.newString('World');
    vm.setProp(vm.global, 'NAME', world);
    world.dispose();
    
    const result2 = vm.evalCode('"Hello, " + NAME');
    if ('error' in result2) {
      console.log('Error:', vm.dump(result2.error));
      result2.error.dispose();
    } else {
      console.log('Result:', vm.dump(result2.value));
      result2.value.dispose();
    }
    
    // Test 3: JSON data
    console.log('\nTest 3: JSON processing');
    const jsonData = vm.newString(JSON.stringify({ users: [{ name: 'Alice' }, { name: 'Bob' }] }));
    vm.setProp(vm.global, 'data', jsonData);
    jsonData.dispose();
    
    const result3 = vm.evalCode('JSON.parse(data).users.map(u => u.name).join(", ")');
    if ('error' in result3) {
      console.log('Error:', vm.dump(result3.error));
      result3.error.dispose();
    } else {
      console.log('Result:', vm.dump(result3.value));
      result3.value.dispose();
    }
    
    // Test 4: Check what result actually is
    console.log('\nTest 4: Checking result structure');
    const result4 = vm.evalCode('42');
    console.log('Result type:', typeof result4);
    console.log('Result keys:', Object.keys(result4));
    console.log('Has error?', 'error' in result4);
    console.log('Has value?', 'value' in result4);
    
    if ('value' in result4) {
      result4.value.dispose();
    }
    
    // Test 5: Test context methods
    console.log('\nTest 5: Testing context object');
    console.log('Context type:', typeof vm);
    console.log('Context has evalCode:', 'evalCode' in vm);
    console.log('evalCode type:', typeof vm.evalCode);
    
    // Test 6: Runtime info
    console.log('\nTest 6: Runtime info');
    const runtime = QuickJS.runtime;
    if (runtime) {
      const memUsage = runtime.computeMemoryUsage();
      console.log('Memory usage:', memUsage);
    }
    
  } finally {
    vm.dispose();
  }
  
  console.log('\n✨ Simple test completed!');
}

simpleTest().catch(console.error);