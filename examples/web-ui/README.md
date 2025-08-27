# JSQ Web Playground

ブラウザでJSQを体験できるWebアプリケーションです。2つのバージョンがあります：

1. **簡易版** (`index.html`) - QuickJS WASMを直接使用したシンプルな実装
2. **本格版** (`index-webpack.html`) - 実際のJSQコードをWebpackでバンドルした完全版

## 機能

- 🚀 **リアルタイムJSON処理**: JSONデータに対してJavaScript式を実行
- 💡 **スマートドル記法**: `$`を使った直感的なデータアクセス
- 🔧 **Lodashサポート**: 本物のLodash関数を使用
- 📝 **コンソール出力**: `console.log()`でデバッグ情報を表示
- 🎨 **シンタックスハイライト**: 結果をきれいに表示
- ⚙️ **式変換表示**: JSQがどのように式を変換するかを確認可能

## クイックスタート

### 簡易版（すぐに試せる）

```bash
cd examples/web-ui
python -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```

### 本格版（実際のJSQコードを使用）

```bash
cd examples/web-ui

# 依存関係をインストール
npm install

# 開発サーバーを起動（自動リロード付き）
npm run dev
# ブラウザで http://localhost:9000 が自動で開く

# または本番ビルド
npm run build
# distディレクトリにビルドされたファイルが生成される
```

## 使用例

### 基本的な使い方

```javascript
// 全ユーザーの名前を取得（SmartDollar記法）
$.users.name

// 年齢でフィルタリング
$.users.filter(u => u.age > 25)

// 都市でグループ化（パイプ演算子）
$.users | _.groupBy('city')
```

### 高度な使い方

```javascript
// 複雑な変換
$.users
  .filter(u => u.active)
  .map(u => ({
    ...u,
    ageGroup: u.age < 30 ? 'young' : 'adult'
  }))

// 集計とチェーン処理
$.products
  .filter(p => p.inStock)
  | _.sortBy('price')
  | _.take(5)

// デバッグ出力付き
(() => {
  console.log('Total users:', $.users.length);
  const activeUsers = $.users.filter(u => u.active);
  console.log('Active users:', activeUsers.length);
  return activeUsers;
})()

// ネストしたデータへのアクセス
$.stats.metrics.revenue
```

## 技術詳細

### 簡易版
- **QuickJS WASM**: CDNから直接読み込み
- **手動実装**: SmartDollarとLodashの簡易実装
- **軽量**: 追加の依存関係なし

### 本格版
- **実際のJSQコード**: `src/core`のコードを使用
- **完全な機能**: Node.js版と同じ評価エンジン
- **Webpack**: TypeScriptのトランスパイルとバンドル
- **QuickJS統合**: 本物のVMサンドボックス実装

## ビルド設定

### Webpack設定の主な内容
```javascript
{
  // Node.js固有モジュールをスタブ化
  resolve: {
    fallback: {
      "fs": false,
      "path": false,
      "stream": false
    }
  },
  // QuickJS WASMサポート
  experiments: {
    asyncWebAssembly: true
  }
}
```

### TypeScript設定
- パスエイリアス: `@/` → `../../src/`
- ターゲット: ES2020
- DOM型定義を含む

## APIリファレンス

### グローバル変数
```javascript
// JSQインスタンス（自動初期化）
window.jsq

// JSQクラス（手動初期化用）
window.JSQ
```

### メソッド
```javascript
// 初期化
await jsq.initialize();

// 式の評価
const result = await jsq.evaluate(expression, data, options);

// 式の変換（デバッグ用）
const transformed = jsq.transform(expression);
```

## カスタマイズ

### 新しいLodash関数を追加
```javascript
// browser-entry.tsまたはapp.jsを編集
_.chunk = function(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};
```

## トラブルシューティング

### 「Lifetime not alive」エラー
QuickJSのハンドル管理の問題です。VMコンテキストを適切にdispose()してください。

### 初期化に失敗
- ブラウザのコンソールでエラーを確認
- CORSポリシーに注意（ローカルサーバーが必要）
- WebAssemblyがサポートされているブラウザを使用

### メモリ不足
- データサイズを小さくする
- メモリリミットを増やす（options.memoryLimit）

## 制限事項

- ファイルシステムアクセスなし（ブラウザの制限）
- コマンドライン引数なし
- ストリーミング処理は限定的
- 一部のNode.js固有機能は利用不可

## 今後の拡張予定

- [ ] Web Workersでの並列処理
- [ ] IndexedDBでのデータ永続化
- [ ] PWA対応（オフライン動作）
- [ ] より多くのLodash関数のサポート
- [ ] パフォーマンスメトリクスの表示

## ライセンス

JSQ本体と同じライセンスに従います。