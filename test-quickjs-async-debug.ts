import { getQuickJS } from 'quickjs-emscripten';

async function testQuickJSAsync() {
  console.log('Testing QuickJS async behavior...');
  
  const quickjs = await getQuickJS();
  const runtime = quickjs.newRuntime();
  runtime.setMemoryLimit(128 * 1024 * 1024);
  runtime.setMaxStackSize(1024 * 1024);
  
  const context = runtime.newContext();
  
  try {
    console.log('QuickJS runtime and context created');
    
    // Test 1: Simple async evaluation
    console.log('\n--- Test 1: Simple async function ---');
    try {
      const result1 = context.evalCode(`
        (async () => {
          return 42;
        })()
      `);
      if ('error' in result1) {
        const errorMsg = context.dump(result1.error);
        result1.error.dispose();
        console.error('Test 1 failed:', errorMsg);
      } else {
        const value = context.dump(result1.value);
        result1.value.dispose();
        console.log('Result 1:', value);
      }
    } catch (error) {
      console.error('Test 1 failed:', error);
    }
    
    // Test 2: Async with Promise.all
    console.log('\n--- Test 2: Promise.all ---');
    try {
      const result2 = context.evalCode(`
        (async () => {
          const promises = [1, 2, 3].map(x => Promise.resolve(x * 2));
          return await Promise.all(promises);
        })()
      `);
      if ('error' in result2) {
        const errorMsg = context.dump(result2.error);
        result2.error.dispose();
        console.error('Test 2 failed:', errorMsg);
      } else {
        const value = context.dump(result2.value);
        result2.value.dispose();
        console.log('Result 2:', value);
      }
    } catch (error) {
      console.error('Test 2 failed:', error);
    }
    
    // Test 3: SmartDollar-like mapAsync
    console.log('\n--- Test 3: SmartDollar mapAsync simulation ---');
    try {
      // Set up a mock SmartDollar with mapAsync
      const dataHandle = context.newString(JSON.stringify([1, 2, 3]));
      const parseResult = context.evalCode(`JSON.parse('${JSON.stringify([1, 2, 3])}')`);
      if ('value' in parseResult) {
        context.setProp(context.global, 'mockData', parseResult.value);
        parseResult.value.dispose();
      }
      dataHandle.dispose();
      
      const setupCode = `
        class SmartDollar {
          constructor(value) {
            this._value = value;
          }
          
          async mapAsync(fn) {
            const arr = Array.isArray(this._value) ? this._value : [this._value];
            const promises = arr.map((item, index) => fn(item, index, arr));
            const results = await Promise.all(promises);
            return new SmartDollar(results);
          }
        }
        
        const $ = new SmartDollar(mockData);
      `;
      
      const setupResult = context.evalCode(setupCode);
      if ('error' in setupResult) {
        const errorMsg = context.dump(setupResult.error);
        setupResult.error.dispose();
        console.error('SmartDollar setup failed:', errorMsg);
      } else {
        setupResult.value.dispose();
        console.log('SmartDollar setup complete');
      }
      
      const result3 = context.evalCode(`
        (async () => {
          const result = await $.mapAsync(async (x) => x * 2);
          return result._value;
        })()
      `);
      if ('error' in result3) {
        const errorMsg = context.dump(result3.error);
        result3.error.dispose();
        console.error('Test 3 failed:', errorMsg);
      } else {
        const value = context.dump(result3.value);
        result3.value.dispose();
        console.log('Result 3:', value);
      }
    } catch (error) {
      console.error('Test 3 failed:', error);
    }
    
    // Test 4: Test with context release
    console.log('\n--- Test 4: Context release and reuse ---');
    context.dispose();
    console.log('Context disposed');
    
    // Create new context
    const context2 = runtime.newContext();
    console.log('New context created');
    
    try {
      const result4 = context2.evalCode(`
        (async () => {
          return "New context works!";
        })()
      `);
      if ('error' in result4) {
        const errorMsg = context2.dump(result4.error);
        result4.error.dispose();
        console.error('Test 4 failed:', errorMsg);
      } else {
        const value = context2.dump(result4.value);
        result4.value.dispose();
        console.log('Result 4:', value);
      }
    } catch (error) {
      console.error('Test 4 failed:', error);
    }
    
    context2.dispose();
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    runtime.dispose();
    console.log('\nRuntime disposed');
  }
}

// Run the test
testQuickJSAsync().catch(console.error);