#!/bin/bash

# REPLモードでテスト
echo "Testing REPL mode bug:"
echo "[1,2,3,4] | \$.aaaa" | timeout 2s node dist/index.js --repl-mode 2>/dev/null | tail -n +5 | head -n 2

echo ""
echo "Expected: undefined"
echo "Actual: [ 1, 2, 3, 4 ]"