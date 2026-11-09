# 第24章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- |
| 1 | ミドルウェアが動く順番を予想する | [predict-order.mjs](predict-order.mjs) | 2, 3 | 空いている番号 |
| 2 | Express の芯（ミドルウェアの列と `next`）を作る | [mini-express.mjs](mini-express.mjs)、[mini-express.test.mjs](mini-express.test.mjs) | 2, 3, 8 | 空いている番号 |
| 3 | 回数を制限するミドルウェア `rateLimit` | [rate-limit.mjs](rate-limit.mjs)、[rate-limit.test.mjs](rate-limit.test.mjs) | 5 | 空いている番号 |
| 4 | アクセスログのミドルウェア `accessLog` | [access-log.mjs](access-log.mjs)、[access-log.test.mjs](access-log.test.mjs) | 4 | 空いている番号 |
| 5 | ミドルウェアの並べ方と書き方のバグを直す | [buggy-api.mjs](buggy-api.mjs)、[check-api.sh](check-api.sh) | 2〜6 | 9319 |
| 6 | express-session の設定と使い方のバグを直す | [session-app.mjs](session-app.mjs)、[check-session.sh](check-session.sh) | 6.3 | 9318 |

- どの問題も、`~/dev/part05/ch24-middleware/exercises` の中で動かします
- 問題2・3・4は `node --test ○○.test.mjs` ですべてのテストが通れば完成です。最初は、問題2が 14 個中 13 個、問題3が 8 個すべて、問題4が 7 個中 6 個失敗します
- 問題5は `bash check-api.sh`（最初は 17 個中 10 個失敗）、問題6は `bash check-session.sh`（最初は 13 個中 8 個失敗）で確かめます
- 模範解答は `MODULE=../solutions/mini-express.mjs node --test mini-express.test.mjs`、`bash check-api.sh ../solutions/api.mjs` のように確かめられます

---

## 問題1 ミドルウェアが動く順番を予想する

[predict-order.mjs](predict-order.mjs) には、記録を残すミドルウェアとハンドラ（A〜I）と、6つのリクエストがあります。**実行する前に**、それぞれのリクエストで「記録される文字の順番」と「ステータスと本文」を予想してから、`node predict-order.mjs` で確かめてください。

特に、次のものは理由を説明してください。

- 1番: `a`（A の `next()` の後）は、`c` や `D` より先か後か。なぜか
- 2番: `res.send` の後に `next()` を呼ぶと、何が動くか。H の `if (res.headersSent) return;` が無かったら、何が起きるか
- 3番: エラーのとき、E と H はどうなるか
- 5番と6番: `/SHOP/items/` と `/shop` で、B の `req.url` は何になったか。6番で D が動かないのはなぜか

## 問題2 Express の芯を作る

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

## 問題3 回数を制限するミドルウェア

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

## 問題4 アクセスログのミドルウェア

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

## 問題5 ミドルウェアの並べ方と書き方のバグを直す

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

## 問題6 express-session の設定と使い方のバグを直す

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
