import { VMSandboxQuickJS } from './core/vm/vm-sandbox-quickjs';

async function testQuickJSWithLogging() {
  console.log('=== Starting QuickJS Test with Logging ===');
  
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

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await sandbox.dispose();
  }
}

// Run the test
testQuickJSWithLogging().catch(console.error);