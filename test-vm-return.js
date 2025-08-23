// Test returning values from VM
const ivm = require('isolated-vm');

async function test() {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = await isolate.createContext();
  const jail = context.global;
  
  await jail.set('$ivm', ivm);

  // Test returning array with methods
  try {
    const script = await isolate.compileScript(`
      (function() {
        function createSmartDollar(data) {
          if (Array.isArray(data)) {
            const arr = [...data];
            arr.filter = function(...args) {
              const filtered = Array.prototype.filter.apply(this, args);
              return createSmartDollar(filtered);
            };
            return arr;
          }
          return data;
        }
        
        const result = createSmartDollar([1, 2, 3, 4, 5]);
        // Try to return the array with methods
        return new $ivm.ExternalCopy(result).copyInto();
      })()
    `);
    
    const result = await script.run(context);
    console.log('Test 1 passed: Returned array with methods:', result);
  } catch (error) {
    console.error('Test 1 failed:', error.message);
  }

  // Test returning array after stripping methods
  try {
    const script = await isolate.compileScript(`
      (function() {
        function createSmartDollar(data) {
          if (Array.isArray(data)) {
            const arr = [...data];
            arr.filter = function(...args) {
              const filtered = Array.prototype.filter.apply(this, args);
              return createSmartDollar(filtered);
            };
            return arr;
          }
          return data;
        }
        
        const result = createSmartDollar([1, 2, 3, 4, 5]);
        // Strip methods before returning
        return new $ivm.ExternalCopy([...result]).copyInto();
      })()
    `);
    
    const result = await script.run(context);
    console.log('Test 2 passed: Returned stripped array:', result);
  } catch (error) {
    console.error('Test 2 failed:', error.message);
  }

  isolate.dispose();
}

test().catch(console.error);