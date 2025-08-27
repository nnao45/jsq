import { 
  newQuickJSWASMModule,
  RELEASE_SYNC
} from 'quickjs-emscripten';

async function testStackSizes() {
  console.log('=== Testing Different Stack Sizes ===');
  
  // Test different stack size configurations
  const configs = [
    { name: 'No stack size set', stackSize: null },
    { name: '256KB', stackSize: 256 * 1024 },
    { name: '512KB', stackSize: 512 * 1024 },
    { name: '1MB', stackSize: 1024 * 1024 },
    { name: '2MB', stackSize: 2 * 1024 * 1024 },
    { name: '4MB', stackSize: 4 * 1024 * 1024 },
    { name: '8MB', stackSize: 8 * 1024 * 1024 },
    { name: '16MB', stackSize: 16 * 1024 * 1024 },
    { name: '32MB (memoryLimit/4)', stackSize: 32 * 1024 * 1024 },
  ];
  
  const memoryLimit = 128 * 1024 * 1024; // 128MB
  
  for (const config of configs) {
    console.log(`\n--- Testing ${config.name} ---`);
    
    try {
      const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
      const runtime = quickjs.newRuntime();
      
      // Always set memory limit
      runtime.setMemoryLimit(memoryLimit);
      
      // Set stack size if specified
      if (config.stackSize !== null) {
        console.log(`Setting stack size to ${config.stackSize} bytes`);
        runtime.setMaxStackSize(config.stackSize);
      }
      
      const context = runtime.newContext();
      
      // Test simple evaluation
      const result = context.evalCode('"hello"');
      
      if ('value' in result) {
        console.log('✓ Success! Value:', context.dump(result.value));
        result.value.dispose();
      } else if ('error' in result) {
        const errorDump = context.dump(result.error);
        console.log('✗ Error:', errorDump || '(empty error message)');
        result.error.dispose();
      }
      
      // Clean up
      context.dispose();
      runtime.dispose();
      
    } catch (error) {
      console.log('✗ Exception:', error.message);
    }
  }
  
  // Also test the exact configuration from QuickJSEngine.ts
  console.log('\n--- Testing QuickJSEngine.ts configuration ---');
  console.log('Memory limit:', memoryLimit);
  console.log('Stack size:', 1024 * 1024, '(fixed 1MB)');
  
  try {
    const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
    const runtime = quickjs.newRuntime();
    
    runtime.setMemoryLimit(memoryLimit);
    runtime.setMaxStackSize(1024 * 1024); // Fixed 1MB as in the current code
    
    const context = runtime.newContext();
    
    const result = context.evalCode('"hello"');
    
    if ('value' in result) {
      console.log('✓ Success! Value:', context.dump(result.value));
      result.value.dispose();
    } else if ('error' in result) {
      const errorDump = context.dump(result.error);
      console.log('✗ Error:', errorDump || '(empty error message)');
      result.error.dispose();
    }
    
    context.dispose();
    runtime.dispose();
    
  } catch (error) {
    console.log('✗ Exception:', error.message);
  }
}

// Run the test
testStackSizes().catch(console.error);