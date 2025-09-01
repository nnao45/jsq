import { performance } from 'perf_hooks';
import { execSync } from 'child_process';
import { cpus } from 'os';

const cpuCount = cpus().length;
console.log(`=== VM Pooling with ${cpuCount} vCPUs Benchmark ===\n`);

// Test different data sizes
const sizes = [100, 500, 1000, 5000, 10000];
const workers = [1, 2, 4, 8, 16, 20];

console.log('1. Single-threaded performance (CPU-based VM pool):');
for (const size of sizes) {
  const start = performance.now();
  try {
    execSync(`head -${size} benchmark.jsonl | ./dist/index.js --json-lines '$.value' > /dev/null`, {
      shell: true,
      stdio: 'pipe', // Use pipe to capture stderr
      env: { ...process.env, NODE_ENV: 'production' } // Suppress pool init message
    });
  } catch (e) {
    // Ignore error, we just want timing
  }
  const duration = performance.now() - start;
  const opsPerSec = (size / (duration / 1000)).toFixed(2);
  console.log(`  ${size} lines: ${duration.toFixed(2)}ms (${opsPerSec} ops/sec)`);
}

console.log(`\n2. Parallel performance with CPU-based pool (1000 lines):`);
for (const w of workers) {
  if (w > cpuCount) {
    console.log(`  ${w} workers: Skipping (exceeds vCPU count)`);
    continue;
  }
  const start = performance.now();
  try {
    execSync(`head -1000 benchmark.jsonl | ./dist/index.js --json-lines --parallel ${w} '$.value' > /dev/null`, {
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' }
    });
  } catch (e) {
    // Ignore error, we just want timing
  }
  const duration = performance.now() - start;
  const opsPerSec = (1000 / (duration / 1000)).toFixed(2);
  console.log(`  ${w} workers: ${duration.toFixed(2)}ms (${opsPerSec} ops/sec)`);
}

console.log(`\n3. Large-scale parallel test (10000 lines):`);
for (const w of [4, 8, 16, 20]) {
  if (w > cpuCount) continue;
  const start = performance.now();
  try {
    execSync(`cat benchmark.jsonl | ./dist/index.js --json-lines --parallel ${w} '$.value' > /dev/null`, {
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' }
    });
  } catch (e) {
    // Ignore error
  }
  const duration = performance.now() - start;
  const opsPerSec = (10000 / (duration / 1000)).toFixed(2);
  console.log(`  ${w} workers: ${duration.toFixed(2)}ms (${opsPerSec} ops/sec)`);
}

console.log('\n4. Pool saturation test:');
// Test with many concurrent operations to see pool efficiency
console.log('  Running 20 concurrent operations...');
const promises = [];
const concurrentStart = performance.now();

for (let i = 0; i < 20; i++) {
  const promise = new Promise((resolve) => {
    exec(`head -50 benchmark.jsonl | ./dist/index.js --json-lines '$.value' > /dev/null`, {
      env: { ...process.env, NODE_ENV: 'production' }
    }, (error, stdout, stderr) => {
      resolve(null);
    });
  });
  promises.push(promise);
}

import { exec } from 'child_process';
await Promise.all(promises);
const concurrentDuration = performance.now() - concurrentStart;
console.log(`  20 concurrent tasks completed in: ${concurrentDuration.toFixed(2)}ms`);
console.log(`  Average per task: ${(concurrentDuration / 20).toFixed(2)}ms`);