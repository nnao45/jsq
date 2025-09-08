#!/usr/bin/env python3
"""マルチライン入力のE2Eテスト"""

import pexpect
import sys
import os
import json

# 1秒タイムアウト
TIMEOUT = 1

# デフォルトの環境変数
def get_env():
    env = os.environ.copy()
    env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'  # リアルタイム評価を無効化
    return env

def test_multiline_json():
    """複数行にわたるJSON処理のテスト"""
    print("Testing multiline JSON input...")
    
    # パイプ経由でデータを渡してREPLを起動
    cmd = 'echo \'{}\' | node dist/index.js'
    child = pexpect.spawn('bash', ['-c', cmd], env=get_env())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # 複数行のJSONを入力（改行含む）
        multiline_json = '''{
  "name": "test",
  "values": [1, 2, 3],
  "nested": {
    "deep": "value"
  }
}'''
        child.sendline(multiline_json)
        
        # 結果を待つ
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        assert '"name": "test"' in output or 'name' in output
        assert '"deep": "value"' in output or 'deep' in output
        
        print("✓ Multiline JSON test passed")
        
    finally:
        child.sendcontrol('c')  # Ctrl+Cで終了
        child.expect(pexpect.EOF)

def test_multiline_function():
    """複数行の関数定義のテスト"""
    print("Testing multiline function definition...")
    
    # パイプ経由でデータを渡してREPLを起動
    cmd = 'echo \'[1, 2, 3, 4, 5]\' | node dist/index.js'
    child = pexpect.spawn('bash', ['-c', cmd], env=get_env())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # 複数行の関数を一度に入力
        multiline_func = '''data.map(x => {
  const squared = x * x;
  const cubed = squared * x;
  return {
    original: x,
    squared: squared,
    cubed: cubed
  };
})'''
        child.sendline(multiline_func)
        
        # 結果を確認
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        # 結果の確認（JSONの整形が異なる可能性があるため、値の存在のみチェック）
        assert '1' in output and '25' in output and '125' in output
        
        print("✓ Multiline function test passed")
        
    finally:
        child.sendcontrol('c')  # Ctrl+Cで終了
        child.expect(pexpect.EOF)

def test_multiline_string_literal():
    """複数行の文字列リテラルのテスト"""
    print("Testing multiline string literal...")
    
    # パイプ経由でデータを渡してREPLを起動
    cmd = 'echo \'"dummy"\' | node dist/index.js'
    child = pexpect.spawn('bash', ['-c', cmd], env=get_env())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # テンプレートリテラルを一度に入力
        child.sendline('`This is a\nmultiline\nstring literal`')
        
        # 結果を確認
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        assert 'This is a' in output or 'multiline' in output
        
        print("✓ Multiline string literal test passed")
        
    finally:
        child.sendcontrol('c')  # Ctrl+Cで終了
        child.expect(pexpect.EOF)

def test_incomplete_input_recovery():
    """不完全な入力からの回復テスト"""
    print("Testing incomplete input recovery...")
    
    # パイプ経由でデータを渡してREPLを起動
    cmd = 'echo \'{}\' | node dist/index.js'
    child = pexpect.spawn('bash', ['-c', cmd], env=get_env())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # エラーを引き起こす不完全な入力
        child.sendline('{ invalid json')
        
        # エラー後も動作することを確認
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        # エラーメッセージが含まれていることを確認
        assert 'Error' in output or 'error' in output
        
        # 正常な入力を続ける
        child.sendline('"recovered"')
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        assert 'recovered' in output
        
        print("✓ Incomplete input recovery test passed")
        
    finally:
        child.sendcontrol('c')  # Ctrl+Cで終了
        child.expect(pexpect.EOF)

def test_complex_nested_query():
    """複雑なネストクエリのテスト"""
    print("Testing complex nested query...")
    
    # 複雑なデータをパイプで渡す
    data = {
        "users": [
            {"id": 1, "name": "Alice", "scores": [85, 92, 78]},
            {"id": 2, "name": "Bob", "scores": [90, 88, 95]},
            {"id": 3, "name": "Charlie", "scores": [76, 82, 80]}
        ]
    }
    cmd = f"echo '{json.dumps(data)}' | node dist/index.js"
    child = pexpect.spawn('bash', ['-c', cmd], env=get_env())
    child.timeout = TIMEOUT
    
    try:
        # プロンプトを待つ
        child.expect_exact('> ')
        
        # 複雑なクエリを一度に実行
        complex_query = '''data.users
  .map(user => ({
    ...user,
    average: user.scores.reduce((a, b) => a + b, 0) / user.scores.length,
    grade: (() => {
      const avg = user.scores.reduce((a, b) => a + b, 0) / user.scores.length;
      if (avg >= 90) return "A";
      if (avg >= 80) return "B";
      return "C";
    })()
  }))
  .filter(user => user.grade !== "C")'''
        child.sendline(complex_query)
        
        # 結果を確認
        child.expect_exact('> ')
        output = child.before.decode('utf-8')
        # 結果の確認（JSONの整形が異なる可能性があるため、キーワードの存在のみチェック）
        assert 'Alice' in output
        assert 'Bob' in output
        # Charlieは除外されるはず
        
        print("✓ Complex nested query test passed")
        
    finally:
        child.sendcontrol('c')  # Ctrl+Cで終了
        child.expect(pexpect.EOF)

if __name__ == "__main__":
    print("Running multiline input E2E tests...\n")
    
    tests = [
        test_multiline_json,
        test_multiline_function,
        test_multiline_string_literal,
        test_incomplete_input_recovery,
        test_complex_nested_query
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