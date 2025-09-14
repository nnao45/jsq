#!/usr/bin/env python3
"""REPLインタラクティブ機能の詳細E2Eテスト"""

import pexpect
import sys
import os
import time
import tempfile
import json

# タイムアウト設定
TIMEOUT = 2

def spawn_jsq_repl():
    """共通のREPL起動処理"""
    env = os.environ.copy()
    env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
    env['NO_COLOR'] = '1'
    child = pexpect.spawn('node dist/index.js', env=env, encoding='utf-8', timeout=TIMEOUT)
    
    # REPLヘッダーをスキップしてプロンプトを待つ
    index = child.expect(['> ', 'jsq REPL', pexpect.TIMEOUT], timeout=TIMEOUT)
    if index == 1:
        child.expect_exact('> ')
    elif index == 2:
        raise Exception("Timeout waiting for prompt")
    
    return child

def test_custom_variable_definition():
    """カスタム変数の定義と再利用テスト"""
    print("Testing custom variable definition and reuse...")
    
    child = spawn_jsq_repl()
    
    try:
        # 変数を定義
        child.sendline('const myFilter = x => x > 10')
        child.expect_exact('> ')
        
        # データを入力
        child.sendline('[5, 10, 15, 20, 25]')
        child.expect_exact('> ')
        
        # 定義した変数を使用
        child.sendline('_.filter(myFilter)')
        child.expect_exact('> ')
        output = child.before
        assert '[15, 20, 25]' in output or '15, 20, 25' in output
        
        # 別の変数を定義
        child.sendline('const double = x => x * 2')
        child.expect_exact('> ')
        
        # 複数の変数を組み合わせて使用
        child.sendline('[5, 10, 15, 20, 25].filter(myFilter).map(double)')
        child.expect_exact('> ')
        output = child.before
        assert '[30, 40, 50]' in output or '30, 40, 50' in output
        
        print("✓ Custom variable definition test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_multiple_query_chain():
    """複数のクエリチェインテスト"""
    print("Testing multiple query chains...")
    
    child = spawn_jsq_repl()
    
    try:
        # 初期データを入力
        child.sendline('[{name: "Alice", score: 85}, {name: "Bob", score: 92}, {name: "Charlie", score: 78}]')
        child.expect_exact('> ')
        
        # 最初の変換
        child.sendline('const highScorers = _.filter(x => x.score > 80)')
        child.expect_exact('> ')
        
        # 次の変換
        child.sendline('const names = highScorers.map(x => x.name)')
        child.expect_exact('> ')
        
        # 最終結果を表示
        child.sendline('names')
        child.expect_exact('> ')
        output = child.before
        assert 'Alice' in output
        assert 'Bob' in output
        assert 'Charlie' not in output
        
        # 元のデータも残っていることを確認
        child.sendline('_.length')
        child.expect_exact('> ')
        output = child.before
        assert '3' in output
        
        print("✓ Multiple query chain test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_repl_commands():
    """REPLコマンド（.help、.exit等）のテスト"""
    print("Testing REPL commands...")
    
    child = spawn_jsq_repl()
    
    try:
        # .helpコマンドをテスト
        child.sendline('.help')
        child.expect_exact('> ')
        output = child.before
        # ヘルプ情報が表示されることを確認
        assert 'Commands:' in output or 'help' in output.lower() or '.exit' in output
        
        # データを入力
        child.sendline('[1, 2, 3]')
        child.expect_exact('> ')
        
        # .clearコマンドをテスト（もし実装されていれば）
        child.sendline('.clear')
        child.expect_exact('> ')
        
        print("✓ REPL commands test passed")
        
    finally:
        # .exitは既にテストしているので、別の終了方法を使う
        child.sendcontrol('d')  # Ctrl+D
        child.expect(pexpect.EOF)

def test_data_persistence_across_queries():
    """クエリ間でのデータ永続性テスト"""
    print("Testing data persistence across queries...")
    
    child = spawn_jsq_repl()
    
    try:
        # 初期データを設定
        child.sendline('{"users": [1, 2, 3], "total": 6}')
        child.expect_exact('> ')
        
        # 部分的なクエリ
        child.sendline('_.users')
        child.expect_exact('> ')
        output = child.before
        assert '[1, 2, 3]' in output or '1, 2, 3' in output
        
        # 元のデータ構造がまだ利用可能か確認（_は最後の結果を保持）
        child.sendline('{"users": [1, 2, 3], "total": 6}')
        child.expect_exact('> ')
        
        child.sendline('_.total')
        child.expect_exact('> ')
        output = child.before
        assert '6' in output
        
        # データを変更
        child.sendline('_.users.push(4) && _')
        child.expect_exact('> ')
        
        # 変更が反映されているか確認
        child.sendline('_.users')
        child.expect_exact('> ')
        output = child.before
        assert '4' in output  # 新しい要素が追加されている
        
        print("✓ Data persistence test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_complex_data_transformation():
    """複雑なデータ変換のテスト"""
    print("Testing complex data transformation...")
    
    child = spawn_jsq_repl()
    
    try:
        # 複雑なデータ構造を入力
        data = {
            "departments": [
                {
                    "name": "Engineering",
                    "employees": [
                        {"name": "Alice", "salary": 100000, "years": 5},
                        {"name": "Bob", "salary": 120000, "years": 3}
                    ]
                },
                {
                    "name": "Sales",
                    "employees": [
                        {"name": "Charlie", "salary": 80000, "years": 2},
                        {"name": "David", "salary": 90000, "years": 4}
                    ]
                }
            ]
        }
        child.sendline(json.dumps(data))
        child.expect_exact('> ')
        
        # 複雑な変換：部門ごとの平均給与を計算
        child.sendline('''_.departments.map(dept => ({
            department: dept.name,
            avgSalary: dept.employees.reduce((sum, emp) => sum + emp.salary, 0) / dept.employees.length,
            totalEmployees: dept.employees.length
        }))''')
        child.expect_exact('> ')
        output = child.before
        
        # 結果を確認
        assert 'Engineering' in output
        assert 'Sales' in output
        assert '110000' in output  # Engineering平均
        assert '85000' in output   # Sales平均
        
        print("✓ Complex data transformation test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_repl_with_external_file():
    """外部ファイルとの連携テスト"""
    print("Testing REPL with external file...")
    
    # テスト用の一時ファイルを作成
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        test_data = {
            "products": [
                {"id": 1, "name": "Laptop", "price": 1200},
                {"id": 2, "name": "Mouse", "price": 25},
                {"id": 3, "name": "Keyboard", "price": 75}
            ]
        }
        json.dump(test_data, f)
        temp_file = f.name
    
    try:
        # jsqでファイルを読み込む（パイプで渡す）
        env = os.environ.copy()
        env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
        env['NO_COLOR'] = '1'
        child = pexpect.spawn(f'cat {temp_file} | node dist/index.js', 
                             env=env, encoding='utf-8', timeout=TIMEOUT, shell=True)
        
        # REPLヘッダーをスキップしてプロンプトを待つ
        index = child.expect(['> ', 'jsq REPL', pexpect.TIMEOUT], timeout=TIMEOUT)
        if index == 1:
            child.expect_exact('> ')
        elif index == 2:
            raise Exception("Timeout waiting for prompt")
        
        # ファイルのデータが読み込まれていることを確認
        child.sendline('_.products.length')
        child.expect_exact('> ')
        output = child.before
        assert '3' in output
        
        # データを操作
        child.sendline('_.products.filter(p => p.price < 100).map(p => p.name)')
        child.expect_exact('> ')
        output = child.before
        assert 'Mouse' in output
        assert 'Keyboard' in output
        assert 'Laptop' not in output
        
        print("✓ REPL with external file test passed")
        
    finally:
        # クリーンアップ
        os.unlink(temp_file)
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_session_state_management():
    """セッション状態管理のテスト"""
    print("Testing session state management...")
    
    child = spawn_jsq_repl()
    
    try:
        # 複数の状態を作成
        child.sendline('const originalData = [1, 2, 3, 4, 5]')
        child.expect_exact('> ')
        
        child.sendline('originalData')
        child.expect_exact('> ')
        
        child.sendline('const filtered = originalData.filter(x => x > 2)')
        child.expect_exact('> ')
        
        child.sendline('const mapped = filtered.map(x => x * 10)')
        child.expect_exact('> ')
        
        # すべての状態が保持されていることを確認
        child.sendline('originalData')
        child.expect_exact('> ')
        output = child.before
        assert '[1, 2, 3, 4, 5]' in output or '1, 2, 3, 4, 5' in output
        
        child.sendline('filtered')
        child.expect_exact('> ')
        output = child.before
        assert '[3, 4, 5]' in output or '3, 4, 5' in output
        
        child.sendline('mapped')
        child.expect_exact('> ')
        output = child.before
        assert '[30, 40, 50]' in output or '30, 40, 50' in output
        
        print("✓ Session state management test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_underscore_variable():
    """アンダースコア変数（最後の結果）のテスト"""
    print("Testing underscore variable...")
    
    child = spawn_jsq_repl()
    
    try:
        # 最初の計算
        child.sendline('10 + 20')
        child.expect_exact('> ')
        output = child.before
        assert '30' in output
        
        # _で前の結果を参照
        child.sendline('_ * 2')
        child.expect_exact('> ')
        output = child.before
        assert '60' in output
        
        # 配列での動作確認
        child.sendline('[1, 2, 3, 4, 5]')
        child.expect_exact('> ')
        
        child.sendline('_.map(x => x * x)')
        child.expect_exact('> ')
        output = child.before
        assert '[1, 4, 9, 16, 25]' in output or '1, 4, 9, 16, 25' in output
        
        # _が更新されていることを確認
        child.sendline('_.length')
        child.expect_exact('> ')
        output = child.before
        assert '5' in output
        
        print("✓ Underscore variable test passed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

if __name__ == "__main__":
    print("Running advanced REPL E2E tests...\n")
    
    tests = [
        test_custom_variable_definition,
        test_multiple_query_chain,
        test_repl_commands,
        test_data_persistence_across_queries,
        test_complex_data_transformation,
        test_repl_with_external_file,
        test_session_state_management,
        test_underscore_variable
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