# JSQ REPL Mode Architecture

## Overview
JSQのREPLモードは、複数のランタイム（Node.js/Bun）と入力環境（TTY直接/パイプ経由）に対応するため、複雑なアーキテクチャを持っています。

## パイプあり/なしの違い

### パイプなし（TTY直接）
- `process.stdin.isTTY === true`の場合
- 通常のインタラクティブモードで起動
- readlineインターフェースをそのまま使用
- キーストロークイベントを直接処理可能

### パイプあり
- `process.stdin.isTTY === false`でパイプ経由のデータが存在
- ランタイムによって処理が大きく異なる：
  - **Node.js**: `/dev/tty`を開いて新しいTTYストリームを作成
  - **Bun**: 特殊な処理が必要（後述）

## Node.js vs Bun の違い

### Node.js
- 標準的な`readline`モジュールが正常に動作
- `/dev/tty`を直接開いてTTYストリームを作成可能
- パイプ後も問題なくインタラクティブ入力が可能

```typescript
// tty-helper.ts での実装
const ttyFd = openSync('/dev/tty', 'r+');
const stream = new ReadStream(ttyFd);
stream.isTTY = true;
```

### Bun
- `readline`モジュールに互換性の問題あり
- TTY処理に特殊な対応が必要：

#### 方法1: process.bindingを使用（モンキーパッチ）
```typescript
const tty_wrap = process.binding('tty_wrap');
stdin.isTTY = true;
stdin.setRawMode = function(mode) { return this; };
```

#### 方法2: 子プロセス経由
```typescript
const ttyProcess = spawn('sh', ['-c', 'exec < /dev/tty; cat']);
```

#### 方法3: FIFO使用
```typescript
const mkfifoProcess = spawn('mkfifo', [fifoPath]);
const readStream = createReadStream(fifoPath);
```

## ファイル構成と責務

### メインエントリポイント
- `src/index.ts`: CLIのメインエントリ、REPLモードの起動判定

### REPL実装の中核
- `src/core/repl/repl-factory.ts`: REPLマネージャーの生成、評価ハンドラーの作成
- `src/core/repl/repl-manager.ts`: 従来のreadlineベースのREPL実装（レガシーモード）
- `src/core/repl/prompts/prompts-repl-manager.ts`: Promptsベースの新しいREPL実装（デフォルト）

### ヘルパー/ユーティリティ
- `src/utils/tty-helper.ts`: TTYストリームの作成、ランタイム別の処理
- `src/utils/input.ts`: 標準入力の読み取り処理
- `src/utils/runtime.ts`: ランタイム（Node.js/Bun/Deno）の検出
- `src/utils/bun-pipe-handler.ts`: Bun専用のパイプ後REPL処理

### オートコンプリート
- `src/core/repl/autocomplete-engine.ts`: 補完候補の生成エンジン

## 入力処理フロー

### 通常のREPLモード（readline使用）
1. `repl-manager.ts`の`handleKeypress`でキー入力を処理
2. デバウンス処理でキー入力をバッチ化
3. 特殊キー（Tab、Enter、Ctrl+C等）は即座に処理
4. リアルタイム評価機能で入力中に結果をプレビュー

### Promptsベースのモード
1. 3つのモードを持つ：
   - 通常のPrompts使用（TTY環境）
   - readline使用（`startInteractiveMode`）
   - readline-sync使用（パイプ環境のフォールバック）
2. パイプ環境では`promptUser`メソッドで直接stdin読み取り
3. タブ補完はreadlineモードでのみ完全サポート

### Bunでのパイプ後REPL
1. 環境変数`JSQ_STDIN_DATA`でデータを渡す
2. 子プロセスでREPLを起動
3. 親プロセスは子プロセスの終了を待つ

## 処理フローダイアグラム

```
[標準入力] → [ランタイム検出] → [TTY判定]
                                    ↓
                            [TTYあり] [TTYなし]
                                ↓         ↓
                        [通常REPL起動] [パイプ処理]
                                         ↓
                                  [Node.js] [Bun]
                                      ↓       ↓
                              [/dev/tty作成] [特殊処理]
                                      ↓       ↓
                                  [REPL起動] [子プロセス/FIFO]
```

## 注意事項

- Bunのサポートは実験的で、様々なワークアラウンドが実装されています
- パイプ環境では一部の機能（リアルタイム評価など）が制限される場合があります
- ランタイムによってTTY処理の実装が大きく異なるため、新しい機能を追加する際は両方でテストが必要です