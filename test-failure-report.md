# jsq テスト失敗レポート

## 概要
パイプ演算子の実装後、既存のテストの一部が失敗しています。主な失敗パターンと対策をまとめます。

## 失敗カテゴリ別分析

### 1. process.stdin モック問題 (18個のテスト失敗)

**問題**: `src/utils/input.test.ts`で`process.stdin`を直接置換しようとして失敗

**エラー**: `TypeError: Cannot set property stdin of [object process] which has only a getter`

**影響範囲**:
- isStdinAvailable関連のテスト
- readStdin関連のテスト  
- getStdinStream関連のテスト
- integration scenarios
- edge cases

**原因**: Node.jsでは`process.stdin`は読み取り専用プロパティのため、直接置換できない

**解決策**: `jest.spyOn`やプロパティディスクリプターを使用したモック手法に変更

### 2. VM実行時のJSON.parse問題 (複数のテスト)

**問題**: VMコンテキスト内で`JSON.parse is not a function`エラー

**エラー**: `Error transferring VMChainable data for $: TypeError: JSON.parse is not a function`

**影響範囲**:
- vm-executor.test.ts
- evaluator.test.ts  
- stream-processor.test.ts
- integration.test.ts

**原因**: VM内でJSON.parseが正しく設定されていない

**解決策**: VM初期化時にJSON.parseの実装を確実に注入

### 3. ライブラリマネージャー問題

**問題**: npmライブラリのインストール/ロードが失敗

**エラー**: `ENOENT: no such file or directory, open '/home/nnao45/.jsq/cache/node_modules/lodash/package.json'`

**影響範囲**:
- library-manager.test.ts

**原因**: テスト環境でのキャッシュディレクトリ/ライブラリパスの問題

**解決策**: テスト用のモックライブラリマネージャーを作成

### 4. ファイル入力テスト問題

**問題**: ファイル操作のテストが失敗

**影響範囲**:
- file-input.test.ts

**原因**: テストファイルの存在確認やパーミッション関連

### 5. パイプ演算子テスト（新規）

**状況**: 新しく作成したテストは一部失敗の可能性

**対象**: `pipe-operator.test.ts`

## 修正優先度

### 高優先度
1. **VM JSON.parse問題** - コア機能に影響
2. **process.stdinモック問題** - 入力処理の基本機能

### 中優先度  
3. **ライブラリマネージャー問題** - 外部ライブラリ機能
4. **ファイル入力問題** - ファイル処理機能

### 低優先度
5. **Jest設定警告** - `moduleNameMapping`の設定ミス

## 推奨対策

### 即座の対応
1. VM内のJSON.parse実装を修正
2. input.test.tsのモック手法を変更

### 中期対応
1. ライブラリマネージャーのテスト戦略見直し
2. ファイル操作テストの環境依存問題解決

### 長期対応  
1. テストアーキテクチャの改善
2. モック戦略の統一化

## テスト成功状況

### 正常動作しているテスト
- ✅ chainable.test.ts - 基本チェーン機能
- ✅ jquery-wrapper.test.ts - jQuery風ラッパー
- ✅ parser.test.ts - JSON解析機能
- ✅ 新しいpipe-operator.test.ts（一部）

### 修正が必要なテスト
- ❌ input.test.ts - 18個のテスト
- ❌ vm-executor.test.ts - JSON.parse関連
- ❌ evaluator.test.ts - VM実行関連
- ❌ stream-processor.test.ts - ストリーム処理
- ❌ integration.test.ts - 統合テスト
- ❌ library-manager.test.ts - ライブラリ管理
- ❌ file-input.test.ts - ファイル入力

## 次のアクション

1. 最重要問題（VM JSON.parse）の修正
2. process.stdinモック手法の改善
3. 修正後の全テスト実行と検証
4. パイプ演算子テストの完全動作確認