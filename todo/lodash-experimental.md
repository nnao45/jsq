### :火: Math系（めっちゃ使いそう！）
- sumBy - オブジェクトの配列の特定プロパティの合計（例: _.sumBy(users, 'age'))
- meanBy - 特定プロパティの平均値
- add, subtract, multiply, divide - 基本的な算術演算
- ceil, floor, round - 精度指定できる丸め処理
### :線グラフ: Collection系（超便利系）
- flatMap, flatMapDeep - mapしてからflatten
- invokeMap - 各要素のメソッド呼び出し
- partition - 条件で2つのグループに分割
- pullAll, pullAllBy - 配列から複数要素を削除
- differenceBy, differenceWith - カスタム比較での差分
- intersectionBy, intersectionWith - カスタム比較での交差
- unionBy, unionWith - カスタム比較での結合
- xor, xorBy, xorWith - 対称差（どちらか片方にしかない要素）
### :ダーツ: Array系（めっちゃ便利！）
- findLast, findLastIndex - 後ろから検索
- nth - n番目の要素取得（負の値で後ろから）
- pullAt - 指定インデックスの要素を削除して返す
- takeRight, takeRightWhile - 後ろからtake
- dropRight, dropRightWhile - 後ろからdrop
- zipObject, zipObjectDeep - キーと値の配列からオブジェクト作成
- unzip, unzipWith - zip解除
### :アルファベット小文字: String系（Case変換もっと欲しい！）
- upperCase, lowerCase - スペース区切りの大文字/小文字
- pad, padStart, padEnd - パディング処理
- trim, trimStart, trimEnd - カスタム文字でトリム
- truncate - 文字列の切り詰め
- escape, unescape - HTML エスケープ
- words - 単語分割
- deburr - アクセント記号除去
### :ハンマーとレンチ: Object系（めっちゃ必要！）
- get, set - ネストしたプロパティへの安全なアクセス
- has, hasIn - プロパティ存在チェック
- mapKeys, mapValues - キーや値の変換
- toPairs, toPairsIn - オブジェクトを[key, value]配列に
- assignIn, assignWith - プロトタイプも含むマージ
- mergeWith - カスタマイザー付きディープマージ
- at - 複数パスの値を配列で取得
### :ビデオゲーム: Function系（関数型プログラミング系）
- debounce, throttle - イベント制御（超重要！）
- curry, curryRight - カリー化
- partial, partialRight - 部分適用
- memoize - メモ化
- once - 一度だけ実行
- flow, flowRight - 関数合成
## 優先的に実装すべきメソッドの提案 :キラキラハート:
1. sumBy - めっちゃ使う！配列の合計計算
2. get/set - ネストしたオブジェクトの安全なアクセス
3. debounce/throttle - イベント制御は必須
4. flatMap - map + flattenはよく使うパターン
5. partition - フィルタリングの進化版
6. memoize - パフォーマンス最適化に必須