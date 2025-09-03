import { execSync } from 'child_process.js';
import fs from 'fs.js';

// Create large test data
console.log('📊 Creating large test dataset...');
const testData = [];
for (let i = 0; i < 100000; i++) {
  testData.push({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    age: Math.floor(Math.random() * 80) + 20,
    active: Math.random() > 0.5,
    score: Math.random() * 100,
    tags: ['tag1', 'tag2', 'tag3'].slice(0, Math.floor(Math.random() * 3) + 1),
    metadata: {
      created: new Date().toISOString(),
      lastLogin: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      department: ['sales', 'engineering', 'marketing', 'support'][Math.floor(Math.random() * 4)]
    }
  });
}

// Save as JSON Lines format for streaming
const jsonlData = testData.map(item => JSON.stringify(item)).join('\n');
fs.writeFileSync('./tmp/large-data.jsonl', jsonlData);
fs.writeFileSync('./tmp/large-data.json', JSON.stringify(testData));

console.log(`✅ Created dataset with ${testData.length} records\n`);

console.log('🎯 jsq Parallel vs jq Performance Comparison\n');

const tests = [
  {
    name: 'Heavy computation (filtering + transformation)',
    jsqQuery: '$.filter(u => u.active && u.age > 30).map(u => ({id: u.id, name: u.name, score: Math.round(u.score * 100) / 100, ageGroup: u.age < 40 ? "young" : u.age < 60 ? "middle" : "senior"}))',
    jqQuery: '.[] | select(.active and .age > 30) | {id: .id, name: .name, score: ((.score * 100 | round) / 100), ageGroup: (if .age < 40 then "young" elif .age < 60 then "middle" else "senior" end)}',
    description: 'Complex filtering with data transformation'
  },
  {
    name: 'Multiple aggregations',
    jsqQuery: '$.filter(u => u.active).map(u => ({dept: u.metadata.department, age: u.age, score: u.score}))',
    jqQuery: '.[] | select(.active) | {dept: .metadata.department, age: .age, score: .score}',
    description: 'Filter and reshape for aggregation'
  },
  {
    name: 'String processing',
    jsqQuery: '$.map(u => ({id: u.id, email: u.email.toLowerCase(), domain: u.email.split("@")[1], nameLength: u.name.length}))',
    jqQuery: '.[] | {id: .id, email: (.email | ascii_downcase), domain: (.email | split("@") | .[1]), nameLength: (.name | length)}',
    description: 'String manipulation operations'
  }
];

// Test both JSON and JSON Lines format
const formats = [
  { name: 'JSON Lines (streaming)', file: './tmp/large-data.jsonl', jsqFlag: '--stream', jqFlag: '', cat: true },
  { name: 'JSON array', file: './tmp/large-data.json', jsqFlag: '', jqFlag: '', cat: true }
];

for (const format of formats) {
  console.log(`\n📁 Format: ${format.name}\n`);
  
  for (const test of tests) {
    console.log(`\n📊 ${test.name}`);
    console.log(`Description: ${test.description}`);
    
    // Test jsq with different worker counts
    const workerCounts = [1, 2, 4, 8];
    const jsqTimes = {};
    
    for (const workers of workerCounts) {
      try {
        const jsqCmd = format.cat 
          ? `cat ${format.file} | node ./dist/index.js ${format.jsqFlag} --parallel ${workers} '${test.jsqQuery}' > /dev/null 2>&1`
          : `node ./dist/index.js ${format.jsqFlag} --parallel ${workers} --file ${format.file} '${test.jsqQuery}' > /dev/null 2>&1`;
        
        // Warm up
        execSync(jsqCmd, { stdio: 'pipe' });
        
        // Measure
        const jsqStart = process.hrtime.bigint();
        execSync(jsqCmd, { stdio: 'pipe' });
        const jsqEnd = process.hrtime.bigint();
        jsqTimes[workers] = Number(jsqEnd - jsqStart) / 1000000; // Convert to ms
        
        console.log(`jsq (${workers} workers): ${jsqTimes[workers].toFixed(2)}ms`);
      } catch (error) {
        console.log(`jsq (${workers} workers): Error - ${error.message}`);
      }
    }
    
    // Test jq
    try {
      const jqCmd = format.cat
        ? `cat ${format.file} | ./tmp/jq ${format.jqFlag} '${test.jqQuery}' > /dev/null 2>&1`
        : `./tmp/jq ${format.jqFlag} '${test.jqQuery}' ${format.file} > /dev/null 2>&1`;
      
      // Warm up
      execSync(jqCmd, { stdio: 'pipe' });
      
      // Measure
      const jqStart = process.hrtime.bigint();
      execSync(jqCmd, { stdio: 'pipe' });
      const jqEnd = process.hrtime.bigint();
      const jqTime = Number(jqEnd - jqStart) / 1000000; // Convert to ms
      
      console.log(`jq:               ${jqTime.toFixed(2)}ms`);
      
      // Compare
      console.log('\n🏆 Results:');
      for (const [workers, time] of Object.entries(jsqTimes)) {
        const ratio = time / jqTime;
        if (ratio < 1) {
          console.log(`  ✨ jsq (${workers} workers) is ${(1/ratio).toFixed(2)}x faster than jq!`);
        } else {
          console.log(`  ⚡ jq is ${ratio.toFixed(2)}x faster than jsq (${workers} workers)`);
        }
      }
    } catch (error) {
      console.log(`jq: Error - ${error.message}`);
    }
  }
}

// Special test: Very large dataset with heavy computation
console.log('\n\n🔥 EXTREME TEST: 1M records with complex processing\n');

const hugeData = [];
for (let i = 0; i < 1000000; i++) {
  hugeData.push({
    id: i,
    value: Math.random() * 1000,
    category: ['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)],
    timestamp: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
  });
}

fs.writeFileSync('./tmp/huge-data.jsonl', hugeData.map(item => JSON.stringify(item)).join('\n'));

const extremeTest = {
  name: 'Complex aggregation on 1M records',
  jsqQuery: '$.filter(item => item.value > 500).map(item => ({...item, dayOfWeek: new Date(item.timestamp).getDay()}))',
  jqQuery: '.[] | select(.value > 500) | . + {dayOfWeek: (.timestamp | strftime("%w") | tonumber)}'
};

console.log(`📊 ${extremeTest.name}`);

// jsq parallel
try {
  const jsqCmd = `cat ./tmp/huge-data.jsonl | node ./dist/index.js --stream --parallel 8 '${extremeTest.jsqQuery}' > /dev/null 2>&1`;
  const jsqStart = process.hrtime.bigint();
  execSync(jsqCmd, { stdio: 'pipe' });
  const jsqEnd = process.hrtime.bigint();
  const jsqTime = Number(jsqEnd - jsqStart) / 1000000;
  console.log(`jsq (8 workers): ${jsqTime.toFixed(2)}ms`);
  
  // jq
  const jqStart = process.hrtime.bigint();
  execSync(`cat ./tmp/huge-data.jsonl | ./tmp/jq '${extremeTest.jqQuery}' > /dev/null 2>&1`, { stdio: 'pipe' });
  const jqEnd = process.hrtime.bigint();
  const jqTime = Number(jqEnd - jqStart) / 1000000;
  console.log(`jq:              ${jqTime.toFixed(2)}ms`);
  
  const ratio = jsqTime / jqTime;
  if (ratio < 1) {
    console.log(`\n🎉 jsq is ${(1/ratio).toFixed(2)}x faster on large datasets with parallel processing!`);
  } else {
    console.log(`\n⚡ jq is still ${ratio.toFixed(2)}x faster`);
  }
} catch (error) {
  console.log(`Error in extreme test: ${error.message}`);
}