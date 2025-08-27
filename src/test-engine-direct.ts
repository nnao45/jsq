import { QuickJSEngine } from './core/vm/engines/quickjs/QuickJSEngine';
import type { VMSandboxConfig } from './types/sandbox';

async function testEngineDirect() {
  console.log('Testing QuickJSEngine directly...\n');
  
  const config: VMSandboxConfig = {
    memoryLimit: 64 * 1024 * 1024,
    timeout: 5000,
    enableAsync: false,
    enableGenerators: false,
    enableProxies: false,
    enableSymbols: false,
    maxContextSize: 10 * 1024 * 1024,
    recycleIsolates: false,
    isolatePoolSize: 1,
  };
  
  const engine = new QuickJSEngine();
  
  try {
    await engine.initialize(config);
    const context = await engine.createContext();
    
    // eval()を直接呼んでみる
    console.log('Testing direct eval:');
    try {
      const directResult = await (context as any).vm.evalCode('7 + 3');
      console.log('Direct evalCode result:', directResult);
      if ('value' in directResult) {
        console.log('Value:', (context as any).vm.dump(directResult.value));
        directResult.value.dispose();
      }
    } catch (e) {
      console.error('Direct eval error:', e);
    }
    
    context.release();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await engine.dispose();
  }
  
  console.log('\n✨ Direct test completed!');
}

testEngineDirect().catch(console.error);