# 第23章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [hello.mjs](hello.mjs) | 「手を動かす」の完成形。いちばん小さな Express のアプリ。`X-Powered-By` を消す | 2 | 9307 |
| [routes.mjs](routes.mjs) | 「手を動かす」の完成形。パスパラメータとクエリ（配列にそろえる）、具体的なルートを先に | 3 | 9307 |
| [body.mjs](body.mjs) | 「手を動かす」の完成形。`express.json()` で読み、415・422・201 を返す | 5 | 9307 |
| [errors.mjs](errors.mjs) | 「手を動かす」の完成形。404 のミドルウェアと、JSON を返すエラーハンドラ | 8 | 9307 |
| [hello-express.mjs](hello-express.mjs) | いちばん小さな Express のアプリ。`app` は関数なので `http.createServer(app)` に渡せる | 2 | 9300 |
| [routes-demo.mjs](routes-demo.mjs) | パスパラメータ、クエリ、`*名前`、`{…}`、`app.route`、ルートの順番。405 にならないこと | 3 | 9301 |
| [req-res-demo.mjs](req-res-demo.mjs) | `res.send` の型による違い、`res.send(数)` の落とし穴、`res.redirect`、204、2回返す、`req.get`・`req.accepts` | 4 | 9302 |
| [body-demo.mjs](body-demo.mjs) | `express.json()`・`express.urlencoded()`。Content-Type が違うと `req.body` は `undefined`、400・413 | 5 | 9303 |
| [static-demo.mjs](static-demo.mjs) | `express.static`（index、ドットファイル、Cache-Control、Range、`fallthrough`） | 6 | 9304 |
| [view-engine-demo.mjs](view-engine-demo.mjs) | 第21章のテンプレートエンジンを `app.engine` で登録して `res.render` | 7 | 9306 |
| [error-demo.mjs](error-demo.mjs) | 同期・async・コールバックの中の例外、`err.status`、既定のエラーハンドラ（`NODE_ENV`）と自分のエラーハンドラ | 8 | 9305 |
| [public/](public/) | `static-demo.mjs` が公開するフォルダ | 6 | — |
| [views/](views/) | `view-engine-demo.mjs` のテンプレート | 7 | — |

## 動かし方

第5部のサンプルは Express などのパッケージを使います。本文の最初の「読み方」で `setup-part05.sh` を動かして作った `~/dev/part05` の中で、章のフォルダから動かします。

```sh
$ cd ~/dev/part05/ch23-express-intro
$ node samples/hello-express.mjs          # 別のターミナルで curl -i http://127.0.0.1:9300/
$ node samples/routes-demo.mjs            # 別のターミナルで curl -i http://127.0.0.1:9301/tasks/42
$ NODE_ENV=production node samples/error-demo.mjs
```

- 各ファイルの先頭のコメントに、試す `curl` を書いてあります
- サーバは `Ctrl+C` で止めます
- `view-engine-demo.mjs` は、第4部の部品のコピー（[../../lib/](../../lib/)）を使います
- `error-demo.mjs` の例外の文にある `dev-only-password` は、説明のための値です。本物の接続文字列やパスワードを、例外の文やソースコードに書かないでください（第26章で、設定と秘密の情報の分け方を学びます）
