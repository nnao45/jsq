import { JsqProcessor } from './core/lib/processor';

async function test() {
  console.log('Starting QuickJS debug test...');
  
  const processor = new JsqProcessor({ verbose: true });
  
  try {
    const data = { name: 'Alice', age: 30 };
    console.log('Input data:', JSON.stringify(data));
    
    const expression = '$.name';
    console.log('Expression:', expression);
    
    const result = await processor.process(expression, JSON.stringify(data));
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await processor.dispose();
  }
}

test().catch(console.error);