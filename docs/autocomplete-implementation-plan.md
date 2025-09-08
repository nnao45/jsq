# jsq REPL 自動補完機能実装計画

## 概要

jsq REPLにIDE風の自動補完機能を実装する計画書。初期実装では既存のreadlineベースREPLにTab補完を追加し、将来的にはink-uiを使用した高度なUIへの拡張を視野に入れる。

## 現状分析

### 既存のREPL機能
- Node.js readlineベースの実装
- リアルタイム評価（100msデバウンス）
- 履歴機能（最大1000件）
- 高度なカーソル操作（Ctrl+A/E、単語削除等）
- Worker Threadによる評価の分離

### 利用可能なリソース
- lodashメソッド一覧（`lodash-shared-methods.ts`）
- SmartDollarメソッド一覧（`smart-dollar-shared-methods.ts`）
- ink/ink-uiの依存関係（将来的な拡張用）

## 実装計画

### Phase 1: 基本的なTab補完（1週間）

#### 1. AutocompleteEngineクラスの作成
```typescript
// src/core/repl/autocomplete-engine.ts
interface CompletionContext {
  input: string;
  cursorPosition: number;
  currentData?: unknown;
}

interface CompletionResult {
  completions: string[];
  replaceStart: number;
  replaceEnd: number;
}

class AutocompleteEngine {
  getSuggestions(context: CompletionContext): CompletionResult
}
```

#### 2. 補完候補生成ロジック
- **メソッド補完**: lodash/SmartDollarメソッドの提案
- **プロパティ補完**: オブジェクトのプロパティ、配列の要素
- **JavaScript標準メソッド**: Array、Object、String等のメソッド

#### 3. REPLへの統合
- Tabキーハンドリングの追加
- 補完候補の循環選択
- Escキーでキャンセル

### Phase 2: 補完UIの改善（1週間）

#### 1. 補完候補の表示
- 複数候補がある場合のリスト表示
- 選択中の候補のハイライト
- 候補数の表示（例: `[1/10]`）

#### 2. スマートな補完
- コンテキスト認識（配列にはArrayメソッド、オブジェクトにはObjectメソッド）
- 頻度ベースの候補ソート
- ファジーマッチング

### Phase 3: ink-ui統合（2-3週間）

#### 1. ink-replモードの実装
- `--ink-repl`オプションの追加
- 既存機能の完全な移植

#### 2. 高度な補完UI
- ドロップダウンメニュー
- メソッドシグネチャの表示
- ドキュメントプレビュー

## 技術的詳細

### 補完候補の取得フロー

```
ユーザー入力 → パース → コンテキスト分析 → 候補生成 → フィルタリング → 表示
```

### パフォーマンス考慮事項

1. **デバウンス**: 150ms（リアルタイム評価より長め）
2. **キャッシング**: 同一プレフィックスの結果をキャッシュ
3. **候補数制限**: 最大100件、表示は10件まで
4. **Worker活用**: 重い補完候補生成はWorkerで実行

### エラーハンドリング

- 評価エラーの場合は補完を無効化
- 巨大オブジェクトの場合は深さ制限（最大3階層）
- 循環参照の検出と回避

## テスト計画

### ユニットテスト
- AutocompleteEngineの各メソッド
- 補完候補生成ロジック
- エッジケース（空入力、特殊文字等）

### E2Eテスト
- expectスクリプトによるTab補完の動作確認
- 各種補完パターンの網羅的テスト

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| パフォーマンス劣化 | 高 | Worker Thread活用、キャッシング |
| 既存機能への影響 | 中 | 機能フラグで段階的導入 |
| ink統合の複雑性 | 中 | 別モードとして実装 |

## マイルストーン

1. **Week 1**: 基本的なTab補完の実装とテスト
2. **Week 2**: 補完UIの改善と最適化
3. **Week 3-4**: ink-uiモードの実装（オプション）
4. **Week 5**: ドキュメント作成とリリース準備

## 成功指標

- Tab補完の応答時間 < 50ms
- 補完精度 > 90%
- 既存機能への影響ゼロ
- ユーザビリティの向上（フィードバックによる評価）