import { getQuickJS } from 'quickjs-emscripten';

async function directGCRepro() {
  console.log('=== Direct GC Repro Test ===\n');
  
  // Problematic pattern 1: Not disposing intermediate handles
  console.log('Test 1: Testing handle disposal patterns...');
  try {
    const quickjs = await getQuickJS();
    const runtime = quickjs.newRuntime();
    const vm = runtime.newContext();
    
    // Create handles without proper disposal
    for (let i = 0; i < 10; i++) {
      // This creates a handle but doesn't dispose it immediately
      const nameHandle = vm.newString(`prop${i}`);
      const valueHandle = vm.newString(`value${i}`);
      
      // Get props without disposing intermediate handles
      const globalProp = vm.getProp(vm.global, 'JSON');
      const parseProp = vm.getProp(globalProp, 'parse');
      
      // These handles are not being disposed!
      // globalProp.dispose(); // MISSING!
      // parseProp.dispose(); // MISSING!
      
      nameHandle.dispose();
      valueHandle.dispose();
    }
    
    vm.dispose();
    runtime.dispose();
    console.log('✓ Test 1 completed (but may have leaked handles)\n');
  } catch (error) {
    console.error('✗ Test 1 failed:', error, '\n');
  }
  
  // Problematic pattern 2: Multiple runtime/context cycles
  console.log('Test 2: Testing multiple runtime cycles...');
  try {
    const quickjs = await getQuickJS();
    
    for (let i = 0; i < 5; i++) {
      console.log(`  Cycle ${i + 1}/5`);
      const runtime = quickjs.newRuntime();
      const vm = runtime.newContext();
      
      // Set up globals with proper disposal
      const name = vm.newString('testVar');
      const value = vm.newNumber(42);
      vm.setProp(vm.global, 'testVar', value);
      name.dispose();
      value.dispose();
      
      // Eval code
      const result = vm.evalCode('testVar * 2');
      if ('value' in result) {
        result.value.dispose();
      } else if ('error' in result) {
        result.error.dispose();
      }
      
      // Important: Dispose in correct order
      vm.dispose();
      runtime.dispose();
    }
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('✗ Test 2 failed:', error, '\n');
  }
  
  // Problematic pattern 3: Complex object operations
  console.log('Test 3: Testing complex object operations...');
  try {
    const quickjs = await getQuickJS();
    const runtime = quickjs.newRuntime();
    const vm = runtime.newContext();
    
    // Create a complex object structure
    const obj = vm.newObject();
    
    for (let i = 0; i < 5; i++) {
      const propName = vm.newString(`prop${i}`);
      const propValue = vm.newObject();
      
      // Nested properties
      for (let j = 0; j < 3; j++) {
        const nestedName = vm.newString(`nested${j}`);
        const nestedValue = vm.newNumber(j);
        vm.setProp(propValue, `nested${j}`, nestedValue);
        nestedName.dispose();
        nestedValue.dispose();
      }
      
      vm.setProp(obj, `prop${i}`, propValue);
      propName.dispose();
      propValue.dispose();
    }
    
    // Set to global
    vm.setProp(vm.global, 'complexObj', obj);
    obj.dispose();
    
    // Eval to check
    const result = vm.evalCode('JSON.stringify(complexObj)');
    if ('value' in result) {
      console.log('  Complex object:', vm.dump(result.value));
      result.value.dispose();
    }
    
    vm.dispose();
    runtime.dispose();
    console.log('✓ Test 3 passed\n');
  } catch (error) {
    console.error('✗ Test 3 failed:', error, '\n');
  }
  
  console.log('=== Tests completed ===');
}

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('\n!!! CRITICAL: Uncaught exception:', error);
  console.error('Message:', error.message);
  if (error.message.includes('Assertion failed') && error.message.includes('gc_obj_list')) {
    console.error('\n!!! This is the GC assertion failure we\'re looking for!');
  }
  process.exit(1);
});

process.on('SIGABRT', () => {
  console.error('\n!!! CRITICAL: Process aborted (likely GC assertion)');
  process.exit(1);
});

directGCRepro().catch(console.error);