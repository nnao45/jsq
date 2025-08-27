import { VMSandboxQuickJS } from './core/vm/vm-sandbox-quickjs';

async function testQuickJSDebug() {
  console.log('=== Starting QuickJS Debug Test ===');
  
  const sandbox = new VMSandboxQuickJS({
    memoryLimit: 128,
    timeout: 30000,
  });

  try {
    // Test 1: Simple expression
    console.log('\n--- Test 1: Simple expression ---');
    const result1 = await sandbox.execute('1 + 2');
    console.log('Test 1 result:', result1);

    // Test 2: Expression with context
    console.log('\n--- Test 2: Expression with context ---');
    const result2 = await sandbox.execute('x * 2', { x: 5 });
    console.log('Test 2 result:', result2);

    // Test 3: Array return
    console.log('\n--- Test 3: Array return ---');
    const result3 = await sandbox.execute('[1, 2, 3]');
    console.log('Test 3 result:', result3);

    // Test 4: Object return
    console.log('\n--- Test 4: Object return ---');
    const result4 = await sandbox.execute('({ a: 1, b: 2 })');
    console.log('Test 4 result:', result4);

    // Test 5: Function call
    console.log('\n--- Test 5: Function call ---');
    const result5 = await sandbox.execute('Math.max(1, 2, 3)');
    console.log('Test 5 result:', result5);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await sandbox.dispose();
  }
}

// Run the test
testQuickJSDebug().catch(console.error);