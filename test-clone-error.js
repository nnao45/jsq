// Direct test of the VM sandbox with problematic context
const ivm = require('isolated-vm');

async function testDirectly() {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = await isolate.createContext();
  const jail = context.global;

  // This is what createSmartDollar returns for null/undefined
  const problematicFunction = function(...args) {
    if (args.length === 0) {
      return data;
    }
    return createSmartDollar(args[0]);
  };

  // Try to set it directly
  try {
    await jail.set('problematic', problematicFunction);
    console.log('✓ Direct set worked');
  } catch (err) {
    console.log('✗ Direct set failed:', err.message);
  }

  // Try with external copy (should fail)
  try {
    await jail.set('problematicCopy', new ivm.ExternalCopy(problematicFunction));
    console.log('✓ ExternalCopy worked');
  } catch (err) {
    console.log('✗ ExternalCopy failed:', err.message);
  }

  context.release();
  isolate.dispose();
}

testDirectly().catch(console.error);