const { VMSandboxSimple } = require('./dist/core/vm-sandbox-simple.js');

async function test() {
  const sandbox = new VMSandboxSimple();
  
  // Test the startCase function directly in VM
  const code = `
    // Test the regex replacement
    const testStr = 'hello-world_test';
    const step1 = testStr.replace(/([a-z])([A-Z])/g, '$1 $2');
    const step2 = step1.replace(/[_-]+/g, ' ');
    const step3 = step2.replace(/\\b\\w/g, function(letter) { return letter.toUpperCase(); });
    const result = step3.trim();
    
    __result = { 
      original: testStr,
      step1: step1,
      step2: step2,
      step3: step3,
      result: result,
      startCaseResult: _.startCase(testStr)
    };
  `;
  
  const context = {
    _: {
      startCase: function(str) {
        return str
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/[_-]+/g, ' ')
          .replace(/\\b\\w/g, function(letter) { return letter.toUpperCase(); })
          .trim();
      }
    }
  };
  
  try {
    const result = await sandbox.execute(code, context);
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();