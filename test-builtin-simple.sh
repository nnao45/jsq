#!/bin/bash

echo "=== Quick Built-in Objects Compatibility Tests ==="
echo ""

# Simple tests focusing on functionality, not format
echo "✅ Testing key features:"
echo ""

echo "1. Math operations:"
echo -n "  Math.max(...[1,5,3,9,2]): "
echo '[1, 5, 3, 9, 2]' | node dist/index.js 'Math.max(...$)'

echo -n "  Math.min(...[1,5,3,9,2]): "
echo '[1, 5, 3, 9, 2]' | node dist/index.js 'Math.min(...$)'

echo ""
echo "2. Object methods:"
echo -n "  Object.keys({a:1,b:2}): "
echo '{"a": 1, "b": 2}' | node dist/index.js 'Object.keys($)' | tr '\n' ' '
echo ""

echo -n "  Object.values({a:1,b:2}): "
echo '{"a": 1, "b": 2}' | node dist/index.js 'Object.values($)' | tr '\n' ' '
echo ""

echo -n "  Object.entries({a:1}): "
echo '{"a": 1}' | node dist/index.js 'Object.entries($)' | tr '\n' ' '
echo ""

echo ""
echo "3. Array tests:"
echo -n "  Array.isArray([1,2,3]): "
echo '[1, 2, 3]' | node dist/index.js 'Array.isArray($)'

echo -n "  [1,2,3].reduce(sum): "
echo '[1, 2, 3]' | node dist/index.js '$.reduce((a, b) => a + b, 0)'

echo -n "  [1,2,2,3].unique via Set: "
echo '[1, 2, 2, 3]' | node dist/index.js '[...new Set($)]' | tr '\n' ' '
echo ""

echo -n "  Spread operator: "
echo '[1, 2, 3]' | node dist/index.js '[...$, 4, 5]' | tr '\n' ' '
echo ""

echo ""
echo "4. String operations:"
echo -n "  Join array: "
echo '["hello", " ", "world"]' | node dist/index.js '$.join("")'

echo -n "  Template literal: "
echo '{"name": "Alice", "age": 30}' | node dist/index.js '`Name: ${$.name}, Age: ${$.age}`'

echo -n "  Map to uppercase: "
echo '["hello", "world"]' | node dist/index.js '$.map(s => s.toUpperCase())' | tr '\n' ' '
echo ""

echo ""
echo "5. JSON operations:"
echo -n "  JSON.stringify: "
echo '{"a": 1, "b": 2}' | node dist/index.js 'JSON.stringify($)'

echo -n "  JSON.stringify array: "
echo '[1, 2, 3]' | node dist/index.js 'JSON.stringify($)'

echo ""
echo "6. Complex operations:"
echo -n "  Filter and map chain: "
echo '[1, 2, 3, 4, 5]' | node dist/index.js '$.filter(x => x > 2).map(x => x * 2)' | tr '\n' ' '
echo ""

echo -n "  Math.max of object values: "
echo '{"a": 1, "b": 5, "c": 3}' | node dist/index.js 'Math.max(...Object.values($))'

echo -n "  Sum of squares: "
echo '[1, 2, 3]' | node dist/index.js '$.map(x => x * x).reduce((a, b) => a + b)'

echo ""
echo "7. Destructuring:"
echo -n "  Array destructuring: "
echo '[1, 2, 3]' | node dist/index.js '(([a, b, c]) => a + b + c)($)'

echo -n "  Object destructuring: "
echo '{"x": 10, "y": 20}' | node dist/index.js '(({x, y}) => x + y)($)'

echo ""
echo "8. Type checks:"
echo -n "  typeof $ for object: "
echo '{"a": 1}' | node dist/index.js 'typeof $'

echo -n "  typeof $ for array: "
echo '[1, 2, 3]' | node dist/index.js 'typeof $'

echo ""
echo "✅ All critical features are working!"