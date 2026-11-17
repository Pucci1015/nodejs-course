# 第10部の成果物 完成例（`task-api` パッケージと `web/`）

要件とヒントは [../README.md](../README.md) にあります。第7部の API と第8部の画面に、ユーザー登録・メールアドレスの確認・ログイン・パスワードの再設定・練習用の IdP でのログインを足し、タスクを人ごとにしたものです。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [package.json](package.json)、[package-lock.json](package-lock.json) | 第7部のものに、express-session・helmet・nodemailer と、その型を足した |
| [tsconfig.json](tsconfig.json) | 第7部と同じ（`"include": ["src", "test"]`） |
| [eslint.config.js](eslint.config.js) | 第7部の設定に、`web/` を見ない設定を足した |
| [mise.toml](mise.toml) | Node.js のバージョン |
| [.env.example](.env.example) | 設定の例。`.env` にコピーして使う。第10部の設定（`APP_URL`・メール・IdP など）を足した |
| [.gitignore](.gitignore) | `node_modules/` と `.env` をコミットしない |
| [migrations/](migrations/) | マイグレーションの SQL。003（ユーザーなどの表）と 004（タスクの持ち主）を足した |
| [src/](src/) | API のコード。第10部で足した所は `// 追加（第10部）:`、変えた所は `// 変更（第10部）:` |
| [test/](test/) | 外から HTTP で確かめるテスト（45 個）と、テストの道具 |
| [web/](web/) | 画面（`task-web` パッケージ）。ログイン・登録・確認・再設定のページを足した |

## 動かし方

PostgreSQL を先に動かします（第6部 第32章 2節）。

```sh
$ (cd ~/dev/part06 && docker compose up -d --wait)
$ cp -R ~/dev/part10/project-task-auth/solutions ~/dev/task-api-example10
$ cd ~/dev/task-api-example10
$ npm ci             # package-lock.json のとおりに入れる
$ cp .env.example .env
$ npm run check      # tsc → ESLint → 45 個のテスト（127.0.0.1:9491〜9494 を使う）
$ cd web
$ npm ci
$ npm run check      # tsc → ESLint → 34 個のテスト（API は要らない）
```

- `~/dev/part10` には `node_modules` がありますが、`cp -R` は `solutions` の中だけをコピーするので、コピー先の API と `web/` の両方で `npm ci` が要ります
- 画面を目で確かめる手順は、[../README.md](../README.md) の 4.2節です（メールの受け取り口・練習用の IdP・API・画面を動かす）
- 完成例を動かすときも、`npm start`（`npm run migrate`）は、データベース `taskapi` の `public` のタスクを消します（マイグレーション 004）。第7・8部の完成例と同じデータベースを使っているときは、気を付けてください
- `npm ci` の最後に `npm audit` が「moderate」と出ることがあります。ESLint が使う `minimatch` のもので、開発のときだけ使う道具なので、API や画面には入りません（第55章 9節）。`npm audit fix --force` は打たないでください

## 作りの要点（第8部から変えた所）

- **タスクは、リクエストごとに「その人のサービス」で**: `server.ts` の `serviceFor(req)` が、`createPgTaskRepo(pool, userId)`（どの SQL も `owner_id` で絞る）と、その人のハブに知らせる `publish` でサービスを作ります。`services/tasks.ts` は、第7部から変えていません
- **ほかの人のタスクは 404**: 探してから持ち主を比べるのではなく、SQL で絞るので、「あるけれど、あなたのものではない」という答えが、そもそも作れません
- **セッションは PostgreSQL に**: `PgSessionStore`。起動し直しても2台にしてもログインが続き、`user_id` の列で「その人のセッションを全部消す」ができます（ログアウトをすべての端末で、再設定のとき）
- **ログインのときは ID を作り直す**: `req.session.regenerate` の後で `userId` を入れ、`save` を待ってから 204 を返します
- **登録済みかどうかを漏らさない**: 登録と再設定のメールの依頼は、いつも同じ 202 と本文。登録済みのときは、本人にだけ「もう登録されています」のメール。メールは待たずに送り、パスワードのハッシュは、どの道でも計算します
- **トークンは、表にはハッシュだけ、URL では `#` の後ろ**: 1回使ったら消し（`DELETE … RETURNING`）、新しいものを出したら古いものも消します
- **CSRF は2重に**: `SameSite=Lax` の Cookie と、`Origin`・`Sec-Fetch-Site` を見る `requireSameOrigin`
- **画面のログインしている人は TanStack Query に**: キー `['me']`。どこかの API が 401 を返したら `null` にし、`RequireLogin` がログインのページへ移します。ログアウトでは、前の人のタスクをキャッシュから消します
- **止めるときの SSE**: express-session が応答の終わりを遅らせるので、`closeAll` で、書き終わったら接続も閉じます（成果物の README 3.6節）

## テストが確かめないこと

- メールの見た目（HTML のメール）。`npm run mail` で受け取って、`http://127.0.0.1:8025/api/messages` の `html` を目で確かめてください
- 本番の Cookie（`__Host-sid`・`Secure`）。HTTPS が要るので、第12部で確かめます（テスト 43 は、本番では `SESSION_SECRET` が要ることだけを確かめます）
- メールを送れなかったときのログ（`SMTP_PORT` を、何も動いていない番号にして登録すると、ログに「メールを送れませんでした」が出ます）
- 画面と本物の API のつながり（プロキシ・Cookie・SSE・IdP のリダイレクト）。成果物の README 4.2節の手順で確かめてください
