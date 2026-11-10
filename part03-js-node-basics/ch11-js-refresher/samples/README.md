# 第11章 サンプル

`~/dev/part03/ch11-js-refresher` で、`node samples/ファイル名` のように実行します。外部のパッケージは使わないので、`npm install` は不要です。

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [counter.mjs](counter.mjs) | 本文で書く、クロージャのカウンタの完成形 | 3.2 |
| [account.mjs](account.mjs) | 本文で書く、クラスの完成形（`#private`、ゲッター、`RangeError`） | 5.2 |
| [tasks-summary.mjs](tasks-summary.mjs) | 本文で書く、`filter`・`map`・`reduce`・`find`・`toSorted` で集計するプログラムの完成形 | 7.1 |
| [types-demo.mjs](types-demo.mjs) | `typeof`、数値（浮動小数点数・BigInt）、`==` と `===`、falsy な値、UTF-16 の文字列 | 1 |
| [scope-closure-demo.mjs](scope-closure-demo.mjs) | ブロックスコープ、TDZ、巻き上げ、クロージャ、ループと `var`・`let`、既定の引数 | 2, 3 |
| [this-demo.mjs](this-demo.mjs) | 呼び方で変わる `this`、`bind`、アロー関数、クラスのメソッドを渡したとき | 4 |
| [class-demo.mjs](class-demo.mjs) | プロトタイプ、クラス、`#private`、ゲッター、継承、独自のエラーと `cause` | 5, 9 |
| [array-demo.mjs](array-demo.mjs) | 分割代入、スプレッド、`?.`・`??`、配列のメソッド、`sort` の落とし穴、`Map` | 6, 7 |
| [copy-demo.mjs](copy-demo.mjs) | 参照、浅いコピー、JSON のコピー、`structuredClone`、`Object.freeze` | 8 |

表の `○○-demo.mjs` の6つは、**中身は読まなくてよい**サンプルです。実行すると、説明付きの結果がまとめて表示されます。

```sh
$ node samples/types-demo.mjs
$ node samples/this-demo.mjs
```

VS Code の JavaScript Debug Terminal（第1部 第4章10.1節）で実行し、ブレークポイントを置いて変数の中身を見るのもおすすめです。
