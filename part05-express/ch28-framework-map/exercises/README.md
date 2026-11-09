# 第28章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- |
| 1 | フレームワークを選ぶ | このページ | 1〜8 | — |
| 2 | Node.js の req・res と Web 標準をつなぐ | [web-adapter.mjs](web-adapter.mjs)、[web-adapter.test.mjs](web-adapter.test.mjs) | 5 | 空いている番号 |
| 3 | Hono のタスク API に PATCH と DELETE を足す | [hono-tasks.mjs](hono-tasks.mjs)、[hono-tasks.test.mjs](hono-tasks.test.mjs) | 4, 6 | 空いている番号（手で試すときは 9354） |
| 4 | Fastify の JSON Schema で、入力と出力を決める | [fastify-users.mjs](fastify-users.mjs)、[fastify-users.test.mjs](fastify-users.test.mjs) | 3 | — |
| 5 | Web 標準で動く小さなルーター | [web-router.mjs](web-router.mjs)、[web-router.test.mjs](web-router.test.mjs) | 4, 5 | — |

- どの問題も、`~/dev/part05/ch28-framework-map/exercises` の中で動かします
- 問題2〜5は `node --test ○○.test.mjs` ですべてのテストが通れば完成です。最初は、問題2が 8 個中 5 個、問題3が 12 個中 5 個、問題4が 8 個中 7 個、問題5が 8 個中 6 個失敗します
- 模範解答は `MODULE=../solutions/web-adapter.mjs node --test web-adapter.test.mjs` のように確かめられます
- 問題3は、サンプルの [tasks-core.mjs](../samples/tasks-core.mjs)（`update`・`remove` もあります）と [contract.mjs](../samples/contract.mjs) を使います

---

## 問題1 フレームワークを選ぶ

次のそれぞれで、Express・Fastify・Hono・NestJS・Next.js の Route Handlers のどれを選びますか。理由と、「選ばなかったもののうち、いちばん迷ったもの」も書いてください。答えは1つとは限りません。

1. この教材の成果物のタスク API（これから第6部・第7部で、データベースと TypeScript を足していく）
2. 1秒に何千回も呼ばれる、JSON を返すだけの API。入力と出力の形は、きっちり決まっている
3. Cloudflare Workers（Node.js ではない、Web 標準の API だけがある場所）で動かす、小さな API
4. 20 人のチームで作る、大きな業務システムの API。人の入れ替わりが多く、書き方をそろえたい
5. React の画面と同じリポジトリで、フォームの送り先を少しだけ作りたい（第9部）
6. 10 年前からある Express のアプリに、新しい API を少し足したい

## 問題2 Node.js の req・res と Web 標準をつなぐ

Hono や Next.js のハンドラは、Web 標準の `Request` を受け取って `Response` を返します。Node.js の `http` サーバで動かすには、`req`・`res` との間をつなぐものが要ります。[web-adapter.mjs](web-adapter.mjs) の `toWebRequest(req, res)` と `sendWebResponse(res, response, { method })` を、次のようにしてください。今のひな形は、サンプルの [web-handler-tasks.mjs](../samples/web-handler-tasks.mjs) の `toNodeHandler` と同じ、いちばん簡単なものです。

**`toWebRequest`**

- URL は `http://` + `Host` ヘッダ + `req.url`（クエリも含む）。TLS の接続（`req.socket.encrypted`）なら `https://`
- ヘッダは `req.rawHeaders` から1つずつ `append` する（同じ名前のヘッダも両方入れる）
- GET・HEAD 以外は、ボディを流れのまま（`Readable.toWeb(req)`）渡す。全部ためない
- 客が応答の前に切ったら、`request.signal` を abort する

**`sendWebResponse`**

- ステータスと `statusText` を渡す
- `Set-Cookie` が複数あれば、1つずつの行で送る（`response.headers.getSetCookie()`）。`Object.fromEntries(response.headers)` では、最後の1つしか残らない
- 本文は、全部ためずに、届いたものから送る（`Readable.fromWeb(response.body)` と `pipe`）
- HEAD のときは本文を送らない。本文が無い（204 など）ときは、そのまま終える
- 客が途中で切ったら、本文を読むのをやめる（`ReadableStream` の `cancel` が呼ばれる）

```sh
$ node --test web-adapter.test.mjs
```

## 問題3 Hono のタスク API に PATCH と DELETE を足す

[hono-tasks.mjs](hono-tasks.mjs) は、サンプルの Hono の API と同じものです。ここに、次の2つを足してください。サービスには `update(id, body)` と `remove(id)` が用意してあります（決まりの確かめは、サービスがします）。

| メソッドと URL | 成功 | 主なエラー |
| --- | --- | --- |
| `PATCH /tasks/:id`（ボディ `{ "done": true }` や `{ "title": "…" }`） | 200、変えた後のタスク | 404（無い id・形の違う id）、400（壊れた JSON）、415（JSON でない）、422（中身の間違い） |
| `DELETE /tasks/:id` | 204（本文なし） | 404 |

テストは、サンプルと同じ「契約」のテスト（1〜7）に、PATCH と DELETE の確かめ（8〜12）を足したものです。POST と PATCH で同じ「JSON のボディを読む」処理が要るので、関数に出してみてください。

```sh
$ node --test hono-tasks.test.mjs
```

## 問題4 Fastify の JSON Schema で、入力と出力を決める

[fastify-users.mjs](fastify-users.mjs) は、ユーザーの API です。スキーマを1つも書いていないので、`passwordHash` まで返してしまい、`role: "admin"` を送れば管理者のユーザーを作れてしまいます。JSON Schema を書いて、次のようにしてください。

- **出力**: `GET /users`・`GET /users/:id`・`POST /users` が返すユーザーは、`id` と `name` だけ。レスポンスのスキーマ（`schema.response`）に書いた項目だけが JSON になる、という Fastify の働きを使う
- **クエリ**: `limit` は 1〜100 の、数字だけの文字列。`' 20'`・`'2e1'`・`'0'`・`''`・2回の指定は 400。知らない名前（`page` など）も 400
- **パス**: `id` が正の整数の形でなければ 404
- **ボディ**: `name`（1〜50 文字）と `email`（メールの形）だけ。どちらも必須。知らない項目（`role` など）は 422
- **エラー**: スキーマに合わないとき（`err.validation`）、場所（`err.validationContext`）が `body` なら 422、`params` なら 404、ほかは 400

Fastify の既定の設定では、`type: 'integer'` は `' 20'` を 20 に変え（`coerceTypes`）、`additionalProperties: false` は知らない項目を黙って取り除きます（`removeAdditional`）。テストが通らないときは、本文 3.2節を見てください。

```sh
$ node --test fastify-users.test.mjs
```

## 問題5 Web 標準で動く小さなルーター

[web-router.mjs](web-router.mjs) の `createRouter()` を完成させてください。Hono の芯にあたるもので、サーバを起動しなくても、`new Request(…)` を `router.fetch` に渡すだけでテストできます。

- `router.get(path, handler)`（`post`・`put`・`patch`・`delete` も）。`path` は URLPattern の書き方（`/tasks/:id`）。ハンドラは `(request, { params, url }) => Response`
- `params` の値は `%xx` を戻す。壊れた `%xx` は 400
- HEAD は GET のハンドラで答え、本文だけを捨てる（ステータスとヘッダはそのまま）
- パスはあるがメソッドが違えば 405 と `Allow`（GET があれば HEAD も入れる）。パスも無ければ 404
- ハンドラが投げたら 500。中の文は見せない
- `router.use(async (request, next) => Response)` のミドルウェア。登録した順に動き、`await next()` で後ろを全部待てる（Koa と同じ形。第4部 第18章の `compose`）。`next` を呼ばずに `Response` を返せば、そこで止まる

```sh
$ node --test web-router.test.mjs
```

考えてみてください: Express の `next()` は Promise を返さないので、`await next()` で後ろを待てませんでした（第24章 2.2節）。このルーターのミドルウェアで、かかった時間を `Server-Timing` ヘッダに入れるには、どう書けばよいでしょう。
