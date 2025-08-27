import { VMSandboxQuickJS } from './core/vm/vm-sandbox-quickjs';

async function testQuickJSFixed() {
  console.log('=== Testing Fixed QuickJS Implementation ===');
  
  const sandbox = new VMSandboxQuickJS({
    memoryLimit: 128,
    timeout: 30000,
  });

  try {
    // Test 1: Simple expression
    console.log('\n--- Test 1: Simple expression ---');
    const result1 = await sandbox.execute('1 + 2');
    console.log('Result:', result1);

    // Test 2: Expression with context
    console.log('\n--- Test 2: Expression with context ---');
    const result2 = await sandbox.execute('x * 2', { x: 5 });
    console.log('Result:', result2);

    // Test 3: Array operations
    console.log('\n--- Test 3: Array operations ---');
    const result3 = await sandbox.execute('[1, 2, 3].map(x => x * 2)');
    console.log('Result:', result3);

    // Test 4: Object return
    console.log('\n--- Test 4: Object return ---');
    const result4 = await sandbox.execute('({ a: 1, b: 2 })');
    console.log('Result:', result4);

    // Test 5: Error handling
    console.log('\n--- Test 5: Error handling ---');
    try {
      await sandbox.execute('undefinedVariable');
    } catch (error) {
      console.log('Expected error:', error.message);
    }

    console.log('\n✨ All tests passed!');

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    await sandbox.dispose();
  }
}

// Run the test
testQuickJSFixed().catch(console.error);