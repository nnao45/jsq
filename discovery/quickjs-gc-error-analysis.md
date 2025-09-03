# QuickJS GCエラー分析レポート

## エラー内容
```
Assertion failed: list_empty(&rt->gc_obj_list), at: ../../vendor/quickjs/quickjs.c,1998,JS_FreeRuntime
```

## 原因
QuickJSのランタイムを破棄する際、まだ破棄されていないオブジェクトが残っているとこのアサーションエラーが発生します。

## 問題のあるパターン

### 1. getProp()の戻り値を破棄し忘れる
```typescript
// 問題のあるコード
const globalProp = vm.getProp(vm.global, 'JSON');
const parseProp = vm.getProp(globalProp, 'parse');
// globalProp.dispose(); // 忘れている！
// parseProp.dispose(); // 忘れている！
```

### 2. シングルトンハンドルの誤った扱い
QuickJSには以下のシングルトンハンドルがあり、これらはdispose()してはいけません：
- `vm.global`
- `vm.null`
- `vm.undefined`
- `vm.true`
- `vm.false`

## 調査結果

### 確認したファイル
1. **src/core/vm/engines/quickjs/QuickJSEngine.ts**
   - `setGlobal()`メソッド: シングルトンハンドルは正しく処理されている（dispose()していない）
   - `eval()`メソッド: `getProp()`の戻り値は正しくdispose()されている

2. **src/core/vm/vm-sandbox-quickjs.ts**
   - QuickJSエンジンのラッパー実装
   - 毎回新しいエンジンインスタンスを作成してメモリリークを防いでいる

## 修正が必要な可能性がある箇所

### 1. 潜在的な問題箇所
現在のコード調査では、明確なハンドル管理の問題は見つかりませんでした。しかし、以下の点に注意が必要です：

1. **動的なコード評価時のハンドル管理**
   - `evalCode()`の結果から取得したオブジェクトのプロパティを操作する場合
   - 複雑なオブジェクト構造を作成・操作する場合

2. **エラー処理パス**
   - 例外が発生した際のクリーンアップ処理

### 2. ベストプラクティス
```typescript
// 正しいパターン
try {
  const prop = vm.getProp(obj, 'property');
  try {
    // propを使った処理
  } finally {
    prop.dispose();
  }
} finally {
  // 必要に応じてobjもdispose
}
```

## 推奨される対策

### 1. ハンドル管理の強化
- すべての`newXXX()`と`getProp()`の戻り値を追跡
- try-finallyパターンを使用して確実にdispose()を呼ぶ

### 2. デバッグ用のラッパー作成
```typescript
class QuickJSHandleTracker {
  private handles = new Set<QuickJSHandle>();
  
  track<T extends QuickJSHandle>(handle: T): T {
    this.handles.add(handle);
    return handle;
  }
  
  disposeAll() {
    for (const handle of this.handles) {
      try {
        handle.dispose();
      } catch (e) {
        // already disposed
      }
    }
    this.handles.clear();
  }
}
```

### 3. 自動クリーンアップメカニズム
Scope/Lifetimeパターンを使用して、自動的にハンドルを管理する仕組みの導入を検討

## 結論
現在のコード実装では明確なハンドルリークは見つかりませんでしたが、GCエラーが発生している場合は、以下の可能性があります：

1. 特定の実行パスでのみ発生するハンドルリーク
2. 並行処理時のタイミング問題
3. 外部ライブラリとの相互作用

より詳細な調査には、実際にエラーが発生する最小限の再現コードが必要です。