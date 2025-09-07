#!/bin/bash

# Direct test of REPL without expect
echo "Testing REPL directly with verbose mode..."

# Test 1: Simple expression
echo '{"test": "hello"}' | timeout 5 node dist/index.js --verbose 2>&1