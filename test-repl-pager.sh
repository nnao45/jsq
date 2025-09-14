#!/bin/bash

# Test script for REPL pager functionality

echo "Testing JSQ REPL Ctrl+R functionality..."
echo ""
echo "Instructions:"
echo "1. Type an expression like: [1,2,3].map(x => x*2)"
echo "2. Press Enter to evaluate"
echo "3. Press Ctrl+R to view the result in pager mode"
echo "4. Press 'q' to exit pager and return to REPL"
echo "5. Press Ctrl+D to exit REPL"
echo ""
echo "Starting REPL..."

# Start REPL with some initial data
echo '{"test": [1,2,3], "nested": {"value": 42}}' | node dist/index.js