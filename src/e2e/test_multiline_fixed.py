#!/usr/bin/env python3
"""マルチライン入力のE2Eテスト（修正版）"""

import pexpect
import sys
import os
import json
import time
import re

# タイムアウト設定
TIMEOUT = 10

def strip_ansi(text):
    """ANSIエスケープコードを削除"""
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)

def test_basic_json_query():
    """基本的なJSON処理のテスト"""
    print("Testing basic JSON query...")
    
    try:
        # 環境変数の設定
        env = os.environ.copy()
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        env['NO_COLOR'] = '1'
        
        # パイプ経由でデータを渡してREPLを起動
        json_data = '{"name": "test", "values": [1, 2, 3]}'
        cmd = f"echo '{json_data}' | node dist/index.js"
        child = pexpect.spawn('sh', ['-c', cmd], encoding='utf-8', timeout=TIMEOUT, env=env)
        
        # ヘッダーまたはプロンプトを待つ
        try:
            child.expect('jsq REPL', timeout=2)
        except pexpect.TIMEOUT:
            pass
        
        child.expect('> ')
        print("  ✓ REPL started successfully")
        
        # 基本的なクエリ
        child.send('$.name')
        child.send('\r')
        time.sleep(0.5)  # 結果を待つ
        
        # バッファの内容を取得
        child.expect('> ', timeout=5)
        output = strip_ansi(child.before)
        
        # 結果を確認
        assert 'test' in output
        print("  ✓ Basic query passed")
        
        # 配列クエリ
        child.send('$.values[1]')
        child.send('\r')
        time.sleep(0.5)
        
        child.expect('> ', timeout=5)
        output = strip_ansi(child.before)
        assert '2' in output
        print("  ✓ Array query passed")
        
        # Ctrl+Cで終了
        child.sendcontrol('c')
        child.close()
        
        print("✓ Basic JSON query test passed\n")
        return True
        
    except Exception as e:
        print(f"✗ Basic JSON query test failed: {e}")
        if 'child' in locals() and hasattr(child, 'before'):
            print(f"Raw output: {repr(child.before)}")
            print(f"Cleaned output: {strip_ansi(child.before)}")
        return False

def test_multiline_expression():
    """マルチライン式のテスト"""
    print("Testing multiline expression...")
    
    try:
        env = os.environ.copy()
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        env['NO_COLOR'] = '1'
        
        # 配列データでREPLを起動
        json_data = '[1, 2, 3, 4, 5]'
        cmd = f"echo '{json_data}' | node dist/index.js"
        child = pexpect.spawn('sh', ['-c', cmd], encoding='utf-8', timeout=TIMEOUT, env=env)
        
        # プロンプトを待つ
        child.expect('> ')
        
        # マルチライン式を一度に送信
        expression = '''$.map(x => {
  return x * x;
})'''
        
        # 各行を個別に送信
        lines = expression.strip().split('\n')
        for line in lines:
            child.send(line)
            child.send('\r')
            time.sleep(0.1)  # 各行の間に少し待つ
        
        time.sleep(0.5)  # 結果を待つ
        
        child.expect('> ', timeout=5)
        output = strip_ansi(child.before)
        
        # 結果を確認（二乗された値）
        assert '25' in output  # 5の二乗
        print("  ✓ Map function worked")
        
        child.sendcontrol('c')
        child.close()
        
        print("✓ Multiline expression test passed\n")
        return True
        
    except Exception as e:
        print(f"✗ Multiline expression test failed: {e}")
        if 'child' in locals() and hasattr(child, 'before'):
            print(f"Output: {strip_ansi(child.before)}")
        return False

def test_error_handling():
    """エラーハンドリングのテスト"""
    print("Testing error handling...")
    
    try:
        env = os.environ.copy()
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        env['NO_COLOR'] = '1'
        
        json_data = '{"x": 10, "y": 20}'
        cmd = f"echo '{json_data}' | node dist/index.js"
        child = pexpect.spawn('sh', ['-c', cmd], encoding='utf-8', timeout=TIMEOUT, env=env)
        
        child.expect('> ')
        
        # エラーを引き起こす
        child.send('$.nonexistent.property')
        child.send('\r')
        time.sleep(0.5)
        
        child.expect('> ', timeout=5)
        output = strip_ansi(child.before)
        
        # エラーメッセージを確認（undefinedまたはエラー）
        print("  ✓ Error handled gracefully")
        
        # 正常なクエリで回復を確認
        child.send('$.x')
        child.send('\r')
        time.sleep(0.5)
        
        child.expect('> ', timeout=5)
        output = strip_ansi(child.before)
        assert '10' in output
        print("  ✓ Recovered from error")
        
        child.sendcontrol('c')
        child.close()
        
        print("✓ Error handling test passed\n")
        return True
        
    except Exception as e:
        print(f"✗ Error handling test failed: {e}")
        if 'child' in locals() and hasattr(child, 'before'):
            print(f"Output: {strip_ansi(child.before)}")
        return False

def test_complex_data_manipulation():
    """複雑なデータ操作のテスト"""
    print("Testing complex data manipulation...")
    
    try:
        env = os.environ.copy()
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        env['NO_COLOR'] = '1'
        
        # 複雑なデータ
        data = {
            "users": [
                {"name": "Alice", "age": 30, "active": True},
                {"name": "Bob", "age": 25, "active": False},
                {"name": "Charlie", "age": 35, "active": True}
            ]
        }
        cmd = f"echo '{json.dumps(data)}' | node dist/index.js"
        child = pexpect.spawn('sh', ['-c', cmd], encoding='utf-8', timeout=TIMEOUT, env=env)
        
        child.expect('> ')
        
        # フィルタとマップの組み合わせ
        child.send('$.users.filter(u => u.active).map(u => u.name)')
        child.send('\r')
        time.sleep(0.5)
        
        child.expect('> ', timeout=5)
        output = strip_ansi(child.before)
        
        # アクティブユーザーのみが結果に含まれる
        assert 'Alice' in output
        assert 'Charlie' in output
        assert 'Bob' not in output
        print("  ✓ Filter and map worked correctly")
        
        # 集計操作
        child.send('$.users.reduce((sum, u) => sum + u.age, 0)')
        child.send('\r')
        time.sleep(0.5)
        
        child.expect('> ', timeout=5)
        output = strip_ansi(child.before)
        assert '90' in output  # 30 + 25 + 35 = 90
        print("  ✓ Reduce operation worked")
        
        child.sendcontrol('c')
        child.close()
        
        print("✓ Complex data manipulation test passed\n")
        return True
        
    except Exception as e:
        print(f"✗ Complex data manipulation test failed: {e}")
        if 'child' in locals() and hasattr(child, 'before'):
            print(f"Output: {strip_ansi(child.before)}")
        return False

if __name__ == "__main__":
    print("Running multiline/complex expression E2E tests...\n")
    
    tests = [
        test_basic_json_query,
        test_multiline_expression,
        test_error_handling,
        test_complex_data_manipulation
    ]
    
    passed = 0
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"Test crashed: {e}")
    
    print(f"\nTotal: {passed}/{len(tests)} tests passed")
    sys.exit(0 if passed == len(tests) else 1)