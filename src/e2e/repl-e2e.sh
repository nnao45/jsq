#!/bin/bash

# REPL E2E Test Script
# This script tests basic REPL functionality without expect

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting JSQ REPL E2E Tests (Shell version)"
echo "=========================================="

# Test helper functions
test_success() {
    echo -e "${GREEN}✓${NC} $1"
}

test_failure() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Test 1: Basic expression evaluation with piped input
echo -e "\n=== Test 1: Basic expression with piped input ==="
result=$(echo '{"test": "hello"}' | node dist/index.js '$.test' 2>&1)
if [[ "$result" == *"hello"* ]]; then
    test_success "Basic query with piped input"
else
    test_failure "Basic query failed: $result"
fi

# Test 2: Math expression without input
echo -e "\n=== Test 2: Math expression without input ==="
result=$(node dist/index.js '1 + 2 + 3' 2>&1)
if [[ "$result" == "6" ]]; then
    test_success "Math expression without input"
else
    test_failure "Math expression failed: $result"
fi

# Test 3: Complex query with piped input
echo -e "\n=== Test 3: Complex query ==="
result=$(echo '{"users": [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]}' | node dist/index.js '$.users.filter(u => u.age > 26).map(u => u.name)' 2>&1)
if [[ "$result" == *"Alice"* ]]; then
    test_success "Complex filter and map query"
else
    test_failure "Complex query failed: $result"
fi

# Test 4: File input
echo -e "\n=== Test 4: File input ==="
echo '{"from_file": true, "data": [1,2,3]}' > /tmp/jsq-test.json
result=$(node dist/index.js -f /tmp/jsq-test.json '$.data.reduce((a,b) => a+b, 0)' 2>&1)
rm -f /tmp/jsq-test.json
if [[ "$result" == "6" ]]; then
    test_success "File input with reduce"
else
    test_failure "File input failed: $result"
fi

# Test 5: JSONL streaming
echo -e "\n=== Test 5: JSONL streaming ==="
echo -e '{"id": 1, "value": 10}\n{"id": 2, "value": 20}\n{"id": 3, "value": 30}' > /tmp/jsq-test.jsonl
result=$(node dist/index.js -f /tmp/jsq-test.jsonl '$.value' 2>&1)
rm -f /tmp/jsq-test.jsonl
if [[ "$result" == *"10"* ]] && [[ "$result" == *"20"* ]] && [[ "$result" == *"30"* ]]; then
    test_success "JSONL streaming"
else
    test_failure "JSONL streaming failed: $result"
fi

# Test 6: CSV input
echo -e "\n=== Test 6: CSV input ==="
echo -e "name,age\nAlice,30\nBob,25" > /tmp/jsq-test.csv
result=$(node dist/index.js -f /tmp/jsq-test.csv '$.data.map(row => row.name)' 2>&1)
rm -f /tmp/jsq-test.csv
if [[ "$result" == *"Alice"* ]] && [[ "$result" == *"Bob"* ]]; then
    test_success "CSV input processing"
else
    test_failure "CSV input failed: $result"
fi

# Test 7: Lodash methods
echo -e "\n=== Test 7: Lodash methods ==="
result=$(echo '[1,2,3,4,5]' | node dist/index.js '_.chunk($, 2)' 2>&1)
if [[ "$result" == *"[[1,2],[3,4],[5]]"* ]] || [[ "$result" == *"[ [ 1, 2 ], [ 3, 4 ], [ 5 ] ]"* ]]; then
    test_success "Lodash chunk method"
else
    test_failure "Lodash method failed: $result"
fi

# Test 8: Error handling
echo -e "\n=== Test 8: Error handling ==="
result=$(echo '{"test": 1}' | node dist/index.js '$.nonexistent.property' 2>&1 || true)
if [[ "$result" == *"undefined"* ]] || [[ "$result" == "" ]]; then
    test_success "Handled undefined property access"
else
    test_failure "Error handling unexpected: $result"
fi

# Test 9: Parallel processing (if available)
echo -e "\n=== Test 9: Parallel processing ==="
echo -e '{"value": 1}\n{"value": 2}\n{"value": 3}' > /tmp/jsq-test-parallel.jsonl
result=$(node dist/index.js -f /tmp/jsq-test-parallel.jsonl -p '$.value * 2' 2>&1)
rm -f /tmp/jsq-test-parallel.jsonl
if [[ "$result" == *"2"* ]] && [[ "$result" == *"4"* ]] && [[ "$result" == *"6"* ]]; then
    test_success "Parallel processing"
else
    test_failure "Parallel processing failed: $result"
fi

# Test 10: REPL mode check (just verify it starts)
echo -e "\n=== Test 10: REPL mode startup ==="
timeout 2 bash -c 'echo "{}" | node dist/index.js' > /tmp/jsq-repl-test.log 2>&1 || true
if grep -q "jsq REPL" /tmp/jsq-repl-test.log; then
    test_success "REPL mode starts correctly"
else
    test_failure "REPL mode failed to start"
fi
rm -f /tmp/jsq-repl-test.log

echo -e "\n=========================================="
echo -e "${GREEN}All shell-based E2E tests passed!${NC}"