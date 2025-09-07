#!/bin/bash
# Test Deno REPL with verbose output

echo "Testing Deno REPL with verbose mode..."
(
  echo '{"data": 123}'
  sleep 1
  echo "data"
  sleep 1
  echo -e "\x03"
) | deno run --allow-env --allow-read dist/index.js --verbose