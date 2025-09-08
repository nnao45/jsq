#!/usr/bin/env python3
"""すべてのPython E2Eテストを実行するスクリプト"""

import os
import sys
import subprocess
import time
from pathlib import Path

# このスクリプトのディレクトリを取得
script_dir = Path(__file__).parent

# テストファイルのリスト（実行順）
test_files = [
    # 基本的なテスト
    'test_repl_basic.py',
    'test_simple_repl.py',
    'test_autocomplete.py',
    'test_no_color_option.py',
    
    # 中級テスト
    'test_multiline_input.py',
    'test_autocomplete_advanced.py',
    
    # 高度なテスト
    'test_repl_advanced.py',
    'test_error_recovery.py',
    
    # セキュリティテスト
    'test_security.py',
    
    # デバッグ・パフォーマンステスト
    'test_debug_repl.py',
    'test_timing_repl.py',
]

# その他の test_*.py ファイル（まだ実装が不明なもの）
other_tests = [
    'test_cli_multiline.py',
    'test_minimal_repl.py',
    'test_multiline_fixed.py',
    'test_multiline_input_simple.py',
    'test_repl_pexpect.py',
    'test_repl_pexpect_fixed.py',
    'test_simple_e2e.py',
    'test_working_repl.py',
]

def run_test(test_file):
    """個別のテストファイルを実行"""
    test_path = script_dir / test_file
    
    if not test_path.exists():
        return None, f"File not found: {test_file}"
    
    try:
        # テストを実行
        start_time = time.time()
        result = subprocess.run(
            [sys.executable, str(test_path)],
            cwd=str(script_dir.parent.parent),  # プロジェクトルートで実行
            capture_output=True,
            text=True,
            timeout=300  # 5分のタイムアウト
        )
        elapsed_time = time.time() - start_time
        
        return result, elapsed_time
    except subprocess.TimeoutExpired:
        return None, "Timeout (5 minutes)"
    except Exception as e:
        return None, str(e)

def main():
    print("=== jsq E2E Test Suite ===\n")
    print(f"Running {len(test_files)} test files...\n")
    
    # 結果の集計
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    skipped_tests = 0
    
    # 各テストを実行
    for test_file in test_files:
        print(f"Running {test_file}...", end="", flush=True)
        result, info = run_test(test_file)
        
        if result is None:
            print(f" SKIPPED ({info})")
            skipped_tests += 1
            continue
        
        if isinstance(info, float):
            elapsed = f"{info:.2f}s"
        else:
            elapsed = info
        
        if result.returncode == 0:
            print(f" PASSED ({elapsed})")
            passed_tests += 1
            
            # テスト結果から個別のテスト数を抽出
            output = result.stdout
            if "/" in output and "tests passed" in output:
                # "X/Y tests passed" のパターンを探す
                for line in output.split('\n'):
                    if "tests passed" in line and "/" in line:
                        try:
                            parts = line.strip().split("/")
                            if len(parts) >= 2:
                                passed = int(parts[0].split()[-1])
                                total = int(parts[1].split()[0])
                                total_tests += total
                                break
                        except:
                            pass
        else:
            print(f" FAILED ({elapsed})")
            failed_tests += 1
            print("\n--- Error Output ---")
            print(result.stdout)
            if result.stderr:
                print("--- Stderr ---")
                print(result.stderr)
            print("--- End Error Output ---\n")
    
    # その他のテストファイルの存在確認
    print("\n=== Checking other test files ===")
    other_found = 0
    for test_file in other_tests:
        test_path = script_dir / test_file
        if test_path.exists():
            print(f"  Found: {test_file} (not executed)")
            other_found += 1
    
    if other_found > 0:
        print(f"\nNote: {other_found} additional test files found but not executed.")
    
    # サマリー
    print("\n=== Test Summary ===")
    print(f"Test Files: {passed_tests + failed_tests + skipped_tests}")
    print(f"  Passed: {passed_tests}")
    print(f"  Failed: {failed_tests}")
    print(f"  Skipped: {skipped_tests}")
    
    if total_tests > 0:
        print(f"\nTotal Individual Tests: {total_tests}")
    
    # 終了コード
    if failed_tests > 0:
        print("\n❌ Some tests failed!")
        return 1
    elif skipped_tests > 0:
        print("\n⚠️  All executed tests passed, but some were skipped.")
        return 0
    else:
        print("\n✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())