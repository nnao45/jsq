const ivm = require('isolated-vm');

// Test function that mirrors what createSmartDollar creates
function createTestFunction(data) {
  return function(...args) {
    if (args.length === 0) {
      return data;
    }
    return createSmartDollar(args[0]);
  };
}

async function testCloning() {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = await isolate.createContext();
  const jail = context.global;

  try {
    // Test 1: Simple value
    console.log('Test 1: Simple value');
    await jail.set('simpleValue', 42);
    console.log('✓ Simple value works');

    // Test 2: Function with closure
    console.log('\nTest 2: Function with closure');
    const func = createTestFunction(null);
    try {
      await jail.set('funcWithClosure', func);
      console.log('✓ Function with closure works');
    } catch (err) {
      console.log('✗ Function with closure failed:', err.message);
    }

    // Test 3: Reference to function
    console.log('\nTest 3: Reference to function');
    try {
      await jail.set('funcRef', new ivm.Reference(func));
      console.log('✓ Function reference works');
    } catch (err) {
      console.log('✗ Function reference failed:', err.message);
    }

    // Test 4: ExternalCopy of function (should fail)
    console.log('\nTest 4: ExternalCopy of function');
    try {
      await jail.set('funcCopy', new ivm.ExternalCopy(func));
      console.log('✓ Function ExternalCopy works');
    } catch (err) {
      console.log('✗ Function ExternalCopy failed:', err.message);
    }

  } finally {
    context.release();
    isolate.dispose();
  }
}

testCloning().catch(console.error);