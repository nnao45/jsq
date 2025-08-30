#!/usr/bin/env node

// Minimal test case for QuickJS GC issue
async function runMinimalTest() {
  const { VMSandboxQuickJS } = await import('./dist/index.js');
  
  console.log('Test 1: Simple string evaluation');
  try {
    const vm = new VMSandboxQuickJS();
    const result = await vm.execute('"hello"', {});
    console.log('Result:', result.value);
    await vm.dispose();
    console.log('✅ Test 1 passed\n');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  console.log('Test 2: Simple object');
  try {
    const vm = new VMSandboxQuickJS();
    const result = await vm.execute('({a: 1})', {});
    console.log('Result:', result.value);
    await vm.dispose();
    console.log('✅ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  console.log('Test 3: With $ context');
  try {
    const vm = new VMSandboxQuickJS();
    const result = await vm.execute('$', { $: { test: 'value' } });
    console.log('Result:', result.value);
    await vm.dispose();
    console.log('✅ Test 3 passed\n');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
  }
  
  console.log('Test 4: Array with map');
  try {
    const vm = new VMSandboxQuickJS();
    const result = await vm.execute('[1,2,3].map(x => x * 2)', {});
    console.log('Result:', result.value);
    await vm.dispose();
    console.log('✅ Test 4 passed\n');
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message);
  }
}

runMinimalTest().catch(console.error);