# REPL File Mode Debug Notes

## 概要
REPLファイルモードは、ワーカープロセスとファイル経由で通信することで、VMプーリングの恩恵を受けながらREPLを実行するモードです。

## 現在の状態
- ✅ ワーカープロセスの起動
- ✅ ファイル監視機能（watchFile使用）
- ✅ リクエストの処理と結果の返却
- ❌ パイプ経由での標準入力サポート（TTY検出の問題）

## 使い方
### ターミナルで直接実行（推奨）
```bash
# データファイルを作成
echo '{"message": [1,2,3]}' > data.json

# REPLファイルモードで起動
node dist/index.js --file data.json --repl --repl-file-mode
```

### パイプ経由（現在動作しない）
```bash
echo '{"message": [1,2,3]}' | node dist/index.js --repl --repl-file-mode
```

## 技術的詳細
1. メインプロセスが`ReplFileCommunicator`を作成
2. ワーカープロセス（`repl-file-worker.js`）を起動
3. 一時ファイル経由で通信：
   - 入力: `/tmp/jsq-repl-input-{workerId}.json`
   - 出力: `/tmp/jsq-repl-output-{workerId}.json`
4. `watchFile`でファイル変更を監視（100msインターバル）

## 問題点
- パイプ経由で実行すると、サブプロセスでTTYが検出されず、標準入力が読めない
- `stdio: 'inherit'`を使っているが、親プロセスの標準入力は既に読み終わっている

## 今後の改善案
1. pty（擬似端末）の使用を検討
2. サブプロセスを使わない実装に変更
3. パイプ入力専用のモードを追加