// Test what happens when we try to pass lodash to isolated-vm
const ivm = require('isolated-vm');
const _ = require('lodash');

async function testLodash() {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = await isolate.createContext();
  const jail = context.global;

  // Try to pass lodash
  console.log('Lodash type:', typeof _);
  console.log('Lodash is function:', typeof _ === 'function');
  console.log('Sample lodash method:', typeof _.map);
  
  try {
    // Try to set lodash directly (this might fail)
    await jail.set('_', _);
    console.log('✓ Direct lodash set worked');
  } catch (err) {
    console.log('✗ Direct lodash set failed:', err.message.substring(0, 100) + '...');
  }

  // Try with a reference
  try {
    await jail.set('_ref', new ivm.Reference(_));
    console.log('✓ Lodash reference worked');
  } catch (err) {
    console.log('✗ Lodash reference failed:', err.message.substring(0, 100) + '...');
  }

  // Try with external copy (will definitely fail for functions)
  try {
    await jail.set('_copy', new ivm.ExternalCopy(_));
    console.log('✓ Lodash ExternalCopy worked');
  } catch (err) {
    console.log('✗ Lodash ExternalCopy failed:', err.message.substring(0, 100) + '...');
  }

  context.release();
  isolate.dispose();
}

testLodash().catch(console.error);