# 第18章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [if-router.mjs](if-router.mjs) | if 文を並べたルーティング。DELETE も 404 になってしまう | 2 | 9180 |
| [url-parts.mjs](url-parts.mjs) | `req.url` の例を `URL` で分解する。`//` で始まるとき、`.`・`..`・`%xx`、`searchParams` の注意 | 3 | — |
| [router.mjs](router.mjs) | いちばん簡単な Router（`SimpleRouter`）。パターンを正規表現に変え、登録した順に試す。404 と 405 | 4 | — |
| [router-demo.mjs](router-demo.mjs) | `SimpleRouter` と第17章の `createApp` で書いたタスクの API | 4, 6 | 9181 |
| [urlpattern-demo.mjs](urlpattern-demo.mjs) | 組み込みの `URLPattern` | 8 | — |
| [middleware-demo.mjs](middleware-demo.mjs) | ミドルウェア（時間を測る、ヘッダを足す、ログインの確認） | 10 | 9182 |

外部のパッケージは使わないので、`npm install` は不要です。サーバのサンプルは、第17章の模範解答（`../../ch17-minimal-server/solutions/`）を `import` しています。

```sh
$ node url-parts.mjs
$ node urlpattern-demo.mjs
$ node router-demo.mjs        # 別のターミナルで curl -i http://127.0.0.1:9181/api/tasks/1
$ node middleware-demo.mjs    # 別のターミナルで curl -i http://127.0.0.1:9182/private
```

- 各ファイルの先頭のコメントに、試す `curl` を書いてあります
- `//` で始まるパスや `/./` を含むパスを、そのまま送りたいときは `curl --path-as-is` を使います（curl は、ふつうは送る前に直してしまいます）
- `middleware-demo.mjs` の `Bearer demo` は、練習用の決まった値です。本物のログインの仕組みは第10部で扱います
