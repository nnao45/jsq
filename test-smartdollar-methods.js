#!/usr/bin/env node

// Test SmartDollar methods in QuickJS
const { exec } = require('child_process');
const fs = require('fs');

// Test cases for SmartDollar methods
const testCases = [
  {
    name: 'Array map method',
    expression: '$.map(x => x * 2)',
    data: '[1, 2, 3]',
    expected: '[2, 4, 6]'
  },
  {
    name: 'Array filter method',
    expression: '$.filter(x => x > 2)',
    data: '[1, 2, 3, 4]',
    expected: '[3, 4]'
  },
  {
    name: 'Array reduce method',
    expression: '$.reduce((a, b) => a + b, 0)',
    data: '[1, 2, 3, 4]',
    expected: '10'
  },
  {
    name: 'String split method',
    expression: '$.split(",")',
    data: '"a,b,c"',
    expected: '["a","b","c"]'
  },
  {
    name: 'Object keys method',
    expression: '$.keys()',
    data: '{"a": 1, "b": 2}',
    expected: '["a","b"]'
  },
  {
    name: 'Object values method',
    expression: '$.values()',
    data: '{"a": 1, "b": 2}',
    expected: '[1,2]'
  },
  {
    name: 'Array pluck method',
    expression: '$.pluck("name")',
    data: '[{"name": "alice", "age": 30}, {"name": "bob", "age": 25}]',
    expected: '["alice","bob"]'
  },
  {
    name: 'Array sortBy method',
    expression: '$.sortBy("age")',
    data: '[{"name": "alice", "age": 30}, {"name": "bob", "age": 25}]',
    expected: '[{"name":"bob","age":25},{"name":"alice","age":30}]'
  },
  {
    name: 'Array groupBy method',
    expression: '$.groupBy("type")',
    data: '[{"name": "a", "type": "x"}, {"name": "b", "type": "x"}, {"name": "c", "type": "y"}]',
    expected: '{"x":[{"name":"a","type":"x"},{"name":"b","type":"x"}],"y":[{"name":"c","type":"y"}]}'
  },
  {
    name: 'Chain method',
    expression: '$.filter(x => x > 1).map(x => x * 2)',
    data: '[1, 2, 3, 4]',
    expected: '[4, 6, 8]'
  }
];

async function runTest(testCase) {
  return new Promise((resolve, reject) => {
    const command = `echo '${testCase.data}' | ./bin/jsq '${testCase.expression}'`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve({
          test: testCase.name,
          status: 'FAILED',
          error: error.message,
          stderr: stderr
        });
        return;
      }
      
      const result = stdout.trim();
      const status = result === testCase.expected ? 'PASSED' : 'FAILED';
      
      resolve({
        test: testCase.name,
        status: status,
        expected: testCase.expected,
        actual: result,
        stderr: stderr
      });
    });
  });
}

async function runAllTests() {
  console.log('Testing SmartDollar methods in VM...\n');
  
  const results = [];
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
    
    if (result.status === 'PASSED') {
      console.log(`✅ ${result.test}`);
    } else {
      console.log(`❌ ${result.test}`);
      console.log(`   Expected: ${result.expected}`);
      console.log(`   Actual: ${result.actual}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.stderr) {
        console.log(`   Stderr: ${result.stderr}`);
      }
    }
  }
  
  console.log('\n--- Summary ---');
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  // Write detailed results to file
  fs.writeFileSync('test-smartdollar-results.json', JSON.stringify(results, null, 2));
  console.log('\nDetailed results saved to test-smartdollar-results.json');
}

// Check if jsq is available
if (!fs.existsSync('./bin/jsq')) {
  console.error('jsq is not found. Please ensure bin/jsq exists');
  process.exit(1);
}

runAllTests().catch(console.error);