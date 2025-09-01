import { _ } from '../core/lodash/lodash-non-vm';

console.log('Testing _.assignWith in chainable form...\n');

// Test chainable assignWith
const obj1 = { a: 1, b: 2 };
const obj2 = { b: 3, c: 4 };
const obj3 = { c: 5, d: 6 };

// Basic chainable assignWith without customizer
const result1 = _(obj1).assignWith(obj2, obj3).value();
console.log('1. Chainable assignWith:', result1);
console.log('   Expected: { a: 1, b: 3, c: 5, d: 6 }\n');

// Chainable assignWith with customizer
const customizer = (objValue: unknown, srcValue: unknown, _key?: string) => {
  if (typeof objValue === 'number' && typeof srcValue === 'number') {
    return objValue + srcValue; // Add numbers instead of replacing
  }
  return undefined;
};

const obj4 = { a: 1, b: 2 };
const obj5 = { b: 3, c: 4 };
const result2 = _({}).assignWith(obj4, obj5, customizer).value();
console.log('2. Chainable assignWith with customizer:', result2);
console.log('   Expected: { a: 1, b: 5, c: 4 }\n');

// Test chaining with other methods
const obj6 = { a: 1, b: 2, c: 3 };
const obj7 = { b: 4, d: 5 };
const result3 = _(obj6).assignWith(obj7, customizer).pick('a', 'b', 'd').value();
console.log('3. Chained with pick:', result3);
console.log('   Expected: { a: 1, b: 6, d: 5 }\n');

// Test that chainable method exists
const lodashInstance = _(obj1);
console.log('4. Verify chainable method exists:');
console.log('   typeof _({}).assignWith:', typeof lodashInstance.assignWith);
console.log('   Is function?', typeof lodashInstance.assignWith === 'function');
