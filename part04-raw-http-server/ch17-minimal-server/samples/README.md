# 第17章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [hello-server.mjs](hello-server.mjs) | いちばん小さなサーバ。`createServer`・`listen`・`req.url` | 2 | 9170 |
| [lifecycle-demo.mjs](lifecycle-demo.mjs) | 1つのリクエストで起きるイベント（`connection`・`request`・`data`・`end`・`finish`・`close`）、keep-alive、客が先に切ったとき | 3 | 9171 |
| [response-demo.mjs](response-demo.mjs) | `setHeader`・`writeHead`・`write`・`end`、Content-Length と chunked、遅すぎる `setHeader`、2回目の `end`、`end` を呼ばない、HEAD | 4 | 9172 |
| [crash-demo.mjs](crash-demo.mjs) | ハンドラの例外でプロセスごと止まる様子と、包んで 500 を返す書き方（`safe`）。コールバックの中の例外 | 5 | 9173 |
| [shutdown-demo.mjs](shutdown-demo.mjs) | SIGINT・SIGTERM で安全に止まる。処理中を返してから終わる、2回目はすぐ終わる、上限の時間 | 7 | 9174 |
| [timeout-demo.mjs](timeout-demo.mjs) | `headersTimeout` と `keepAliveTimeout`。自分のサーバに、同じプロセスから遅い客をつなぐ | 8 | 9175 |

外部のパッケージは使わないので、`npm install` は不要です。どのサーバも `127.0.0.1` だけで待ち受けるので、同じ Mac の中からしか開けません。

```sh
$ node hello-server.mjs          # 止めるのは Ctrl+C
$ node lifecycle-demo.mjs
$ node response-demo.mjs
$ node crash-demo.mjs            # /throw を開くと、プロセスが終わる
$ node crash-demo.mjs safe       # 例外を捕まえて 500 を返す
$ node shutdown-demo.mjs
$ node timeout-demo.mjs          # 5 秒ほどで自分で終わる
```

- サーバを開くのは、別のターミナルの `curl -i`（ヘッダも表示する）かブラウザです。各ファイルの先頭のコメントに、試す URL を書いてあります
- `crash-demo.mjs` は**わざと**プロセスを落とします。落ちたら、もう一度起動してください
- `timeout-demo.mjs` は、ヘッダを少しずつ送る遅い客を、**自分で立てたサーバに対して**同じプロセスの中で動かします。ほかのサーバに対して、このような客を動かさないでください
- ファイルを保存するたびに起動し直したいときは `node --watch hello-server.mjs`（本文 2.3節）
