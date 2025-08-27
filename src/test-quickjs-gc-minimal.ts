import { newQuickJSWASMModule, RELEASE_SYNC } from 'quickjs-emscripten';

async function test() {
  console.log('Starting minimal QuickJS GC test...');
  
  const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
  const runtime = quickjs.newRuntime();
  const vm = runtime.newContext();
  
  try {
    // 単純な評価
    const result = vm.evalCode('1 + 1');
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