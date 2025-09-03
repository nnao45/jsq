#!/bin/bash
echo '{"message": [1,2,3]}' | timeout 8 node dist/index.js --repl --repl-file-mode 2>&1 | grep -E "Verified written|File stats changed|evaluate\(\) called" &
PID=$!

sleep 3
echo "=== Checking temp files ==="
ls -la /tmp/jsq-repl-input-* 2>/dev/null
echo "==="

wait $PID