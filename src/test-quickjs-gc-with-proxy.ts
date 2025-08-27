import { newQuickJSWASMModule, RELEASE_SYNC } from 'quickjs-emscripten';

async function test() {
  console.log('Starting QuickJS GC test with Proxy...');
  
  const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
  const runtime = quickjs.newRuntime();
  const vm = runtime.newContext();
  
  try {
    // Proxyを使ったコード
    const result = vm.evalCode(`
      const obj = { name: 'Alice' };
      const proxy = new Proxy(obj, {
        get(target, prop) {
          return target[prop];
        }
      });
      proxy.name;
    `);
    
    if ('value' in result) {
      console.log('Result:', vm.dump(result.value));
      result.value.dispose();
    }
    
  } finally {
    console.log('Disposing VM context...');
    vm.dispose();
    console.log('Disposing runtime...');
    runtime.dispose();
    console.log('Done!');
  }
}

test().catch(console.error);