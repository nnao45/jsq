# jsq - jQuery風JSON処理コマンドラインツール

🇯🇵 **日本語** | [🇺🇸 English](README.md)

jsqは、Web開発者が既に慣れ親しんでいるjQuery/Lodashライクな記法でJSONデータを処理できる革新的なコマンドラインツールです。jqの学習コストの高さを解決し、JavaScriptの既存スキルを活用してJSONを直感的に操作できます。

## 🌟 主な特徴

### 1. jQuery風チェイニングAPI
Web開発者にとって直感的な記法でJSONを操作

```bash
# jq（学習が必要）
cat users.json | jq '.users[] | select(.active == true) | .name'

# jsq（直感的）
cat users.json | jsq '$.users.filter(u => u.active).pluck("name")'
```

### 2. 🔗 npmライブラリ統合
任意のnpmライブラリを動的にロードして利用可能

```bash
# Lodashを使った高度なデータ処理
cat data.json | jsq --use lodash '_.orderBy($.users, ["age"], ["desc"])'

# 複数ライブラリの同時利用
cat data.json | jsq --use lodash,moment '_.map($.events, e => ({...e, formatted: moment(e.date).format("YYYY-MM-DD")}))'

# ファイルから直接読み込み
jsq '$.users.length' --file data.json
jsq '$.name' --file users.jsonl --stream

# インタラクティブREPLモード
jsq --repl --file data.json  # リアルタイムでデータを探索
```

### 3. ⚡ 高速実行＆オプションセキュリティ
デフォルトで高速実行、セキュリティが重要な場合は`--safe`オプションでVM分離可能

```bash
# デフォルト（高速）モードで実行
cat data.json | jsq --use lodash '_.uniq(data.tags)'

# セキュリティ重視の場合は --safe オプション
cat data.json | jsq --use lodash --safe '_.uniq(data.tags)'
```

### 4. 📈 インテリジェントキャッシュ
一度インストールしたライブラリは自動でキャッシュされ、次回から高速に利用可能

### 5. 🎯 TypeScript完全対応
型安全な処理と優れた開発体験を提供

## 📦 インストール

```bash
npm install -g jsq
```

## 🚀 基本的な使い方

### データの変換

```bash
# 配列の各要素を変換
echo '{"numbers": [1, 2, 3, 4, 5]}' | jsq '$.numbers.map(n => n * 2)'
# 出力: [2, 4, 6, 8, 10]

# オブジェクトのフィルタリング
echo '{"users": [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]}' | jsq '$.users.filter(u => u.age > 25)'
# 出力: [{"name": "Alice", "age": 30}]
```

### チェイニング操作

```bash
# 複数の操作を組み合わせ
echo '{"sales": [{"product": "laptop", "price": 1200}, {"product": "mouse", "price": 25}]}' | jsq '$.sales.sortBy("price").pluck("product")'
# 出力: ["mouse", "laptop"]

# 集計操作
echo '{"orders": [{"amount": 100}, {"amount": 250}, {"amount": 75}]}' | jsq '$.orders.sum("amount")'
# 出力: 425
```

### 条件付きフィルタリング

```bash
echo '{"products": [{"name": "iPhone", "category": "phone", "price": 999}, {"name": "MacBook", "category": "laptop", "price": 1299}]}' | jsq '$.products.where("category", "phone").pluck("name")'
# 出力: ["iPhone"]
```

## 🔧 高度な機能

### npmライブラリの利用

#### Lodashによる高度なデータ処理

```bash
# グループ化
cat data.json | jsq --use lodash '_.groupBy($.users, "department")'

# 深いクローン
cat data.json | jsq --use lodash '_.cloneDeep($.config)'

# 複雑なソート
cat data.json | jsq --use lodash '_.orderBy($.products, ["category", "price"], ["asc", "desc"])'
```

#### 日付処理ライブラリ

```bash
# Moment.jsでの日付フォーマット
cat events.json | jsq --use moment '$.events.map(e => ({...e, formatted: moment(e.timestamp).format("YYYY/MM/DD HH:mm")}))'

# Day.jsによる日付計算
cat logs.json | jsq --use dayjs '$.logs.filter(log => dayjs(log.date).isAfter(dayjs().subtract(1, "week")))'
```

### セキュリティ機能

jsqはデフォルトで高速実行、オプションでVMサンドボックス環境での安全な実行を提供します：

```bash
# デフォルト（高速）モードでの実行
cat data.json | jsq --use lodash '_.uniq(data.tags)'
# ⚡ Running in fast mode (VM disabled)

# セキュリティ重視の場合は --safe フラグ
cat data.json | jsq --use lodash --safe '_.sortBy(data.items, "name")'
# 🔒 Running in secure VM mode
```

### ストリーミング処理デモ

```bash
# リアルタイムでのデータ処理を体験
for i in {1..3}; do echo "{\"id\":$i,\"name\":\"User$i\"}"; sleep 1; done | node dist/index.js '$.name' --stream
# 出力：
# "User1"
# "User2"  (1秒後)
# "User3"  (さらに1秒後)
```

### パフォーマンス監視

```bash
# 詳細なパフォーマンス情報を表示
cat large-data.json | jsq -v '$.records.filter(r => r.status === "active").length()'
# Processing time: 15ms
# Input size: 1024 bytes
# Output size: 1 bytes
```

## 📚 利用可能なメソッド

### 配列操作

| メソッド | 説明 | 例 |
|---------|------|-----|
| `filter(predicate)` | 条件に一致する要素をフィルタ | `$.users.filter(u => u.age > 18)` |
| `map(transform)` | 各要素を変換 | `$.numbers.map(n => n * 2)` |
| `find(predicate)` | 条件に一致する最初の要素を取得 | `$.users.find(u => u.name === "Alice")` |
| `where(key, value)` | 指定のキー/値でフィルタ | `$.products.where("category", "electronics")` |
| `pluck(key)` | 指定のキーの値を抽出 | `$.users.pluck("email")` |
| `sortBy(key)` | 指定のキーでソート | `$.items.sortBy("price")` |
| `take(count)` | 先頭からN個取得 | `$.results.take(5)` |
| `skip(count)` | 先頭からN個スキップ | `$.results.skip(10)` |

### 集計操作

| メソッド | 説明 | 例 |
|---------|------|-----|
| `length()` | 要素数を取得 | `$.items.length()` |
| `sum(key?)` | 合計値を計算 | `$.orders.sum("amount")` |
| `keys()` | オブジェクトのキー一覧 | `$.config.keys()` |
| `values()` | オブジェクトの値一覧 | `$.settings.values()` |

## 🎛️ コマンドラインオプション

```bash
jsq [options] <expression>

Options:
  -v, --verbose           詳細な実行情報を表示
  -d, --debug            デバッグモードを有効化
  -u, --use <libraries>  npmライブラリを読み込み (カンマ区切り)
  -s, --stream           大容量データセット用のストリーミングモードを有効化
  -b, --batch <size>     指定サイズでのバッチ処理（--streamを含む）
  --json-lines           JSON Lines形式での入出力
  -f, --file <path>      標準入力の代わりにファイルから読み込み
  --file-format <format> 入力ファイル形式を指定 (json, jsonl, csv, tsv, parquet, auto)
  --repl                 インタラクティブREPLモードを開始
  --safe                 VM分離ありで実行（セキュアだが低速）
  --unsafe               レガシーオプション（非推奨、--safeを推奨）
  --help                 ヘルプを表示
  --version              バージョンを表示
```

## 🔄 jqからの移行

| jq | jsq |
|----|-----|
| `.users[] \| select(.active)` | `$.users.filter(u => u.active)` |
| `.users[] \| .name` | `$.users.pluck("name")` |
| `.users \| length` | `$.users.length()` |
| `.products \| sort_by(.price)` | `$.products.sortBy("price")` |
| `.items[] \| select(.price > 100)` | `$.items.filter(i => i.price > 100)` |

## 🏗️ アーキテクチャ

jsqは以下の主要コンポーネントで構成されています：

- **チェイニングエンジン**: jQuery風のメソッドチェイニングを提供
- **ライブラリマネージャー**: npmパッケージの動的ロードとキャッシュ管理
- **VMエグゼキューター**: セキュアな実行環境の提供
- **JSONパーサー**: 高性能なJSON解析とエラーハンドリング

## 💡 実用例

### ログ解析

```bash
# エラーログの抽出と集計
cat server.log | jsq '$.logs.filter(log => log.level === "error").groupBy("component").mapValues(logs => logs.length)'

# 最新のエラーTOP5
cat server.log | jsq '$.logs.filter(l => l.level === "error").sortBy("timestamp").take(5)'
```

### データ変換

```bash
# APIレスポンスの正規化
cat api-response.json | jsq '$.results.map(item => ({id: item._id, name: item.displayName, active: item.status === "active"}))'

# CSVライクなデータ生成
cat users.json | jsq '$.users.map(u => [u.id, u.name, u.email].join(",")).join("\n")'
```

### レポート生成

```bash
# 売上サマリー
cat sales.json | jsq --use lodash '_.chain($.sales).groupBy("month").mapValues(sales => _.sumBy(sales, "amount")).value()'

# ユーザー統計
cat analytics.json | jsq '$.users.groupBy("country").mapValues(users => ({count: users.length, avgAge: users.reduce((sum, u) => sum + u.age, 0) / users.length}))'
```

## 🔧 開発・貢献

```bash
# 開発環境のセットアップ
git clone https://github.com/nnao45/jsq.git
cd jsq
npm install

# ビルド
npm run build

# テスト実行
npm test

# 開発モード
npm run dev
```

## ✅ 実装済み機能

- [x] ストリーミング処理（大容量ファイル対応）
- [x] JSON Lines形式サポート
- [x] CSV/TSV/Parquetファイル対応
- [x] バッチ処理モード
- [x] ファイル直接読み込み
- [x] インタラクティブREPLモード
- [x] VM分離によるセキュアな実行
- [x] npmライブラリ動的ローディング
- [x] 関数型プログラミングメソッド
- [x] TypeScript完全対応

## 🚧 今後の予定

- [ ] プラグインシステム
- [ ] より高度な型チェック
- [ ] GraphQL対応
- [ ] WebAssembly統合
- [ ] 分散処理サポート

## 📄 ライセンス

MIT License

## 🤝 サポート・フィードバック

バグ報告や機能要求は[GitHubのIssues](https://github.com/nnao45/jsq/issues)でお願いします。

---

**jsq**は、JSON処理における開発者体験の革新を目指しています。jqの強力さとJavaScriptの親しみやすさを組み合わせ、既存のスキルを最大限に活用できるツールです。