import { getQuickJS } from 'quickjs-emscripten';
import { SMART_DOLLAR_METHODS, VM_SMART_DOLLAR_CLASS } from './core/smart-dollar/smart-dollar-shared-methods.js';

async function simpleTest() {
  console.log('Testing basic QuickJS...\n');
  
  const QuickJS = await getQuickJS();
  const vm = QuickJS.newContext();
  
  try {
    // Test 1: Simple eval
    console.log('Test 1: Simple math');
    const result0 = vm.evalCode("let globalThis = {}");
    const result1 = vm.evalCode(SMART_DOLLAR_METHODS);
    const result2 = vm.evalCode(VM_SMART_DOLLAR_CLASS);
    const result3 = vm.evalCode("$([1, 2, 3])");
    const result4 = vm.evalCode("$([1, 2, 3]).map(x => x * 2).join(',')");
    
    const results = [result0, result1, result2, result3, result4];
    const labels = ['globalThis setup', 'SMART_DOLLAR_METHODS', 'VM_SMART_DOLLAR_CLASS', '$([1,2,3]) call', 'map & join test'];
    
    results.forEach((result, index) => {
      console.log(`\n${labels[index]}:`);
      if ('error' in result) {
        console.log('Error:', vm.dump(result.error));
        result.error.dispose();
      } else {
        console.log('Success:', vm.dump(result.value));
        result.value.dispose();
      }
    });
  } finally {
    vm.dispose();
  }
  
  console.log('\n✨ Simple test completed!');
}

simpleTest().catch(console.error);