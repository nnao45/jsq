import { getQuickJS } from 'quickjs-emscripten';
import { createVMSmartDollarCode } from './src/core/smart-dollar/smart-dollar-vm';
import { createVMLodashCode } from './src/core/lodash/lodash-vm';

async function testSmartDollar() {
  console.log('=== Testing QuickJS with SmartDollar ===');
  
  const quickjs = await getQuickJS();
  const runtime = quickjs.newRuntime();
  const vm = runtime.newContext();
  
  try {
    // Step 1: Set up data
    console.log('\n1. Setting up data');
    const data = { a: 1, b: 2, c: 3 };
    const jsonString = JSON.stringify(data);
    const parseCode = `globalThis.$_data = JSON.parse('${jsonString}')`;
    const result1 = vm.evalCode(parseCode);
    if ('error' in result1) {
      console.error('Error setting data:', vm.dump(result1.error));
      result1.error.dispose();
      return;
    }
    result1.value.dispose();
    
    // Step 2: Load SmartDollar code
    console.log('\n2. Loading SmartDollar code');
    const smartDollarCode = createVMSmartDollarCode();
    const result2 = vm.evalCode(smartDollarCode);
    if ('error' in result2) {
      console.error('Error loading SmartDollar:', vm.dump(result2.error));
      result2.error.dispose();
      return;
    }
    result2.value.dispose();
    
    // Step 3: Load Lodash code
    console.log('\n3. Loading Lodash code');
    const lodashCode = createVMLodashCode();
    const result3 = vm.evalCode(lodashCode);
    if ('error' in result3) {
      console.error('Error loading Lodash:', vm.dump(result3.error));
      result3.error.dispose();
      return;
    }
    result3.value.dispose();
    
    // Step 4: Set up $
    console.log('\n4. Setting up $');
    const setupCode = `
      if (globalThis.$_data === null || globalThis.$_data === undefined) {
        globalThis.$ = globalThis.$_data;
      } else {
        globalThis.$ = createSmartDollar(globalThis.$_data);
      }
      delete globalThis.$_data;
    `;
    const result4 = vm.evalCode(setupCode);
    if ('error' in result4) {
      console.error('Error setting up $:', vm.dump(result4.error));
      result4.error.dispose();
      return;
    }
    result4.value.dispose();
    
    // Step 5: Test semicolon expression
    console.log('\n5. Testing semicolon expression');
    const testCode = '(() => { try { $.a; $.b; return $.c; } catch (error) { throw error; } })()';
    const result5 = vm.evalCode(testCode);
    if ('error' in result5) {
      console.error('Error in test:', vm.dump(result5.error));
      result5.error.dispose();
      return;
    }
    console.log('Result:', vm.dump(result5.value));
    result5.value.dispose();
    
    // Step 6: Clean up globals
    console.log('\n6. Cleaning up globals');
    const cleanupCode = 'delete globalThis.$; delete globalThis.createSmartDollar; delete globalThis.createLodash; delete globalThis._;';
    const result6 = vm.evalCode(cleanupCode);
    if ('value' in result6) {
      result6.value.dispose();
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Dispose in correct order
    console.log('\n7. Disposing VM and runtime');
    vm.dispose();
    runtime.dispose();
  }
}

testSmartDollar().catch(console.error);