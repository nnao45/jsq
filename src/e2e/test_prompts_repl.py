#!/usr/bin/env python3
"""
PromptsReplManager E2E tests using pexpect
"""

import os
import sys
import json
import time
import tempfile
import pexpect

# jsqのパスを取得
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
JSQ_PATH = os.path.join(PROJECT_ROOT, 'dist', 'index.js')

def create_test_data():
    """テスト用のJSONデータを作成"""
    data = {
        "users": [
            {"id": 1, "name": "Alice", "age": 30, "city": "Tokyo"},
            {"id": 2, "name": "Bob", "age": 25, "city": "Osaka"},
            {"id": 3, "name": "Charlie", "age": 35, "city": "Kyoto"}
        ],
        "products": [
            {"id": 101, "name": "Laptop", "price": 1000, "stock": 5},
            {"id": 102, "name": "Mouse", "price": 50, "stock": 20}
        ],
        "metadata": {
            "version": "1.0",
            "timestamp": "2023-01-01",
            "nested": {
                "deep": {
                    "value": "found"
                }
            }
        }
    }
    return data

def test_basic_startup():
    """基本的な起動テスト"""
    print("[TEST] Basic startup")
    
    # 一時ファイルを作成
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(create_test_data(), f)
        tmpfile = f.name
    
    try:
        # REPLを起動
        child = pexpect.spawn('node', [JSQ_PATH, '--prompts', '--file', tmpfile], 
                              encoding='utf-8', timeout=10)
        
        # 起動メッセージを確認
        child.expect('Welcome to jsq REPL \\(Prompts Edition\\)')
        child.expect('Type .help for commands')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # 終了
        child.sendline('.exit')
        child.expect('Bye!')
        child.expect(pexpect.EOF)
        
        print("✓ Basic startup test passed")
        return True
        
    except Exception as e:
        print(f"✗ Basic startup test failed: {e}")
        if 'child' in locals():
            print(f"Buffer: {child.before}")
        return False
    finally:
        os.unlink(tmpfile)

def test_basic_queries():
    """基本的なクエリテスト"""
    print("\n[TEST] Basic queries")
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(create_test_data(), f)
        tmpfile = f.name
    
    try:
        child = pexpect.spawn('node', [JSQ_PATH, '--prompts', '--file', tmpfile], 
                              encoding='utf-8', timeout=10)
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # 基本的なプロパティアクセス
        test_cases = [
            ('$.users[0].name', 'Alice'),
            ('$.users.length', '3'),
            ('$.products[1].price', '50'),
            ('$.metadata.version', '1.0'),
            ('$.metadata.nested.deep.value', 'found')
        ]
        
        for query, expected in test_cases:
            child.sendline(query)
            child.expect('→')
            child.expect(expected)
            # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        child.sendline('.exit')
        child.expect(pexpect.EOF)
        
        print("✓ Basic queries test passed")
        return True
        
    except Exception as e:
        print(f"✗ Basic queries test failed: {e}")
        if 'child' in locals():
            print(f"Buffer: {child.before}")
        return False
    finally:
        os.unlink(tmpfile)

def test_commands():
    """REPLコマンドのテスト"""
    print("\n[TEST] REPL commands")
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({"test": "data"}, f)
        tmpfile = f.name
    
    try:
        child = pexpect.spawn('node', [JSQ_PATH, '--prompts', '--file', tmpfile], 
                              encoding='utf-8', timeout=10)
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # ヘルプコマンド
        child.sendline('.help')
        child.expect('Available commands:')
        child.expect('.exit')
        child.expect('.help')
        child.expect('.clear')
        child.expect('.history')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # 履歴コマンド
        child.sendline('$.test')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        child.sendline('.history')
        child.expect('Command history:')
        child.expect('\\$.test')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # 設定表示
        child.sendline('.config')
        child.expect('Current configuration:')
        child.expect('REPL Mode:')
        child.expect('Prompts Edition')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # 不明なコマンド
        child.sendline('.unknown')
        child.expect('Unknown command:')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        child.sendline('.exit')
        child.expect(pexpect.EOF)
        
        print("✓ REPL commands test passed")
        return True
        
    except Exception as e:
        print(f"✗ REPL commands test failed: {e}")
        if 'child' in locals():
            print(f"Buffer: {child.before}")
        return False
    finally:
        os.unlink(tmpfile)

def test_error_handling():
    """エラーハンドリングのテスト"""
    print("\n[TEST] Error handling")
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({"test": "data"}, f)
        tmpfile = f.name
    
    try:
        child = pexpect.spawn('node', [JSQ_PATH, '--prompts', '--file', tmpfile], 
                              encoding='utf-8', timeout=10)
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # 構文エラー
        child.sendline('$.')
        child.expect('❌ Syntax Error:')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # 存在しないプロパティ
        child.sendline('$.nonexistent')
        child.expect('→')
        child.expect('undefined')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # 無効な式
        child.sendline('invalid expression')
        child.expect('❌')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        child.sendline('.exit')
        child.expect(pexpect.EOF)
        
        print("✓ Error handling test passed")
        return True
        
    except Exception as e:
        print(f"✗ Error handling test failed: {e}")
        if 'child' in locals():
            print(f"Buffer: {child.before}")
        return False
    finally:
        os.unlink(tmpfile)

def test_session_save_load():
    """セッションの保存と読み込みテスト"""
    print("\n[TEST] Session save/load")
    
    session_file = '/tmp/jsq-test-session.json'
    
    # 既存のセッションファイルを削除
    if os.path.exists(session_file):
        os.unlink(session_file)
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({"original": "data", "number": 42}, f)
        tmpfile = f.name
    
    try:
        # セッションを保存
        child = pexpect.spawn('node', [JSQ_PATH, '--prompts', '--file', tmpfile], 
                              encoding='utf-8', timeout=10)
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        child.sendline(f'.save {session_file}')
        child.expect('Session saved to:')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        child.sendline('.exit')
        child.expect(pexpect.EOF)
        child.wait()
        
        # セッションを読み込み
        child = pexpect.spawn('node', [JSQ_PATH, '--prompts'], 
                              encoding='utf-8', timeout=10)
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        child.sendline(f'.load {session_file}')
        child.expect('Session loaded from:')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # データが正しく読み込まれたか確認
        child.sendline('$.original')
        child.expect('→')
        child.expect('data')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        child.sendline('$.number')
        child.expect('→')
        child.expect('42')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        child.sendline('.exit')
        child.expect(pexpect.EOF)
        
        print("✓ Session save/load test passed")
        return True
        
    except Exception as e:
        print(f"✗ Session save/load test failed: {e}")
        if 'child' in locals():
            print(f"Buffer: {child.before}")
        return False
    finally:
        os.unlink(tmpfile)
        if os.path.exists(session_file):
            os.unlink(session_file)

def test_ctrl_c_handling():
    """Ctrl+C ハンドリングのテスト"""
    print("\n[TEST] Ctrl+C handling")
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({"test": "data"}, f)
        tmpfile = f.name
    
    try:
        child = pexpect.spawn('node', [JSQ_PATH, '--prompts', '--file', tmpfile], 
                              encoding='utf-8', timeout=10)
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # Ctrl+Cを送信
        child.sendcontrol('c')
        child.expect('Use .exit to quit')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # 通常の操作が続けられることを確認
        child.sendline('$.test')
        child.expect('→')
        child.expect('data')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        child.sendline('.exit')
        child.expect(pexpect.EOF)
        
        print("✓ Ctrl+C handling test passed")
        return True
        
    except Exception as e:
        print(f"✗ Ctrl+C handling test failed: {e}")
        if 'child' in locals():
            print(f"Buffer: {child.before}")
        return False
    finally:
        os.unlink(tmpfile)

def test_empty_input():
    """空入力のテスト"""
    print("\n[TEST] Empty input handling")
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({"test": "data"}, f)
        tmpfile = f.name
    
    try:
        child = pexpect.spawn('node', [JSQ_PATH, '--prompts', '--file', tmpfile], 
                              encoding='utf-8', timeout=10)
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # 空入力を送信
        child.sendline('')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # スペースのみの入力
        child.sendline('   ')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        # 通常の操作が続けられることを確認
        child.sendline('$.test')
        child.expect('→')
        child.expect('data')
        # promptsライブラリの特殊なプロンプト形式に対応
        child.expect_exact('? > › ')
        
        child.sendline('.exit')
        child.expect(pexpect.EOF)
        
        print("✓ Empty input handling test passed")
        return True
        
    except Exception as e:
        print(f"✗ Empty input handling test failed: {e}")
        if 'child' in locals():
            print(f"Buffer: {child.before}")
        return False
    finally:
        os.unlink(tmpfile)

def main():
    """メインテスト実行"""
    print("=== Prompts REPL E2E Tests ===\n")
    
    # jsqがビルドされているか確認
    if not os.path.exists(JSQ_PATH):
        print(f"Error: jsq not found at {JSQ_PATH}")
        print("Please run 'npm run build' first")
        return 1
    
    tests = [
        test_basic_startup,
        test_basic_queries,
        test_commands,
        test_error_handling,
        test_session_save_load,
        test_ctrl_c_handling,
        test_empty_input
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"✗ Test {test.__name__} crashed: {e}")
            failed += 1
    
    print(f"\n=== Test Summary ===")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Total:  {len(tests)}")
    
    return 0 if failed == 0 else 1

if __name__ == '__main__':
    sys.exit(main())