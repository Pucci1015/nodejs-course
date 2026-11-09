# 第12章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [callback-demo.mjs](callback-demo.mjs) | エラーファーストのコールバック、コールバック地獄、同じ処理を `promisify` と `async`/`await` で書き直したもの | 2, 3 | — |
| [promise-demo.mjs](promise-demo.mjs) | Promise の状態、`then` のつなぎ方、`then` のコールバックが呼ばれる時期、`async` 関数が返すもの | 3, 4 | — |
| [unhandled-demo.mjs](unhandled-demo.mjs) | unhandled rejection でプロセスが終わる様子。番号（1〜4）で場面を選ぶ | 5 | — |
| [timing-demo.mjs](timing-demo.mjs) | 直列と並行の時間の違い、`Promise.all`・`allSettled`・`race`・`any` | 6 | — |
| [foreach-demo.mjs](foreach-demo.mjs) | `forEach` が `await` を待たないこと、`for...of` と `Promise.all` での書き直し | 7 | — |
| [abort-demo.mjs](abort-demo.mjs) | `AbortController`・`AbortSignal.timeout`・`AbortSignal.any` で `fetch` をやめる。遅いサーバ（127.0.0.1:9120）を同じプロセスの中で起動する | 8 | 9120 |

外部のパッケージは使わないので、`npm install` は不要です。

```sh
$ node promise-demo.mjs
$ node unhandled-demo.mjs 1
$ node abort-demo.mjs
```

`callback-demo.mjs` は、OS の一時フォルダ（`os.tmpdir()`）の中に `ch12-callback-demo` というフォルダを作り、そこに小さなファイルを書きます。教材のフォルダは汚しません。

`unhandled-demo.mjs` の 1〜3 は、**わざとプロセスを異常終了させます**。最後に表示されるエラーと、終了コード（`echo $?`）を見てください。

時間を表示するサンプル（`timing-demo.mjs`・`abort-demo.mjs`）は、実行するたびに数ミリ秒ずれます。本文に載せた結果と少し違っても問題ありません。
