# Enquirer REPL Migration Plan 🚀

## 概要
現在のreadlineベースのREPL実装をEnquirerベースに移行し、より安定した高機能なREPLを実現する。

## 現状の問題点

### readline実装の課題
1. **低レベルすぎてバグりやすい** - キー入力を全部自分で処理する必要がある
2. **カーソル移動と表示制御が複雑** - `readline.clearLine()`や`cursorTo()`の手動管理
3. **補完UIが貧弱** - 単純な1行表示のみでドロップダウンUIなし
4. **テストが困難** - E2Eテストがexpectスクリプトに依存

### Enquirerを使うメリット
1. **リッチなUI** - ドロップダウン、ハイライト、スクロール可能なリストが標準装備
2. **イベントハンドリングの簡潔化** - キー入力処理が抽象化される
3. **テスタビリティ向上** - モックしやすい設計
4. **エラー処理の改善** - 組み込みの例外処理機構

## アーキテクチャ設計

### コンポーネント構成

```typescript
// 1. EnquirerReplManager - メインのREPLマネージャー
class EnquirerReplManager {
  private prompt: CustomAutocompletePrompt;
  private autocompleteEngine: AutocompleteEngine; // 既存エンジンを再利用
  private evaluator: JsqEvaluator;
  private history: string[];
  
  async start(): Promise<void>
}

// 2. CustomAutocompletePrompt - Enquirerを拡張
class CustomAutocompletePrompt extends Autocomplete {
  // リアルタイム補完
  // マルチライン対応
  // 履歴機能
  // シンタックスハイライト
}
```

### 主要機能の実装方針

#### 1. オートコンプリート機能
- Enquirerの`Autocomplete`プロンプトを拡張
- 既存の`AutocompleteEngine`をアダプターパターンで接続
- ドロップダウンUIで補完候補を表示
- ファジー検索サポート

#### 2. 履歴機能
- Enquirerの組み込み履歴管理を活用
- 上下キーでのナビゲーション
- 永続化対応

#### 3. マルチライン対応
- Shift+Enterで改行
- インデント自動調整
- ブラケットマッチング

#### 4. リアルタイム評価
- 非同期評価エンジン
- 結果のインライン表示
- エラーハイライト

## 実装計画

### Phase 1: プロトタイプ作成（1週間）
- [ ] Enquirerのセットアップ
- [ ] 基本的なREPLループの実装
- [ ] AutocompleteEngineとの接続
- [ ] 単純な入力・評価・出力の動作確認

### Phase 2: 機能移植（2週間）
- [ ] 履歴機能の実装
- [ ] マルチライン入力対応
- [ ] エラーハンドリング強化
- [ ] 特殊コマンド対応（.exit, .help等）

### Phase 3: UI改善（1週間）
- [ ] ドロップダウン式補完UIの実装
- [ ] シンタックスハイライト（chalk使用）
- [ ] プログレスインジケーター
- [ ] カラーテーマサポート

### Phase 4: テストとバグ修正（1週間）
- [ ] ユニットテスト作成
- [ ] インテグレーションテスト
- [ ] E2Eテストの更新（Enquirer対応）
- [ ] パフォーマンステスト

## 既存コードの再利用計画

### AutocompleteEngineの統合
```typescript
class EnquirerAutocompleteAdapter {
  constructor(private engine: AutocompleteEngine) {}
  
  async getSuggestions(input: string, cursor: number): Promise<Suggestion[]> {
    const context = this.createContext(input, cursor);
    const completions = await this.engine.getCompletions(context);
    return this.formatForEnquirer(completions);
  }
}
```

### 評価エンジンの再利用
- 現在の`JsqEvaluator`をそのまま使用
- 非同期評価のラッパーを追加

## リスク評価と対策

| リスク | 影響度 | 確率 | 対策 |
|--------|--------|------|------|
| Enquirerのカスタマイズ制限 | 中 | 中 | 必要に応じてpatch-packageで対応 |
| パフォーマンス劣化 | 低 | 低 | ベンチマークによる継続的モニタリング |
| 既存機能の互換性問題 | 高 | 中 | フィーチャーフラグで段階的移行 |
| 依存関係の増加 | 低 | 高 | 最小限の依存に留める |

## 成功指標
- 補完機能のバグ報告が50%以上削減
- ユーザビリティテストでの満足度向上
- テストカバレッジ80%以上
- パフォーマンス劣化なし（起動時間、レスポンス時間）

## タイムライン
- Week 1: Phase 1 完了
- Week 2-3: Phase 2 完了
- Week 4: Phase 3 完了
- Week 5: Phase 4 完了、リリース準備

## 次のステップ
1. Enquirerパッケージのインストール
2. プロトタイプ実装の開始
3. 既存テストの分析と移行計画