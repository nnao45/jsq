#!/usr/bin/env python3
"""CLIモードでのマルチライン入力テスト"""

import subprocess
import json
import sys
import tempfile
import os

def run_jsq(data, query):
    """jsqをCLIモードで実行"""
    # 一時ファイルにデータを書き込む
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(data, f)
        temp_file = f.name
    
    try:
        # jsqを実行
        cmd = ['node', 'dist/index.js', '-f', temp_file, query]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.stdout.strip(), result.stderr.strip(), result.returncode
    finally:
        # 一時ファイルを削除
        os.unlink(temp_file)

def test_basic_queries():
    """基本的なクエリのテスト"""
    print("Testing basic queries...")
    
    data = {"name": "test", "values": [1, 2, 3], "nested": {"key": "value"}}
    
    # 基本的なプロパティアクセス
    stdout, stderr, code = run_jsq(data, 'data.name')
    assert code == 0
    assert 'test' in stdout
    print("  ✓ Basic property access")
    
    # 配列アクセス
    stdout, stderr, code = run_jsq(data, 'data.values[1]')
    assert code == 0
    assert '2' in stdout
    print("  ✓ Array access")
    
    # ネストしたプロパティ
    stdout, stderr, code = run_jsq(data, 'data.nested.key')
    assert code == 0
    assert 'value' in stdout
    print("  ✓ Nested property access")
    
    print("✓ Basic queries test passed\n")
    return True

def test_multiline_expressions():
    """マルチライン式のテスト"""
    print("Testing multiline expressions...")
    
    data = [1, 2, 3, 4, 5]
    
    # マップ操作（単一行で表現）
    query = 'data.map(x => { const squared = x * x; return { num: x, squared: squared }; })'
    stdout, stderr, code = run_jsq(data, query)
    assert code == 0
    assert '25' in stdout  # 5の二乗
    print("  ✓ Map with block expression")
    
    # フィルタとマップの組み合わせ
    query = 'data.filter(x => x > 2).map(x => x * 2)'
    stdout, stderr, code = run_jsq(data, query)
    assert code == 0
    result = json.loads(stdout)
    assert result == [6, 8, 10]  # [3,4,5] * 2
    print("  ✓ Filter and map chain")
    
    print("✓ Multiline expressions test passed\n")
    return True

def test_complex_data_operations():
    """複雑なデータ操作のテスト"""
    print("Testing complex data operations...")
    
    data = {
        "users": [
            {"id": 1, "name": "Alice", "scores": [85, 92, 78]},
            {"id": 2, "name": "Bob", "scores": [90, 88, 95]},
            {"id": 3, "name": "Charlie", "scores": [76, 82, 80]}
        ]
    }
    
    # 平均スコアの計算
    query = '''data.users.map(user => ({
        name: user.name,
        average: user.scores.reduce((a, b) => a + b, 0) / user.scores.length
    }))'''
    stdout, stderr, code = run_jsq(data, query)
    assert code == 0
    result = json.loads(stdout)
    assert len(result) == 3
    assert any(u['name'] == 'Alice' and abs(u['average'] - 85.0) < 0.1 for u in result)
    print("  ✓ Average calculation")
    
    # フィルタリング（高得点者のみ）
    query = '''data.users
        .map(u => ({ name: u.name, avg: u.scores.reduce((a,b)=>a+b,0)/u.scores.length }))
        .filter(u => u.avg > 85)
        .map(u => u.name)'''
    stdout, stderr, code = run_jsq(data, query)
    assert code == 0
    result = json.loads(stdout)
    assert 'Bob' in result
    assert 'Charlie' not in result
    print("  ✓ Complex filtering and mapping")
    
    print("✓ Complex data operations test passed\n")
    return True

def test_error_handling():
    """エラーハンドリングのテスト"""
    print("Testing error handling...")
    
    data = {"x": 10}
    
    # 存在しないプロパティ
    stdout, stderr, code = run_jsq(data, 'data.nonexistent')
    assert code == 0
    assert stdout == '' or 'undefined' in stdout.lower()
    print("  ✓ Undefined property handled")
    
    # 構文エラー
    stdout, stderr, code = run_jsq(data, 'data.x +')
    assert code != 0
    assert stderr != ''  # エラーメッセージがある
    print("  ✓ Syntax error detected")
    
    print("✓ Error handling test passed\n")
    return True

def test_lodash_style_operations():
    """Lodash風の操作テスト"""
    print("Testing Lodash-style operations...")
    
    data = [
        {"category": "A", "value": 10},
        {"category": "B", "value": 20},
        {"category": "A", "value": 15},
        {"category": "B", "value": 25}
    ]
    
    # groupBy風の操作
    query = '''data.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {})'''
    stdout, stderr, code = run_jsq(data, query)
    assert code == 0
    result = json.loads(stdout)
    assert len(result['A']) == 2
    assert len(result['B']) == 2
    print("  ✓ GroupBy operation")
    
    # sumBy風の操作
    query = 'data.reduce((sum, item) => sum + item.value, 0)'
    stdout, stderr, code = run_jsq(data, query)
    assert code == 0
    assert '70' in stdout  # 10+20+15+25
    print("  ✓ SumBy operation")
    
    print("✓ Lodash-style operations test passed\n")
    return True

if __name__ == "__main__":
    print("Running CLI multiline/complex expression tests...\n")
    
    tests = [
        test_basic_queries,
        test_multiline_expressions,
        test_complex_data_operations,
        test_error_handling,
        test_lodash_style_operations
    ]
    
    passed = 0
    failed_tests = []
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed_tests.append(test.__name__)
        except Exception as e:
            print(f"✗ {test.__name__} crashed: {e}")
            failed_tests.append(test.__name__)
    
    print(f"\nTotal: {passed}/{len(tests)} tests passed")
    
    if failed_tests:
        print(f"Failed tests: {', '.join(failed_tests)}")
    
    sys.exit(0 if passed == len(tests) else 1)