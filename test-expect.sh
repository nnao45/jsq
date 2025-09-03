#!/usr/bin/expect -f

set timeout 10

spawn sh -c "echo '{\"message\": \[1,2,3\]}' | node dist/index.js --repl --repl-file-mode 2>&1"

expect "> "
send "$.message\r"

expect {
    "\[1,2,3\]" { puts "\nSUCCESS: Got expected output" }
    timeout { puts "\nTIMEOUT: No response" }
}

send "\003"
expect eof