const { newQuickJSWASMModuleFromVariant, RELEASE_SYNC } = require('quickjs-emscripten');

async function main() {
  console.log('Starting complex test...');
  
  const QuickJS = await newQuickJSWASMModuleFromVariant(RELEASE_SYNC);
  
  // Test 5: Multiple properties and cleanup
  console.log('\n=== Test 5: Multiple properties and cleanup ===');
  try {
    const vm = QuickJS.newContext();
    console.log('Created VM');
    
    // Set multiple global properties
    const props = ['prop1', 'prop2', 'prop3'];
    for (const prop of props) {
      const val = vm.evalCode(`"value_${prop}"`);
      if (!val.error) {
        vm.setProp(vm.global, prop, val.value);
        val.value.dispose();
      }
    }
    console.log('Set multiple properties');
    
    // List properties
    const listResult = vm.evalCode(`
      Object.getOwnPropertyNames(globalThis).filter(p => p.startsWith('prop'))
    `);
    if (!listResult.error) {
      console.log('Properties found:', vm.dump(listResult.value));
      listResult.value.dispose();
    }
    
    // Delete properties
    const deleteResult = vm.evalCode(`
      ['prop1', 'prop2', 'prop3'].forEach(p => delete globalThis[p]);
      "done"
    `);
    if (!deleteResult.error) {
      console.log('Deleted properties');
      deleteResult.value.dispose();
    }
    
    // Check again
    const checkResult = vm.evalCode(`
      Object.getOwnPropertyNames(globalThis).filter(p => p.startsWith('prop'))
    `);
    if (!checkResult.error) {
      console.log('Properties after delete:', vm.dump(checkResult.value));
      checkResult.value.dispose();
    }
    
    vm.dispose();
    console.log('Disposed VM successfully');
  } catch (e) {
    console.error('Failed:', e.message);
  }
  
  // Test 6: Function with closure
  console.log('\n=== Test 6: Function with closure ===');
  try {
    const vm = QuickJS.newContext();
    console.log('Created VM');
    
    const closureCode = `
      (function() {
        const secret = "hidden";
        globalThis.getSecret = function() { return secret; };
      })();
      "setup done"
    `;
    
    const setupResult = vm.evalCode(closureCode);
    if (!setupResult.error) {
      console.log('Setup closure function');
      setupResult.value.dispose();
    }
    
    // Call the function
    const callResult = vm.evalCode('getSecret()');
    if (!callResult.error) {
      console.log('Called function, got:', vm.dump(callResult.value));
      callResult.value.dispose();
    }
    
    // Clean up
    const cleanupResult = vm.evalCode('delete globalThis.getSecret; "cleaned"');
    if (!cleanupResult.error) {
      console.log('Cleaned up function');
      cleanupResult.value.dispose();
    }
    
    vm.dispose();
    console.log('Disposed VM successfully');
  } catch (e) {
    console.error('Failed:', e.message);
  }
  
  // Test 7: Complex object with methods
  console.log('\n=== Test 7: Complex object with methods ===');
  try {
    const vm = QuickJS.newContext();
    console.log('Created VM');
    
    const complexCode = `
      globalThis.myAPI = {
        data: [1, 2, 3],
        process: function(fn) {
          return this.data.map(fn);
        },
        nested: {
          value: 42,
          get: function() { return this.value; }
        }
      };
      "API created"
    `;
    
    const createResult = vm.evalCode(complexCode);
    if (!createResult.error) {
      console.log('Created complex API');
      createResult.value.dispose();
    }
    
    // Use the API
    const useResult = vm.evalCode('myAPI.process(x => x * 2)');
    if (!useResult.error) {
      console.log('API result:', vm.dump(useResult.value));
      useResult.value.dispose();
    }
    
    // Clean up
    const cleanResult = vm.evalCode('delete globalThis.myAPI; "cleaned"');
    if (!cleanResult.error) {
      console.log('Cleaned up API');
      cleanResult.value.dispose();
    }
    
    vm.dispose();
    console.log('Disposed VM successfully');
  } catch (e) {
    console.error('Failed:', e.message);
  }
  
  console.log('\n=== All complex tests completed ===');
}

main().catch(console.error);