#!/bin/bash
set -e

echo "Testing stdin JSON input..."

# Test 1: Simple JSON
echo '✅ Test 1: Simple JSON'
echo '{"name": "Alice", "age": 25}' | node dist/index.js
echo

# Test 2: Array JSON
echo '✅ Test 2: Array JSON'
echo '[1, 2, 3, 4, 5]' | node dist/index.js
echo

# Test 3: JSON with expression
echo '✅ Test 3: JSON with expression ($.name)'
echo '{"name": "Bob", "age": 30}' | node dist/index.js '$.name'
echo

# Test 4: Complex JSON
echo '✅ Test 4: Complex JSON'
echo '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]}' | node dist/index.js '$.users'
echo

# Test 5: JSON with lodash expression
echo '✅ Test 5: JSON with lodash expression'
echo '[1, 2, 3, 4, 5]' | node dist/index.js '_.sum($)'
echo

# Test 6: Multi-line JSON
echo '✅ Test 6: Multi-line JSON'
cat << 'EOF' | node dist/index.js '$.items.length'
{
  "items": [
    {"id": 1, "price": 100},
    {"id": 2, "price": 200},
    {"id": 3, "price": 150}
  ]
}
EOF
echo

# Test 7: JSON from file redirect
echo '✅ Test 7: JSON from file redirect'
echo '{"test": "redirect"}' > /tmp/test-input.json
node dist/index.js < /tmp/test-input.json
rm -f /tmp/test-input.json
echo

echo "All tests completed! 🎉"