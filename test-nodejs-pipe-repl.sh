#!/bin/bash

echo "🧪 Testing Node.js JSQ with piped input and REPL commands"

# Create a temporary file for commands
COMMANDS_FILE="/tmp/jsq-test-commands-$$"
cat > "$COMMANDS_FILE" << 'EOF'
$.name
$.value
.exit
EOF

# Test with Node.js
echo "=== Node.js Test ==="
(cat "$COMMANDS_FILE"; sleep 1) | (echo '{"name": "test", "value": 42}' | node dist/index.js)

echo -e "\n=== Bun Test ==="
(cat "$COMMANDS_FILE"; sleep 1) | (echo '{"name": "test", "value": 42}' | bun dist/index-bun.js)

# Clean up
rm -f "$COMMANDS_FILE"