import { getQuickJS } from 'quickjs-emscripten';

async function debugTest() {
  console.log('Debug QuickJS issue...\n');
  
  const QuickJS = await getQuickJS();
  const runtime = QuickJS.newRuntime();
  
  // メモリ制限を設定
  runtime.setMemoryLimit(64 * 1024 * 1024);
  
  // 複数のコンテキストを作成してテスト
  console.log('Test 1: First context');
  const ctx1 = runtime.newContext();
  const result1 = ctx1.evalCode('1 + 1');
  console.log('Result:', 'value' in result1 ? ctx1.dump(result1.value) : 'error');
  if ('value' in result1) result1.value.dispose();
  ctx1.dispose();
  
  console.log('\nTest 2: Second context');
  const ctx2 = runtime.newContext();
  const result2 = ctx2.evalCode('2 + 2');
  console.log('Result:', 'value' in result2 ? ctx2.dump(result2.value) : 'error');
  if ('value' in result2) result2.value.dispose();
  
  // このコンテキストは破棄せずに再利用
  console.log('\nTest 3: Reuse context');
  const result3 = ctx2.evalCode('3 + 3');
  console.log('Result:', 'value' in result3 ? ctx2.dump(result3.value) : 'error');
  if ('value' in result3) result3.value.dispose();
  
  ctx2.dispose();
  runtime.dispose();
  
  console.log('\n✨ Debug completed!');
}

debugTest().catch(console.error);