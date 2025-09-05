#!/bin/bash

# Build first
echo "Building..."
npm run build

# Create test data
echo '{"test": "data"}' > test-data.json

# Test non-REPL mode
echo "Testing non-REPL mode:"
echo "$.aaaaaaaaaaa:"
cat test-data.json | node dist/index.js '$.aaaaaaaaaaa'

echo -e "\n$.test:"
cat test-data.json | node dist/index.js '$.test'

# Clean up
rm test-data.json