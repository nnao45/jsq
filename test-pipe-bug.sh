#!/bin/bash

echo "Testing pipe operator bug with arrays..."
echo ""

echo "Test 1: Direct property access on array"
echo "[1,2,3,4]" | node dist/index.js "$.aaaa"

echo ""
echo "Test 2: Pipe operator with property access"
echo "[1,2,3,4]" | node dist/index.js "[1,2,3,4] | $.aaaa"

echo ""
echo "Test 3: Direct evaluation result"  
echo "[1,2,3,4]" | node dist/index.js "([1,2,3,4]).aaaa"

echo ""
echo "Test 4: With verbose mode to see transformation"
echo "[1,2,3,4]" | node dist/index.js --verbose "[1,2,3,4] | $.aaaa" 2>&1 | grep -E "Transformed|Result"