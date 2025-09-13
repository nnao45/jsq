#!/bin/bash

# Test jsq with bun in interactive mode
echo '{"name": "test", "value": 42}' | script -q -c "bun dist/index-bun.js -v" /dev/null