import { performance } from 'perf_hooks';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('=== Current Implementation Benchmark ===\n');

// Test different data sizes
const sizes = [100, 500, 1000, 5000];
const workers = [1, 2, 4, 8];

console.log('1. Single-threaded performance:');
for (const size of sizes) {
  const start = performance.now();
  try {
    execSync(`head -${size} benchmark.jsonl | ./dist/index.js --json-lines '$.value' > /dev/null`, {
      shell: true,
      stdio: 'inherit'
    });
  } catch (e) {
    // Ignore error, we just want timing
  }
  const duration = performance.now() - start;
  const opsPerSec = (size / (duration / 1000)).toFixed(2);
  console.log(`  ${size} lines: ${duration.toFixed(2)}ms (${opsPerSec} ops/sec)`);
}

console.log('\n2. Parallel performance (1000 lines):');
for (const w of workers) {
  const start = performance.now();
  try {
    execSync(`head -1000 benchmark.jsonl | ./dist/index.js --json-lines --parallel ${w} '$.value' > /dev/null`, {
      shell: true,
      stdio: 'inherit'
    });
  } catch (e) {
    // Ignore error, we just want timing
  }
  const duration = performance.now() - start;
  const opsPerSec = (1000 / (duration / 1000)).toFixed(2);
  console.log(`  ${w} workers: ${duration.toFixed(2)}ms (${opsPerSec} ops/sec)`);
}

console.log('\n3. VM initialization overhead test:');
// Single operation to measure startup
const singleStart = performance.now();
execSync(`echo '{"value": "test"}' | ./dist/index.js --json-lines '$.value' > /dev/null`, {
  shell: true,
  stdio: 'inherit'
});
const singleDuration = performance.now() - singleStart;
console.log(`  Single operation: ${singleDuration.toFixed(2)}ms`);

// Multiple single operations to see cumulative overhead
const multiStart = performance.now();
for (let i = 0; i < 10; i++) {
  execSync(`echo '{"value": "test"}' | ./dist/index.js --json-lines '$.value' > /dev/null`, {
    shell: true,
    stdio: 'inherit'
  });
}
const multiDuration = performance.now() - multiStart;
console.log(`  10 single operations: ${multiDuration.toFixed(2)}ms (avg: ${(multiDuration/10).toFixed(2)}ms)`);