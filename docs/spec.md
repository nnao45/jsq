# 英語のjsqのドキュメントを作りましょう。
## 実行環境
github pageにホスティングする予定です。
jsqはwasmでホスティングする予定で、実装はexamples/web-ui配下を参考にしてください。

## ドキュメントのコンテンツ

### 1ページ目
Introduction

- 簡単なjsqのコンセプトと紹介

### 2ページ目
getting-started

- install方法
- 簡単な使用例
- wsamのホスティングについて
  - `examples/web-ui` の紹介

### 3ページ目
$記法のメソッドチェーン一覧

- `src/core/smart-dollar/smart-dollar-shared-methods.ts` が一覧です。
- 全ての$記法のメソッドチェーンについてsyntaxと使用例
- 各メソッドチェーンの項目には使用例と実際にWASMで動くフォームを用意
### 4ページ目
lodash記法のメソッドチェーン一覧

- `src/core/lodash/lodash-shared-methods.ts` をが一覧です。
- 全てのlodash記法のメソッドチェーンについてsyntaxと使用例
- 各メソッドチェーンの項目には使用例と実際にWASMで動くフォームを用意