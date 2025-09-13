#!/bin/bash

# Test JSQ with pipe input and interactive commands

# Create a test script that sends commands to the REPL
cat <<'EOF' > test-commands.txt
$.name
$.value * 2
.exit
EOF

# Run JSQ with piped data and send commands
echo '{"name": "test", "value": 42}' | bun dist/index-bun.js < test-commands.txt

# Clean up
rm -f test-commands.txt