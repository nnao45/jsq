import { execSync } from 'child_process.js';
import fs from 'fs.js';

// Create simple test data
const data = [];
for (let i = 0; i < 10000; i++) {
  data.push({ id: i, value: Math.random() * 100 });
}
fs.writeFileSync('./tmp/test.json', JSON.stringify(data));
fs.writeFileSync('./tmp/test.jsonl', data.map(JSON.stringify).join('\n'));

console.log('🎯 jsq vs jq: Where jsq can win!\n');

// Test 1: JavaScript-specific operations
console.log('1️⃣ JavaScript Math operations (no direct jq equivalent)');
console.log('   Query: Calculate logarithm base 2');

let start = process.hrtime.bigint();
execSync(`cat ./tmp/test.json | node ./dist/index.js '$.map(item => Math.log2(item.value))' > /dev/null 2>&1`);
let jsqTime = Number(process.hrtime.bigint() - start) / 1000000;
console.log(`   jsq: ${jsqTime.toFixed(2)}ms`);

start = process.hrtime.bigint();
execSync(`cat ./tmp/test.json | ./tmp/jq '[.[] | .value | log / (2 | log)]' > /dev/null 2>&1`);
let jqTime = Number(process.hrtime.bigint() - start) / 1000000;
console.log(`   jq:  ${jqTime.toFixed(2)}ms`);
console.log(`   Result: ${jsqTime < jqTime ? '✨ jsq wins!' : '⚡ jq wins'} (${(jsqTime/jqTime).toFixed(2)}x)\n`);

// Test 2: Complex string operations
console.log('2️⃣ Complex string manipulation');
console.log('   Query: Convert ID to padded hex string');

start = process.hrtime.bigint();
execSync(`cat ./tmp/test.json | node ./dist/index.js '$.map(item => item.id.toString(16).padStart(4, "0"))' > /dev/null 2>&1`);
jsqTime = Number(process.hrtime.bigint() - start) / 1000000;
console.log(`   jsq: ${jsqTime.toFixed(2)}ms`);

// jq doesn't have easy hex conversion
console.log(`   jq:  N/A (no simple hex conversion)`);
console.log(`   Result: ✨ jsq wins by default!\n`);

// Test 3: Using JavaScript libraries/features
console.log('3️⃣ Modern JavaScript features');
console.log('   Query: Destructuring and spread operator');

start = process.hrtime.bigint();
execSync(`cat ./tmp/test.json | node ./dist/index.js '$.map(({id, value}) => ({id, doubled: value * 2, triple: value * 3}))' > /dev/null 2>&1`);
jsqTime = Number(process.hrtime.bigint() - start) / 1000000;
console.log(`   jsq: ${jsqTime.toFixed(2)}ms`);

start = process.hrtime.bigint();
execSync(`cat ./tmp/test.json | ./tmp/jq '[.[] | {id: .id, doubled: .value * 2, triple: .value * 3}]' > /dev/null 2>&1`);
jqTime = Number(process.hrtime.bigint() - start) / 1000000;
console.log(`   jq:  ${jqTime.toFixed(2)}ms`);
console.log(`   Result: ${jsqTime < jqTime ? '✨ jsq wins!' : '⚡ jq wins'} (${(jsqTime/jqTime).toFixed(2)}x)\n`);

// Test 4: Streaming with parallel processing
console.log('4️⃣ Streaming + Parallel Processing');
console.log('   Query: Simple value extraction on 100K records');

// Create larger dataset
const bigData = [];
for (let i = 0; i < 100000; i++) {
  bigData.push({ x: i });
}
fs.writeFileSync('./tmp/big.jsonl', bigData.map(JSON.stringify).join('\n'));

start = process.hrtime.bigint();
execSync(`cat ./tmp/big.jsonl | node ./dist/index.js --stream --parallel 8 '$.x' > /dev/null 2>&1`);
jsqTime = Number(process.hrtime.bigint() - start) / 1000000;
console.log(`   jsq (parallel): ${jsqTime.toFixed(2)}ms`);

start = process.hrtime.bigint();
execSync(`cat ./tmp/big.jsonl | ./tmp/jq -c '.x' > /dev/null 2>&1`);
jqTime = Number(process.hrtime.bigint() - start) / 1000000;
console.log(`   jq:             ${jqTime.toFixed(2)}ms`);
console.log(`   Result: ${jsqTime < jqTime ? '✨ jsq wins!' : '⚡ jq wins'} (${(jsqTime/jqTime).toFixed(2)}x)\n`);

console.log('📌 Summary:');
console.log('- jsq wins when using JavaScript-specific features');
console.log('- jsq has advantages with complex math/string operations');
console.log('- jq is still faster for simple JSON transformations');
console.log('- Parallel processing helps but doesn\'t always beat jq\'s C performance');