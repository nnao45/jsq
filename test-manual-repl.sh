#!/bin/bash
echo "Starting REPL file mode test..."

# Start jsq in background
echo '{"message": [1,2,3]}' | node dist/index.js --repl --repl-file-mode 2>&1 &
PID=$!

# Wait for initialization
sleep 2

# Find the temp files
INPUT_FILE=$(ls /tmp/jsq-repl-input-* 2>/dev/null | head -1)
OUTPUT_FILE=$(ls /tmp/jsq-repl-output-* 2>/dev/null | head -1)

echo "Input file: $INPUT_FILE"
echo "Output file: $OUTPUT_FILE"

# Monitor files in another terminal
if [ -n "$INPUT_FILE" ]; then
  echo "Monitoring input file..."
  tail -f "$INPUT_FILE" 2>/dev/null &
  TAIL_PID=$!
fi

# Keep running for a bit
sleep 10

# Clean up
kill $PID 2>/dev/null
kill $TAIL_PID 2>/dev/null