#!/bin/bash
echo "Testing REPL file mode with manual input..."
echo '{"message": [1,2,3]}' | node dist/index.js --repl --repl-file-mode 2>&1 &
PID=$!

sleep 2
echo "Checking temp files..."
ls -la /tmp/jsq-repl-* 2>/dev/null || echo "No temp files found"

sleep 3
kill $PID 2>/dev/null