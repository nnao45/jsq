import { VMSandboxQuickJS } from './src/core/vm/vm-sandbox-quickjs';

async function testSmartDollarAsync() {
  console.log('Testing SmartDollar async in QuickJS...');
  
  const sandbox = new VMSandboxQuickJS({
    memoryLimit: 128,
    enableAsync: true
  });
  
  try {
    // Test 1: Simple async execution
    console.log('\n--- Test 1: Simple async ---');
    const result1 = await sandbox.execute(`
      (async () => {
        return 42;
      })()
    `);
    console.log('Result 1:', result1.value);
    
    // Test 2: Promise.all
    console.log('\n--- Test 2: Promise.all ---');
    const result2 = await sandbox.execute(`
      (async () => {
        const promises = [1, 2, 3].map(x => Promise.resolve(x * 2));
        return await Promise.all(promises);
      })()
    `);
    console.log('Result 2:', result2.value);
    
    // Test 3: SmartDollar mapAsync
    console.log('\n--- Test 3: SmartDollar mapAsync ---');
    const data = [1, 2, 3];
    const result3 = await sandbox.execute(
      `await $.mapAsync(async (x) => { return x * 2; })`,
      { $: data }
    );
    console.log('Result 3:', result3.value);
    
    // Test 4: Direct SmartDollar test
    console.log('\n--- Test 4: Direct SmartDollar test ---');
    const result4 = await sandbox.execute(`
      const result = await $.mapAsync(async (x) => x * 10);
      console.log('Inside VM - result:', result);
      console.log('Inside VM - result._value:', result._value);
      result._value || result.value || result
    `, { $: [1, 2, 3] });
    console.log('Result 4:', result4.value);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sandbox.dispose();
    console.log('\nDisposed');
  }
}

testSmartDollarAsync().catch(console.error);