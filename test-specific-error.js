// Test to reproduce the exact error
const child_process = require('child_process');

// Test case 1: Simple expression with null data
console.log('Test 1: Simple expression with null data');
const result1 = child_process.execSync('echo "null" | node dist/index.js "1+1"', { encoding: 'utf8' }).trim();
console.log('Result:', result1);

// Test case 2: Expression that uses $
console.log('\nTest 2: Expression using $ with null data');
try {
  const result2 = child_process.execSync('echo "null" | node dist/index.js "$ || \'default\'"', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  console.log('Result:', result2);
} catch (err) {
  console.log('Error:', err.stderr.toString());
}

// Test case 3: Complex expression
console.log('\nTest 3: Complex expression');
try {
  const result3 = child_process.execSync('echo "null" | node dist/index.js "const x = $; x"', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  console.log('Result:', result3);
} catch (err) {
  console.log('Error:', err.stderr.toString());
}

// Test case 4: With undefined
console.log('\nTest 4: With no input (undefined data)');
try {
  const result4 = child_process.execSync('node dist/index.js "1+1" < /dev/null', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  console.log('Result:', result4);
} catch (err) {
  console.log('Error:', err.stderr.toString());
}