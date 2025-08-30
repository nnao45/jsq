const { newQuickJSWASMModuleFromVariant, RELEASE_SYNC } = require('quickjs-emscripten');
const fs = require('fs');

async function main() {
  console.log('Testing SmartDollar GC issue...');
  
  const QuickJS = await newQuickJSWASMModuleFromVariant(RELEASE_SYNC);
  
  // Read the SmartDollar code
  const smartDollarCode = fs.readFileSync(__dirname + '/src/core/smart-dollar/smart-dollar-vm-v2.ts', 'utf-8');
  const codeMatch = smartDollarCode.match(/return `\n([\s\S]*?)\n`;/);
  if (!codeMatch) {
    console.error('Could not extract SmartDollar code');
    return;
  }
  const actualCode = codeMatch[1];
  
  console.log('\n=== Test 1: Load SmartDollar code ===');
  try {
    const vm = QuickJS.newContext();
    console.log('Created VM');
    
    // Load SmartDollar
    const loadResult = vm.evalCode(actualCode);
    if (loadResult.error) {
      console.error('Failed to load:', vm.dump(loadResult.error));
      loadResult.error.dispose();
    } else {
      console.log('SmartDollar loaded successfully');
      // The result is the module object
      console.log('Module type:', vm.typeof(loadResult.value));
      loadResult.value.dispose();
    }
    
    // Check what was added to globalThis
    const checkResult = vm.evalCode(`
      Object.getOwnPropertyNames(globalThis).filter(p => 
        !['JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean',
          'undefined', 'null', 'globalThis', 'Function', 'Error', 'EvalError',
          'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError',
          'InternalError', 'AggregateError', 'parseInt', 'parseFloat', 'isNaN',
          'isFinite', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
          'escape', 'unescape', 'Infinity', 'NaN', 'Reflect', 'Symbol', 'eval',
          'RegExp', 'Proxy', 'Map', 'Set', 'WeakMap', 'WeakSet', 'ArrayBuffer',
          'SharedArrayBuffer', 'Uint8ClampedArray', 'Int8Array', 'Uint8Array',
          'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'BigInt64Array',
          'BigUint64Array', 'Float32Array', 'Float64Array', 'DataView', 'Promise', 'BigInt'
        ].includes(p)
      )
    `);
    
    if (!checkResult.error) {
      console.log('Added to globalThis:', vm.dump(checkResult.value));
      checkResult.value.dispose();
    }
    
    vm.dispose();
    console.log('Disposed VM successfully');
  } catch (e) {
    console.error('Failed:', e.message);
  }
  
  console.log('\n=== Test 2: Use SmartDollar ===');
  try {
    const vm = QuickJS.newContext();
    console.log('Created VM');
    
    // Load and use SmartDollar
    const setupCode = `
      const smartDollarModule = ${actualCode};
      const { createSmartDollar } = smartDollarModule;
      const $ = createSmartDollar([1, 2, 3]);
      typeof $
    `;
    
    const setupResult = vm.evalCode(setupCode);
    if (setupResult.error) {
      console.error('Failed to setup:', vm.dump(setupResult.error));
      setupResult.error.dispose();
    } else {
      console.log('Created SmartDollar, type:', vm.dump(setupResult.value));
      setupResult.value.dispose();
    }
    
    // Clean up
    const cleanupResult = vm.evalCode(`
      delete globalThis.$;
      delete globalThis.smartDollarModule;
      delete globalThis.createSmartDollar;
      "cleaned"
    `);
    
    if (!cleanupResult.error) {
      console.log('Cleaned up');
      cleanupResult.value.dispose();
    }
    
    vm.dispose();
    console.log('Disposed VM successfully');
  } catch (e) {
    console.error('Failed:', e.message);
  }
  
  console.log('\n=== All tests completed ===');
}

main().catch(console.error);