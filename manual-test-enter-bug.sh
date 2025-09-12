#!/bin/bash

echo "Testing enter newline bug fix..."
echo "1. Type: 3*15"
echo "2. Press Enter to see result"
echo "3. Press Enter again to create empty line"
echo "4. Type: \$"
echo "5. Check if it shows null/undefined instead of 45"
echo ""
echo "Starting jsq in prompts mode..."

echo '{}' | node dist/index.js --prompts