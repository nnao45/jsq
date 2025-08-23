// mapの結果がちゃんとプロキシになってるかチェック！
const vm = require('vm');
const fs = require('fs');

// VMコンテキスト作って、createSmartDollarを定義
const context = vm.createContext({ globalThis: global });
const createSmartDollarCode = fs.readFileSync('./src/core/vm-create-smart-dollar.js', 'utf8');
vm.runInContext(createSmartDollarCode, context);

// テストデータ作るよ〜
const testData = [
  { category: 'A', items: [{value: 10}, {value: 20}] },
  { category: 'B', items: [{value: 30}] }
];

console.log('Step 1: createSmartDollar作成');
const createSmartDollar = context.globalThis.createSmartDollar;
const smartData = createSmartDollar(testData);
console.log('smartData type:', typeof smartData);
console.log('smartData.map exists?', typeof smartData.map);

console.log('\nStep 2: map実行');
const mapped = smartData.map(item => ({ cat: item.category, total: item.items.length }));
console.log('mapped type:', typeof mapped);
console.log('mapped is array?', Array.isArray(mapped));
console.log('mapped.orderBy exists?', typeof mapped.orderBy);

console.log('\nStep 3: 実際のデータ確認');
console.log('mapped data:', mapped);

// orderByが使えるかテスト
try {
  console.log('\nStep 4: orderBy実行');
  if (typeof mapped.orderBy === 'function') {
    const sorted = mapped.orderBy(['total'], ['desc']);
    console.log('sorted:', sorted);
  } else {
    console.log('orderBy is not a function!');
    console.log('Available methods:', Object.getOwnPropertyNames(mapped).filter(p => typeof mapped[p] === 'function'));
  }
} catch (e) {
  console.error('Error:', e.message);
}