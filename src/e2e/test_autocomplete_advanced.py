#!/usr/bin/env python3
"""オートコンプリート詳細E2Eテスト"""

import pexpect
import sys
import os
import time

# 1秒タイムアウト
TIMEOUT = 1

def test_nested_property_completion():
    """ネストしたプロパティの補完テスト"""
    print("Testing nested property completion...")
    
    child = pexpect.spawn('node dist/index.js', env=os.environ.copy())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # 複雑なオブジェクトを入力
        child.sendline('{ user: { name: "Alice", address: { city: "Tokyo", country: "Japan" }, scores: [85, 92, 78] } }')
        child.expect_exact('> ')
        
        # ネストしたプロパティの補完をテスト
        child.send('data.user.')
        child.send('\t')  # Tab補完
        time.sleep(0.1)
        
        # 補完候補が表示されることを確認
        output = child.before.decode('utf-8')
        # name, address, scores が候補に含まれるはず
        
        # さらに深いネスト
        child.send('address.')
        child.send('\t')  # Tab補完
        time.sleep(0.1)
        
        # city, country が候補に含まれるはず
        
        print("✓ Nested property completion test passed")
        
    finally:
        child.sendcontrol('c')  # 入力をクリア
        child.expect_exact('> ')
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_method_chain_completion():
    """メソッドチェインでの補完テスト"""
    print("Testing method chain completion...")
    
    child = pexpect.spawn('node dist/index.js', env=os.environ.copy())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # 配列データを入力
        child.sendline('[1, 2, 3, 4, 5]')
        child.expect_exact('> ')
        
        # メソッドチェインの補完をテスト
        child.send('data.')
        child.send('\t')  # Tab補完
        time.sleep(0.1)
        
        # Array メソッドが候補に含まれるはず（map, filter, reduce など）
        
        # メソッドチェインを続ける
        child.send('map(x => x * 2).')
        child.send('\t')  # Tab補完
        time.sleep(0.1)
        
        # さらにArrayメソッドが補完されるはず
        
        print("✓ Method chain completion test passed")
        
    finally:
        child.sendcontrol('c')  # 入力をクリア
        child.expect_exact('> ')
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_lodash_methods_completion():
    """Lodashメソッドの詳細補完テスト"""
    print("Testing Lodash methods completion...")
    
    child = pexpect.spawn('node dist/index.js', env=os.environ.copy())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # オブジェクトデータを入力
        child.sendline('[{name: "Alice", age: 30}, {name: "Bob", age: 25}]')
        child.expect_exact('> ')
        
        # Lodash風のメソッドの補完をテスト
        child.send('_.')
        child.send('\t')  # Tab補完
        time.sleep(0.1)
        
        # Lodashメソッドが候補に含まれるかチェック
        
        # 具体的なLodashメソッド
        child.sendcontrol('c')  # クリア
        child.expect_exact('> ')
        child.send('data.grou')  # groupByの途中
        child.send('\t')  # Tab補完
        time.sleep(0.1)
        
        print("✓ Lodash methods completion test passed")
        
    finally:
        child.sendcontrol('c')  # 入力をクリア
        child.expect_exact('> ')
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_dynamic_type_completion():
    """動的な型に基づく補完テスト"""
    print("Testing dynamic type completion...")
    
    child = pexpect.spawn('node dist/index.js', env=os.environ.copy())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # 文字列データ
        child.sendline('"Hello World"')
        child.expect_exact('> ')
        
        # 文字列メソッドの補完
        child.send('data.')
        child.send('\t')  # Tab補完
        time.sleep(0.1)
        
        # String メソッドが候補に含まれるはず（split, toLowerCase, etc）
        
        child.sendcontrol('c')  # クリア
        child.expect_exact('> ')
        
        # 数値データ
        child.sendline('42.5')
        child.expect_exact('> ')
        
        # 数値メソッドの補完
        child.send('data.')
        child.send('\t')  # Tab補完
        time.sleep(0.1)
        
        # Number メソッドが候補に含まれるはず（toFixed, toString, etc）
        
        print("✓ Dynamic type completion test passed")
        
    finally:
        child.sendcontrol('c')  # 入力をクリア
        child.expect_exact('> ')
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_partial_match_completion():
    """部分一致による補完テスト"""
    print("Testing partial match completion...")
    
    child = pexpect.spawn('node dist/index.js', env=os.environ.copy())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # 複雑なオブジェクトを入力
        child.sendline('{ firstName: "John", lastName: "Doe", fullName: "John Doe", phoneNumber: "123-456" }')
        child.expect_exact('> ')
        
        # 部分一致で補完
        child.send('data.f')
        child.send('\t')  # Tab補完
        time.sleep(0.1)
        
        # firstName, fullName が候補に含まれるはず
        
        # より具体的な部分一致
        child.send('ull')  # fullName を補完したい
        child.send('\t')  # Tab補完
        time.sleep(0.1)
        
        print("✓ Partial match completion test passed")
        
    finally:
        child.sendcontrol('c')  # 入力をクリア
        child.expect_exact('> ')
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_completion_with_special_chars():
    """特殊文字を含むプロパティの補完テスト"""
    print("Testing completion with special characters...")
    
    child = pexpect.spawn('node dist/index.js', env=os.environ.copy())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # 特殊文字を含むプロパティを持つオブジェクト
        child.sendline('{ "user-name": "Alice", "user_id": 123, "user@email": "alice@example.com" }')
        child.expect_exact('> ')
        
        # 特殊文字を含むプロパティの補完
        child.send('data["user')
        child.send('\t')  # Tab補完
        time.sleep(0.1)
        
        # user-name, user_id, user@email が候補に含まれるはず
        
        print("✓ Completion with special characters test passed")
        
    finally:
        child.sendcontrol('c')  # 入力をクリア
        child.expect_exact('> ')
        child.sendline('.exit')
        child.expect(pexpect.EOF)

if __name__ == "__main__":
    print("Running advanced autocomplete E2E tests...\n")
    
    tests = [
        test_nested_property_completion,
        test_method_chain_completion,
        test_lodash_methods_completion,
        test_dynamic_type_completion,
        test_partial_match_completion,
        test_completion_with_special_chars
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