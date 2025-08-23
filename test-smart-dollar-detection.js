// Import the actual createSmartDollar function
const { createSmartDollar } = require('./lib/core/jquery-wrapper.js');

// Test the function detection
const data = null;
const $ = createSmartDollar(data);

console.log('Function toString:', $.toString());
console.log('Function name:', $.name);
console.log('Has valueOf:', 'valueOf' in $);
console.log('valueOf result:', $.valueOf());
console.log('Call with no args:', $());

// Check what the detection logic would find
const funcStr = $.toString();
const isSmartDollar = $.name === '$' || 
                     funcStr.includes('ChainableWrapper') || 
                     funcStr.includes('createSmartDollar') ||
                     (funcStr.includes('args.length === 0') && funcStr.includes('return data'));

console.log('\nDetection result:', isSmartDollar);
console.log('Includes ChainableWrapper:', funcStr.includes('ChainableWrapper'));
console.log('Includes createSmartDollar:', funcStr.includes('createSmartDollar'));
console.log('Includes pattern:', funcStr.includes('args.length === 0') && funcStr.includes('return data'));