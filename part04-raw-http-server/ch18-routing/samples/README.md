# 第18章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [tasks-if.mjs](tasks-if.mjs) | 「手を動かす」の完成形。if 文を並べたタスクの API | 2 | 9183 |
| [parse-url.mjs](parse-url.mjs) | 「手を動かす」の完成形。`req.url` を `URL` で分解する（サーバは起動しない） | 3.1 | — |
| [routes-table.mjs](routes-table.mjs) | 「手を動かす」の完成形。ルートの表を引き、404 と 405 を分ける | 4, 5 | 9183 |
| [mw.mjs](mw.mjs) | 「手を動かす」の完成形。ミドルウェアを `next` で順に呼ぶ | 10 | 9183 |
| [if-router.mjs](if-router.mjs) | if 文を並べたルーティング。DELETE も 404 になってしまう | 2 | 9180 |
| [url-parts.mjs](url-parts.mjs) | `req.url` の例を `URL` で分解する。`//` で始まるとき、`.`・`..`・`%xx`、`searchParams` の注意 | 3 | — |
| [router.mjs](router.mjs) | いちばん簡単な Router（`SimpleRouter`）。パターンを正規表現に変え、登録した順に試す。404 と 405 | 4 | — |
| [router-demo.mjs](router-demo.mjs) | `SimpleRouter` と第17章の `createApp` で書いたタスクの API | 4, 6 | 9181 |
| [urlpattern-demo.mjs](urlpattern-demo.mjs) | 組み込みの `URLPattern` | 8 | — |
| [middleware-demo.mjs](middleware-demo.mjs) | ミドルウェア（時間を測る、ヘッダを足す、ログインの確認） | 10 | 9182 |

外部のパッケージは使わないので、`npm install` は不要です。`~/dev/part04/ch18-routing/samples` で（`cd samples` で移ってから）、次のように動かします。サーバのサンプルは、第17章の模範解答（`../../ch17-minimal-server/solutions/`）を `import` しています。

```sh
$ node url-parts.mjs
$ node urlpattern-demo.mjs
$ node router-demo.mjs        # 別のターミナルで curl -i http://127.0.0.1:9181/api/tasks/1
$ node middleware-demo.mjs    # 別のターミナルで curl -i http://127.0.0.1:9182/private
```

- 各ファイルの先頭のコメントに、試す `curl` を書いてあります
- `//` で始まるパスや `/./` を含むパスを、そのまま送りたいときは `curl --path-as-is` を使います（curl は、ふつうは送る前に直してしまいます）
- `middleware-demo.mjs` の `Bearer demo` は、練習用の決まった値です。本物のログインの仕組みは第10部で扱います
