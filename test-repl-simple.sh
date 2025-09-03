#!/bin/bash
echo "Testing REPL file mode..."
echo '{"message": [1,2,3]}' | timeout 5 node dist/index.js --repl --repl-file-mode <<EOF
$.message
EOF