const { JsqProcessor } = require('./dist/core/processor');

async function test() {
  const processor = new JsqProcessor({ verbose: true });
  const data = '{"message": "Hello; World"}';
  
  console.log('Testing semicolon in string...');
  try {
    const result = await processor.process('$.message', data);
    console.log('Result:', result.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
