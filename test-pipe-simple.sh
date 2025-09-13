#!/bin/bash

echo "🧪 Testing JSQ with Bun - Simple pipe test"

# Test 1: Direct expression evaluation (this should work)
echo "Test 1: Direct expression with pipe"
echo '{"name": "test", "value": 42}' | bun dist/index-bun.js '$.name'
echo '{"name": "test", "value": 42}' | bun dist/index-bun.js '$.value'

# Test 2: Process substitution (might work)
echo -e "\nTest 2: Process substitution"
bun dist/index-bun.js < <(echo '{"name": "test", "value": 42}')

# Test 3: Using expect if available
if command -v expect &> /dev/null; then
    echo -e "\nTest 3: Using expect"
    expect -c '
        spawn sh -c "echo {\"name\": \"test\", \"value\": 42} | bun dist/index-bun.js"
        expect "> "
        send "$.name\r"
        expect "> "
        send ".exit\r"
        expect eof
    '
else
    echo -e "\nTest 3: expect not available"
fi

# Test 4: Named pipe (FIFO)
echo -e "\nTest 4: Named pipe test"
FIFO="/tmp/jsq-test-$$"
mkfifo "$FIFO"

# Start JSQ reading from FIFO in background
bun dist/index-bun.js < "$FIFO" &
JSQ_PID=$!

# Write data to FIFO
echo '{"name": "test", "value": 42}' > "$FIFO" &

# Wait a bit and check if process is still running
sleep 1
if ps -p $JSQ_PID > /dev/null; then
    echo "JSQ is running with FIFO input"
    kill $JSQ_PID 2>/dev/null
else
    echo "JSQ exited after reading FIFO"
fi

rm -f "$FIFO"