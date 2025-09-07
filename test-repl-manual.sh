#!/bin/bash
# 手動でREPLをテスト

echo '{"a": 1, "b": 2}' | (
    echo ".a"
    echo ".b + 10"
    sleep 0.1
) | node dist/index.js 2>&1 | head -20