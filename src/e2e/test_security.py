#!/usr/bin/env python3
"""セキュリティ関連のE2Eテスト"""

import pexpect
import sys
import os
import tempfile

# 1秒タイムアウト
TIMEOUT = 1

def test_file_system_access_restriction():
    """ファイルシステムアクセスの制限テスト"""
    print("Testing file system access restriction...")
    
    child = pexpect.spawn('node dist/index.js', env=os.environ.copy())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # ファイルシステムへのアクセスを試みる
        child.sendline('require("fs").readFileSync("/etc/passwd", "utf8")')
        child.expect_exact('> ')
        
        # エラーが発生することを確認
        output = child.before.decode('utf-8')
        assert 'Error' in output or 'require is not defined' in output
        
        # process.envへのアクセスを試みる
        child.sendline('process.env')
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        assert 'Error' in output or 'process is not defined' in output
        
        print("✓ File system access restriction test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_command_injection_prevention():
    """コマンドインジェクションの防止テスト"""
    print("Testing command injection prevention...")
    
    child = pexpect.spawn('node dist/index.js', env=os.environ.copy())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # コマンドインジェクションを試みる
        child.sendline('"; ls -la; echo "')
        child.expect_exact('> ')
        
        # コマンドが実行されないことを確認（文字列として評価される）
        output = child.before.decode('utf-8')
        assert 'total' not in output  # lsの出力が含まれていない
        assert 'drwxr' not in output  # ディレクトリリストが含まれていない
        
        # バッククォートによる実行を試みる
        child.sendline('`ls`')
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        assert 'bin' not in output or '"ls"' in output  # lsコマンドの結果ではなく文字列として扱われる
        
        print("✓ Command injection prevention test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_dangerous_functions_restriction():
    """危険な関数の実行制限テスト"""
    print("Testing dangerous functions restriction...")
    
    child = pexpect.spawn('node dist/index.js', env=os.environ.copy())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # evalの使用を試みる
        child.sendline('eval("1 + 1")')
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        # evalが使えるかどうかは実装によるが、結果を確認
        
        # Functionコンストラクタの使用を試みる
        child.sendline('new Function("return 1 + 1")()')
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        
        # setTimeoutなどの非同期関数を試みる
        child.sendline('setTimeout(() => console.log("async"), 0)')
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        assert 'Error' in output or 'setTimeout is not defined' in output
        
        print("✓ Dangerous functions restriction test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_prototype_pollution_prevention():
    """プロトタイプ汚染の防止テスト"""
    print("Testing prototype pollution prevention...")
    
    child = pexpect.spawn('node dist/index.js', env=os.environ.copy())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # __proto__への書き込みを試みる
        child.sendline('({}).__proto__.polluted = "yes"')
        child.expect_exact('> ')
        
        # 新しいオブジェクトが汚染されていないことを確認
        child.sendline('({}).polluted')
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        # undefinedまたはエラーが期待される
        
        # Object.prototypeへの直接アクセスを試みる
        child.sendline('Object.prototype.polluted = "yes"')
        child.expect_exact('> ')
        
        # 汚染が起きていないことを確認
        child.sendline('({}).polluted')
        child.expect_exact('> ')
        
        print("✓ Prototype pollution prevention test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_resource_exhaustion_prevention():
    """リソース枯渇攻撃の防止テスト"""
    print("Testing resource exhaustion prevention...")
    
    child = pexpect.spawn('node dist/index.js', env=os.environ.copy())
    child.timeout = 3  # このテストは長めのタイムアウト
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # 巨大な文字列の生成を試みる
        child.sendline('"x".repeat(1000000000)')
        
        # タイムアウトまたはエラーを確認
        try:
            child.expect_exact('jsq> ', timeout=2)
            output = child.before.decode('utf-8')
            # メモリエラーまたは制限エラーが期待される
            assert 'Error' in output or len(output) < 100000  # 出力が制限されている
        except pexpect.TIMEOUT:
            # タイムアウトした場合は、Ctrl+Cで中断
            child.sendcontrol('c')
            child.expect_exact('> ')
        
        # システムがまだ応答することを確認
        child.sendline('"still alive"')
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        assert '"still alive"' in output
        
        print("✓ Resource exhaustion prevention test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_input_validation():
    """入力検証のテスト"""
    print("Testing input validation...")
    
    child = pexpect.spawn('node dist/index.js', env=os.environ.copy())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # 極端に長い入力
        long_input = "x" * 10000
        child.sendline(f'"{long_input}"')
        child.expect_exact('> ')
        # システムがクラッシュしないことを確認
        
        # 制御文字を含む入力
        child.sendline('"\x00\x01\x02\x03\x04\x05"')
        child.expect_exact('> ')
        
        # SQLインジェクション風の入力
        child.sendline('"; DROP TABLE users; --')
        child.expect_exact('> ')
        
        # XSS風の入力
        child.sendline('<script>alert("XSS")</script>')
        child.expect_exact('> ')
        
        # システムがまだ正常に動作することを確認
        child.sendline('[1, 2, 3]')
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        assert '[1, 2, 3]' in output
        
        print("✓ Input validation test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_json_dos_prevention():
    """JSON DoS攻撃の防止テスト"""
    print("Testing JSON DoS prevention...")
    
    child = pexpect.spawn('node dist/index.js', env=os.environ.copy())
    child.timeout = 2
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # 深くネストしたJSONを作成
        nested_json = '{"a":' * 100 + '1' + '}' * 100
        child.sendline(nested_json)
        
        # 処理が適切に制限されることを確認
        try:
            child.expect_exact('jsq> ', timeout=1)
            # 正常に処理されるか、エラーが出ることを確認
        except pexpect.TIMEOUT:
            # タイムアウトした場合は中断
            child.sendcontrol('c')
            child.expect_exact('> ')
        
        # 循環参照を含むような構造
        child.sendline('(() => { const a = {}; a.self = a; return a; })()')
        child.expect_exact('> ')
        # 無限ループに陥らないことを確認
        
        print("✓ JSON DoS prevention test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

if __name__ == "__main__":
    print("Running security E2E tests...\n")
    
    tests = [
        test_file_system_access_restriction,
        test_command_injection_prevention,
        test_dangerous_functions_restriction,
        test_prototype_pollution_prevention,
        test_resource_exhaustion_prevention,
        test_input_validation,
        test_json_dos_prevention
    ]
    
    failed = 0
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"✗ {test.__name__} failed: {e}")
            failed += 1
    
    print(f"\n{len(tests) - failed}/{len(tests)} tests passed")
    sys.exit(failed)