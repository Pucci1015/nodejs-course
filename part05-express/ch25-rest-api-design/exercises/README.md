# 第25章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- |
| 1 | API の設計をレビューして、直す | [review-api.md](review-api.md) | 2, 3, 4 | — |
| 2 | エラーを Problem Details の形にそろえる `problemHandler` | [problem.mjs](problem.mjs)、[problem.test.mjs](problem.test.mjs) | 4 | 空いている番号 |
| 3 | カーソルでページを分ける `paginate` | [cursor.mjs](cursor.mjs)、[cursor.test.mjs](cursor.test.mjs) | 6 | — |
| 4 | 一覧のクエリを zod で確かめる `parseListQuery` | [query.mjs](query.mjs)、[query.test.mjs](query.test.mjs) | 5, 6 | — |
| 5 | ステータスコードと応答の形のバグを直す | [buggy-api.mjs](buggy-api.mjs)、[check-design.sh](check-design.sh) | 3, 4, 5 | 9329 |
| 6 | `If-Match`・`If-None-Match` を正しく確かめる | [preconditions.mjs](preconditions.mjs)、[preconditions.test.mjs](preconditions.test.mjs) | 7 | — |

- どの問題も、`~/dev/part05/ch25-rest-api-design/exercises` の中で動かします
- 問題2・3・4・6は `node --test ○○.test.mjs` ですべてのテストが通れば完成です。最初は、問題2が 12 個中 11 個、問題3が 9 個すべて、問題4が 10 個中 9 個、問題6が 12 個中 9 個失敗します
- 問題5は `bash check-design.sh` で確かめます（最初は 20 個中 17 個失敗）
- 模範解答は `MODULE=../solutions/problem.mjs node --test problem.test.mjs`、`bash check-design.sh ../solutions/design-api.mjs` のように確かめられます
- 問題4・5は、`../samples/http-problem.mjs` と `../samples/tasks-db.mjs` を使います。問題3は、第4部で作った `../../lib/signed.mjs` を使います

---

## 問題1 API の設計をレビューして、直す

[review-api.md](review-api.md) は、ある人が書いた「タスク管理 API」の設計書です。コードを書く前に、設計だけを読んで問題を見つけます。

1. 問題点を、少なくとも 10 個挙げてください。それぞれ「何が困るのか」（使う人・ブラウザ・キャッシュ・プロキシ・セキュリティのどれにとって）も書きます
2. 直した設計を、同じ表の形で書いてください。メソッド・URL・成功のときのステータス・主なエラーのステータスを入れます
3. エラーの本文の例を、Problem Details（本文 4節）の形で1つ書いてください

ヒント: 本文 2節（リソースと URL）、3節（メソッドとステータスコード）、4節（エラーの形）の表を見ながら、1行ずつ確かめます。特に `GET /deleteTask` は、「誰が、いつ、そのリクエストを送るか」を考えてみてください。

## 問題2 エラーを Problem Details の形にそろえる

[problem.mjs](problem.mjs) の `HttpProblem`・`notFound`・`problemHandler` を完成させて、どんなエラーも `application/problem+json`（RFC 9457）で返すようにしてください。サンプルの [http-problem.mjs](../samples/http-problem.mjs) は簡単な形なので、それを、実際に使える形にします。

- 本文は `{ type, title, status, detail?, instance, errors? }`。`type` の既定は `about:blank`、`title` の既定はステータスの名前（表に無ければ `Error`）、`instance` は `req.originalUrl`。値の無い項目は出さない
- `HttpProblem` の `status` は 400〜599 の整数だけ。それ以外は作る時点で `RangeError`。`headers` を渡したら、応答に付ける
- `notFound()` は、どのルートにもないリクエストに 404 を返すミドルウェア。`detail` は `GET /nothing はありません` の形
- zod の `ZodError` は 422。`errors` を `[{ pointer, detail }]` にする。`pointer` は JSON Pointer（RFC 6901）で、`['tags', 1]` なら `#/tags/1`。名前の中の `~` は `~0`、`/` は `~1` にする
- `express.json()` の失敗は `err.type` で見分ける: 壊れた JSON は 400、大きすぎると 413、知らない charset は 415
- Express やパッケージが付けた 400 番台（壊れた `%xx` など）は、そのステータスで返す。ただし、文は自分で書いたものではないので `detail` に出さない
- それ以外の例外は 500。`detail` を出さない。`log(err)` に渡すのは 500 のときだけ（客の間違いでログをうめない）
- もう途中まで送っていたら、自分で返さずに `next(err)`（Express が接続を切る）

```sh
$ node --test problem.test.mjs
```

## 問題3 カーソルでページを分ける

[cursor.mjs](cursor.mjs) の `paginate(items, { sort, limit, cursor, secret })` を、キーセット・ページネーション（本文 6.2節）にしてください。今のひな形は「先頭から `limit` 件」を返すだけです。

- `sort` は `'-createdAt'`（新しい順）・`'createdAt'`（古い順）・`'title'` のように、項目の名前と向き。値が同じものは `id` で並べる（向きは `sort` と同じ）
- 返すものは `{ items, nextCursor }`。次のページが無ければ `nextCursor` は `null`。ちょうど割り切れるときに、空のページを作らない
- カーソルには「前のページの最後の項目の、並べ替えの値と `id`」と `sort` を入れ、`lib/signed.mjs` の `signJson` で署名する。次のページは「その値より後ろ」から始める（位置ではなく値で探すので、前に増えても、その項目が消されても、ずれない）
- 書き換えたカーソル、別の鍵のカーソル、別の `sort` で作ったカーソルは `CursorError`
- `limit` は 1〜100 の整数。それ以外は `RangeError`。元の配列を並べ替えない

```sh
$ node --test cursor.test.mjs
```

考えてみてください: カーソルに署名をしないと、何が起きますか。カーソルの中身は客に見られても困りませんが、作り変えられると困るのはなぜでしょう（データベースを使う第6部では、カーソルの値がそのまま SQL の条件になります）。

## 問題4 一覧のクエリを zod で確かめる

[query.mjs](query.mjs) の `ListQuery` と `parseListQuery(query)` を直して、`GET /api/tasks?status=todo,doing&sort=-dueDate&limit=50&due_before=2026-11-30` のようなクエリを、安全に読めるようにしてください。

| 名前 | 形 | 既定 | 返す値 |
| --- | --- | --- | --- |
| `status` | `todo`・`doing`・`done` をカンマで区切る（同じものは1つに） | なし | `['todo', 'doing']` |
| `sort` | `createdAt`・`dueDate`・`title`（前に `-` で逆順） | `-createdAt` | `{ field: 'createdAt', desc: true }` |
| `limit` | 1〜100 の、数字だけの文字列（`020`・`2e1`・` 20` はだめ） | 20 | `50` |
| `cursor` | 1〜512 文字 | なし | そのまま |
| `due_before` | `YYYY-MM-DD` | なし | `dueBefore: '2026-11-30'` |

- 知らない名前は 400。名前ごとに1つずつ `{ parameter, detail }` を入れる
- `?limit=1&limit=2` のように同じ名前が2回あると、Express 5 では配列になる。これも 400
- 間違いは最初の1つで止めず、すべて集めてから、まとめて `HttpProblem(400, { errors })` を投げる

```sh
$ node --test query.test.mjs
```

## 問題5 ステータスコードと応答の形のバグを直す

[buggy-api.mjs](buggy-api.mjs) は、タスクの API です。どのルートも「動く」のですが、HTTP の決まりごととしては 9 か所が間違っています（足りないものも含みます）。次の仕様に合わせて直してください。

| メソッドと URL | 成功 | 主なエラー |
| --- | --- | --- |
| `GET /api/tasks?limit=1〜100` | 200 `{ items }` | 400（limit の間違い） |
| `GET /api/tasks/:id` | 200 | 404 |
| `POST /api/tasks` | 201、`Location: /api/tasks/:id` | 415（JSON でない）、422（中身の間違い） |
| `PATCH /api/tasks/:id` | 200 | 404、415、422（知らない項目、値の間違い） |
| `DELETE /api/tasks/:id` | 204（本文なし） | 404 |
| どれにもないパス | — | 404 |

- エラーはすべて `application/problem+json`。本文の `status` は、HTTP のステータスと同じ
- 422 の `errors` は `[{ pointer: '#/title', detail }]` の形
- 500 のときも、サーバの中の文（例外の文や、zod の中の言葉）を客に見せない
- 問題2の解答（`../solutions/problem.mjs`）や、自分で書いた `problem.mjs` を使ってかまいません

```sh
$ bash check-design.sh
```

確認14・15を特によく見てください。`PATCH` で `{"id":1}` を送ると、何が起きていたでしょう。zod で確かめたのに、なぜ防げなかったのでしょう。

## 問題6 `If-Match`・`If-None-Match` を正しく確かめる

サンプルの [etag-demo.mjs](../samples/etag-demo.mjs) は、`If-Match` を「文字列が同じか」で比べました。ふつうの使い方では動きますが、HTTP の仕様（RFC 9110 13.1・13.2.2）どおりではありません。[preconditions.mjs](preconditions.mjs) の2つの関数を、仕様どおりにしてください。

- `parseEntityTags(header)`: `'"a", W/"b"'` を `[{ weak: false, tag: 'a' }, { weak: true, tag: 'b' }]` に、`'*'` を `'*'` にする。ETag の中には `,` を書けるので、`split(',')` では読めない。形の正しくないものは入れない
- `evaluatePreconditions({ method, ifMatch, ifNoneMatch, etag, exists, requireIfMatch })` は `'proceed'`・`304`・`412`・`428` のどれかを返す
  1. `requireIfMatch` で、GET・HEAD 以外なのに `If-Match` も `If-None-Match` も無ければ 428
  2. `If-Match` があれば、**強い比べ方**（`W/` が付いたものは、どちらにあってもあてはまらない）で、どれか1つが今の ETag と同じなら進む。`*` は「今あるなら」。あてはまらなければ 412
  3. `If-None-Match` があれば、**弱い比べ方**（`W/` を気にしない）で比べる。`*` は「今あるなら」。あてはまったら、GET・HEAD は 304、それ以外は 412
  4. どれにも引っかからなければ `'proceed'`

```sh
$ node --test preconditions.test.mjs
```

考えてみてください: `PUT /api/tasks/7` を「まだ無いときだけ作る」には、どのヘッダを送ればよいでしょう。また、Express の自動の ETag（本文から作る弱い ETag）を `If-Match` に使えないのはなぜでしょう。
