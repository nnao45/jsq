#!/usr/bin/env python3
"""
Prompts REPL の基本的な動作確認テスト
"""

import os
import sys
import json
import tempfile
import subprocess
import time

# jsqのパスを取得
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
JSQ_PATH = os.path.join(PROJECT_ROOT, 'dist', 'index.js')

def test_prompts_startup():
    """Prompts REPLが起動することを確認"""
    print("[TEST] Prompts REPL startup check")
    
    # テストデータを作成
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({"test": "data", "number": 42}, f)
        tmpfile = f.name
    
    try:
        # PromptsモードでREPLを起動（expressionなしで）
        cmd = ['node', JSQ_PATH, '--prompts']
        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # 起動メッセージを確認
        time.sleep(0.5)  # 起動待ち
        
        # .exit コマンドを送信して終了
        stdout, stderr = proc.communicate(input='.exit\n', timeout=5)
        
        # 出力を確認
        if 'Welcome to jsq REPL (Prompts Edition)' in stdout:
            print("✓ Prompts REPL started successfully")
            success = True
        else:
            print("✗ Expected welcome message not found")
            print(f"Stdout: {stdout}")
            print(f"Stderr: {stderr}")
            success = False
            
        return success
        
    except subprocess.TimeoutExpired:
        proc.kill()
        print("✗ Process timeout")
        return False
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False
    finally:
        os.unlink(tmpfile)

def test_prompts_with_nodejs_helper():
    """Node.js ヘルパースクリプトを使った動作確認"""
    print("\n[TEST] Prompts REPL functionality via helper")
    
    # テストデータを作成
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({"name": "Alice", "age": 30, "items": ["apple", "banana"]}, f)
        tmpfile = f.name
    
    # ヘルパースクリプトを作成
    helper_script = """
const { spawn } = require('child_process');
const jsqPath = process.argv[2];
const dataFile = process.argv[3];

const child = spawn('node', [jsqPath, '--prompts'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
child.stdout.on('data', (data) => {
    output += data.toString();
});

child.stderr.on('data', (data) => {
    output += data.toString();
});

// データをstdinから供給
child.stdin.write(require('fs').readFileSync(dataFile));

// テストシーケンス
setTimeout(() => {
    // 基本的なクエリ
    child.stdin.write('$.name\\n');
    setTimeout(() => {
        child.stdin.write('$.age\\n');
        setTimeout(() => {
            child.stdin.write('.help\\n');
            setTimeout(() => {
                child.stdin.write('.exit\\n');
            }, 500);
        }, 500);
    }, 500);
}, 1000);

child.on('exit', (code) => {
    console.log('--- OUTPUT ---');
    console.log(output);
    console.log('--- END ---');
    process.exit(code || 0);
});
"""
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
        f.write(helper_script)
        helper_file = f.name
    
    try:
        # ヘルパースクリプトを実行
        result = subprocess.run(
            ['node', helper_file, JSQ_PATH, tmpfile],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        output = result.stdout
        
        # 結果を検証
        checks = [
            ('Prompts Edition', 'Welcome message'),
            ('Alice', 'Name query result'),
            ('30', 'Age query result'),
            ('Available commands', 'Help command output'),
            ('Bye!', 'Exit message')
        ]
        
        all_passed = True
        for check_str, description in checks:
            if check_str in output:
                print(f"  ✓ {description}: Found '{check_str}'")
            else:
                print(f"  ✗ {description}: Missing '{check_str}'")
                all_passed = False
        
        if not all_passed:
            print("\nFull output:")
            print(output)
        
        return all_passed
        
    except subprocess.TimeoutExpired:
        print("✗ Helper script timeout")
        return False
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False
    finally:
        os.unlink(tmpfile)
        os.unlink(helper_file)

def test_prompts_error_cases():
    """エラーケースの基本確認"""
    print("\n[TEST] Prompts REPL error handling")
    
    # 空のJSONファイルでテスト
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        f.write('{}')
        tmpfile = f.name
    
    helper_script = """
const { spawn } = require('child_process');
const child = spawn('node', [process.argv[2], '--prompts'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
child.stdout.on('data', d => output += d.toString());
child.stderr.on('data', d => output += d.toString());

setTimeout(() => {
    // 構文エラー
    child.stdin.write('$.\\n');
    setTimeout(() => {
        // 存在しないプロパティ
        child.stdin.write('$.nonexistent\\n');
        setTimeout(() => {
            // 無効なコマンド
            child.stdin.write('.invalid\\n');
            setTimeout(() => {
                child.stdin.write('.exit\\n');
            }, 500);
        }, 500);
    }, 500);
}, 1000);

child.on('exit', () => {
    console.log(output);
});
"""
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
        f.write(helper_script)
        helper_file = f.name
    
    try:
        result = subprocess.run(
            ['node', helper_file, JSQ_PATH, tmpfile],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        output = result.stdout
        
        # エラーハンドリングの確認
        if '❌' in output or 'Error' in output or 'undefined' in output:
            print("  ✓ Error handling is working")
            return True
        else:
            print("  ✗ No error indicators found")
            print(f"Output: {output}")
            return False
            
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False
    finally:
        os.unlink(tmpfile)
        os.unlink(helper_file)

def main():
    """メインテスト実行"""
    print("=== Prompts REPL Basic Tests ===\n")
    
    # jsqがビルドされているか確認
    if not os.path.exists(JSQ_PATH):
        print(f"Error: jsq not found at {JSQ_PATH}")
        print("Please run 'npm run build' first")
        return 1
    
    tests = [
        test_prompts_startup,
        test_prompts_with_nodejs_helper,
        test_prompts_error_cases
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