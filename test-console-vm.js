const { createApplicationContext } = require('./dist/core/application-context');
const { VMSandboxQuickJS } = require('./dist/core/vm/vm-sandbox-quickjs');

async function testConsoleInVM() {
  console.log('=== Testing console.log in VMSandboxQuickJS ===');
  
  const appContext = createApplicationContext();
  const sandbox = new VMSandboxQuickJS(appContext);
  
  try {
    // Test 1: Simple console.log
    console.log('\nTest 1: Simple console.log');
    const result1 = await sandbox.execute('console.log("Hello from VM!")', {});
    console.log('Result:', result1);
    
    // Test 2: Check if console object exists
    console.log('\nTest 2: Check console object');
    const result2 = await sandbox.execute('typeof console', {});
    console.log('typeof console:', result2.value);
    
    // Test 3: Check console.log
    console.log('\nTest 3: Check console.log function');
    const result3 = await sandbox.execute('typeof console.log', {});
    console.log('typeof console.log:', result3.value);
    
    // Test 4: Try to use console.log with return value
    console.log('\nTest 4: console.log with expression');
    const result4 = await sandbox.execute('console.log("test"); 42', {});
    console.log('Result:', result4.value);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sandbox.dispose();
    await appContext.dispose();
  }
}

testConsoleInVM().catch(console.error);