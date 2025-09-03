#!/bin/bash

echo "Testing REPL file mode with debug output..."
echo

# Test 1: REPL with piped input
echo "Test 1: REPL with piped input and file mode"
echo '{"name": "test", "value": 42}' | timeout 5 node dist/index.js --repl --repl-file-mode || echo "Timeout (expected)"

echo
echo "Test 2: Direct REPL file mode (needs TTY)"
echo "Starting jsq REPL in file mode..."
script -q -c "timeout 5 node dist/index.js --repl-file-mode" /dev/null || echo "Timeout (expected)"