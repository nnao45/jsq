import { _ } from '../core/lodash/lodash-non-vm';

console.log('Testing assign-related methods...\n');

// Test assignIn (includes inherited properties)
const parent = { a: 1 };
const child = Object.create(parent);
child.b = 2;

const result1 = _.assignIn({}, child);
console.log('1. assignIn (includes inherited):', result1);
console.log('   Expected: { a: 1, b: 2 }\n');

// Test assignWith
const customizer = (objValue: unknown, srcValue: unknown) => {
  if (typeof objValue === 'number' && typeof srcValue === 'number') {
    return objValue + srcValue;
  }
  return undefined;
};

const obj1 = { a: 1, b: 2 };
const obj2 = { b: 3, c: 4 };
const result2 = _.assignWith({}, obj1, obj2, customizer);
console.log('2. assignWith with customizer:', result2);
console.log('   Expected: { a: 1, b: 5, c: 4 }\n');

// Test chainable forms
const result3 = _({}).assignIn(child).pick('a', 'b').value();
console.log('3. Chainable assignIn:', result3);
console.log('   Expected: { a: 1, b: 2 }\n');

const result4 = _({}).assignWith(obj1, obj2, customizer).keys().value();
console.log('4. Chainable assignWith + keys:', result4);
console.log('   Expected: ["a", "b", "c"]\n');

// Verify methods exist
console.log('5. Method verification:');
console.log('   _.assignIn exists:', typeof _.assignIn === 'function');
console.log('   _.assignWith exists:', typeof _.assignWith === 'function');
console.log('   Chainable assignIn exists:', typeof _({}).assignIn === 'function');
console.log('   Chainable assignWith exists:', typeof _({}).assignWith === 'function');
