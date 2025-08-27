import { 
  newQuickJSWASMModule,
  RELEASE_SYNC
} from 'quickjs-emscripten';

async function testMemoryLimits() {
  console.log('=== Testing Different Memory Limits ===');
  
  const limits = [
    { mb: 1, bytes: 1 * 1024 * 1024 },
    { mb: 8, bytes: 8 * 1024 * 1024 },
    { mb: 16, bytes: 16 * 1024 * 1024 },
    { mb: 32, bytes: 32 * 1024 * 1024 },
    { mb: 64, bytes: 64 * 1024 * 1024 },
    { mb: 96, bytes: 96 * 1024 * 1024 },
    { mb: 128, bytes: 128 * 1024 * 1024 },
    { mb: 256, bytes: 256 * 1024 * 1024 },
  ];
  
  for (const limit of limits) {
    console.log(`\n--- Testing ${limit.mb}MB (${limit.bytes} bytes) ---`);
    
    try {
      const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
      const runtime = quickjs.newRuntime();
      
      console.log(`Setting memory limit to ${limit.bytes}`);
      runtime.setMemoryLimit(limit.bytes);
      runtime.setMaxStackSize(limit.bytes / 4);
      
      const context = runtime.newContext();
      
      const result = context.evalCode('"hello"');
      if ('value' in result) {
        console.log('✓ Success! Value:', context.dump(result.value));
        result.value.dispose();
      } else if ('error' in result) {
        console.log('✗ Error:', context.dump(result.error));
        result.error.dispose();
      }
      
      context.dispose();
      runtime.dispose();
    } catch (error) {
      console.log('✗ Exception:', error.message);
    }
  }
  
  // Also test what happens if we don't set stack size
  console.log('\n--- Testing 128MB without setting stack size ---');
  try {
    const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
    const runtime = quickjs.newRuntime();
    
    runtime.setMemoryLimit(128 * 1024 * 1024);
    // DON'T set stack size
    
    const context = runtime.newContext();
    
    const result = context.evalCode('"hello"');
    if ('value' in result) {
      console.log('✓ Success! Value:', context.dump(result.value));
      result.value.dispose();
    } else if ('error' in result) {
      console.log('✗ Error:', context.dump(result.error));
      result.error.dispose();
    }
    
    context.dispose();
    runtime.dispose();
  } catch (error) {
    console.log('✗ Exception:', error.message);
  }
}

// Run the test
testMemoryLimits().catch(console.error);