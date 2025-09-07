#\!/bin/bash
# verboseモードでREPLテスト

(
    echo '{"a": 1, "b": 2}'
    sleep 1
    echo ".a"
    sleep 1
    echo ".b + 10" 
    sleep 1
) | node dist/index.js -v 2>&1 | head -30
EOF < /dev/null