#!/bin/bash
# エコーバックテスト

(
    echo '{"a": 1, "b": 2}'
    sleep 0.5
    echo "$.a"
    sleep 0.5
    echo "$.b + 10" 
    sleep 0.5
) | timeout 5 node dist/index.js --verbose 2>&1