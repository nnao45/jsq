import { QuickJSEngine } from './core/vm/engines/quickjs/QuickJSEngine';

async function testFirstCode() {
  console.log('=== Testing First Code Execution ===');
  
  try {
    const config = { memoryLimit: 128 * 1024 * 1024 };
    const engine = new QuickJSEngine();
    await engine.initialize(config);
    console.log('Engine initialized');
    
    const context = await engine.createContext();
    console.log('Context created');
    
    // Check what happens with the very first code execution
    console.log('\n--- First execution ---');
    const testCode = '"hello"';  // Simple string literal
    console.log('About to eval:', testCode);
    
    try {
      const result = await context.eval(testCode);
      console.log('Result:', result);
    } catch (e) {
      console.error('Error:', e);
      console.error('Error message:', e.message);
    }
    
    // Clean up
    context.release();
    await engine.dispose();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testFirstCode().catch(console.error);