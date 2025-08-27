import { ExpressionEvaluator } from './core/lib/evaluator.js';

async function testQuickJSVM() {
  console.log('Testing QuickJS VM Engine...');
  console.log('JSQ_VM_ENGINE:', process.env.JSQ_VM_ENGINE);
  
  const evaluator = new ExpressionEvaluator({ 
    verbose: true,
    unsafe: false // Force VM mode
  });
  
  const testCases = [
    {
      name: 'Simple expression',
      expression: '1 + 1',
      data: null,
    },
    {
      name: 'Array filter',
      expression: '$.filter(x => x > 3)',
      data: [1, 2, 3, 4, 5],
    },
    {
      name: 'Array map',
      expression: '$.map(x => x * 2)',
      data: [1, 2, 3, 4, 5],
    },
    {
      name: 'Method chain',
      expression: '$.filter(x => x > 2).map(x => x * 2)',
      data: [1, 2, 3, 4, 5],
    },
    {
      name: 'Object manipulation',
      expression: '$.map(x => x.name)',
      data: [{ name: 'Alice' }, { name: 'Bob' }],
    },
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n--- ${testCase.name} ---`);
      console.log('Expression:', testCase.expression);
      console.log('Data:', testCase.data);
      
      const result = await evaluator.evaluate(testCase.expression, testCase.data);
      console.log('Result:', result);
    } catch (error) {
      console.error('ERROR:', error);
    }
  }
  
  await evaluator.dispose();
}

testQuickJSVM().catch(console.error);