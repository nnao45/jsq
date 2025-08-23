const { ExpressionEvaluator } = require('./dist/core/evaluator.js');

async function test() {
  const evaluator = new ExpressionEvaluator({});
  
  const data = [
    { category: 'A', value: 10, active: true },
    { category: 'B', value: 20, active: false },
    { category: 'A', value: 15, active: true },
  ];
  
  try {
    // Test step by step
    console.log('Testing $.filter...');
    const step1 = await evaluator.evaluate('$.filter(item => item.active)', data);
    console.log('Step 1 result:', step1);
    
    console.log('\nTesting $.filter().groupBy...');
    const step2 = await evaluator.evaluate('$.filter(item => item.active).groupBy(item => item.category)', data);
    console.log('Step 2 result:', step2);
    
    console.log('\nTesting $.filter().groupBy().entries()...');
    const step3 = await evaluator.evaluate('$.filter(item => item.active).groupBy(item => item.category).entries()', data);
    console.log('Step 3 result:', step3);
    
    console.log('\nTesting entries().map()...');
    const step4 = await evaluator.evaluate(`
      $.filter(item => item.active)
        .groupBy(item => item.category)
        .entries()
        .map(([category, items]) => ({
          category,
          count: items.length
        }))
    `, data);
    console.log('Step 4 result:', step4);
    
    console.log('\nTesting full chain...');
    const result = await evaluator.evaluate(`
      $.filter(item => item.active)
        .groupBy(item => item.category)
        .entries()
        .map(([category, items]) => ({
          category,
          totalValue: items.reduce((sum, item) => sum + item.value, 0),
          count: items.length
        }))
        .orderBy(['totalValue'], ['desc'])
    `, data);
    console.log('Final result:', result);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();