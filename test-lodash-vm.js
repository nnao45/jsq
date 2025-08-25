const { ExpressionEvaluator } = require('./src/core/evaluator.ts');

async function test() {
  const evaluator = new ExpressionEvaluator({ vmEnabled: true, mode: 'normal' });
  
  try {
    // Test 1: Simple array
    console.log('Test 1: Simple array');
    const result1 = await evaluator.evaluate('[1,2,3]', {});
    console.log('Result 1:', result1);
    
    // Test 2: _ function with data
    console.log('\nTest 2: _ function with data');
    const result2 = await evaluator.evaluate('_(data)', [1,2,3]);
    console.log('Result 2:', result2);
    
    // Test 3: _ function with filter
    console.log('\nTest 3: _ function with filter');
    const result3 = await evaluator.evaluate('_(data).filter(x => x > 2).value()', [1,2,3,4,5]);
    console.log('Result 3:', result3);
    
    // Test 4: Static _.chunk
    console.log('\nTest 4: Static _.chunk');
    const result4 = await evaluator.evaluate('_.chunk(data, 2)', [1,2,3,4,5]);
    console.log('Result 4:', result4);
    
    // Test 5: Static _.filter
    console.log('\nTest 5: Static _.filter');
    const result5 = await evaluator.evaluate('_.filter(data, x => x > 3)', [1,2,3,4,5]);
    console.log('Result 5:', result5);
    
    // Test 6: Static _.map
    console.log('\nTest 6: Static _.map');
    const result6 = await evaluator.evaluate('_.map(data, x => x * 2)', [1,2,3]);
    console.log('Result 6:', result6);
    
    // Test 7: Static _.uniqBy
    console.log('\nTest 7: Static _.uniqBy');
    const result7 = await evaluator.evaluate('_.uniqBy(data, "id")', [{id: 1, name: 'a'}, {id: 1, name: 'b'}, {id: 2, name: 'c'}]);
    console.log('Result 7:', result7);
    
    // Test 8: Static _.sortBy
    console.log('\nTest 8: Static _.sortBy');
    const result8 = await evaluator.evaluate('_.sortBy(data, "age")', [{name: 'a', age: 30}, {name: 'b', age: 20}, {name: 'c', age: 25}]);
    console.log('Result 8:', result8);
    
    // Test 9: Static _.groupBy
    console.log('\nTest 9: Static _.groupBy');
    const result9 = await evaluator.evaluate('_.groupBy(data, "type")', [{name: 'a', type: 'fruit'}, {name: 'b', type: 'veggie'}, {name: 'c', type: 'fruit'}]);
    console.log('Result 9:', result9);
    
    // Test 10: Static _.sum
    console.log('\nTest 10: Static _.sum');
    const result10 = await evaluator.evaluate('_.sum(data)', [1,2,3,4,5]);
    console.log('Result 10:', result10);
    
    // Test 11: Chained operations
    console.log('\nTest 11: Chained operations');
    const result11 = await evaluator.evaluate('_(data).filter(x => x.age > 20).sortBy("age").map(x => x.name).value()', [{name: 'a', age: 30}, {name: 'b', age: 20}, {name: 'c', age: 25}]);
    console.log('Result 11:', result11);
    
    // Test 12: Static _.pick
    console.log('\nTest 12: Static _.pick');
    const result12 = await evaluator.evaluate('_.pick(data, ["name", "age"])', {name: 'John', age: 30, city: 'NYC', country: 'USA'});
    console.log('Result 12:', result12);
    
    // Test 13: Static _.omit
    console.log('\nTest 13: Static _.omit');
    const result13 = await evaluator.evaluate('_.omit(data, ["city", "country"])', {name: 'John', age: 30, city: 'NYC', country: 'USA'});
    console.log('Result 13:', result13);
    
    // Test 14: Static _.camelCase
    console.log('\nTest 14: Static _.camelCase');
    const result14 = await evaluator.evaluate('_.camelCase(data)', 'hello-world');
    console.log('Result 14:', result14);
    
    // Test 15: Check if _ without data returns undefined
    console.log('\nTest 15: _ without data');
    const result15 = await evaluator.evaluate('_()', {});
    console.log('Result 15:', result15);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test().then(() => {
  console.log('\nAll tests completed!');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});