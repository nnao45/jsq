const { VMSandboxSimple } = require('./lib/core/vm-sandbox-simple.js');

async function test() {
  const sandbox = new VMSandboxSimple();
  
  // Test with context that includes a function that can't be cloned
  const context = {
    data: null,
    $: null,
    someFunc: function(...args) {
      if (args.length === 0) {
        return data;
      }
      return createSmartDollar(args[0]);
    }
  };
  
  try {
    const result = await sandbox.execute('1 + 1', context);
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test().catch(console.error);