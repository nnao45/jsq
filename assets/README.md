# Test Assets

このディレクトリには、jsqのテスト用データファイルが含まれています。

## ファイル一覧

### users.jsonl
ユーザー情報のサンプルデータ（8件）
- 従業員データ（名前、年齢、部署、給与など）
- 用途: フィルタリング、集計、ソート処理のテスト

### sales.jsonl  
販売データのサンプル（8件）
- 商品売上データ（日付、商品、数量、価格など）
- 用途: 集計処理、グループ化のテスト

### logs.jsonl
システムログのサンプルデータ（8件）
- アプリケーションログ（レベル、メッセージ、サービス名など）
- 用途: ログ解析、エラー抽出のテスト

### test-data.jsonl (旧)
基本的なテストデータ（5件）
- シンプルなユーザーデータ
- 用途: 基本機能のテスト

### large-test.jsonl (旧)
数値データのサンプル（10件）
- ID と値のペア
- 用途: 計算処理のテスト

### big-test.jsonl (旧) 
大量データのサンプル（1000件）
- タイムスタンプ付きデータ
- 用途: パフォーマンス・ストリーミングテスト

## 使用例

```bash
# ユーザーデータから東京在住者を抽出
cat assets/users.jsonl | jsq '$.city === "Tokyo" ? $ : null' --stream | grep -v null

# 売上データの総額計算
cat assets/sales.jsonl | jsq 'data.quantity * data.price' --stream

# エラーログのみ抽出
cat assets/logs.jsonl | jsq '$.level === "error" ? $ : null' --stream | grep -v null

# バッチ処理例
cat assets/users.jsonl | jsq '$.salary' --batch 3
```