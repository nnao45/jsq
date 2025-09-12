#!/bin/bash

echo "Testing preview line bug fix manually..."
echo "1. Type '40 + 5' and press Enter"
echo "2. Type '$' on the new line"
echo "3. Check if the old value (45) appears unexpectedly"
echo ""

# Run jsq in REPL mode
node dist/index.js