#!/bin/bash

# Test jsq REPL with debug output
echo "Testing jsq REPL with Bun..."
echo '["hello", "world"]' > test-input.txt

# Run with input and send some commands
(cat test-input.txt; sleep 1; echo '$[0]'; sleep 1; echo '.exit') | bun dist/index.js -v 2>&1 | tee jsq-repl-output.log

echo -e "\n\nOutput saved to jsq-repl-output.log"