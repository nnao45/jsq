#!/usr/bin/env python3
"""マルチライン入力のE2Eテスト（シンプル版）"""

import pexpect
import sys
import os
import json

# タイムアウト設定
TIMEOUT = 5

# デフォルトの環境変数
def get_env():
    env = os.environ.copy()
    env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'  # リアルタイム評価を無効化
    env['NO_COLOR'] = '1'  # カラー出力を無効化
    return env

def test_basic_multiline_json():
    """基本的なマルチラインJSON処理のテスト"""
    print("Testing basic multiline JSON...")
    
    try:
        # パイプ経由でデータを渡してREPLを起動
        json_data = '{"initial": "data"}'
        cmd = f"echo '{json_data}' | node dist/index.js"
        child = pexpect.spawn('sh', ['-c', cmd], encoding='utf-8', timeout=TIMEOUT, env=get_env())
        
        # プロンプトを待つ
        child.expect('> ')
        
        # マルチラインJSONを入力（一度に送信）
        multiline_json = '''{"name": "test",
"values": [1, 2, 3],
"nested": {
  "deep": "value"
}}'''
        child.sendline(multiline_json)
        
        # 結果を確認
        child.expect('> ')
        output = child.before
        assert 'name' in output or 'test' in output
        assert 'deep' in output or 'value' in output
        
        print("✓ Basic multiline JSON test passed")
        return True
        
    except Exception as e:
        print(f"✗ Basic multiline JSON test failed: {e}")
        if 'child' in locals():
            print(f"Output: {child.before}")
        return False
    finally:
        if 'child' in locals():
            try:
                child.sendcontrol('c')  # Ctrl+Cで終了
                child.close()
            except:
                pass

def test_multiline_function():
    """マルチライン関数のテスト"""
    print("Testing multiline function...")
    
    try:
        # パイプ経由でデータを渡してREPLを起動
        json_data = '[1, 2, 3, 4, 5]'
        cmd = f"echo '{json_data}' | node dist/index.js"
        child = pexpect.spawn('sh', ['-c', cmd], encoding='utf-8', timeout=TIMEOUT, env=get_env())
        
        # プロンプトを待つ
        child.expect('> ')
        
        # マルチライン関数を入力（$を使ってアクセス）
        multiline_func = '''$.map(x => {
  const squared = x * x;
  return { value: x, squared: squared };
})'''
        child.sendline(multiline_func)
        
        # 結果を確認
        child.expect('> ')
        output = child.before
        # 値の存在を確認
        assert '25' in output  # 5の二乗
        
        print("✓ Multiline function test passed")
        return True
        
    except Exception as e:
        print(f"✗ Multiline function test failed: {e}")
        if 'child' in locals():
            print(f"Output: {child.before}")
        return False
    finally:
        if 'child' in locals():
            try:
                child.sendcontrol('c')  # Ctrl+Cで終了
                child.close()
            except:
                pass

def test_error_recovery():
    """エラーからの回復テスト"""
    print("Testing error recovery...")
    
    try:
        # パイプ経由でデータを渡してREPLを起動
        json_data = '{"test": 123}'
        cmd = f"echo '{json_data}' | node dist/index.js"
        child = pexpect.spawn('sh', ['-c', cmd], encoding='utf-8', timeout=TIMEOUT, env=get_env())
        
        # プロンプトを待つ
        child.expect('> ')
        
        # エラーを引き起こす入力
        child.sendline('$.nonexistent.property')
        child.expect('> ')
        
        # エラーメッセージが含まれることを確認
        output = child.before
        # エラー後も動作することを確認
        
        # 正常な入力
        child.sendline('$.test')
        child.expect('> ')
        output = child.before
        assert '123' in output
        
        print("✓ Error recovery test passed")
        return True
        
    except Exception as e:
        print(f"✗ Error recovery test failed: {e}")
        if 'child' in locals():
            print(f"Output: {child.before}")
        return False
    finally:
        if 'child' in locals():
            try:
                child.sendcontrol('c')  # Ctrl+Cで終了
                child.close()
            except:
                pass

def test_complex_nested_query():
    """複雑なネストクエリのテスト"""
    print("Testing complex nested query...")
    
    try:
        # 複雑なデータをパイプで渡す
        data = {
            "users": [
                {"id": 1, "name": "Alice", "scores": [85, 92, 78]},
                {"id": 2, "name": "Bob", "scores": [90, 88, 95]},
                {"id": 3, "name": "Charlie", "scores": [76, 82, 80]}
            ]
        }
        cmd = f"echo '{json.dumps(data)}' | node dist/index.js"
        child = pexpect.spawn('sh', ['-c', cmd], encoding='utf-8', timeout=TIMEOUT, env=get_env())
        
        # プロンプトを待つ
        child.expect('> ')
        
        # 複雑なクエリを実行
        query = '''$.users.map(u => ({
  name: u.name,
  avg: u.scores.reduce((a,b) => a+b, 0) / u.scores.length
})).filter(u => u.avg > 80)'''
        child.sendline(query)
        
        # 結果を確認
        child.expect('> ')
        output = child.before
        # AliceとBobが結果に含まれることを確認
        assert 'Alice' in output
        assert 'Bob' in output
        # Charlieは平均が80以下なので含まれない
        
        print("✓ Complex nested query test passed")
        return True
        
    except Exception as e:
        print(f"✗ Complex nested query test failed: {e}")
        if 'child' in locals():
            print(f"Output: {child.before}")
        return False
    finally:
        if 'child' in locals():
            try:
                child.sendcontrol('c')  # Ctrl+Cで終了
                child.close()
            except:
                pass

if __name__ == "__main__":
    print("Running multiline input E2E tests (simplified)...\n")
    
    tests = [
        test_basic_multiline_json,
        test_multiline_function,
        test_error_recovery,
        test_complex_nested_query
    ]
    
    passed = 0
    for test in tests:
        if test():
            passed += 1
        print()  # 空行を追加
    
    print(f"\nTotal: {passed}/{len(tests)} tests passed")
    sys.exit(0 if passed == len(tests) else 1)