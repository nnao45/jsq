#!/bin/bash

# REPLファイルモードのテストスクリプト

echo "Starting REPL in file mode..."
echo "Type JavaScript expressions to query the data."
echo "Press Ctrl+C to exit."
echo ""

# TTYを偽装して実行
script -q -c "node dist/index.js --repl-file-mode" /dev/null