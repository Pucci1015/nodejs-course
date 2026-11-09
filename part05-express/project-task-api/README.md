# 第5部の成果物 タスク管理 REST API

第5部のまとめとして、**Express でタスク管理の REST API を作ります**。データはまだメモリに置きます（サーバを止めると消えます）。

第23〜28章で作った部品を、すべて組み合わせます。problem+json のエラー・ページ分け・クエリの確かめ・ETag と If-Match（第25章）、3つの層と設定・ログ・止め方（第26章）、SSE（第27章）、書き換えの回数の上限（第24章）です。そして、外から HTTP だけで確かめるテスト（第28章 6節）で、要件を満たしているかを確かめます。

この API は、ここから第12部まで育て続けます。第6部でデータを PostgreSQL に移し、第7部で TypeScript にし、第8部で React の画面をつなぎ、第10部でログインを足します。そのときに、ルートとサービスをほとんど変えずに済むように、層を分けて作ります。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 10〜15時間 |
| 前提 | 第23〜28章（特に、各章の練習問題の模範解答） |
| 作るもの | `~/dev/task-api` の Git リポジトリ。`npm start` で `http://127.0.0.1:9360/api/tasks` に API が立ち上がるもの |
| 確かめ方 | 完成例のテスト（[solutions/test/api.test.mjs](solutions/test/api.test.mjs)、25 個）を、自分の API に対して動かす。curl でも試す |

| フォルダ | 中身 |
| --- | --- |
| [solutions/](solutions/) | 完成例（`task-api` パッケージ）。外から HTTP で確かめるテスト付き |

---

## 1. 準備

作業は `~/dev/task-api` で行い、Git で管理します（教材のフォルダは OneDrive の中なので、`node_modules` や Git のリポジトリを作らないようにします）。

```sh
$ mkdir -p ~/dev/task-api && cd ~/dev/task-api
$ git init
$ npm init -y                     # "type": "commonjs" になるので、"module" に直す
$ mise use node@24                # このフォルダの Node.js を固定する（第1部 第2章6.3節）
$ npm install --save-exact express@5.3.0 zod@4.6.7 pino@10.4.0 cors@2.8.6
$ mkdir -p src/{lib,middleware,routes,services,repositories} test
$ printf 'node_modules/\n.env\n' > .gitignore   # .env（自分の設定）はコミットしない
```

> バージョンは、執筆時点で教材を確かめたものです。新しいものを入れてもかまいませんが、動きが違ったら、まずこのバージョンで試してください。`--save-exact` は、`package.json` に `^` を付けずに書く指定です（第3部 第14章）。

`package.json` の `scripts` は、次のようにします。

```json
{
  "type": "module",
  "scripts": {
    "start": "node --env-file-if-exists=.env src/server.mjs",
    "dev": "node --watch --env-file-if-exists=.env src/server.mjs",
    "test": "node --test \"test/*.test.mjs\""
  },
  "engines": { "node": ">=24" }
}
```

- `--env-file-if-exists=.env` は、`.env` があれば環境変数として読み、無ければ何もしない指定です（第26章 5.3節）。`--env-file` だと、ファイルが無いときに起動できません
- `--watch` は、ファイルを保存するたびにサーバを起動し直します

設定の例を、[solutions/.env.example](solutions/.env.example) からコピーしておきます。

### 1.1 自分の部品を持ってくる

第22〜27章の練習問題で作った関数を、コピーします。自分の解答でも、教材の模範解答でもかまいません。コピーしたら、ファイルの先頭の `import` のパスを直します（例: `'../../lib/signed.mjs'` → `'./signed.mjs'`）。

| コピーするもの | 元の場所 | 完成例での名前 |
| --- | --- | --- |
| `problemHandler`・`notFound`・`HttpProblem` | `part05-express/lib/problem.mjs`（第25章 練習問題2） | `src/middleware/problem.mjs` |
| `parseListQuery` | 第25章 `solutions/query.mjs`（練習問題4） | `src/routes/list-query.mjs` |
| `paginate` | 第25章 `solutions/cursor.mjs`（練習問題3） | `src/lib/cursor.mjs` |
| `signJson`・`unsignJson` | `part05-express/lib/signed.mjs`（第22章 練習問題3） | `src/lib/signed.mjs` |
| `evaluatePreconditions` | 第25章 `solutions/preconditions.mjs`（練習問題6） | `src/lib/preconditions.mjs` |
| `rateLimit` | 第24章 `solutions/rate-limit.mjs`（練習問題3） | `src/middleware/rate-limit.mjs` |
| `loadConfig` | 第26章 `solutions/config.mjs`（練習問題2） | `src/config.mjs` |
| エラーのクラス | 第26章 `solutions/errors.mjs` | `src/errors.mjs` |
| `createTaskService` | 第26章 `solutions/task-service.mjs`（練習問題3） | `src/services/tasks.mjs` |
| `createMemoryTaskRepo` | 第26章 `solutions/memory-task-repo.mjs` | `src/repositories/memory-tasks.mjs` |
| `requestLogger` | 第26章 `solutions/request-logger.mjs`（練習問題4。第24章の `accessLog` の代わりに使う） | `src/middleware/request-logger.mjs` |
| `createTasksRouter`・`mapDomainErrors` | 第26章 `solutions/tasks-routes.mjs`（練習問題5） | `src/routes/tasks.mjs` |
| `formatEvent` | 第27章 `solutions/sse-format.mjs`（練習問題2） | `src/lib/sse-format.mjs` |
| `createEventHub`・`sseRoute` | 第27章 `solutions/event-hub.mjs`（練習問題3） | `src/lib/event-hub.mjs` |

```sh
$ N=~/Library/CloudStorage/OneDrive-個人用/program/nodejs/part05-express
$ cp $N/lib/problem.mjs src/middleware/problem.mjs
$ cp $N/ch25-rest-api-design/solutions/cursor.mjs src/lib/
$ cp $N/ch26-app-structure/solutions/task-service.mjs src/services/tasks.mjs
# …残りも同じように
```

コピーしたものの多くは、そのままでは要件に足りません。何をどう足すかは、2節の要件と3節のヒントで考えてください。完成例では、足した所に `// 追加（成果物）:`、変えた所に `// 変更（成果物）:` のコメントを付けてあります。

## 2. 要件

### 2.1 URL

| メソッドとパス | すること | 成功したとき |
| --- | --- | --- |
| `GET /healthz` | 生きているか | 200 `{ "status": "ok" }` |
| `GET /readyz` | リクエストを受けられるか。止める途中なら 503 | 200 `{ "status": "ready" }` |
| `GET /api/tasks` | 一覧（2.3節） | 200 `{ "items": [...], "nextCursor": "…" か null }` |
| `POST /api/tasks` | 作る。ボディは `{ "title", "dueDate"? }` | 201、`Location`、`ETag`、作ったタスク |
| `GET /api/tasks/:id` | 1件 | 200、`ETag`、タスク |
| `PATCH /api/tasks/:id` | 変える。ボディは `{ "title"?, "status"?, "dueDate"? }`。`If-Match` が要る | 200、新しい `ETag`、変えた後のタスク |
| `DELETE /api/tasks/:id` | 消す。`If-Match` が要る | 204（本文なし） |
| `GET /api/events` | 変わったことを SSE で知らせる（2.6節） | 200 `text/event-stream` |

- 無いタスクは 404。`/api/tasks/abc`・`/api/tasks/0`・`/api/tasks/01` のように、id が正の整数の形でないときも 404
- パスはあるがメソッドが違う（`PUT /api/tasks/1`、`DELETE /api/tasks`）ときは 405 と `Allow`。パスも無ければ 404

### 2.2 タスクの形と決まり

```json
{
  "id": 1,
  "title": "牛乳を買う",
  "status": "todo",
  "dueDate": "2026-12-01",
  "createdAt": "2026-11-05T09:00:00.000Z",
  "updatedAt": "2026-11-05T09:00:00.000Z",
  "completedAt": null,
  "version": 1
}
```

| 項目 | 決まり | 違うとき |
| --- | --- | --- |
| `title` | 前後の空白を取って 1〜100 文字 | 422 |
| `title` | 終わっていない（`done` でない）ほかのタスクと同じ題名は不可 | 409 |
| `status` | `todo`・`doing`・`done`。作ったときは `todo` | 422 |
| `status` | `doing` は同時に 3 個まで（`MAX_DOING`） | 409 |
| `dueDate` | `YYYY-MM-DD` か `null`。日本の今日より前は不可（同じ値のまま、ほかの項目を変えるのはよい） | 422 |
| `completedAt` | `done` にした時刻。`done` でなくなったら `null` | — |
| `version` | 作ったときは 1。何かが変わるたびに 1 増える。何も変わらない PATCH では増えない | — |
| 終わったタスク | `status` を戻すこと以外（題名・締め切り）は変えられない | 409 |
| ボディ | 知らない項目（`id`・`version`・`done` など）は不可。オブジェクトでない（配列など）も不可 | 422 |

これは、第26章 練習問題3の決まりと同じです。

### 2.3 一覧のクエリ

| クエリ | 意味 | 既定 |
| --- | --- | --- |
| `status` | `todo`・`doing`・`done` をカンマで区切って（`status=todo,doing`） | すべて |
| `due_before` | その日より前の締め切りのものだけ（`YYYY-MM-DD`）。締め切りの無いものは入らない | — |
| `sort` | `createdAt`・`dueDate`・`title`。前に `-` で逆の順 | `-createdAt` |
| `limit` | 1〜100 の、数字だけの文字列 | 20 |
| `cursor` | 前のページの `nextCursor` | — |

- 間違い（知らない名前、2回の指定、`limit=' 20'`、`limit=2e1` など）は 400。本文の `errors` に、`{ "parameter": "limit", "detail": "…" }` の形で、どれが違うかを入れる（第25章 練習問題4）
- ページ分けはカーソル（第25章 6.2節）。カーソルは署名して、作り変えられたら 400。別の `sort` で作ったカーソルも 400
- 並べる値が同じものは `id` の順。**締め切りの無いもの（`null`）は、昇順のときいちばん後ろ**（降順では前）
- 途中でタスクが足されたり消されたりしても、カーソルで読み進めて、重なりや抜けが出ない

### 2.4 ETag と If-Match（第25章 7節）

- `GET`・`POST`・`PATCH` の応答には、`version` から作った強い ETag（`"3"`）を付ける。Express の自動の ETag は止める
- `GET /api/tasks/:id` で `If-None-Match` が今の ETag と同じなら 304（本文なし）
- `PATCH`・`DELETE` は、`If-Match` が無ければ 428、今の ETag とあてはまらなければ 412（`W/"3"` のような弱い ETag もあてはまらない）。無いタスクは、`If-Match` より先に 404

### 2.5 Idempotency-Key（第25章 8節）

- `POST /api/tasks` に `Idempotency-Key`（英数字と `-` で 8〜64 文字）が付いていたら、1回目の応答（ステータス・本文・`Location`・`ETag`）を覚える
- 同じキーと同じ中身なら、作らずに同じ応答を返し、`Idempotent-Replayed: true` を付ける
- 同じキーで別の中身なら 422。キーの形が違えば 400。1回目がまだ終わっていなければ 409
- 失敗した応答（400 番台・500 番台）は覚えない（直して、同じキーで送り直せるように）
- 覚えておくのは 24 時間まで。数にも上限を決める

### 2.6 SSE（第27章 5節）

- `GET /api/events` は `text/event-stream`。最初に `retry:` を送る
- タスクを作った・変えた・消したら、`task.created`・`task.updated`・`task.deleted` のイベントを配る。`data` はタスクの JSON（消したときは、消す前のタスク）、`id` は 1, 2, 3, … と増える数
- `Last-Event-ID` ヘッダ（無ければ `?lastEventId=`）があれば、それより後のものを送り直す。送り直せない（覚えている範囲より古い、今より後、数でない）ときは `reset` のイベントを1つ送る
- 心拍のコメント（`: ping`）を `SSE_HEARTBEAT_MS` ごとに送る
- 客が切ったら、ハブから外し、タイマーを止める

### 2.7 エラー

すべてのエラーは problem+json（RFC 9457、第25章 4節）で返します。`Content-Type: application/problem+json`、本文には少なくとも `type`・`title`・`status` を入れます。

| ステータス | 主なとき |
| --- | --- |
| 400 | 壊れた JSON、クエリの間違い、カーソルの間違い、`Idempotency-Key` の形 |
| 404 | 無いタスク、無いパス |
| 405 | パスはあるが、メソッドが違う（`Allow` を付ける） |
| 409 | 題名が重なる、`doing` が多すぎる、終わったタスクを変える、同じキーを処理中 |
| 412 | `If-Match` があてはまらない |
| 413 | ボディが 16KB を超える |
| 415 | `POST`・`PATCH` のボディが JSON でない |
| 422 | ボディの中身の間違い。`errors` に `{ "pointer": "#/title", "detail": "…" }` |
| 428 | `PATCH`・`DELETE` に `If-Match` が無い |
| 429 | 書き換えが多すぎる（`Retry-After` を付ける） |
| 500 | 思っていなかったエラー。中の文（`err.message` やスタック）は見せない。ログには書く |

### 2.8 そのほか

- **CORS**: `CORS_ORIGINS` に書いたオリジンだけに許す（完全に同じかで比べる）。`ETag`・`Location` などのヘッダを、画面の JavaScript から読めるようにする（`Access-Control-Expose-Headers`）。プリフライトでは `If-Match`・`Idempotency-Key` を許す
- **書き換えの回数**: `POST`・`PATCH`・`DELETE` を、1つの IP から1分に `RATE_LIMIT_PER_MINUTE` 回まで。超えたら 429。読むだけのもの（一覧・SSE）は数えない
- **ヘッダ**: どの応答にも `X-Content-Type-Options: nosniff`。`X-Request-Id`（届いたものが英数字と `._-` で 64 文字までならそれを、違えば作ったもの）
- **ログ**: 1行1つの JSON（pino）。リクエストごとに、応答の後に1行（メソッド・URL・ステータス・時間・`reqId`）。秘密の値（`Authorization`・`Cookie`、クエリの `token` など）は書かない（第26章 6節）

### 2.9 設定

```sh
$ npm start                                  # http://127.0.0.1:9360/api/tasks
$ PORT=9300 LOG_LEVEL=debug npm start
```

| 環境変数 | 既定 | 意味 |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`・`test`・`production` |
| `HOST` | `127.0.0.1` | 待つアドレス |
| `PORT` | `9360` | 待つポート |
| `LOG_LEVEL` | `info`（`test` のときは `silent`） | ログの量 |
| `CORS_ORIGINS` | 空 | 許すオリジン。カンマで区切る |
| `CURSOR_SECRET` | 起動のたびに乱数で作る | カーソルに署名する鍵（32 文字以上）。**`production` では必須** |
| `RATE_LIMIT_PER_MINUTE` | `120` | 書き換えの上限。`0` で数えない |
| `MAX_DOING` | `3` | `doing` にできる数 |
| `SSE_HEARTBEAT_MS` | `15000` | SSE の心拍 |
| `SHUTDOWN_DELAY_MS` | `0` | 止める合図から、新しい接続を断るまで |
| `SHUTDOWN_TIMEOUT_MS` | `10000` | それでも終わらないとき、あきらめるまで |
| `SESSION_SECRET` | — | まだ使わない（第10部）。`production` では必須（第26章 練習問題2のまま） |

- 起動するときに1回だけ確かめ、間違っていたら、**名前と理由だけ**（値は書かない）を書いて、終了コード 1 で終わる

### 2.10 止め方

- SIGTERM・SIGINT で、`/readyz` を 503 にし、`SHUTDOWN_DELAY_MS` 待ってから、新しい接続を断る
- SSE の接続には `shutdown` のイベントを送ってから閉じる（閉じないと、`server.close()` が時間切れまで終わらない）
- 受け付け中のリクエストが終わったら、終了コード 0。`SHUTDOWN_TIMEOUT_MS` を過ぎたら、終了コード 1

## 3. 作り方のヒント

### 3.1 ファイルの分け方

第26章 9節の形にします。

| ファイル | 中身 |
| --- | --- |
| `src/server.mjs` | 起動（コンポジションルート）: `loadConfig` → logger → repo → hub → service → app → listen → shutdown |
| `src/app.mjs` | `createApp({ service, sse, logger, config, isReady })`。ミドルウェアの順番を決める |
| `src/config.mjs` | `loadConfig` |
| `src/errors.mjs` | `NotFoundError`・`ConflictError`・`ValidationError`・`PreconditionFailedError` |
| `src/routes/tasks.mjs` | `createTasksRouter({ service, cursorSecret })` と `mapDomainErrors` |
| `src/routes/list-query.mjs` | `parseListQuery` |
| `src/services/tasks.mjs` | `createTaskService({ repo, clock, maxDoing, publish })` |
| `src/repositories/memory-tasks.mjs` | `createMemoryTaskRepo()` |
| `src/middleware/` | `problem`・`requestLogger`・`rateLimit`・`idempotency` |
| `src/lib/` | HTTP にも Express にも頼らない部品（`paginate`・`signJson`・`evaluatePreconditions`・`formatEvent`・`createEventHub`） |

### 3.2 進める順番

1. `server.mjs`・`app.mjs`・`config.mjs` で、`/healthz` が答えるところまで。ログもここで入れる
2. 第26章のルート・サービス・データの層をつないで、作る・見る・変える・消すを動かす。エラーは problem+json
3. 一覧のクエリとカーソル
4. ETag・`If-None-Match`・`If-Match`（3.3節）
5. `Idempotency-Key`
6. SSE（3.4節）と、止め方
7. CORS・書き換えの回数・ヘッダ
8. 完成例のテストを動かして、通らないところを直す

### 3.3 版の確かめは、データの層で

`If-Match` を確かめるとき、「今の版を読む → 同じか比べる → 変える」の3つの間に `await` があると、その間にほかのリクエストが同じタスクを変えるかもしれません（第26章のデータの層は、メモリでも `async` です）。

完成例では、ルートで `If-Match` の形（`*`、並び、弱い ETag）を確かめて「客が見ていた版」を決め、それを `service.update(id, changes, { expectedVersion })` に渡します。データの層の `update` も `expectedVersion` を受け取り、**今の版が同じときだけ変える**（違えば `null` を返す）ようにしています。

```js
// repositories/memory-tasks.mjs
async update(id, fields, { expectedVersion } = {}) {
  const t = rows.get(id);
  if (!t) return null;
  if (expectedVersion !== undefined && t.version !== expectedVersion) return null;
  // …
}
```

これは、SQL の `UPDATE tasks SET … WHERE id = $1 AND version = $2` と同じ形です。第6部で PostgreSQL に移すときに、そのまま置き換えられます。

### 3.4 サービスは SSE を知らない

「タスクが変わったら知らせる」は、どこに書けばよいでしょう。ルートに書くと、ルートが増えるたびに書き忘れが起きます。サービスに `hub` を渡すと、サービスが SSE という HTTP の仕組みを知ることになります。

完成例では、サービスに `publish(type, task)` という**関数だけ**を渡し、変え終わった後に呼んでいます。何が起きたかを知らせるのはサービスの仕事、それをどう届けるか（SSE、第12部のキューなど）は、組み立てる `server.mjs` が決めます。

```js
// server.mjs
const service = createTaskService({ repo, clock: () => new Date(), publish: (type, task) => hub.publish(type, task) });
```

### 3.5 ミドルウェアの順番

`app.mjs` の順番には、それぞれ理由があります。

1. `requestLogger`: いちばん前。後ろで何が起きても、1行書かれる
2. ヘッダ（`nosniff`）と CORS: エラーの応答にも付くように、ルートより前
3. `/healthz`・`/readyz`: 回数の上限やボディの読み取りより前（ロードバランサが何度も呼ぶので）
4. 書き換えの回数: ボディを読む前（数えすぎたリクエストのボディを、読まずに断る）
5. `express.json({ limit: '16kb' })`
6. ルート
7. `notFound` → `mapDomainErrors` → `problemHandler`

### 3.6 curl で試す

```sh
$ B=http://127.0.0.1:9360/api/tasks
$ curl -si -X POST -H 'Content-Type: application/json' -d '{"title":"牛乳"}' $B
$ curl -si $B/1
$ curl -si -X PATCH -H 'Content-Type: application/json' -H 'If-Match: "1"' -d '{"status":"doing"}' $B/1
$ curl -sN http://127.0.0.1:9360/api/events     # 別のターミナルで。-N はためずに表示する
```

## 4. 確かめ方

完成例のテストをコピーして、自分の API に対して動かします。テストは、サーバを別のプロセスで起動し（`127.0.0.1:9361`、一部のテストは `9362`）、HTTP だけで確かめます。中の作りが完成例と違っていても、2節の要件を満たしていれば通ります。

```sh
$ cp $N/project-task-api/solutions/test/api.test.mjs test/
$ npm test
```

完成例は 25 個のテストがすべて通ります。テストが確かめていないこと（ログの中身、同時に2つの PATCH が来たとき、`SHUTDOWN_TIMEOUT_MS` の時間切れ）は、curl やログを見て確かめてください。

## 5. もっとやるなら

- `GET /api/tasks` にも ETag を付けて、`If-None-Match` で 304 を返す（一覧の ETag は、何から作ればよいでしょう）
- `?q=` で題名を検索する（大文字と小文字、全角と半角をどう扱うか）
- OpenAPI（第25章 9.2節）で、この API の説明書を書き、Swagger UI などで表示する
- 書き換えの回数を、IP ではなく、`Idempotency-Key` やユーザー（第10部）ごとに数える
- SSE の代わりに、第27章のロングポーリングでも知らせられるようにする

## 6. Flask で作るなら

Flask では、Flask-RESTful や flask-smorest のような拡張を使って、リソースごとのクラスに `get`・`post` を書くことが多いです。入力の確かめは marshmallow や pydantic、ログは `logging`、止め方は Gunicorn が受け持ちます。

| この成果物 | Flask |
| --- | --- |
| `createTasksRouter`（Router） | Blueprint |
| zod（`CreateBody`・`parseListQuery`） | marshmallow・pydantic |
| `problemHandler` | `@app.errorhandler` |
| `requestLogger`（pino） | `logging` と、`before_request`・`after_request` |
| `loadConfig` | `app.config.from_prefixed_env()`、pydantic-settings |
| `sseRoute` | ジェネレータを返す `Response`（第27章 6節） |
| SIGTERM で止める | Gunicorn がする（`graceful_timeout`） |
| `createApp({ … })` | アプリケーションファクトリ（`create_app()`） |

Flask のアプリケーションファクトリ（`create_app()` という関数でアプリを作る書き方）は、`createApp` と同じ考え方です。テストのたびに、設定を変えた新しいアプリを作れます。

## 7. 次の部へ

- 第6部: `repositories/memory-tasks.mjs` を、PostgreSQL のものに取り替えます。`list`・`get`・`insert`・`update`（`expectedVersion` つき）・`remove` の形を変えなければ、サービスもルートも、ほぼそのままです。絞り込みとページ分けは、SQL の `WHERE` と `ORDER BY … LIMIT` に移します。冪等キーも、データベースの表に置きます
- 第7部: TypeScript にします。zod のスキーマから型を作ります（第38章）
- 第8部: React の画面から、この API と SSE を使います。CORS の設定は、そのためのものです

---

前の章: [第28章 他のフレームワークの地図](../ch28-framework-map/README.md) ／ 第5部の目次: [../README.md](../README.md)
