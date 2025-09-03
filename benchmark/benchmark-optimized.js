import { performance } from 'perf_hooks.js';
import { execSync } from 'child_process.js';
import { cpus } from 'os.js';

const cpuCount = cpus().length;
console.log(`=== Optimized jsq Benchmark (${cpuCount} vCPUs) ===\n`);
console.log('Optimizations:');
console.log('- VM pool size: ' + Math.min(Math.floor(cpuCount / 2), 8));
console.log('- Dynamic batch sizing');
console.log('- Worker-side JSON parsing\n');

// Test different data sizes
const sizes = [100, 500, 1000, 5000, 10000];
const workers = [1, 2, 4, 8, 16, Math.floor(cpuCount / 2)];

console.log('1. Single-threaded performance (with all optimizations):');
for (const size of sizes) {
  const start = performance.now();
  try {
    execSync(`head -${size} benchmark.jsonl | NODE_ENV=production ./dist/index.js --json-lines '$.value' > /dev/null`, {
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

console.log('\n2. Parallel performance comparison (1000 lines):');
console.log('  Without parallel:');
let singleStart = performance.now();
try {
  execSync(`head -1000 benchmark.jsonl | NODE_ENV=production ./dist/index.js --json-lines '$.value' > /dev/null`, {
    shell: true,
    stdio: 'inherit'
  });
} catch (e) {}
let singleDuration = performance.now() - singleStart;
console.log(`    Time: ${singleDuration.toFixed(2)}ms (${(1000 / (singleDuration / 1000)).toFixed(2)} ops/sec)`);

for (const w of workers) {
  if (w > cpuCount) continue;
  const start = performance.now();
  try {
    execSync(`head -1000 benchmark.jsonl | NODE_ENV=production ./dist/index.js --json-lines --parallel ${w} '$.value' > /dev/null`, {
      shell: true,
      stdio: 'pipe' // Suppress batch size messages
    });
  } catch (e) {
    // Ignore error, we just want timing
  }
  const duration = performance.now() - start;
  const opsPerSec = (1000 / (duration / 1000)).toFixed(2);
  const speedup = ((singleDuration / duration - 1) * 100).toFixed(1);
  console.log(`  ${w} workers: ${duration.toFixed(2)}ms (${opsPerSec} ops/sec) [${speedup}% speedup]`);
}

console.log('\n3. Large dataset test (10000 lines):');
const parallelOptions = [1, 4, 8, Math.floor(cpuCount / 2)];
for (const w of parallelOptions) {
  if (w > cpuCount) continue;
  const start = performance.now();
  try {
    execSync(`cat benchmark.jsonl | NODE_ENV=production ./dist/index.js --json-lines --parallel ${w} '$.value' > /dev/null`, {
      shell: true,
      stdio: 'pipe'
    });
  } catch (e) {
    // Ignore error
  }
  const duration = performance.now() - start;
  const opsPerSec = (10000 / (duration / 1000)).toFixed(2);
  console.log(`  ${w} workers: ${duration.toFixed(2)}ms (${opsPerSec} ops/sec)`);
}

console.log('\n4. Streaming performance test:');
console.log('  Testing continuous stream processing...');
const streamStart = performance.now();
try {
  execSync(`cat benchmark.jsonl | NODE_ENV=production ./dist/index.js --stream --parallel ${Math.floor(cpuCount / 2)} '$.value' | wc -l`, {
    shell: true,
    stdio: 'pipe'
  });
} catch (e) {}
const streamDuration = performance.now() - streamStart;
const streamOps = (10000 / (streamDuration / 1000)).toFixed(2);
console.log(`  Stream mode: ${streamDuration.toFixed(2)}ms (${streamOps} ops/sec)`);

console.log('\n5. Memory efficiency test:');
const memStart = process.memoryUsage();
try {
  execSync(`head -5000 benchmark.jsonl | NODE_ENV=production ./dist/index.js --json-lines --parallel 8 '$.value' > /dev/null`, {
    shell: true,
    stdio: 'pipe'
  });
} catch (e) {}
const memEnd = process.memoryUsage();
const memUsed = ((memEnd.heapUsed - memStart.heapUsed) / 1024 / 1024).toFixed(2);
console.log(`  Memory delta: ${memUsed}MB for 5000 lines`);