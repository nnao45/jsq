import { VMSandboxQuickJS } from './core/vm/vm-sandbox-quickjs';

async function testQuickJSUltraSimple() {
  console.log('=== Starting QuickJS Ultra Simple Test ===');
  
  const sandbox = new VMSandboxQuickJS({
    memoryLimit: 128,
    timeout: 30000,
  });

  try {
    // Test 1: Ultra simple expression without any console
    console.log('\n--- Test 1: Ultra simple expression ---');
    const simpleCode = `(function() { return 1 + 2; })()`;
    
    console.log('About to execute code:', simpleCode);
    
    // Execute directly without setting console
    const engine = await (sandbox as any).getEngine();
    const execContext = await engine.createContext();
    
    console.log('Context created, evaluating code...');
    const evalResult = await execContext.eval(simpleCode);
    console.log('Raw eval result:', evalResult);
    console.log('Raw eval result type:', typeof evalResult);
    
    // Let's also test the dump functionality
    const vm = (execContext as any).vm;
    console.log('VM exists:', !!vm);
    
    // Test simple values
    const testCode = `42`;
    const testResult = vm.evalCode(testCode);
    console.log('Test evalCode result:', testResult);
    
    if ('value' in testResult) {
      console.log('Has value property');
      console.log('Value handle:', testResult.value);
      const dumpedValue = vm.dump(testResult.value);
      console.log('Dumped value:', dumpedValue);
      console.log('Dumped value type:', typeof dumpedValue);
      testResult.value.dispose();
    }
    
    execContext.release();

  } catch (error) {
    console.error('Error during test:', error);
    console.error('Error stack:', (error as Error).stack);
  } finally {
    await sandbox.dispose();
  }
}

// Run the test
testQuickJSUltraSimple().catch(console.error);