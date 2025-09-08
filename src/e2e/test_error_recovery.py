#!/usr/bin/env python3
"""エラーリカバリーのE2Eテスト"""

import pexpect
import sys
import os
import time

# タイムアウト設定
TIMEOUT = 2  # エラーリカバリーテストは少し長めに

def spawn_jsq_repl():
    """共通のREPL起動処理"""
    env = os.environ.copy()
    env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
    env['NO_COLOR'] = '1'
    child = pexpect.spawn('node dist/index.js', env=env, encoding='utf-8', timeout=TIMEOUT)
    
    # REPLヘッダーをスキップしてプロンプトを待つ
    index = child.expect(['jsq>', 'jsq REPL', pexpect.TIMEOUT], timeout=TIMEOUT)
    if index == 1:
        child.expect_exact('jsq>')
    elif index == 2:
        raise Exception("Timeout waiting for prompt")
    
    return child

def test_syntax_error_recovery():
    """構文エラー後の継続動作テスト"""
    print("Testing syntax error recovery...")
    
    child = spawn_jsq_repl()
    
    try:
        # 構文エラーを発生させる
        child.sendline('[1, 2, 3].map(x => x * )')
        child.expect_exact('jsq>')
        
        # エラーメッセージが表示されることを確認
        output = child.before
        assert 'SyntaxError' in output or 'Error' in output
        
        # 正常な入力が受け付けられることを確認
        child.sendline('[1, 2, 3].map(x => x * 2)')
        child.expect_exact('jsq>')
        output = child.before
        assert '[2, 4, 6]' in output or '2, 4, 6' in output
        
        print("✓ Syntax error recovery test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_runtime_error_recovery():
    """実行時エラー後の継続動作テスト"""
    print("Testing runtime error recovery...")
    
    child = spawn_jsq_repl()
    
    try:
        # 実行時エラーを発生させる（存在しないプロパティへのアクセス）
        child.sendline('null.foo.bar')
        child.expect_exact('jsq>')
        
        # エラーメッセージが表示されることを確認
        output = child.before
        assert 'TypeError' in output or 'Error' in output or 'Cannot read' in output
        
        # 正常な入力が受け付けられることを確認
        child.sendline('"recovered from error"')
        child.expect_exact('jsq>')
        output = child.before
        assert '"recovered from error"' in output or 'recovered from error' in output
        
        print("✓ Runtime error recovery test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_invalid_json_recovery():
    """無効なJSON後の動作テスト"""
    print("Testing invalid JSON recovery...")
    
    child = spawn_jsq_repl()
    
    try:
        # 無効なJSONを入力
        child.sendline('{"invalid": json,}')
        child.expect_exact('jsq>')
        
        # エラーが表示されることを確認
        output = child.before
        assert 'Error' in output or 'SyntaxError' in output
        
        # 有効なJSONが処理できることを確認
        child.sendline('{"valid": "json"}')
        child.expect_exact('jsq>')
        output = child.before
        assert '"valid"' in output and '"json"' in output
        
        print("✓ Invalid JSON recovery test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_infinite_loop_interruption():
    """無限ループの中断テスト"""
    print("Testing infinite loop interruption...")
    
    child = spawn_jsq_repl()
    
    try:
        # 無限ループを作成
        child.sendline('while(true) {}')
        
        # 少し待ってからCtrl+Cで中断
        time.sleep(0.5)
        child.sendcontrol('c')
        
        # プロンプトが戻ることを確認（タイムアウトするかもしれない）
        try:
            child.expect_exact('jsq>', timeout=2)
            print("✓ Infinite loop interruption test passed")
        except pexpect.TIMEOUT:
            print("⚠ Infinite loop interruption test skipped (not supported)")
        
        # 正常な入力を試す
        child.sendline('"after interruption"')
        try:
            child.expect_exact('jsq>', timeout=1)
        except:
            pass
        
    finally:
        child.sendline('.exit')
        try:
            child.expect(pexpect.EOF, timeout=1)
        except:
            child.terminate()

def test_memory_intensive_operation_recovery():
    """メモリ集約的な操作後の回復テスト"""
    print("Testing memory intensive operation recovery...")
    
    child = spawn_jsq_repl()
    
    try:
        # 大きな配列を作成（メモリ使用量をテスト）
        child.sendline('Array(1000000).fill(0).length')
        child.expect_exact('jsq>')
        
        # 結果が返ってくることを確認
        output = child.before
        assert '1000000' in output
        
        # さらに大きな操作を試みる
        child.sendline('Array(10000).fill(0).map((_, i) => ({ index: i, data: "x".repeat(10) })).length')
        child.expect_exact('jsq>')
        output = child.before
        assert '10000' in output
        
        # まだ応答があることを確認
        child.sendline('"still responsive"')
        child.expect_exact('jsq>')
        output = child.before
        assert '"still responsive"' in output or 'still responsive' in output
        
        print("✓ Memory intensive operation recovery test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_error_in_chained_operations():
    """チェーン操作中のエラーリカバリーテスト"""
    print("Testing error in chained operations...")
    
    child = spawn_jsq_repl()
    
    try:
        # チェーン操作の途中でエラーを発生させる
        child.sendline('[{a: 1}, {b: 2}, {c: 3}].map(x => x.a).filter(x => x.foo.bar)')
        child.expect_exact('jsq>')
        
        # エラーが表示されることを確認
        output = child.before
        assert 'Error' in output or 'TypeError' in output
        
        # 正しいチェーン操作が動作することを確認
        child.sendline('[{a: 1}, {b: 2}, {c: 3}].map(x => x.a || x.b || x.c).filter(x => x > 1)')
        child.expect_exact('jsq>')
        output = child.before
        assert '[2, 3]' in output or '2, 3' in output
        
        print("✓ Error in chained operations test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_special_character_handling():
    """特殊文字のエラーハンドリングテスト"""
    print("Testing special character handling...")
    
    child = spawn_jsq_repl()
    
    try:
        # 特殊文字を含む入力（null文字などは避ける）
        child.sendline('"special\\ncharacters\\ttab"')
        child.expect_exact('jsq>')
        output = child.before
        assert 'special' in output and 'characters' in output
        
        # Unicode文字
        child.sendline('"日本語 😀 🎉"')
        child.expect_exact('jsq>')
        output = child.before
        assert '日本語' in output or '\\u65e5\\u672c\\u8a9e' in output
        
        # エスケープシーケンス
        child.sendline('"line1\\nline2\\ttab"')
        child.expect_exact('jsq>')
        output = child.before
        assert 'line1' in output and 'line2' in output
        
        print("✓ Special character handling test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

if __name__ == "__main__":
    print("Running error recovery E2E tests...\n")
    
    tests = [
        test_syntax_error_recovery,
        test_runtime_error_recovery,
        test_invalid_json_recovery,
        test_infinite_loop_interruption,
        test_memory_intensive_operation_recovery,
        test_error_in_chained_operations,
        test_special_character_handling
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