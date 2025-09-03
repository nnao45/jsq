# QuickJS VM インスタンスプーリング最適化計画

## 概要
jsqの並列実行時のVM起動オーバーヘッドを削減するため、QuickJS VMインスタンスをプーリングして再利用する実装を行う。

## 現状の問題点
- 各Workerで毎回新しいQuickJS VMを初期化している
- `QuickJSEngine`クラスで毎回`newQuickJSWASMModule()`と`runtime.newContext()`を実行
- 大量のJSONを処理する際、VM起動のオーバーヘッドが蓄積される

## 実装計画

### 1. ベンチマークの準備
#### 計測対象
- VM初期化時間
- Context作成時間
- 1000行のJSON処理にかかる総時間
- Worker単位での処理時間の内訳

#### ベンチマークスクリプト
```bash
# 大量のJSONデータを生成
seq 1 10000 | jq -c '{id: ., value: "test data"}' > benchmark.jsonl

# 現在の実装でのベンチマーク
time cat benchmark.jsonl | jsq '$.value' > /dev/null
```

### 2. VM プーリング実装

#### 2.1 VMプールクラスの作成
```typescript
// src/core/vm/quickjs-vm-pool.ts
class QuickJSVMPool {
  private pool: QuickJSEngine[] = [];
  private inUse: Set<QuickJSEngine> = new Set();
  
  async acquire(): Promise<QuickJSEngine> {
    // プールから利用可能なVMを取得または新規作成
  }
  
  release(engine: QuickJSEngine): void {
    // VMをプールに返却（Contextのリセット含む）
  }
}
```

#### 2.2 Contextリセット機能の実装
- グローバル変数のクリア
- メモリ使用量のリセット
- console呼び出し履歴のクリア

#### 2.3 Workerの修正
- `piscina-parallel-worker.ts`でVMプールを使用するよう修正
- VMの取得と返却のライフサイクル管理

### 3. パフォーマンス計測

#### 計測項目
1. **VM初期化時間の削減率**
   - 初回起動時間 vs プールからの取得時間

2. **スループットの改善**
   - 1秒あたりの処理可能JSON行数

3. **メモリ使用量**
   - プーリングによるメモリ使用量の変化

4. **並列度による性能変化**
   - Worker数を1, 2, 4, 8で変えて計測

#### 計測コマンド
```bash
# タイミング詳細を含む実行
hyperfine --warmup 3 \
  'cat benchmark.jsonl | jsq "$.value"' \
  'cat benchmark.jsonl | jsq --vm-pool "$.value"'

# メモリ使用量の計測
/usr/bin/time -v cat benchmark.jsonl | jsq '$.value' 2>&1
```

### 4. 評価基準

#### 成功の指標
- VM起動オーバーヘッドが50%以上削減
- 大量データ処理時のスループットが20%以上向上
- メモリ使用量の増加が10%以内

#### リスクと対策
- **メモリリーク**: Contextリセットが不完全な場合
  - 対策: 定期的なVMの完全再作成
- **並行性の問題**: VMの同時アクセス
  - 対策: 適切なロック機構の実装

### 5. 実装ステップ

1. **Phase 1: ベンチマーク環境構築**（1日）
   - ベンチマークスクリプトの作成
   - 現在の性能ベースラインの確立

2. **Phase 2: VMプール実装**（2-3日）
   - VMプールクラスの実装
   - Contextリセット機能の実装
   - Worker統合

3. **Phase 3: 性能評価**（1日）
   - 各種ベンチマークの実行
   - 結果の分析とドキュメント化

4. **Phase 4: 最適化**（1日）
   - プールサイズの調整
   - リセット処理の最適化

## 期待される成果
- 並列処理時のVM起動オーバーヘッドの大幅削減
- 大規模データセット処理時のパフォーマンス向上
- より効率的なリソース利用