const { newQuickJSWASMModuleFromVariant, RELEASE_SYNC } = require('quickjs-emscripten');

async function main() {
  const QuickJS = await newQuickJSWASMModuleFromVariant(RELEASE_SYNC);

  // QuickJSのVMを作成
  const vm = QuickJS.newContext();

  // globalThisに定義されているすべての関数を取得
  vm.evalCode(`
  console.log("===== All properties on globalThis =====");
  const allProps = Object.getOwnPropertyNames(globalThis);
  console.log("Total properties:", allProps.length);
  allProps.forEach(prop => {
    const type = typeof globalThis[prop];
    if (type === 'function' || type === 'object') {
      console.log(\`- \${prop}: \${type}\`);
    }
  });
  
  console.log("\\n===== Only functions on globalThis =====");
  const funcs = Object.getOwnPropertyNames(globalThis)
    .filter(n => typeof globalThis[n] === 'function');
  console.log("Total functions:", funcs.length);
  funcs.forEach(func => {
    console.log(\`- \${func}\`);
  });
  
  console.log("\\n===== applicationContext check =====");
  console.log("applicationContext exists?", typeof globalThis.applicationContext !== 'undefined');
  console.log("applicationContext type:", typeof globalThis.applicationContext);
  `);

  // クリーンアップ
  vm.dispose();
}

main().catch(console.error);