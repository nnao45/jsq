// 簡略化したテストでチェーン問題を調査
const { ExpressionEvaluator } = require('./dist/core/evaluator.js');

async function test() {
  const evaluator = new ExpressionEvaluator({});
  
  const data = [
    { category: 'A', value: 10 },
    { category: 'A', value: 15 }
  ];
  
  try {
    // Step 1: entries()まで
    console.log('Test 1: entries()');
    const test1 = await evaluator.evaluate(`
      const grouped = {'A': [{value: 10}, {value: 15}]};
      Object.entries(grouped)
    `, {});
    console.log('Result 1:', test1);
    
    // Step 2: createSmartDollar + entries()
    console.log('\nTest 2: $ with entries()');
    const test2 = await evaluator.evaluate(`
      const obj = {'A': [1, 2], 'B': [3]};
      const smart = globalThis.createSmartDollar ? globalThis.createSmartDollar(obj) : obj;
      smart.entries ? smart.entries() : Object.entries(smart)
    `, {});
    console.log('Result 2:', test2);
    
    // Step 3: entries().map()
    console.log('\nTest 3: entries().map()');
    const test3 = await evaluator.evaluate(`
      const obj = {'A': [1, 2], 'B': [3]};
      const entries = Object.entries(obj);
      const smartEntries = globalThis.createSmartDollar ? globalThis.createSmartDollar(entries) : entries;
      const mapped = smartEntries.map(([k, v]) => ({key: k, count: v.length}));
      ({ 
        entriesType: typeof smartEntries,
        hasMap: typeof smartEntries.map,
        mappedType: typeof mapped,
        hasOrderBy: typeof mapped.orderBy,
        result: mapped
      })
    `, {});
    console.log('Result 3:', test3);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test().catch(console.error);