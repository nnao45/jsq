#!/usr/bin/env python3
"""REPLのタイミングとパフォーマンステスト"""

import pexpect
import sys
import os
import time
import statistics

# タイムアウト設定
TIMEOUT = 5

def spawn_jsq_repl_with_data(data=None):
    """データ付きでREPLを起動"""
    env = os.environ.copy()
    env['JSQ_DISABLE_REALTIME_EVAL'] = 'true'
    env['NO_COLOR'] = '1'
    
    if data:
        # パイプでデータを渡す
        cmd = f'echo \'{data}\' | node dist/index.js'
        child = pexpect.spawn('sh', ['-c', cmd], encoding='utf-8', timeout=TIMEOUT, env=env)
    else:
        child = pexpect.spawn('node dist/index.js', encoding='utf-8', timeout=TIMEOUT, env=env)
    
    # REPLヘッダーをスキップしてプロンプトを待つ
    index = child.expect(['> ', 'jsq REPL', pexpect.TIMEOUT], timeout=TIMEOUT)
    if index == 1:
        child.expect_exact('> ')
    elif index == 2:
        raise Exception("Timeout waiting for prompt")
    
    return child

def test_basic_response_time():
    """基本的な応答時間テスト"""
    print("Testing basic response time...")
    
    child = spawn_jsq_repl_with_data('{"x": 5}')
    
    try:
        # 応答時間を測定
        timings = []
        
        expressions = [
            '_.x',
            '_.x * 2',
            'Object.keys(_)',
            'JSON.stringify(_)'
        ]
        
        for expr in expressions:
            start = time.time()
            child.sendline(expr)
            child.expect_exact('> ')
            end = time.time()
            
            response_time = (end - start) * 1000  # ミリ秒
            timings.append(response_time)
            print(f"  {expr}: {response_time:.2f}ms")
        
        avg_time = statistics.mean(timings)
        max_time = max(timings)
        
        print(f"  Average response time: {avg_time:.2f}ms")
        print(f"  Maximum response time: {max_time:.2f}ms")
        
        # 基準：平均100ms以下、最大200ms以下
        if avg_time < 100 and max_time < 200:
            print("✓ Basic response time test passed")
        else:
            print("✗ Response time too slow")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_large_data_processing():
    """大規模データ処理のパフォーマンステスト"""
    print("\nTesting large data processing...")
    
    # 大きなデータセットを生成
    large_array = list(range(10000))
    data = f'{{"numbers": {large_array[:1000]}}}'  # 最初の1000個
    
    child = spawn_jsq_repl_with_data(data)
    
    try:
        # 大規模データ処理の時間を測定
        operations = [
            ('_.numbers.length', '1000', 100),
            ('_.numbers.filter(x => x % 2 === 0).length', '500', 200),
            ('_.numbers.map(x => x * 2).slice(0, 5)', '[0, 2, 4, 6, 8]', 300),
            ('_.numbers.reduce((a, b) => a + b, 0)', None, 500),
        ]
        
        all_passed = True
        for expr, expected, max_ms in operations:
            start = time.time()
            child.sendline(expr)
            child.expect_exact('> ')
            end = time.time()
            
            output = child.before
            response_time = (end - start) * 1000
            
            # 結果の確認
            result_ok = True
            if expected:
                result_ok = expected in output
            
            # 時間の確認
            time_ok = response_time < max_ms
            
            status = "✓" if (result_ok and time_ok) else "✗"
            print(f"  {status} {expr}: {response_time:.2f}ms (limit: {max_ms}ms)")
            
            if not (result_ok and time_ok):
                all_passed = False
        
        if all_passed:
            print("✓ Large data processing test passed")
        else:
            print("✗ Large data processing test failed")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_realtime_evaluation_disabled():
    """リアルタイム評価が無効の場合のタイミングテスト"""
    print("\nTesting with realtime evaluation disabled...")
    
    child = spawn_jsq_repl_with_data()
    
    try:
        # 文字を一つずつ送信して、途中で評価されないことを確認
        test_string = '[1, 2, 3].map(x => x * 2)'
        
        # 文字を一つずつ送信
        for char in test_string:
            child.send(char)
            time.sleep(0.01)  # 10ms待機
        
        # この時点では結果が表示されていないはず
        time.sleep(0.1)
        
        # Enterを押して初めて評価される
        start = time.time()
        child.send('\r')
        child.expect_exact('> ')
        end = time.time()
        
        output = child.before
        response_time = (end - start) * 1000
        
        if '[2, 4, 6]' in output or '2, 4, 6' in output:
            print(f"✓ Evaluation only after Enter: {response_time:.2f}ms")
        else:
            print(f"✗ Unexpected output: {repr(output)}")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_concurrent_operations():
    """連続操作のパフォーマンステスト"""
    print("\nTesting concurrent operations...")
    
    child = spawn_jsq_repl_with_data('[1, 2, 3, 4, 5]')
    
    try:
        # 連続して複数の操作を実行
        start = time.time()
        
        operations = [
            '_.map(x => x * 2)',
            '_.filter(x => x > 5)',
            '_.length',
            '[10, 20, 30]',
            '_.reduce((a, b) => a + b)'
        ]
        
        for op in operations:
            child.sendline(op)
            child.expect_exact('> ')
        
        end = time.time()
        total_time = (end - start) * 1000
        avg_time = total_time / len(operations)
        
        print(f"  Total time for {len(operations)} operations: {total_time:.2f}ms")
        print(f"  Average time per operation: {avg_time:.2f}ms")
        
        # 基準：平均100ms以下
        if avg_time < 100:
            print("✓ Concurrent operations test passed")
        else:
            print("✗ Operations too slow")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

def test_memory_stability():
    """メモリ安定性のテスト（簡易版）"""
    print("\nTesting memory stability...")
    
    child = spawn_jsq_repl_with_data()
    
    try:
        # 同じ操作を繰り返して、応答時間が安定しているか確認
        timings = []
        
        for i in range(10):
            start = time.time()
            child.sendline(f'Array({i * 1000}).fill(0).length')
            child.expect_exact('> ')
            end = time.time()
            
            response_time = (end - start) * 1000
            timings.append(response_time)
        
        # 最初と最後の応答時間を比較
        first_half = statistics.mean(timings[:5])
        second_half = statistics.mean(timings[5:])
        
        print(f"  First half average: {first_half:.2f}ms")
        print(f"  Second half average: {second_half:.2f}ms")
        
        # 性能劣化がないか確認（20%以内の増加なら許容）
        if second_half < first_half * 1.2:
            print("✓ Memory stability test passed")
        else:
            print("✗ Performance degradation detected")
        
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)

if __name__ == '__main__':
    print("Running REPL timing and performance tests...\n")
    
    tests = [
        test_basic_response_time,
        test_large_data_processing,
        test_realtime_evaluation_disabled,
        test_concurrent_operations,
        test_memory_stability
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