// Test the actual function implementation
const testStr = 'hello-world_test';

// Test direct function
const directResult = testStr
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, function(letter) { return letter.toUpperCase(); })
  .trim();

console.log('Direct result:', directResult);

// Test with arrow function
const arrowResult = testStr
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, letter => letter.toUpperCase())
  .trim();

console.log('Arrow result:', arrowResult);

// Test what the VM might be doing
try {
  const vmFunc = new Function('letter', 'return letter.toUpperCase()');
  const vmResult = testStr
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, vmFunc)
    .trim();
  console.log('VM style result:', vmResult);
} catch (e) {
  console.error('VM style error:', e);
}