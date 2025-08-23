const { JsqProcessor } = require('./dist/core/processor');

async function test() {
  const processor = new JsqProcessor({ verbose: true });
  
  try {
    // Test with parsed object data
    const data = '{"message": "Hello; World"}';
    console.log('Testing with data:', data);
    
    const result = await processor.process('$.message', data);
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  // Cleanup
  await processor.dispose();
}

test().catch(console.error);