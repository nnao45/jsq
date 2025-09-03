#!/bin/bash

# Create test data file
echo '{"message": [1,2,3]}' > /tmp/test-data.json

# Run jsq with file option directly
echo "Running jsq with file option..."
node dist/index.js --file /tmp/test-data.json --repl --repl-file-mode