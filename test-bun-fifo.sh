#!/bin/bash

echo "🧪 Testing Bun JSQ with FIFO"

# Create named pipe
FIFO="/tmp/jsq-test-$$"
mkfifo "$FIFO"

# Start JSQ with piped data, reading commands from FIFO
echo '{"name": "test", "value": 42}' | bun dist/index-bun.js --verbose < "$FIFO" &
JSQ_PID=$!

# Give it time to start
sleep 1

# Send commands to FIFO
echo "$.name" > "$FIFO"
sleep 0.5
echo "$.value" > "$FIFO"
sleep 0.5
echo ".exit" > "$FIFO"

# Wait for JSQ to finish
wait $JSQ_PID

# Clean up
rm -f "$FIFO"