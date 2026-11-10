# 第24章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [order.mjs](order.mjs) | 「手を動かす」の完成形。ミドルウェアとハンドラが動く順番を記録する | 2 | 9317 |
| [timing.mjs](timing.mjs) | 「手を動かす」の完成形。`res.once('close')` で、応答の後にステータスと時間を書く | 4 | 9317 |
| [require-key.mjs](require-key.mjs) | 「手を動かす」の完成形。鍵を受け取ってミドルウェアを返す `requireKey`。401 で `return` | 5 | 9317 |
| [routers.mjs](routers.mjs) | 「手を動かす」の完成形。`express.Router` でタスクと管理用のルートを分ける | 7 | 9317 |
| [order-demo.mjs](order-demo.mjs) | ミドルウェアが動く順番、`app.use(パス)` の中の `req.url`・`req.baseUrl`、`next('route')` | 2 | 9310 |
| [error-flow-demo.mjs](error-flow-demo.mjs) | `next(err)` で飛ばされるもの、エラーハンドラのつなぎ方と回復、404 との違い | 3 | 9311 |
| [my-middleware.mjs](my-middleware.mjs) | 自分で書くミドルウェア: `requestId`・`accessLog`・`serverTiming`（ほかのサンプルが使う） | 4, 5 | — |
| [finish-demo.mjs](finish-demo.mjs) | 応答の後に動かす処理（`close` のイベント）、客が先に切ったとき | 4 | 9312 |
| [builtin-demo.mjs](builtin-demo.mjs) | `cors`（許すオリジンを決める、プリフライト）と `morgan`（アクセスログ） | 6.1, 6.2 | 9313 |
| [session-demo.mjs](session-demo.mjs) | `express-session`（`saveUninitialized: false`、ログインで `regenerate`、ログアウトで `destroy`） | 6.3 | 9314 |
| [router-demo.mjs](router-demo.mjs) | `express.Router` でルートを分ける、`mergeParams`、Router ごとのミドルウェア | 7 | 9315 |

## 動かし方

`~/dev/part05`（第23章で `setup-part05.sh` を動かして作ったもの）の章のフォルダから動かします。

```sh
$ cd ~/dev/part05/ch24-middleware
$ node samples/order-demo.mjs             # 別のターミナルで curl -s http://127.0.0.1:9310/admin/users/7
$ SESSION_SECRET=$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))") node samples/session-demo.mjs
```

- 各ファイルの先頭のコメントに、試す `curl` を書いてあります。どのミドルウェアが動いたかは、サーバのターミナルに出ます
- `session-demo.mjs` は、`SESSION_SECRET` が無いか 32 文字より短いと起動しません。上のように、その場で作った乱数を渡してください（ファイルに書いて残さない）
- `router-demo.mjs` の `X-Demo-User: alice` は、Router ごとのミドルウェアを見せるための仮の確認です。本物の認証は第10部で扱います
