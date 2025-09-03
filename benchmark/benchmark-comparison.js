import { execSync } from 'child_process.js';
import fs from 'fs.js';

// Create test data
const testData = [];
for (let i = 0; i < 10000; i++) {
  testData.push({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    age: Math.floor(Math.random() * 80) + 20,
    active: Math.random() > 0.5,
    tags: ['tag1', 'tag2', 'tag3'].slice(0, Math.floor(Math.random() * 3) + 1),
    metadata: {
      created: new Date().toISOString(),
      score: Math.random() * 100
    }
  });
}

fs.writeFileSync('./tmp/test-data.json', JSON.stringify(testData));

console.log('🎯 jsq vs jq Performance Comparison\n');
console.log(`Test data: ${testData.length} records\n`);

const tests = [
  {
    name: 'Simple field selection',
    jsqQuery: '$.map(u => u.name)',
    jqQuery: '.[] | .name',
    description: 'Extract name field from all records'
  },
  {
    name: 'Filtering',
    jsqQuery: '$.filter(u => u.age > 50)',
    jqQuery: '.[] | select(.age > 50)',
    description: 'Filter users older than 50'
  },
  {
    name: 'Complex query',
    jsqQuery: '$.filter(u => u.active).map(u => ({id: u.id, name: u.name, score: u.metadata.score}))',
    jqQuery: '.[] | select(.active == true) | {id: .id, name: .name, score: .metadata.score}',
    description: 'Filter active users and reshape output'
  },
  {
    name: 'Array operations',
    jsqQuery: '_.mean($.map(u => u.age))',
    jqQuery: 'map(.age) | add / length',
    description: 'Calculate average age'
  }
];

// Run benchmarks
tests.forEach(test => {
  console.log(`\n📊 ${test.name}`);
  console.log(`jsq Query: ${test.jsqQuery}`);
  console.log(`jq Query: ${test.jqQuery}`);
  console.log(`Description: ${test.description}\n`);

  // Test jsq
  try {
    const jsqStart = process.hrtime.bigint();
    execSync(`cat ./tmp/test-data.json | node ./dist/index.js '${test.jsqQuery}' > /dev/null`, { stdio: 'pipe' });
    const jsqEnd = process.hrtime.bigint();
    const jsqTime = Number(jsqEnd - jsqStart) / 1000000; // Convert to ms
    console.log(`jsq: ${jsqTime.toFixed(2)}ms`);

    // Test jq
    const jqStart = process.hrtime.bigint();
    execSync(`cat ./tmp/test-data.json | ./tmp/jq '${test.jqQuery}' > /dev/null`, { stdio: 'pipe' });
    const jqEnd = process.hrtime.bigint();
    const jqTime = Number(jqEnd - jqStart) / 1000000; // Convert to ms
    console.log(`jq:  ${jqTime.toFixed(2)}ms`);

    // Compare
    const ratio = jsqTime / jqTime;
    if (ratio < 1) {
      console.log(`✨ jsq is ${(1/ratio).toFixed(2)}x faster!`);
    } else {
      console.log(`⚡ jq is ${ratio.toFixed(2)}x faster`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
});

// Memory usage test
console.log('\n\n💾 Memory Usage Comparison\n');
const jsqMemoryTestQuery = '$.filter(u => u.active)';
const jqMemoryTestQuery = '.[] | select(.active == true)';

// jsq memory
try {
  const jsqMemResult = execSync(`/usr/bin/time -v sh -c 'cat ./tmp/test-data.json | node ./dist/index.js "${jsqMemoryTestQuery}" > /dev/null' 2>&1 | grep "Maximum resident"`, { encoding: 'utf-8' });
  console.log(`jsq: ${jsqMemResult.trim()}`);
} catch (e) {
  console.log('jsq memory test failed');
}

// jq memory
try {
  const jqMemResult = execSync(`/usr/bin/time -v sh -c 'cat ./tmp/test-data.json | ./tmp/jq "${jqMemoryTestQuery}" > /dev/null' 2>&1 | grep "Maximum resident"`, { encoding: 'utf-8' });
  console.log(`jq:  ${jqMemResult.trim()}`);
} catch (e) {
  console.log('jq memory test failed');
}