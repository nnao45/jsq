import { VMSandboxQuickJS } from './core/vm/vm-sandbox-quickjs';

async function testQuickJSSimpleDebug() {
  console.log('=== Starting QuickJS Simple Debug Test ===');
  
  const sandbox = new VMSandboxQuickJS({
    memoryLimit: 128,
    timeout: 30000,
  });

  try {
    // Test 1: Very simple expression
    console.log('\n--- Test 1: Very simple expression ---');
    const wrappedCode = `(function() { 
      console.log('[QuickJS] Executing code...'); 
      const result = 1 + 2; 
      console.log('[QuickJS] Code result:', result); 
      return result; 
    })()`;
    
    console.log('About to execute wrapped code:', wrappedCode);
    
    // Execute directly without setting console
    const engine = await (sandbox as any).getEngine();
    const execContext = await engine.createContext();
    
    console.log('Context created, evaluating code...');
    const result = await execContext.eval(wrappedCode);
    console.log('Evaluation result:', result);
    console.log('Result type:', typeof result);
    
    execContext.release();

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await sandbox.dispose();
  }
}

// Run the test
testQuickJSSimpleDebug().catch(console.error);