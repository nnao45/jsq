# E2E Tests for jsq

このディレクトリには、jsqのREPLモードに対するEnd-to-End (E2E) テストが含まれています。

## テストの種類

### Python E2E Tests
Pythonの`pexpect`ライブラリを使用して、REPLとの対話的な操作をテストします。

#### 基本テスト
- `test_repl_basic.py` - REPLの基本動作
- `test_simple_repl.py` - シンプルなREPL操作
- `test_autocomplete.py` - オートコンプリート機能
- `test_no_color_option.py` - カラー出力の制御

#### 中級テスト  
- `test_multiline_input.py` - 複数行入力
- `test_autocomplete_advanced.py` - 高度なオートコンプリート

#### 高度なテスト
- `test_repl_advanced.py` - REPLの高度な機能（変数定義、セッション管理など）
- `test_error_recovery.py` - エラーからの回復

#### その他のテスト
- `test_security.py` - セキュリティ関連
- `test_debug_repl.py` - デバッグとトラブルシューティング
- `test_timing_repl.py` - パフォーマンスとタイミング

### Expect Scripts
Expectツールを使用した対話的テスト（`expect`コマンドが必要）：
- `repl-e2e-simple.exp`
- `repl-memory-leak.exp`
- `repl-stress-test.exp`
- など

## 必要な依存関係

### Python E2Eテスト
```bash
pip install pexpect
```

### Expectスクリプト
```bash
# Ubuntu/Debian
sudo apt-get install expect

# macOS
brew install expect
```

## テストの実行方法

### すべてのPython E2Eテストを実行
```bash
npm run test:e2e:python
```

### 個別のテストを実行
```bash
# プロジェクトルートから
python3 src/e2e/test_repl_basic.py
```

### Expectスクリプトを実行（expectがインストールされている場合）
```bash
npm run test:e2e:repl
```

### すべてのE2Eテストを実行
```bash
npm run test:e2e:all
```

## テストの追加方法

新しいE2Eテストを追加する場合：

1. `test_*.py`という名前でPythonファイルを作成
2. `spawn_jsq_repl()`ヘルパー関数を使用してREPLを起動
3. `pexpect`を使って対話的な操作をシミュレート
4. `run_all_tests.py`のテストリストに追加

例：
```python
def test_my_feature():
    """新機能のテスト"""
    child = spawn_jsq_repl()
    try:
        child.sendline('my command')
        child.expect_exact('> ')
        output = child.before
        assert 'expected output' in output
    finally:
        child.sendline('.exit')
        child.expect(pexpect.EOF)
```

## トラブルシューティング

### タイムアウトエラー
- `TIMEOUT`変数を増やす
- `JSQ_DISABLE_REALTIME_EVAL`環境変数を設定

### プロンプトが見つからない
- REPLヘッダーの処理を確認
- `> `プロンプトの正確な文字列を確認

### 文字エンコーディングの問題
- `encoding='utf-8'`パラメータを使用
- 特殊文字のテストでは適切なエスケープを使用