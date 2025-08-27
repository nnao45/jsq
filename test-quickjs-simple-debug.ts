import { VMSandboxQuickJS } from './src/core/vm/vm-sandbox-quickjs';

async function testBasicCase() {
  console.log('=== Testing Basic QuickJS Case ===');
  
  const sandbox = new VMSandboxQuickJS();
  
  try {
    // Test 1: Simple expression
    console.log('\n1. Testing simple expression: "1 + 2"');
    const result1 = await sandbox.execute('1 + 2', {});
    console.log('Result:', result1.value);
    
    // Test 2: With context
    console.log('\n2. Testing with context: "$.a + $.b"');
    const data = { a: 10, b: 20 };
    const result2 = await sandbox.execute('$.a + $.b', { $: data });
    console.log('Result:', result2.value);
    
    // Test 3: Semicolon expression
    console.log('\n3. Testing semicolon: "$.a; $.b; $.c"');
    const data2 = { a: 1, b: 2, c: 3 };
    const result3 = await sandbox.execute('$.a; $.b; $.c', { $: data2 });
    console.log('Result:', result3.value);
    
  } catch (error) {
    console.error('Error:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await sandbox.dispose();
  }
}

testBasicCase().catch(console.error);