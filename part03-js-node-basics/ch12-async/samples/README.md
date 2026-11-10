# 第12章 サンプル

本文の「手を動かす」で書くプログラムの完成形と、動かして結果を見るだけのプログラム（「中身は読まなくてよい」）があります。どれも `~/dev/part03/ch12-async` で `node samples/ファイル名` のように実行します。

**本文で書くプログラムの完成形**

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [read-callback.mjs](read-callback.mjs) | コールバックでファイルを読む。結果より先に次の行が実行される | 2.1 |
| [delay.mjs](delay.mjs) | `delay` と `delayFail` を作り、`then`・`catch`・`finally` でつなぐ | 3.2, 3.3 |
| [delay-await.mjs](delay-await.mjs) | `delay.mjs` を async/await と `try`/`catch` で書き直したもの | 4.1 |
| [timing.mjs](timing.mjs) | 直列と並行（`Promise.all`）の時間を比べる | 6.1 |
| [foreach-pitfall.mjs](foreach-pitfall.mjs) | `forEach` が await を待たないこと、`for...of` と `Promise.all` での書き直し | 7.1, 7.2 |

**動かして結果を見るだけのプログラム（中身は読まなくてよい）**

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
$ node samples/promise-demo.mjs
$ node samples/unhandled-demo.mjs 1
$ node samples/abort-demo.mjs
```

`callback-demo.mjs` は、OS の一時フォルダ（`os.tmpdir()`）の中に `ch12-callback-demo` というフォルダを作り、そこに小さなファイルを書きます。`~/dev/part03` も汚しません。

`unhandled-demo.mjs` の 1〜3 は、**わざとプロセスを異常終了させます**。最後に表示されるエラーと、終了コード（`echo $?`）を見てください。

時間を表示するサンプル（`timing-demo.mjs`・`abort-demo.mjs`）は、実行するたびに数ミリ秒ずれます。本文に載せた結果と少し違っても問題ありません。
