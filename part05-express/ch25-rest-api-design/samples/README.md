# 第25章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [http-problem.mjs](http-problem.mjs) | エラーを Problem Details（RFC 9457）で返す小さな部品: `HttpProblem`・`sendProblem`・`problemHandler`（ほかのサンプルが使う） | 4 | — |
| [tasks-db.mjs](tasks-db.mjs) | メモリの中のタスク。`version` は変えるたびに 1 増える（ほかのサンプルと練習問題5が使う） | — | — |
| [problem-demo.mjs](problem-demo.mjs) | 404・壊れた JSON・入力の間違い・500 を、problem+json で返す | 4 | 9320 |
| [zod-demo.mjs](zod-demo.mjs) | zod の基本: `strictObject`、`safeParse` の issue、`z.coerce.number()` の落とし穴 | 5 | — |
| [validate-demo.mjs](validate-demo.mjs) | ボディ・クエリ・パスを zod で確かめる `validate` ミドルウェア（ボディは 422、URL は 400） | 5 | 9321 |
| [pagination-demo.mjs](pagination-demo.mjs) | オフセットとカーソルのページ分けを比べる。`Link` ヘッダ | 6 | 9322 |
| [etag-demo.mjs](etag-demo.mjs) | ETag と `If-Match` で、同時の書き換えを見つける（412・428）。`If-None-Match` で 304 | 7 | 9323 |
| [idempotency-demo.mjs](idempotency-demo.mjs) | `Idempotency-Key` で、POST を送り直しても二重に作らない | 8 | 9324 |

## 動かし方

`~/dev/part05`（第5部の README の「準備」で作ったもの）の中で動かします。

```sh
$ cd ~/dev/part05/ch25-rest-api-design/samples
$ node zod-demo.mjs               # サーバではないので、出力を読むだけ
$ node problem-demo.mjs           # 別のターミナルで curl -si http://127.0.0.1:9320/api/tasks/99
```

- 各ファイルの先頭のコメントに、試す `curl` を書いてあります
- `curl -si` の `-i` は、ステータスとヘッダも見せるためです。この章では、本文よりもステータスやヘッダ（`Location`・`ETag`・`Link` など）を見ることが多くなります
- `idempotency-demo.mjs` の `uuidgen` は macOS に入っています。無ければ `node -e "console.log(crypto.randomUUID())"` で作れます
- どのサンプルも、データはメモリの中だけです。止めると消えます（データベースは第6部）
