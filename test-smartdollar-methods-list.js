#!/usr/bin/env node

// List all SmartDollar methods
const { exec } = require('child_process');

const cmd = `echo '[1,2,3]' | ./bin/jsq 'Object.getOwnPropertyNames(Object.getPrototypeOf($)).filter(n => n !== "constructor").sort().slice(0, 20).join(",")'`;

console.log("Getting SmartDollar prototype methods (first 20)...\n");

exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error.message);
  }
  console.log('Methods:', stdout.trim());
  
  // Get more methods
  const cmd2 = `echo '[1,2,3]' | ./bin/jsq 'Object.getOwnPropertyNames(Object.getPrototypeOf($)).filter(n => n !== "constructor").length'`;
  
  exec(cmd2, (error2, stdout2, stderr2) => {
    console.log('\nTotal method count:', stdout2.trim());
    
    // Check specific methods
    const methodsToCheck = ['map', 'filter', 'reduce', 'pluck', 'sortBy', 'groupBy', 'keys', 'values', 'split', 'join'];
    
    console.log('\nChecking specific methods:');
    methodsToCheck.forEach((method, i) => {
      setTimeout(() => {
        const checkCmd = `echo '[1,2,3]' | ./bin/jsq 'typeof $.${method}'`;
        exec(checkCmd, (err, out) => {
          console.log(`$.${method}: ${out.trim()}`);
        });
      }, i * 100); // Stagger to avoid overwhelming
    });
  });
});