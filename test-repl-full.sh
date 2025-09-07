#!/bin/bash

echo "Testing REPL evaluation..."

# Create a temp file for output
OUTPUT_FILE=$(mktemp)

# Run jsq with expect
expect -c "
    set timeout 10
    spawn /bin/bash -c \"echo '{\\\"test\\\": \\\"data\\\"}' | npx jsq\"
    
    expect \"> \"
    send \"123\r\"
    
    expect -timeout 5 {
        \"123\" { 
            send_user \"\\n✓ REPL evaluation successful\\n\"
            send \"\003\"
        }
        timeout {
            send_user \"\\n✗ REPL evaluation failed\\n\"
            send \"\003\"
        }
    }
    
    expect eof
" > "$OUTPUT_FILE" 2>&1

# Check results
if grep -q "123" "$OUTPUT_FILE"; then
    echo "✓ Test passed - REPL evaluation is working!"
else
    echo "✗ Test failed - REPL evaluation not working"
    echo "Output:"
    cat "$OUTPUT_FILE"
fi

# Cleanup
rm -f "$OUTPUT_FILE"