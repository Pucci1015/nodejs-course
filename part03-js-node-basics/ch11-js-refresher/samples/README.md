# 第11章 サンプル

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [types-demo.mjs](types-demo.mjs) | `typeof`、数値（浮動小数点数・BigInt）、`==` と `===`、falsy な値、UTF-16 の文字列 | 1 |
| [scope-closure-demo.mjs](scope-closure-demo.mjs) | ブロックスコープ、TDZ、巻き上げ、クロージャ、ループと `var`・`let`、既定の引数 | 2, 3 |
| [this-demo.mjs](this-demo.mjs) | 呼び方で変わる `this`、`bind`、アロー関数、クラスのメソッドを渡したとき | 4 |
| [class-demo.mjs](class-demo.mjs) | プロトタイプ、クラス、`#private`、ゲッター、継承、独自のエラーと `cause` | 5, 9 |
| [array-demo.mjs](array-demo.mjs) | 分割代入、スプレッド、`?.`・`??`、配列のメソッド、`sort` の落とし穴、`Map` | 6, 7 |
| [copy-demo.mjs](copy-demo.mjs) | 参照、浅いコピー、JSON のコピー、`structuredClone`、`Object.freeze` | 8 |

外部のパッケージは使わないので、`npm install` は不要です。

```sh
$ node types-demo.mjs
$ node this-demo.mjs
```

どれも、実行すると説明付きの結果が表示されます。表示を見る前に、コードを読んで結果を予想してみてください。VS Code の JavaScript Debug Terminal（第1部 第4章10.1節）で実行し、ブレークポイントを置いて変数の中身を見るのもおすすめです。
