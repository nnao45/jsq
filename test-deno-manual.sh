#!/bin/bash

echo "=== Manual test for Deno REPL ==="
echo "Try typing '123' and see what happens"
echo ""

echo '{"test": "data"}' | deno run --allow-env --allow-read dist/index.js