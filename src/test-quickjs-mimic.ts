import { 
  newQuickJSWASMModule,
  RELEASE_SYNC,
  QuickJSContext
} from 'quickjs-emscripten';
import { QuickJSEngine } from './core/vm/engines/quickjs/QuickJSEngine';

async function testMimic() {
  console.log('=== Testing QuickJS Engine Mimic ===');
  
  try {
    // Initialize engine like our implementation does
    const config = { memoryLimit: 128 * 1024 * 1024 };
    const engine = new QuickJSEngine();
    await engine.initialize(config);
    console.log('Engine initialized');
    
    // Create context
    const context = await engine.createContext();
    console.log('Context created');
    
    // Test simple eval
    console.log('\n--- Testing eval ---');
    try {
      const result = await context.eval('42');
      console.log('Eval result:', result);
    } catch (e) {
      console.error('Eval error:', e);
    }
    
    // Now test direct QuickJS for comparison
    console.log('\n--- Testing Direct QuickJS ---');
    const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
    const runtime = quickjs.newRuntime();
    runtime.setMemoryLimit(config.memoryLimit);
    runtime.setMaxStackSize(config.memoryLimit / 4);
    const directContext = runtime.newContext();
    
    const result = directContext.evalCode('42');
    if ('value' in result) {
      console.log('Direct result:', directContext.dump(result.value));
      result.value.dispose();
    }
    
    // Clean up
    directContext.dispose();
    runtime.dispose();
    context.release();
    await engine.dispose();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testMimic().catch(console.error);