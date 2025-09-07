#!/bin/bash

# REPLのリアルタイム評価E2Eテストスクリプト

echo "Building JSQ..."
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo ""
echo "Running REPL real-time evaluation E2E tests..."
echo ""

# Run the expect script
expect src/e2e/repl-realtime-eval.exp

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All real-time evaluation tests passed!"
else
    echo ""
    echo "❌ Some real-time evaluation tests failed!"
    exit 1
fi