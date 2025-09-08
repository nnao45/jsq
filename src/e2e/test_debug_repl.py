#!/usr/bin/env python3
"""REPL入出力動作のデバッグテスト"""

import pexpect
import sys
import os
import time

# タイムアウト設定
TIMEOUT = 3

def test_basic_pipe_input():
    """パイプ入力の基本動作テスト"""
    print("\n=== Testing basic pipe input ===")
    try:
        # パイプでデータを渡す
        env = os.environ.copy()
        env['NO_COLOR'] = '1'
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        
        child = pexpect.spawn('sh', ['-c', 'echo \'{"test": 123}\' | node dist/index.js'], 
                              encoding='utf-8', timeout=TIMEOUT, env=env)
        
        # REPLヘッダーをスキップ
        index = child.expect(['jsq>', 'jsq REPL', pexpect.TIMEOUT], timeout=TIMEOUT)
        if index == 1:
            child.expect_exact('jsq>')
        elif index == 2:
            print("✗ Timeout waiting for prompt")
            return False
        
        # 基本的な式の評価
        child.sendline('_.test')
        child.expect_exact('jsq>')
        output = child.before
        
        if '123' in output:
            print("✓ Basic pipe input test passed")
            success = True
        else:
            print(f"✗ Expected '123' in output, got: {repr(output)}")
            success = False
        
        # 終了
        child.sendline('.exit')
        child.expect(pexpect.EOF)
        return success
        
    except Exception as e:
        print(f"✗ Error in basic pipe input test: {str(e)}")
        if 'child' in locals() and child.isalive():
            child.terminate()
        return False

def test_interactive_input():
    """対話的入力の動作テスト"""
    print("\n=== Testing interactive input ===")
    try:
        env = os.environ.copy()
        env['NO_COLOR'] = '1'
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        
        # 対話的モード（標準入力なし）
        child = pexpect.spawn('node dist/index.js', encoding='utf-8', timeout=TIMEOUT, env=env)
        
        # REPLヘッダーをスキップ
        index = child.expect(['jsq>', 'jsq REPL', pexpect.TIMEOUT], timeout=TIMEOUT)
        if index == 1:
            child.expect_exact('jsq>')
        elif index == 2:
            print("✗ Timeout waiting for prompt")
            return False
        
        # 手動でデータを入力
        child.sendline('{"manual": "data", "value": 42}')
        child.expect_exact('jsq>')
        
        # データにアクセス
        child.sendline('_.value')
        child.expect_exact('jsq>')
        output = child.before
        
        if '42' in output:
            print("✓ Interactive input test passed")
            success = True
        else:
            print(f"✗ Expected '42' in output, got: {repr(output)}")
            success = False
        
        # 終了
        child.sendline('.exit')
        child.expect(pexpect.EOF)
        return success
        
    except Exception as e:
        print(f"✗ Error in interactive input test: {str(e)}")
        if 'child' in locals() and child.isalive():
            child.terminate()
        return False

def test_multiline_input_debug():
    """複数行入力のデバッグテスト"""
    print("\n=== Testing multiline input debug ===")
    try:
        env = os.environ.copy()
        env['NO_COLOR'] = '1'
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        
        child = pexpect.spawn('node dist/index.js', encoding='utf-8', timeout=TIMEOUT, env=env)
        
        # REPLヘッダーをスキップ
        index = child.expect(['jsq>', 'jsq REPL', pexpect.TIMEOUT], timeout=TIMEOUT)
        if index == 1:
            child.expect_exact('jsq>')
        elif index == 2:
            print("✗ Timeout waiting for prompt")
            return False
        
        # 複数行の関数を入力
        child.sendline('const add = (a, b) => {')
        time.sleep(0.1)
        child.sendline('  return a + b;')
        time.sleep(0.1)
        child.sendline('}')
        child.expect_exact('jsq>')
        
        # 関数を使用
        child.sendline('add(10, 20)')
        child.expect_exact('jsq>')
        output = child.before
        
        if '30' in output:
            print("✓ Multiline input debug test passed")
            success = True
        else:
            print(f"✗ Expected '30' in output, got: {repr(output)}")
            success = False
        
        # 終了
        child.sendline('.exit')
        child.expect(pexpect.EOF)
        return success
        
    except Exception as e:
        print(f"✗ Error in multiline input debug test: {str(e)}")
        if 'child' in locals() and child.isalive():
            child.terminate()
        return False

def test_special_characters_debug():
    """特殊文字処理のデバッグテスト"""
    print("\n=== Testing special characters debug ===")
    try:
        env = os.environ.copy()
        env['NO_COLOR'] = '1'
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        
        child = pexpect.spawn('node dist/index.js', encoding='utf-8', timeout=TIMEOUT, env=env)
        
        # REPLヘッダーをスキップ
        index = child.expect(['jsq>', 'jsq REPL', pexpect.TIMEOUT], timeout=TIMEOUT)
        if index == 1:
            child.expect_exact('jsq>')
        elif index == 2:
            print("✗ Timeout waiting for prompt")
            return False
        
        # 特殊文字を含む文字列
        test_cases = [
            ('"hello\\nworld"', ['hello', 'world']),
            ('"tab\\there"', ['tab', 'here']),
            ('"quote\\"test\\""', ['quote', 'test']),
        ]
        
        all_passed = True
        for input_str, expected_parts in test_cases:
            child.sendline(input_str)
            child.expect_exact('jsq>')
            output = child.before
            
            passed = all(part in output for part in expected_parts)
            if passed:
                print(f"  ✓ {input_str} handled correctly")
            else:
                print(f"  ✗ {input_str} failed - got: {repr(output)}")
                all_passed = False
        
        if all_passed:
            print("✓ Special characters debug test passed")
        
        # 終了
        child.sendline('.exit')
        child.expect(pexpect.EOF)
        return all_passed
        
    except Exception as e:
        print(f"✗ Error in special characters debug test: {str(e)}")
        if 'child' in locals() and child.isalive():
            child.terminate()
        return False

def test_error_output_debug():
    """エラー出力のデバッグテスト"""
    print("\n=== Testing error output debug ===")
    try:
        env = os.environ.copy()
        env['NO_COLOR'] = '1'
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        
        child = pexpect.spawn('node dist/index.js', encoding='utf-8', timeout=TIMEOUT, env=env)
        
        # REPLヘッダーをスキップ
        index = child.expect(['jsq>', 'jsq REPL', pexpect.TIMEOUT], timeout=TIMEOUT)
        if index == 1:
            child.expect_exact('jsq>')
        elif index == 2:
            print("✗ Timeout waiting for prompt")
            return False
        
        # 各種エラーをテスト
        error_cases = [
            ('undefined.foo', 'TypeError'),
            ('JSON.parse("invalid")', 'SyntaxError'),
            ('[1,2,3].map(x => x.)', 'SyntaxError'),
        ]
        
        all_passed = True
        for expr, expected_error in error_cases:
            child.sendline(expr)
            child.expect_exact('jsq>')
            output = child.before
            
            if expected_error in output or 'Error' in output:
                print(f"  ✓ {expr} produced expected error")
            else:
                print(f"  ✗ {expr} did not produce error - got: {repr(output)}")
                all_passed = False
        
        # エラー後も正常に動作することを確認
        child.sendline('"after errors"')
        child.expect_exact('jsq>')
        output = child.before
        
        if 'after errors' in output:
            print("  ✓ REPL recovered after errors")
        else:
            print("  ✗ REPL did not recover properly")
            all_passed = False
        
        if all_passed:
            print("✓ Error output debug test passed")
        
        # 終了
        child.sendline('.exit')
        child.expect(pexpect.EOF)
        return all_passed
        
    except Exception as e:
        print(f"✗ Error in error output debug test: {str(e)}")
        if 'child' in locals() and child.isalive():
            child.terminate()
        return False

if __name__ == '__main__':
    print("Running REPL debug tests...\n")
    
    tests = [
        test_basic_pipe_input,
        test_interactive_input,
        test_multiline_input_debug,
        test_special_characters_debug,
        test_error_output_debug
    ]
    
    failed = 0
    for test in tests:
        if not test():
            failed += 1
    
    print(f"\n{len(tests) - failed}/{len(tests)} tests passed")
    print("\n=== Debug test suite completed ===")
    sys.exit(failed)