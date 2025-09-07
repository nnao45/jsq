#\!/usr/bin/expect -f

set timeout 10

# 対話的にREPLを起動
spawn node dist/index.js

# プロンプトを待つ
expect ">"

# JSONデータを入力
send "{\"a\": 1, \"b\": 2}\r"

# プロンプトを待つ
expect ">"

# 式を入力
send ".a\r"

# 結果を確認
expect {
    "1" {
        puts "\n✓ Result displayed: 1"
    }
    timeout {
        puts "\n✗ No result displayed"
    }
}

# 終了
send "\x03"
expect eof
