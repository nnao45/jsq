// Mimic the createSmartDollar function for null/undefined
function createTestFunction(data) {
  const $ = (...args) => {
    if (args.length === 0) {
      return data;
    }
    return new ChainableWrapper(args[0]);
  };
  Object.defineProperty($, 'valueOf', { value: () => data });
  Object.defineProperty($, 'toString', { value: () => String(data) });
  Object.defineProperty($, 'toJSON', { value: () => data });
  return $;
}

// Dummy ChainableWrapper
class ChainableWrapper {
  constructor(data) {
    this.data = data;
  }
}

const $ = createTestFunction(null);

console.log('Function toString:', $.toString());
console.log('Function actual toString:', Function.prototype.toString.call($));
console.log('Function name:', $.name);
console.log('Has valueOf:', 'valueOf' in $);
console.log('valueOf result:', $.valueOf());
console.log('Call with no args:', $());

// Check what the detection logic would find
const funcStr = Function.prototype.toString.call($);
const isSmartDollar = $.name === '$' || 
                     funcStr.includes('ChainableWrapper') || 
                     funcStr.includes('createSmartDollar') ||
                     (funcStr.includes('args.length === 0') && funcStr.includes('return data'));

console.log('\nDetection result:', isSmartDollar);
console.log('Function string preview:', funcStr.substring(0, 100) + '...');