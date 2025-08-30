const { newQuickJSWASMModuleFromVariant, RELEASE_SYNC } = require('quickjs-emscripten');

async function main() {
  console.log('=== Comprehensive GC Test ===\n');
  
  const QuickJS = await newQuickJSWASMModuleFromVariant(RELEASE_SYNC);
  const runtime = QuickJS.newRuntime();
  const vm = runtime.newContext();
  
  try {
    // Set up a complex global state similar to JSQ
    console.log('1. Setting up globals...');
    
    // Add lodash-like utilities
    vm.evalCode(`
      globalThis._ = {
        filter: (arr, fn) => arr ? arr.filter(fn) : [],
        map: (arr, fn) => arr ? arr.map(fn) : [],
        find: (arr, fn) => arr ? arr.find(fn) : undefined,
        reduce: (arr, fn, init) => arr ? arr.reduce(fn, init) : init,
        isArray: Array.isArray,
        isObject: (val) => val \!== null && typeof val === 'object',
        isString: (val) => typeof val === 'string',
        isNumber: (val) => typeof val === 'number',
        isFunction: (val) => typeof val === 'function',
        sum: (arr) => arr.reduce((a, b) => a + b, 0),
        max: (arr) => Math.max(...arr)
      };
      'lodash setup'
    `);
    
    // Add SmartDollar-like object
    vm.evalCode(`
      globalThis.SmartDollar = class SmartDollar {
        constructor(value) {
          this._value = value;
        }
        value() { return this._value; }
      };
      globalThis.createSmartDollar = (val) => new SmartDollar(val);
      globalThis.$ = createSmartDollar([1, 2, 3]);
      'SmartDollar setup'
    `);
    
    // Check what's on globalThis
    const checkResult = vm.evalCode(`
      const props = Object.getOwnPropertyNames(globalThis);
      const customProps = props.filter(p => 
        \!['JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean',
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
      );
      customProps;
    `);
    
    if (!checkResult.error) {
      console.log('Custom properties:', vm.dump(checkResult.value));
      checkResult.value.dispose();
    }
    
    console.log('\n2. Attempting cleanup...');
    
    // Try various cleanup approaches
    const cleanupApproaches = [
      {
        name: 'Simple delete',
        code: `
          delete globalThis.$;
          delete globalThis._;
          delete globalThis.SmartDollar;
          delete globalThis.createSmartDollar;
          'simple delete done'
        `
      },
      {
        name: 'Set to undefined then delete',
        code: `
          globalThis.$ = undefined;
          globalThis._ = undefined;
          globalThis.SmartDollar = undefined;
          globalThis.createSmartDollar = undefined;
          delete globalThis.$;
          delete globalThis._;
          delete globalThis.SmartDollar;
          delete globalThis.createSmartDollar;
          'undefined then delete done'
        `
      },
      {
        name: 'Loop through and delete',
        code: `
          const toDelete = ['$', '_', 'SmartDollar', 'createSmartDollar'];
          for (const prop of toDelete) {
            if (prop in globalThis) {
              globalThis[prop] = null;
              delete globalThis[prop];
            }
          }
          'loop delete done'
        `
      }
    ];
    
    for (const approach of cleanupApproaches) {
      console.log(`\nTrying: ${approach.name}`);
      
      // Re-setup globals
      vm.evalCode(`
        globalThis._ = { test: 'lodash' };
        globalThis.$ = { test: 'smartdollar' };
        globalThis.SmartDollar = function() {};
        globalThis.createSmartDollar = function() {};
      `);
      
      // Try cleanup
      const cleanupResult = vm.evalCode(approach.code);
      if (!cleanupResult.error) {
        console.log('Result:', vm.dump(cleanupResult.value));
        cleanupResult.value.dispose();
      }
      
      // Check what remains
      const checkResult2 = vm.evalCode(`
        [
          '$' in globalThis,
          '_' in globalThis,
          'SmartDollar' in globalThis,
          'createSmartDollar' in globalThis
        ]
      `);
      
      if (!checkResult2.error) {
        console.log('Still exists:', vm.dump(checkResult2.value));
        checkResult2.value.dispose();
      }
    }
    
    console.log('\n3. Testing object references...');
    
    // Test if objects hold references
    vm.evalCode(`
      // Create objects with circular references
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2', ref: obj1 };
      obj1.ref = obj2;
      
      globalThis.circularRef = obj1;
      'circular ref created'
    `);
    
    // Try to clean it
    vm.evalCode(`
      delete globalThis.circularRef;
      'circular ref deleted'
    `);
    
    // Force GC
    console.log('\n4. Forcing garbage collection...');
    if (typeof runtime.collectGarbage === 'function') {
      runtime.collectGarbage();
      console.log('GC executed');
    }
    
    // Final check
    const finalCheck = vm.evalCode(`
      Object.getOwnPropertyNames(globalThis).filter(p => 
        \!['JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean',
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
      ).length
    `);
    
    if (!finalCheck.error) {
      console.log('\nFinal custom property count:', vm.dump(finalCheck.value));
      finalCheck.value.dispose();
    }
    
    // Get memory stats
    const memStats = runtime.computeMemoryUsage();
    console.log('Memory stats:', memStats);
    
    // Check if memStats needs disposal
    if (memStats && typeof memStats.dispose === 'function') {
      console.log('Disposing memStats...');
      memStats.dispose();
    }
    
  } catch (e) {
    console.error('Error during test:', e);
  }
  
  console.log('\n5. Disposing VM and runtime...');
  
  try {
    vm.dispose();
    console.log('VM disposed successfully');
  } catch (e) {
    console.error('VM dispose error:', e.message);
  }
  
  try {
    runtime.dispose();
    console.log('Runtime disposed successfully');
  } catch (e) {
    console.error('Runtime dispose error:', e.message);
  }
}

main().catch(console.error);