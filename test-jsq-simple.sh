#!/bin/bash

# First test: Check if REPL starts with piped data
echo "Test 1: Starting REPL with piped data..."
echo '{"name": "test", "value": 42}' | timeout 2 bun dist/index-bun.js
echo "Exit code: $?"

# Second test: Check if we can run a single expression
echo -e "\nTest 2: Running single expression..."
echo '{"name": "test", "value": 42}' | bun dist/index-bun.js '$.name'