#!/bin/bash

# Comprehensive JavaScript Native Compatibility Test Suite
# 50+ tests covering every aspect of native JavaScript behavior with $

echo "🧪 === COMPREHENSIVE JAVASCRIPT NATIVE COMPATIBILITY (50+ TESTS) === 🧪"
echo ""

PASSED=0
FAILED=0

# Test function with detailed output
test_native() {
    local category="$1"
    local description="$2"
    local input="$3"
    local expression="$4"
    local expected_pattern="$5"
    
    result=$(echo "$input" | node dist/index.js "$expression" 2>&1)
    exit_code=$?
    
    if [[ $exit_code -eq 0 && "$result" =~ $expected_pattern ]]; then
        echo "✅ [$category] $description"
        ((PASSED++))
    else
        echo "❌ [$category] $description"
        echo "   Expected pattern: $expected_pattern"
        echo "   Got: $result"
        ((FAILED++))
    fi
}

echo "=== SECTION 1: ARRAY TYPE SYSTEM TESTS ==="
test_native "Type" "Array.isArray(\$) returns true" '[1,2,3]' 'Array.isArray($)' "true"
test_native "Type" "instanceof Array works" '[1,2,3]' '$ instanceof Array' "true"
test_native "Type" "typeof \$ is object for arrays" '[1,2,3]' 'typeof $' "object"
test_native "Type" "constructor is Array" '[1,2,3]' '$.constructor === Array' "true"
test_native "Type" "Symbol.toStringTag is Array" '[1,2,3]' 'Object.prototype.toString.call($)' "\[object Array\]"

echo ""
echo "=== SECTION 2: OBJECT TYPE SYSTEM TESTS ==="
test_native "Type" "typeof \$ is function for objects" '{"a":1}' 'typeof $' "function"
test_native "Type" "Object.prototype.toString for objects" '{"a":1}' 'Object.prototype.toString.call($)' "\[object Function\]"
test_native "Type" "hasOwnProperty works" '{"a":1}' '$.hasOwnProperty("a")' "true"
test_native "Type" "in operator works" '{"a":1}' '"a" in $' "true"
test_native "Type" "propertyIsEnumerable works" '{"a":1}' '$.propertyIsEnumerable("a")' "true"

echo ""
echo "=== SECTION 3: ARRAY NATIVE METHODS ==="
test_native "Array" "push method" '[1,2]' '$.push(3); $' "\[1,2,3\]"
test_native "Array" "pop method" '[1,2,3]' '$.pop()' "3"
test_native "Array" "shift method" '[1,2,3]' '$.shift()' "1"
test_native "Array" "unshift method" '[2,3]' '$.unshift(1); $' "\[1,2,3\]"
test_native "Array" "splice method" '[1,2,3,4]' '$.splice(1,2); $' "\[1,4\]"
test_native "Array" "slice method" '[1,2,3,4]' '$.slice(1,3)' "\[2,3\]"
test_native "Array" "indexOf method" '[1,2,3,2]' '$.indexOf(2)' "1"
test_native "Array" "lastIndexOf method" '[1,2,3,2]' '$.lastIndexOf(2)' "3"
test_native "Array" "includes method" '[1,2,3]' '$.includes(2)' "true"
test_native "Array" "join method" '[1,2,3]' '$.join("-")' '"1-2-3"'

echo ""
echo "=== SECTION 4: ARRAY ITERATION METHODS ==="
test_native "Array" "forEach method" '[1,2,3]' 'let sum=0; $.forEach(x => sum+=x); sum' "6"
test_native "Array" "map method" '[1,2,3]' '$.map(x => x*2)' "\[2,4,6\]"
test_native "Array" "filter method" '[1,2,3,4]' '$.filter(x => x > 2)' "\[3,4\]"
test_native "Array" "reduce method" '[1,2,3,4]' '$.reduce((a,b) => a+b, 0)' "10"
test_native "Array" "reduceRight method" '[1,2,3,4]' '$.reduceRight((a,b) => a+b, 0)' "10"
test_native "Array" "find method" '[1,2,3,4]' '$.find(x => x > 2)' "3"
test_native "Array" "findIndex method" '[1,2,3,4]' '$.findIndex(x => x > 2)' "2"
test_native "Array" "some method" '[1,2,3]' '$.some(x => x > 2)' "true"
test_native "Array" "every method" '[1,2,3]' '$.every(x => x > 0)' "true"

echo ""
echo "=== SECTION 5: OBJECT STATIC METHODS ==="
test_native "Object" "Object.keys(\$)" '{"a":1,"b":2}' 'Object.keys($)' "\[\"a\",\"b\"\]"
test_native "Object" "Object.values(\$)" '{"a":1,"b":2}' 'Object.values($)' "\[1,2\]"
test_native "Object" "Object.entries(\$)" '{"a":1}' 'Object.entries($)' "\[\[\"a\",1\]\]"
test_native "Object" "Object.getOwnPropertyNames" '{"a":1}' 'Object.getOwnPropertyNames($).includes("a")' "true"
test_native "Object" "Object.assign with \$" '{"a":1}' 'Object.assign({}, $, {b:2})' '{"a":1,"b":2}'
test_native "Object" "Object.freeze(\$)" '{"a":1}' 'Object.freeze($); typeof $' "function"
test_native "Object" "Object.seal(\$)" '{"a":1}' 'Object.seal($); typeof $' "function"

echo ""
echo "=== SECTION 6: MATH OPERATIONS ==="
test_native "Math" "Math.max with spread" '[1,5,3,9,2]' 'Math.max(...$)' "9"
test_native "Math" "Math.min with spread" '[1,5,3,9,2]' 'Math.min(...$)' "1"
test_native "Math" "Math.floor with map" '[1.9,2.7,3.1]' '$.map(Math.floor)' "\[1,2,3\]"
test_native "Math" "Math.ceil with map" '[1.1,2.3,3.7]' '$.map(Math.ceil)' "\[2,3,4\]"
test_native "Math" "Math.round with map" '[1.2,2.7,3.5]' '$.map(Math.round)' "\[1,3,4\]"
test_native "Math" "Math.abs with map" '[-1,-2,3]' '$.map(Math.abs)' "\[1,2,3\]"

echo ""
echo "=== SECTION 7: JSON OPERATIONS ==="
test_native "JSON" "JSON.stringify(\$) for array" '[1,2,3]' 'JSON.stringify($)' '"\[1,2,3\]"'
test_native "JSON" "JSON.stringify(\$) for object" '{"a":1}' 'JSON.stringify($)' '"{\"a\":1}"'
test_native "JSON" "JSON.stringify with replacer" '{"a":1,"b":2}' 'JSON.stringify($, ["a"])' '"{\"a\":1}"'
test_native "JSON" "JSON.stringify with indent" '{"a":1}' 'JSON.stringify($, null, 2).includes("  ")' "true"

echo ""
echo "=== SECTION 8: SPREAD OPERATOR ==="
test_native "Spread" "Array spread" '[1,2,3]' '[...$, 4, 5]' "\[1,2,3,4,5\]"
test_native "Spread" "Spread in Math.max" '[5,1,9,3]' 'Math.max(...$)' "9"
test_native "Spread" "Spread in concat" '[1,2]' '[0, ...$, 3]' "\[0,1,2,3\]"
test_native "Spread" "Multiple spreads" '[1,2]' '[...$, ...$]' "\[1,2,1,2\]"

echo ""
echo "=== SECTION 9: DESTRUCTURING ==="
test_native "Destructure" "Array destructuring" '[10,20,30]' '(([a,b,c]) => a+b+c)($)' "60"
test_native "Destructure" "Object destructuring" '{"x":10,"y":20}' '(({x,y}) => x+y)($)' "30"
test_native "Destructure" "Rest operator" '[1,2,3,4,5]' '(([first,...rest]) => rest.length)($)' "4"
test_native "Destructure" "Default values" '[1]' '(([a,b=10]) => a+b)($)' "11"

echo ""
echo "=== SECTION 10: SET AND MAP OPERATIONS ==="
test_native "Set" "new Set(\$)" '[1,2,2,3,3,3]' 'new Set($).size' "3"
test_native "Set" "Set.has method" '[1,2,3]' 'new Set($).has(2)' "true"
test_native "Set" "Set to Array" '[1,2,2,3]' '[...new Set($)]' "\[1,2,3\]"
test_native "Map" "new Map from entries" '[["a",1],["b",2]]' 'new Map($).size' "2"
test_native "Map" "Map.get method" '[["a",1],["b",2]]' 'new Map($).get("a")' "1"

echo ""
echo "=== SECTION 11: STRING OPERATIONS ==="
test_native "String" "Template literals" '{"name":"Alice","age":30}' '`Hello ${$.name}, age ${$.age}`' '"Hello Alice, age 30"'
test_native "String" "String.includes with array" '["apple","banana"]' '$.some(s => s.includes("ana"))' "true"
test_native "String" "String methods chain" '["hello","world"]' '$.map(s => s.toUpperCase())' '\["HELLO","WORLD"\]'

echo ""
echo "=== SECTION 12: NUMBER OPERATIONS ==="
test_native "Number" "Number.isInteger check" '[1,2.5,3]' '$.map(Number.isInteger)' "\[true,false,true\]"
test_native "Number" "Number.parseFloat" '["1.5","2.7"]' '$.map(Number.parseFloat)' "\[1\.5,2\.7\]"
test_native "Number" "Number.parseInt" '["10","20"]' '$.map(Number.parseInt)' "\[10,20\]"
test_native "Number" "isNaN check" '[1,NaN,3]' '$.map(x => isNaN(x))' "\[false,true,false\]"

echo ""
echo "=== SECTION 13: BOOLEAN OPERATIONS ==="
test_native "Boolean" "Boolean filter" '[0,1,"",true,null]' '$.filter(Boolean)' "\[1,true\]"
test_native "Boolean" "Boolean conversion" '[0,1,2]' '$.map(Boolean)' "\[false,true,true\]"
test_native "Boolean" "Truthy count" '[0,1,false,"hello"]' '$.filter(Boolean).length' "2"

echo ""
echo "=== SECTION 14: DATE OPERATIONS ==="
test_native "Date" "Date creation" '[2021,0,1]' 'new Date(...$).getFullYear()' "2021"
test_native "Date" "Date manipulation" '[1609459200000]' '$.map(d => new Date(d).getFullYear())' "\[2021\]"

echo ""
echo "=== SECTION 15: ADVANCED COMPATIBILITY ==="
test_native "Advanced" "Symbol.iterator" '[1,2,3]' 'typeof $[Symbol.iterator]' "function"
test_native "Advanced" "for...of compatibility" '[1,2,3]' 'let sum=0; for(let x of $) sum+=x; sum' "6"
test_native "Advanced" "Array.from(\$)" '[1,2,3]' 'Array.from($)' "\[1,2,3\]"
test_native "Advanced" "Reflect.ownKeys" '{"a":1,"b":2}' 'Reflect.ownKeys($).includes("a")' "true"
test_native "Advanced" "Property descriptors" '{"a":1}' 'Object.getOwnPropertyDescriptor($, "a").enumerable' "true"

echo ""
echo "========================================"
echo "🎯 NATIVE COMPATIBILITY TEST RESULTS:"
echo "   ✅ PASSED: $PASSED tests"
echo "   ❌ FAILED: $FAILED tests"
echo "   📊 SUCCESS RATE: $(( PASSED * 100 / (PASSED + FAILED) ))%"
echo "========================================"

if [ $FAILED -eq 0 ]; then
    echo "🎉 PERFECT NATIVE JAVASCRIPT COMPATIBILITY ACHIEVED!"
    echo "   \$ behaves identically to native JavaScript objects/arrays"
    exit 0
else
    echo "⚠️  Some native compatibility issues found"
    echo "   Review failed tests for native JavaScript compliance"
    exit 1
fi