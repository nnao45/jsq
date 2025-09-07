#!/bin/bash

echo "=== Testing Deno REPL with stdin ==="
echo '{"value": 123}' | deno run --allow-env --allow-read dist/index.js <<EOF
value
value * 2
EOF