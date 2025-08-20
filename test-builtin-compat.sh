#!/bin/bash

# Test script for built-in JavaScript objects compatibility with $
# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=== Testing Built-in Objects Compatibility with $ ==="
echo ""

# Counter for passed/failed tests
PASSED=0
FAILED=0

# Test function
test_expression() {
    local description="$1"
    local input="$2"
    local expression="$3"
    local expected="$4"
    
    result=$(echo "$input" | node dist/index.js "$expression" 2>&1)
    
    if [[ "$result" == *"$expected"* ]]; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $description"
        echo "  Expression: $expression"
        echo "  Expected: $expected"
        echo "  Got: $result"
        ((FAILED++))
    fi
}

echo "1. Math Object Tests"
echo "===================="
test_expression "Math.max with array $" '[1, 5, 3, 9, 2]' 'Math.max(...$)' "9"
test_expression "Math.min with array $" '[1, 5, 3, 9, 2]' 'Math.min(...$)' "1"
test_expression "Math.sum with reduce" '[1, 2, 3, 4, 5]' '$.reduce((a, b) => a + b, 0)' "15"
test_expression "Math.round with map" '[1.2, 2.7, 3.5]' '$.map(Math.round)' "[1,3,4]"
test_expression "Math.floor with map" '[1.9, 2.7, 3.1]' '$.map(Math.floor)' "[1,2,3]"
test_expression "Math.sqrt with map" '[4, 9, 16]' '$.map(Math.sqrt)' "[2,3,4]"
test_expression "Math.pow with map" '[2, 3, 4]' '$.map(x => Math.pow(x, 2))' "[4,9,16]"
test_expression "Math.abs with map" '[-1, -2, 3]' '$.map(Math.abs)' "[1,2,3]"

echo ""
echo "2. Object Methods Tests"
echo "======================="
test_expression "Object.keys" '{"a": 1, "b": 2, "c": 3}' 'Object.keys($)' '["a","b","c"]'
test_expression "Object.values" '{"a": 1, "b": 2, "c": 3}' 'Object.values($)' '[1,2,3]'
test_expression "Object.entries" '{"a": 1, "b": 2}' 'Object.entries($)' '[["a",1],["b",2]]'
test_expression "Object.keys.length" '{"a": 1, "b": 2, "c": 3}' 'Object.keys($).length' "3"
test_expression "Object.assign" '{"a": 1}' 'Object.assign({}, $, {b: 2})' '{"a":1,"b":2}'
test_expression "Object.freeze check" '{"a": 1}' 'typeof Object.freeze($)' '"object"'

echo ""
echo "3. Array Methods Tests"
echo "====================="
test_expression "Array.isArray" '[1, 2, 3]' 'Array.isArray($)' "true"
test_expression "Array.isArray on object" '{"a": 1}' 'Array.isArray($)' "false"
test_expression "Array.from with Set" '[1, 2, 2, 3]' 'Array.from(new Set($))' '[1,2,3]'
test_expression "[...spread] operator" '[1, 2, 3]' '[...$, 4, 5]' '[1,2,3,4,5]'
test_expression "concat arrays" '[1, 2]' '[...$, ...[3, 4]]' '[1,2,3,4]'
test_expression "Array length" '[1, 2, 3, 4, 5]' '$.length' "5"

echo ""
echo "4. String Operations Tests"
echo "========================="
test_expression "String concat" '["hello", " ", "world"]' '$.join("")' '"hello world"'
test_expression "String template literal" '{"name": "Alice", "age": 30}' '`Name: ${$.name}, Age: ${$.age}`' '"Name: Alice, Age: 30"'
test_expression "String includes check" '["apple", "banana", "orange"]' '$.some(x => x.includes("ana"))' "true"
test_expression "String uppercase" '["hello", "world"]' '$.map(s => s.toUpperCase())' '["HELLO","WORLD"]'
test_expression "String length sum" '["hi", "hello", "world"]' '$.map(s => s.length)' '[2,5,5]'

echo ""
echo "5. JSON Operations Tests"
echo "========================"
test_expression "JSON.stringify" '{"a": 1, "b": 2}' 'JSON.stringify($)' '{"a":1,"b":2}'
test_expression "JSON.parse chain" '"{\\"x\\": 10}"' 'JSON.parse($)' '{"x":10}'
test_expression "JSON.stringify array" '[1, 2, 3]' 'JSON.stringify($)' '[1,2,3]'
test_expression "JSON.stringify with indent" '{"a": 1}' 'JSON.stringify($, null, 2)' '"a": 1'

echo ""
echo "6. Number Operations Tests"
echo "========================="
test_expression "Number.isInteger" '[1, 2.5, 3]' '$.map(Number.isInteger)' '[true,false,true]'
test_expression "Number.parseFloat" '["1.5", "2.7", "3.14"]' '$.map(Number.parseFloat)' '[1.5,2.7,3.14]'
test_expression "Number.parseInt" '["10", "20", "30"]' '$.map(Number.parseInt)' '[10,20,30]'
test_expression "isNaN check" '[1, NaN, 3]' '$.map(isNaN)' '[false,true,false]'
test_expression "isFinite check" '[1, Infinity, 3]' '$.map(isFinite)' '[true,false,true]'

echo ""
echo "7. Boolean Operations Tests"
echo "==========================="
test_expression "Boolean filter" '[0, 1, "", "hello", null, true]' '$.filter(Boolean)' '[1,"hello",true]'
test_expression "Boolean conversion" '[0, 1, 2]' '$.map(Boolean)' '[false,true,true]'
test_expression "Truthy count" '[0, 1, false, "hello", null, true]' '$.filter(Boolean).length' "3"

echo ""
echo "8. Set Operations Tests"
echo "======================="
test_expression "Set from array" '[1, 2, 2, 3, 3, 3]' 'new Set($).size' "3"
test_expression "Set to array" '[1, 2, 2, 3]' '[...new Set($)]' '[1,2,3]'
test_expression "Set has check" '[1, 2, 3]' 'new Set($).has(2)' "true"

echo ""
echo "9. Map Operations Tests"
echo "======================="
test_expression "Map from entries" '[["a", 1], ["b", 2]]' 'new Map($).size' "2"
test_expression "Map get value" '[["a", 1], ["b", 2]]' 'new Map($).get("a")' "1"

echo ""
echo "10. Date Operations Tests"
echo "========================"
test_expression "Date year extraction" '[1609459200000, 1640995200000]' '$.map(d => new Date(d).getFullYear())' '[2021,2022]'

echo ""
echo "11. Destructuring Tests"
echo "======================="
test_expression "Array destructuring" '[1, 2, 3]' '(([a, b, c]) => a + b + c)($)' "6"
test_expression "Object destructuring" '{"x": 10, "y": 20}' '(({x, y}) => x + y)($)' "30"
test_expression "Rest operator" '[1, 2, 3, 4, 5]' '(([first, ...rest]) => rest)($)' '[2,3,4,5]'

echo ""
echo "12. Complex Combinations"
echo "========================"
test_expression "Math.max of mapped values" '{"a": 1, "b": 5, "c": 3}' 'Math.max(...Object.values($))' "5"
test_expression "Sum of squared values" '[1, 2, 3]' '$.map(x => x * x).reduce((a, b) => a + b)' "14"
test_expression "Filter and transform" '[1, 2, 3, 4, 5]' '$.filter(x => x > 2).map(x => x * 2)' '[6,8,10]'
test_expression "Nested object values sum" '{"a": {"val": 10}, "b": {"val": 20}}' 'Object.values($).map(o => o.val).reduce((a,b) => a+b)' "30"

echo ""
echo "========================================"
echo "Test Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "========================================"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi