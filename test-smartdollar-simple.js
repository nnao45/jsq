#!/usr/bin/env node

// Simple test to verify SmartDollar methods are available
const { exec } = require('child_process');

const tests = [
  {
    name: "Check if $ is defined",
    cmd: `echo '["test"]' | ./bin/jsq 'typeof $'`
  },
  {
    name: "Check if $.map is a function",
    cmd: `echo '[1,2,3]' | ./bin/jsq 'typeof $.map'`
  },
  {
    name: "Check if $.filter is a function",  
    cmd: `echo '[1,2,3]' | ./bin/jsq 'typeof $.filter'`
  },
  {
    name: "Check if $.keys is a function (for objects)",
    cmd: `echo '{"a":1}' | ./bin/jsq 'typeof $.keys'`
  },
  {
    name: "Test $.map execution",
    cmd: `echo '[1,2,3]' | ./bin/jsq '$.map(x => x * 2).join(",")'`
  },
  {
    name: "Test $.filter execution",
    cmd: `echo '[1,2,3,4,5]' | ./bin/jsq '$.filter(x => x > 2).join(",")'`
  },
  {
    name: "Test $.pluck",
    cmd: `echo '[{"name":"alice"},{"name":"bob"}]' | ./bin/jsq '$.pluck("name").join(",")'`
  },
  {
    name: "Check SmartDollar properties",
    cmd: `echo '[1,2,3]' | ./bin/jsq 'Object.getOwnPropertyNames($).filter(p => !p.match(/^\\d+$/)).sort().join(",")'`
  },
  {
    name: "Check if $ has __isSmartDollar",
    cmd: `echo '[1,2,3]' | ./bin/jsq '$.__isSmartDollar'`
  },
  {
    name: "Check if $ has _value",
    cmd: `echo '[1,2,3]' | ./bin/jsq 'JSON.stringify($._value)'`
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    exec(test.cmd, (error, stdout, stderr) => {
      console.log(`\n${test.name}:`);
      console.log(`Command: ${test.cmd}`);
      if (error) {
        console.log(`Error: ${error.message}`);
      }
      console.log(`Result: ${stdout.trim()}`);
      if (stderr && !stderr.includes('[VMSandboxQuickJS]')) {
        console.log(`Stderr: ${stderr}`);
      }
      resolve();
    });
  });
}

async function main() {
  console.log("Testing SmartDollar in VM...");
  
  for (const test of tests) {
    await runTest(test);
  }
}

main().catch(console.error);