import { newQuickJSWASMModule, RELEASE_SYNC } from 'quickjs-emscripten';

async function test() {
  console.log('Starting QuickJS GC test with multiple evals...');
  
  const quickjs = await newQuickJSWASMModule(RELEASE_SYNC);
  const runtime = quickjs.newRuntime();
  const vm = runtime.newContext();
  
  try {
    // 複数のeval
    console.log('Setting up globals...');
    
    // グローバル設定
    let result = vm.evalCode('globalThis.console = {}');
    if ('error' in result) {
      console.error('Error:', result.error);
    } else {
      result.value.dispose();
    }
    
    result = vm.evalCode('globalThis.console.log = function() {}');
    if ('error' in result) {
      console.error('Error:', result.error);
    } else {
      result.value.dispose();
    }
    
    // データ設定
    const jsonHandle = vm.newString('{"name": "Alice"}');
    vm.setProp(vm.global, '_tempJson', jsonHandle);
    jsonHandle.dispose();
    
    result = vm.evalCode('globalThis.data = JSON.parse(globalThis._tempJson); delete globalThis._tempJson;');
    if ('error' in result) {
      console.error('Error:', result.error);
    } else {
      result.value.dispose();
    }
    
    // メインの評価
    console.log('Evaluating main code...');
    result = vm.evalCode('data.name');
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