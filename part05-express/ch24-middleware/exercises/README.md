# 第24章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part05/ch24-middleware/exercises/` で行います。最初に `cd exercises` で移動してください（`cd ~/dev/part05/ch24-middleware/exercises` と打っても構いません）。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- | --- |
| 1 | 基本 | リクエストに ID を付けるミドルウェア `requestId` | [request-id.mjs](request-id.mjs)、[request-id.test.mjs](request-id.test.mjs) | 5 | 空いている番号 |
| 2 | 基本 | JSON を求めるミドルウェア `requireJson` | [require-json.mjs](require-json.mjs)、[require-json.test.mjs](require-json.test.mjs) | 2, 5 | 空いている番号 |
| 3 | 基本 | タスクのルートを Router にまとめる | [tasks-router.mjs](tasks-router.mjs)、[tasks-router.test.mjs](tasks-router.test.mjs) | 7 | 空いている番号 |
| 4 | 基本 | ミドルウェアが動く順番を予想する（調べる問題） | [predict-order.mjs](predict-order.mjs) | 2, 3 | 空いている番号 |
| 5 | 応用 | 回数を制限するミドルウェア `rateLimit` | [rate-limit.mjs](rate-limit.mjs)、[rate-limit.test.mjs](rate-limit.test.mjs) | 5 | 空いている番号 |
| 6 | 応用 | アクセスログのミドルウェア `accessLog` | [access-log.mjs](access-log.mjs)、[access-log.test.mjs](access-log.test.mjs) | 4 | 空いている番号 |
| 7 | 発展 | Express の芯（ミドルウェアの列と `next`）を作る | [mini-express.mjs](mini-express.mjs)、[mini-express.test.mjs](mini-express.test.mjs) | 2, 3, 8 | 空いている番号 |
| 8 | 発展 | express-session の設定と使い方のバグを直す | [session-app.mjs](session-app.mjs)、[check-session.sh](check-session.sh) | 6.3 | 9318 |
| 9 | 発展 | ミドルウェアの並べ方と書き方のバグを直す | [buggy-api.mjs](buggy-api.mjs)、[check-api.sh](check-api.sh) | 2〜6 | 9319 |

**発展**（7〜9）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

- 問題1〜3・5〜7: `○○.mjs` の「ここを書く」を埋め、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。最初は、問題5が 8 個すべて、問題6が 7 個中 6 個、問題7が 14 個中 13 個失敗します。
- 問題8は `bash check-session.sh`（最初は 13 個中 8 個失敗）、問題9は `bash check-api.sh`（最初は 17 個中 10 個失敗）で確かめます。
- テストは、小さなアプリに組み込んで空いているポート（`listen(0)`）で起動し、`fetch` で確かめて、最後に止めます。

---

## 基本

### 問題1 リクエストに ID を付けるミドルウェア `requestId`

ログとエラーを、どのリクエストのものか結び付けるために、リクエストごとに ID を付けます。ミドルウェアを返す関数 `requestId()` を、[request-id.mjs](request-id.mjs) に作ってください（本文5.1節の「設定を受け取って、ミドルウェアを返す関数」の形）。

- `req.id` に ID を入れ、レスポンスの `X-Request-Id` ヘッダでも返す
- ID は `crypto.randomUUID()` で作る。リクエストごとに違う
- リクエストに `X-Request-Id` ヘッダがあり、英数字と `-` だけの 1〜64 文字なら、それを使う（前に置いたサーバが付けた ID を引き継ぐため）。それ以外の形なら使わずに作る
- 最後に `next()` を呼ぶ

```sh
$ node --test request-id.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- ヘッダは `req.get('x-request-id')` で読み、`res.set('X-Request-Id', 値)` で付けます。
- 形は正規表現 `/^[A-Za-z0-9-]{1,64}$/` で確かめます。`{1,64}` は「1〜64 回くり返す」です。
- 客が送ったヘッダを確かめずにログに書くと、改行などでログの形を崩されることがあります。だから形を決めて、合わなければ使いません。

### 問題2 JSON を求めるミドルウェア `requireJson`

ボディを送るリクエストに、JSON であることを求めるミドルウェア `requireJson(req, res, next)` を、[require-json.mjs](require-json.mjs) に作ってください。

- メソッドが `POST`・`PUT`・`PATCH` で、Content-Type が JSON でなければ、415 と `{ "error": "unsupported_media_type", "message": "…" }` を返す。後ろのハンドラは動かさない
- それ以外（JSON のとき、`GET`・`DELETE` など）は `next()` で進む

```sh
$ node --test require-json.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- 第23章 5節の `req.is('application/json')` を使います。`; charset=utf-8` が付いていても正しく見てくれます。
- 「応答したら `return` して、`next()` を呼ばない」（本文5.2節）を守ります。`return res.status(415).json(…)` と書きます。
- メソッドの一覧は `new Set(['POST', 'PUT', 'PATCH'])` にしておくと、`has(req.method)` で調べられます。

### 問題3 タスクのルートを Router にまとめる

タスクの配列を受け取り、`express.Router()` を返す関数 `createTasksRouter(tasks)` を、[tasks-router.mjs](tasks-router.mjs) に作ってください。テストは `app.use('/api/tasks', createTasksRouter(tasks))` で付けて確かめます。

| リクエスト | 返すもの |
| --- | --- |
| `GET /api/tasks` | 200 と配列全部 |
| `GET /api/tasks?done=true`・`?done=false` | 200 と、`done` が合うものだけ |
| `GET /api/tasks?done=それ以外` | 400 と `{ "error": "bad_request", "message": "…" }` |
| `GET /api/tasks/:id` | 200 と1件。無ければ 404 と `{ "error": "not_found", "message": "…" }` |

```sh
$ node --test tasks-router.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- Router の中のパスは、付ける場所（`/api/tasks`）から後ろだけを書きます。`router.get('/', …)`、`router.get('/:id', …)` です（本文7節の `routers.mjs`）。
- `req.params.id` は文字列です。`String(t.id) === req.params.id` のように、どちらかに合わせて比べます。
- 第26章では、このように Router を返す関数を、ファイルに分けて組み立てます。

### 問題4 ミドルウェアが動く順番を予想する（調べる問題）

[predict-order.mjs](predict-order.mjs) には、記録を残すミドルウェアとハンドラ（A〜I）と、6つのリクエストがあります。**実行する前に**、それぞれのリクエストで「記録される文字の順番」と「ステータスと本文」を予想してから、`node predict-order.mjs` で確かめてください。

特に、次のものは理由を説明してください。

- 1番: `a`（A の `next()` の後）は、`c` や `D` より先か後か。なぜか
- 2番: `res.send` の後に `next()` を呼ぶと、何が動くか。H の `if (res.headersSent) return;` が無かったら、何が起きるか
- 3番: エラーのとき、E と H はどうなるか
- 5番と6番: `/SHOP/items/` と `/shop` で、B の `req.url` は何になったか。6番で D が動かないのはなぜか

---

## 応用

### 問題5 回数を制限するミドルウェア

ログインの画面やパスワードの再設定のように、何度も試されると困る場所には、回数の制限をかけます。[rate-limit.mjs](rate-limit.mjs) に `rateLimit({ windowMs, limit, key, now })` を作ってください。

- **固定の窓**で数える: 客（`key(req)` の値。既定は `req.ip`）の最初のリクエストから `windowMs` ミリ秒の間に、`limit` 回まで通す。窓が終わったら数え直す
- すべての応答に `RateLimit-Limit`（上限）、`RateLimit-Remaining`（残り。0 より小さくしない）、`RateLimit-Reset`（窓が終わるまでの秒数。切り上げ）を付ける
- 上限を超えたら、次のミドルウェアへ進まずに 429 と JSON `{ "error": "too_many_requests", … }`、`Retry-After`（秒、切り上げ）
- `OPTIONS` は数えない（CORS のプリフライトは、ブラウザが自動で送るため）
- 終わった窓の記録は消して、覚える量がふくらみ続けないようにする（`middleware.size()` で数を確かめる）。毎回すべてを調べる必要はない
- `limit`・`windowMs` が正の整数でなければ、作る時点で `TypeError`
- 時刻は `now()` で読む（テストで時計を進めるため）

```sh
$ node --test rate-limit.test.mjs
```

考えてみてください: 固定の窓には、「窓の終わりの直前に `limit` 回、始まりの直後に `limit` 回」で、短い間に2倍通ってしまう弱点があります。どうすれば減らせますか。また、`key` を `req.ip` にすると、リバースプロキシの後ろでは何が起きますか（本文 4.3節の `trust proxy`）。

### 問題6 アクセスログのミドルウェア

[access-log.mjs](access-log.mjs) の `accessLog({ write, now })` を、応答が終わったら1回だけ `write(entry)` を呼ぶミドルウェアにしてください。今のひな形は、リクエストが来た時点で書いているので、ステータスがいつも 200 です。

- `entry` は `{ method, path, status, ms, bytes, id }`
  - `path` は `req.originalUrl`（`app.use('/api', …)` の中でも、元の URL）
  - `status` は応答のステータス。客が先に切ったなら `'aborted'`
  - `ms` は、ミドルウェアが動いてから応答が終わるまでのミリ秒（`now()` で測り、四捨五入）
  - `bytes` は、実際に送った本文のバイト数。`res.write` を何回かに分けても、Buffer でも、日本語でも正しく数える。HEAD は 0
  - `id` は `req.id`（前のミドルウェアが入れたもの）
- クエリの `token`・`password`・`secret`・`code`・`key` の値（名前は大文字・小文字を区別しないで、完全に同じものだけ）は `[redacted]` にする
- `path` が 200 文字より長ければ、200 文字で切って `…` を付ける

```sh
$ node --test access-log.test.mjs
```

---

## 発展

### 問題7 Express の芯を作る

Express の中心は、「登録した順に並んだミドルウェアの列」と、「次へ進む `next`」です。[mini-express.mjs](mini-express.mjs) の `createMiniExpress()` に、それを作ってください。第18章の `compose`（Koa 風）とは違い、Express の `next` は Promise を返しません。

- `app` は `(req, res)` を受け取る関数で、`http.createServer(app)` に渡せる
- `app.use(fn, …)`・`app.use('/prefix', fn, …)`・`app.get(path, fn, …)`（`post`・`put`・`patch`・`delete` も）。どれも `app` を返す
- 層（ミドルウェアとルート）を**登録した順に**試す。`next()` で次へ
- ルートは、メソッドとパスが合うときだけ。`:名前` は1つのセグメントで、`%xx` を戻して `req.params` に入れる。クエリはパスに含めない。HEAD は GET のルートで答える
- `use('/admin', …)` は `/admin` と `/admin/…` にあてはまり、`/adminx` にはあてはまらない。中では `req.url` から `/admin` を取り除き（`/admin` だけなら `/`）、`req.baseUrl` を `'/admin'` にする。次の層へ進むときは元に戻す
- `next(err)`（または、ハンドラの中の `throw`、async 関数の reject）の後は、**引数が4つの関数だけ**を順に動かす。エラーが無いときは、引数が4つの関数を飛ばす。エラーハンドラが `next()`（引数なし）を呼べば、ふつうの流れに戻る。ルートのハンドラはエラーを受け取らない
- `next('route')` は、そのルートの残りのハンドラを飛ばして、次の層へ
- 同じ `next` を2回呼んでも、次の層は1回しか動かない
- 最後まで誰も応答しなければ 404 で `Cannot GET /パス`（クエリなし）。誰もエラーを受け止めなければ、`err.status` が 400〜599 ならそのステータス、それ以外は 500 で、本文は `Internal Server Error`（例外の文は見せない）。もう途中まで送っていたら `res.destroy()`

```sh
$ node --test mini-express.test.mjs
```

できたら、本物の Express でも同じテストを動かしてみてください（`export const createMiniExpress = () => express();` だけのファイルを作り、`MODULE` に指定する）。執筆時点では 14 個中 11 個が通り、通らない3個は、最後の 404・500 の本文の形（Express は HTML）と、`err.status` の扱いの細かい違いだけです。

### 問題8 express-session の設定と使い方のバグを直す

[session-app.mjs](session-app.mjs) は、買い物かご（ログインしなくても使える）とログインのある小さなアプリです。第22章で `withSession` を自分で作ったときに気をつけたことが、express-session の設定と使い方で、いくつも抜けています。

- `SESSION_SECRET`（32 文字以上）が無ければ、起動しない
- ログインもかごも使っていない客には、Cookie を送らない
- Cookie の名前は `sid`。`HttpOnly`・`SameSite=Lax` を付ける
- ログインしたら、セッションの ID を作り直す。ただし、かごの中身は残す。ログイン前の ID では、ログインした状態にならない
- ログアウトしたら、セッションを保存場所から消し、Cookie も消す。ログアウトの前の Cookie を送っても、ユーザーもかごも空になる

```sh
$ bash check-session.sh
```

- 確認10は、確認4（Cookie の名前）を直すまでは、正しく確かめられません（名前が違うので、確認スクリプトが ID を取り出せない）。確認4を直した後で、もう一度見てください
- express-session の `regenerate` と `destroy` は、コールバックの API です。async 関数の中で使うなら Promise にします（第3部 第12章）

### 問題9 ミドルウェアの並べ方と書き方のバグを直す

[buggy-api.mjs](buggy-api.mjs) は、タスクの API（`/api`）と管理用のページ（`/admin`）です。ルートの中身は正しいのですが、ミドルウェアの書き方と並べ方に、7か所のバグがあります（足りないものも1つ含みます）。

| 仕様 | |
| --- | --- |
| エラー | すべて JSON。どのルートにもないパスも 404 の JSON |
| `POST /api/tasks`、`DELETE /api/tasks/:id`、`/admin` の下すべて | `Authorization: Bearer dev-only-token` が無ければ 401。401 のときは、何も変えない |
| CORS | `http://localhost:5173` からだけ、Cookie つきで呼べる。それ以外のオリジンには `Access-Control-Allow-Origin` を付けない |
| アクセスログ | `LOG_FILE` のファイルに `メソッド URL ステータス` を1行ずつ。ステータスは実際に返したもの |

```sh
$ bash check-api.sh
```

確認7・8を特によく見てください。「401 を返したのに、タスクが消えている」とは、どういうことでしょう。客には 401 が見えているので、ブラウザや curl で試すだけでは気づけません。
