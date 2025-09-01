import { _ } from '../core/lodash/lodash-non-vm';

// Test basic assignWith
const obj1 = { a: 1, b: 2 };
const obj2 = { b: 3, c: 4 };
const obj3 = { c: 5, d: 6 };

console.log('Testing _.assignWith static method...\n');

// Basic assignWith without customizer
const result1 = _.assignWith(obj1, obj2, obj3);
console.log('1. Basic assignWith:', result1);
console.log('   Expected: { a: 1, b: 3, c: 5, d: 6 }\n');

// assignWith with customizer
const customizer = (objValue: unknown, srcValue: unknown, _key?: string) => {
  if (typeof objValue === 'number' && typeof srcValue === 'number') {
    return objValue + srcValue; // Add numbers instead of replacing
  }
  return undefined;
};

const obj4 = { a: 1, b: 2 };
const obj5 = { b: 3, c: 4 };
const result2 = _.assignWith({}, obj4, obj5, customizer);
console.log('2. assignWith with customizer (add numbers):', result2);
console.log('   Expected: { a: 1, b: 5, c: 4 }\n');

// Test with multiple sources and customizer
const obj6 = { a: 1, b: 2 };
const obj7 = { b: 3, c: 4 };
const obj8 = { c: 5, d: 6 };
const result3 = _.assignWith({}, obj6, obj7, obj8, customizer);
console.log('3. assignWith with multiple sources and customizer:', result3);
console.log('   Expected: { a: 1, b: 5, c: 9, d: 6 }\n');

// Test customizer returning undefined (should use default behavior)
const customizerWithUndefined = (objValue: unknown, srcValue: unknown) => {
  if (typeof srcValue === 'string') {
    return undefined; // Let default behavior handle strings
  }
  if (typeof objValue === 'number' && typeof srcValue === 'number') {
    return objValue * srcValue; // Multiply numbers
  }
  return undefined;
};

const obj9 = { a: 2, b: 'hello', c: 3 };
const obj10 = { a: 5, b: 'world', c: 4 };
const result4 = _.assignWith({}, obj9, obj10, customizerWithUndefined);
console.log('4. assignWith with selective customizer:', result4);
console.log('   Expected: { a: 10, b: "world", c: 12 }\n');

// Test that it's really a static method
console.log('5. Verify static method exists:');
console.log('   typeof _.assignWith:', typeof _.assignWith);
console.log('   Is function?', typeof _.assignWith === 'function');
