import * as isolatedVM from 'isolated-vm';

console.log('isolatedVM:', isolatedVM);
console.log('isolatedVM.Isolate:', isolatedVM.Isolate);
console.log('isolatedVM.default:', isolatedVM.default);

// Test if we can create an isolate
try {
  const isolate = new isolatedVM.Isolate({ memoryLimit: 10 });
  console.log('Created isolate successfully');
  isolate.dispose();
} catch (error) {
  console.error('Error creating isolate:', error.message);
}