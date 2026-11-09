# 第26章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- |
| 1 | 1つのハンドラを、層に分けて考える | [../samples/fat-route.mjs](../samples/fat-route.mjs) | 2, 3 | — |
| 2 | 設定を読んで確かめる `loadConfig` | [config.mjs](config.mjs)、[config.test.mjs](config.test.mjs) | 5 | — |
| 3 | サービスの層 `createTaskService` | [task-service.mjs](task-service.mjs)、[task-service.test.mjs](task-service.test.mjs)、[memory-task-repo.mjs](memory-task-repo.mjs)、[errors.mjs](errors.mjs) | 3, 4 | — |
| 4 | リクエストのログのミドルウェア `requestLogger` | [request-logger.mjs](request-logger.mjs)、[request-logger.test.mjs](request-logger.test.mjs) | 6 | 空いている番号 |
| 5 | ルートの層 `createTasksRouter` と、エラーの読み替え | [tasks-routes.mjs](tasks-routes.mjs)、[tasks-routes.test.mjs](tasks-routes.test.mjs) | 3, 4 | 空いている番号 |
| 6 | 設定・ログ・止め方のバグを直す | [buggy-server.mjs](buggy-server.mjs)、[check-server.sh](check-server.sh) | 5〜8 | 9339 |

- どの問題も、`~/dev/part05/ch26-app-structure/exercises` の中で動かします
- 問題2〜5は `node --test ○○.test.mjs` ですべてのテストが通れば完成です。最初は、問題2が 10 個中 9 個、問題3が 12 個すべて、問題4が 8 個すべて、問題5が 10 個すべて失敗します
- 問題6は `bash check-server.sh` で確かめます（最初は 14 個中 10 個失敗。サーバを何回か起動するので、20 秒ほどかかります）
- 模範解答は `MODULE=../solutions/config.mjs node --test config.test.mjs`、`bash check-server.sh ../solutions/server.mjs` のように確かめられます
- 問題3・5のテストは、確かめるファイルと同じフォルダの `errors.mjs`（と `memory-task-repo.mjs`）を使います。この2つは書き換えなくてよいファイルです
- 問題5は、第25章 練習問題2の解答（`../../lib/problem.mjs` にコピーがあります）を使います

---

## 問題1 1つのハンドラを、層に分けて考える

[fat-route.mjs](../samples/fat-route.mjs) の `POST /api/tasks` には、[1]〜[12] の印が付いています。コードは書かずに、次のことを考えて、紙かファイルに書いてください。

1. それぞれの印の行は、「ルート（HTTP）」「サービス（仕事の決まり）」「データ（覚え方）」「起動・設定」「ログ」のどれの仕事ですか
2. このハンドラのテストを書こうとすると、困ることを3つ挙げてください。たとえば「締め切りの確かめを、日付を決めて試したい」とき、どうすればよいでしょう
3. 「同じ題名のタスクは作れない」という決まりを、Web の画面からだけでなく、CSV を読み込むコマンド（第3部 第16章のような CLI）からも使いたくなりました。このままのコードで困ることは何ですか
4. [11] のログには、問題が2つあります。何でしょう

[layered/](../samples/layered/) と比べながら考えてもかまいません。

## 問題2 設定を読んで確かめる

[config.mjs](config.mjs) の `loadConfig(env)` は、`Number(env.PORT) || 3000` のような「とりあえず動く」書き方です。間違った値を黙って既定の値にしてしまうので、zod で確かめる形に直してください。

| 環境変数 | 形 | 既定 | 返す名前 |
| --- | --- | --- | --- |
| `NODE_ENV` | `development`・`test`・`production` | `development` | `env` |
| `HOST` | 1文字以上 | `127.0.0.1` | `host` |
| `PORT` | 0〜65535 の、数字だけの文字列 | 3000 | `port` |
| `LOG_LEVEL` | `fatal`・`error`・`warn`・`info`・`debug`・`trace`・`silent` | `test` のときは `silent`、それ以外は `info` | `logLevel` |
| `CORS_ORIGINS` | カンマで区切ったオリジン（`http(s)://ホスト[:ポート]`。パスや最後の `/` は付けない） | なし（`[]`） | `corsOrigins` |
| `SESSION_SECRET` | 32 文字以上。`production` では必須 | なし | `sessionSecret` |
| `SHUTDOWN_DELAY_MS` | 0〜60000 の整数 | 0 | `shutdownDelayMs` |
| `SHUTDOWN_TIMEOUT_MS` | 0〜60000 の整数 | 10000 | `shutdownTimeoutMs` |

- 空の文字列（`.env` に `PORT=` と書いたとき）は、書かなかったのと同じにする。表に無い名前（`PATH` など）は気にしない
- 間違いは、すべて集めてから `ConfigError` を投げる。`issues` は `[{ name, message }]`。**エラーの文と `issues` に、値そのものを書かない**
- 返す設定は `Object.freeze` して、後から書き換えられないようにする（`corsOrigins` の配列も）

```sh
$ node --test config.test.mjs
```

## 問題3 サービスの層

[task-service.mjs](task-service.mjs) の `createTaskService({ repo, clock, maxDoing, timeZone })` に、タスクの決まりを書いてください。`repo` は [memory-task-repo.mjs](memory-task-repo.mjs)（`list`・`get`・`insert`・`update`・`remove`）、`clock` は「今の時刻の `Date` を返す関数」です。サービスは HTTP を知らないので、エラーは [errors.mjs](errors.mjs) の `NotFoundError`・`ConflictError`・`ValidationError` で投げます。

- `create({ title, dueDate })`: `title` は前後の空白を取って 1〜100 文字。`dueDate` は `YYYY-MM-DD` か `null` で、「今日」より前はだめ。**今日は `timeZone`（既定は `Asia/Tokyo`）の日付**。終わっていない（`done` でない）タスクと同じ題名はだめ。`createdAt`・`updatedAt` は `clock()`、`completedAt` は `null`、`version` は 1
- `update(id, changes)`: `changes` は `title`・`status`・`dueDate` のどれか
  - 変えたら `updatedAt` を `clock()` にし、`version` を 1 増やす。何も変わらなければ、そのまま返す
  - `status` は `todo`・`doing`・`done`。`done` にしたら `completedAt` に `clock()`、`done` から戻したら `null`
  - `doing` は同時に `maxDoing` 個（既定 3）まで
  - `done` のタスクは、`status` を戻すとき以外は変えられない（`ConflictError`）
  - `dueDate` は、値が変わるときだけ確かめる（締め切りを過ぎたタスクでも、題名は変えられるように）
- `get`・`update`・`remove` で無いものは `NotFoundError`。`list({ status })` は絞り込んで `id` の順

```sh
$ node --test task-service.test.mjs
```

テストを読むと、`clock` に「進められる時計」を渡しています。本物の `new Date()` を使うと、このテストはどうなるでしょう（「今日」が毎日変わります）。

## 問題4 リクエストのログのミドルウェア

[request-logger.mjs](request-logger.mjs) の `requestLogger({ logger, now, genId })` を、[logging-demo.mjs](../samples/logging-demo.mjs) と同じ考え方で完成させてください。`logger` は pino のロガー（`child` を持つもの）です。テストでは、書いたものを覚えるだけの偽物を渡します。

- `X-Request-Id` が `[A-Za-z0-9._-]` の 1〜64 文字なら、それを `req.id` にする。無いか形が違えば `genId()`。応答の `X-Request-Id` にも入れる
- `req.log` に `logger.child({ reqId })` を入れる（ハンドラの中でも、`req.log.info(…)` で書けるように）
- 応答が終わったら1回だけ、`req.log` に `({ method, url, status, ms }, 'request')` を書く
  - `url` は `req.originalUrl` で、クエリの `token`・`password`・`secret`・`code`・`key`（大文字・小文字を区別しないで、完全に同じ名前）の値を `[redacted]` にする（`redactUrl`）
  - `status` は返したステータス。客が先に切ったら `'aborted'`
  - `ms` は `now()` の差を四捨五入したもの
  - 5xx と `aborted` は `error`、4xx は `warn`、それ以外は `info` で書く

```sh
$ node --test request-logger.test.mjs
```

## 問題5 ルートの層と、エラーの読み替え

[tasks-routes.mjs](tasks-routes.mjs) に、問題3のサービスを HTTP につなぐルートを書いてください。テストは、本物のサービスの代わりに「呼ばれ方を覚える偽物」を渡すので、ルートの層だけを確かめられます。

| メソッドと URL | サービス | 成功 |
| --- | --- | --- |
| `GET /?status=…` | `list({ status })` | 200 `{ items }` |
| `GET /:id` | `get(id)` | 200 |
| `POST /` | `create(body)` | 201、`Location: {baseUrl}/{id}` |
| `PATCH /:id` | `update(id, body)` | 200 |
| `DELETE /:id` | `remove(id)` | 204 |

- ルートで確かめるのは**形だけ**（型、知らない項目、`status` の値、`id` が正の整数か）。長さや締め切りなどの決まりは、サービスに任せる（同じことを2か所に書かない）
- 形の間違いは、サービスを呼ばずに 400（クエリ）・404（`id`）・415（JSON でない）・422（ボディ）
- `mapDomainErrors()` は、サービスのエラーを `HttpProblem` に読み替えるエラーハンドラ。`NotFoundError` は 404、`ConflictError` は 409（`detail` はサービスの文）、`ValidationError` は 422 で `errors: [{ pointer: '#/' + field, detail }]`。ほかのエラーは、そのまま `next(err)`

```sh
$ node --test tasks-routes.test.mjs
```

考えてみてください: サービスの `ValidationError` を、なぜサービスの中で `HttpProblem(422)` にしないのでしょう。問題1の3番（CSV を読み込むコマンド）を思い出してください。

## 問題6 設定・ログ・止め方のバグを直す

[buggy-server.mjs](buggy-server.mjs) は、ふだん curl で試すぶんには問題なく動きます。でも、本番で起動したり、止めたりするときに困るバグが 7 か所あります。次の仕様に合わせて直してください。問題2の `loadConfig` と問題4の `requestLogger`、pino を使ってかまいません。

- 設定が間違っていたら、起動せずに終了コード 1。何が間違っていたか（名前）をログに書く。値は書かない
- ログは1行1つの JSON。`Authorization` の値を書かない。リクエストのログには、返したステータスを入れる
- `SIGTERM` を受け取ったら
  1. `/readyz` を 503 にする
  2. `SHUTDOWN_DELAY_MS` 待ってから、新しい接続を断る
  3. 来ていたリクエストが全部終わったら、終了コード 0 で終わる
  4. `SHUTDOWN_DELAY_MS + SHUTDOWN_TIMEOUT_MS` たっても終わらなければ、終了コード 1 で終わる

```sh
$ bash check-server.sh
```

確認11を特によく見てください。`process.exit(0)` で止めると、ちょうど処理していたリクエストは、どうなるでしょう。PaaS や Docker は、新しい版を出すたびに古いプロセスへ `SIGTERM` を送ります（第12部 第61〜62章）。
