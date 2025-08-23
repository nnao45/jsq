// Test simplified createSmartDollar
const ivm = require('isolated-vm');

async function test() {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = await isolate.createContext();
  const jail = context.global;

  // Test 1: Methods with closures fail
  try {
    await context.eval(`
      function createSmartDollar(data) {
        if (Array.isArray(data)) {
          const arr = [...data];
          arr.chunk = function(size) {
            // This has a closure over createSmartDollar
            return createSmartDollar([1, 2]);
          };
          return arr;
        }
        return data;
      }
      
      const arr = createSmartDollar([1, 2, 3]);
      arr.chunk(2); // This might fail internally
    `);
    console.log('Test 1 passed: Methods with closures');
  } catch (error) {
    console.error('Test 1 failed:', error.message);
  }

  // Test 2: Methods without closures
  try {
    await context.eval(`
      globalThis.createSmartDollar2 = function(data) {
        if (Array.isArray(data)) {
          const arr = [...data];
          arr.chunk = function(size) {
            // Reference global function
            return globalThis.createSmartDollar2([1, 2]);
          };
          return arr;
        }
        return data;
      }
      
      const arr2 = globalThis.createSmartDollar2([1, 2, 3]);
      arr2.chunk(2);
    `);
    console.log('Test 2 passed: Methods referencing globals');
  } catch (error) {
    console.error('Test 2 failed:', error.message);
  }

  // Test 3: Using proxy
  try {
    await context.eval(`
      globalThis.createSmartDollar3 = function(data) {
        if (Array.isArray(data)) {
          const arrayData = [...data];
          
          const methods = {
            chunk: function(size) {
              const chunks = [];
              for (let i = 0; i < arrayData.length; i += size) {
                chunks.push(arrayData.slice(i, i + size));
              }
              return globalThis.createSmartDollar3(chunks);
            }
          };
          
          return new Proxy(arrayData, {
            get(target, prop) {
              if (prop in methods) {
                return methods[prop];
              }
              return target[prop];
            }
          });
        }
        return data;
      }
      
      const arr3 = globalThis.createSmartDollar3([1, 2, 3, 4, 5]);
      const result = arr3.chunk(2);
      result; // Try to return it
    `);
    console.log('Test 3 passed: Using proxy');
  } catch (error) {
    console.error('Test 3 failed:', error.message);
  }

  isolate.dispose();
}

test().catch(console.error);