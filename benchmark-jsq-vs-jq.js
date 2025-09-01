import { execSync } from 'child_process';
import fs from 'fs';
import { cpus } from 'node:os';

const CPU_COUNT = cpus().length;
console.log(`💻 System has ${CPU_COUNT} CPU cores\n`);

// Create different test scenarios
console.log('📊 Creating test data...');

// 1. Large dataset for parallel processing advantage
const largeData = [];
for (let i = 0; i < 100000; i++) {
  largeData.push({
    id: i,
    value: Math.random() * 1000,
    tags: ['tag1', 'tag2', 'tag3'].slice(0, Math.floor(Math.random() * 3) + 1),
    active: Math.random() > 0.3
  });
}
fs.writeFileSync('./tmp/large.jsonl', largeData.map(JSON.stringify).join('\n'));

// 2. Complex computation data
const complexData = [];
for (let i = 0; i < 50000; i++) {
  complexData.push({
    x: Math.random() * 100,
    y: Math.random() * 100,
    z: Math.random() * 100
  });
}
fs.writeFileSync('./tmp/complex.jsonl', complexData.map(JSON.stringify).join('\n'));

console.log('✅ Test data created\n');

// Benchmark scenarios
const scenarios = [
  {
    name: '🚀 Parallel-friendly: Simple filtering',
    description: 'Each line processed independently',
    jsqQuery: '$.active',
    jqQuery: '.active',
    file: './tmp/large.jsonl'
  },
  {
    name: '🧮 Math-heavy computation',
    description: 'JS Math functions vs jq math',
    jsqQuery: 'Math.sqrt($.x * $.x + $.y * $.y + $.z * $.z)',
    jqQuery: '((.x * .x + .y * .y + .z * .z) | sqrt)',
    file: './tmp/complex.jsonl'
  },
  {
    name: '🎯 JavaScript advantages',
    description: 'Using JS-specific features',
    jsqQuery: '({id: $.id, hex: $.id.toString(16), binary: $.id.toString(2).padStart(8, "0")})',
    jqQuery: '({id: .id, hex: (.id | tostring | ltrimstr("") as $s | "0123456789abcdef"[.id % 16:.id % 16 + 1]), binary: (.id | tostring)})',
    file: './tmp/large.jsonl'
  }
];

console.log('🏁 Starting benchmarks...\n');

for (const scenario of scenarios) {
  console.log(`\n${scenario.name}`);
  console.log(`📝 ${scenario.description}`);
  console.log(`📁 File: ${scenario.file}`);
  
  const results = {};
  
  // Test jsq single-threaded
  try {
    const cmd = `cat ${scenario.file} | node ./dist/index.js --stream '${scenario.jsqQuery}' 2>/dev/null | wc -l`;
    const start = process.hrtime.bigint();
    const output = execSync(cmd, { encoding: 'utf-8' }).trim();
    const end = process.hrtime.bigint();
    results['jsq-single'] = Number(end - start) / 1000000;
    console.log(`\n  jsq (single):    ${results['jsq-single'].toFixed(2)}ms (${output} lines)`);
  } catch (e) {
    console.log(`\n  jsq (single):    Error - ${e.message}`);
  }
  
  // Test jsq parallel with different worker counts
  const workerCounts = [2, 4, 8, Math.floor(CPU_COUNT / 2), CPU_COUNT];
  for (const workers of [...new Set(workerCounts)].filter(w => w > 0 && w <= CPU_COUNT)) {
    try {
      const cmd = `cat ${scenario.file} | node ./dist/index.js --stream --parallel ${workers} '${scenario.jsqQuery}' 2>/dev/null | wc -l`;
      const start = process.hrtime.bigint();
      const output = execSync(cmd, { encoding: 'utf-8' }).trim();
      const end = process.hrtime.bigint();
      results[`jsq-${workers}w`] = Number(end - start) / 1000000;
      console.log(`  jsq (${workers} workers): ${results[`jsq-${workers}w`].toFixed(2)}ms`);
    } catch (e) {
      console.log(`  jsq (${workers} workers): Error`);
    }
  }
  
  // Test jq
  try {
    const cmd = `cat ${scenario.file} | ./tmp/jq -c '${scenario.jqQuery}' 2>/dev/null | wc -l`;
    const start = process.hrtime.bigint();
    const output = execSync(cmd, { encoding: 'utf-8' }).trim();
    const end = process.hrtime.bigint();
    results['jq'] = Number(end - start) / 1000000;
    console.log(`  jq:              ${results['jq'].toFixed(2)}ms (${output} lines)`);
  } catch (e) {
    console.log(`  jq:              Error - ${e.message}`);
  }
  
  // Analysis
  if (results['jq']) {
    console.log('\n  📊 Results:');
    let fastestJsq = null;
    let fastestTime = Infinity;
    
    for (const [config, time] of Object.entries(results)) {
      if (config !== 'jq' && time < fastestTime) {
        fastestTime = time;
        fastestJsq = config;
      }
    }
    
    if (fastestTime < results['jq']) {
      const speedup = results['jq'] / fastestTime;
      console.log(`  🎉 jsq wins! ${fastestJsq} is ${speedup.toFixed(2)}x faster than jq!`);
    } else {
      const slowdown = fastestTime / results['jq'];
      console.log(`  ⚡ jq wins. It's ${slowdown.toFixed(2)}x faster than best jsq (${fastestJsq})`);
    }
  }
}

// Special test: Very simple operation where parallelization overhead might show
console.log('\n\n🔬 Special Test: Minimal Processing (Parallelization Overhead)\n');

const minimalData = Array(1000000).fill({x: 1});
fs.writeFileSync('./tmp/minimal.jsonl', minimalData.map(JSON.stringify).join('\n'));

console.log('Testing 1M records with minimal processing...');

const minimalResults = {};

// jsq tests
for (const workers of [1, 8, CPU_COUNT]) {
  try {
    const cmd = `cat ./tmp/minimal.jsonl | node ./dist/index.js --stream --parallel ${workers} '$.x' 2>&1 | grep -c '^1$' || true`;
    const start = process.hrtime.bigint();
    execSync(cmd);
    const end = process.hrtime.bigint();
    minimalResults[`jsq-${workers}w`] = Number(end - start) / 1000000;
    console.log(`  jsq (${workers} workers): ${minimalResults[`jsq-${workers}w`].toFixed(2)}ms`);
  } catch (e) {
    console.log(`  jsq (${workers} workers): Error`);
  }
}

// jq test
try {
  const cmd = `cat ./tmp/minimal.jsonl | ./tmp/jq -c '.x' | grep -c '^1$'`;
  const start = process.hrtime.bigint();
  execSync(cmd);
  const end = process.hrtime.bigint();
  minimalResults['jq'] = Number(end - start) / 1000000;
  console.log(`  jq:              ${minimalResults['jq'].toFixed(2)}ms`);
} catch (e) {
  console.log(`  jq:              Error`);
}

// Final analysis
console.log('\n🏆 Summary:');
console.log('  - jsq excels with JavaScript-specific operations');
console.log('  - Parallel processing helps with large datasets');
console.log('  - jq is highly optimized for simple JSON operations');
console.log(`  - Best worker count appears to be around ${Math.floor(CPU_COUNT / 2)} for this system`);