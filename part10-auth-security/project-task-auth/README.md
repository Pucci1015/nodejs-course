# 第10部の成果物 ユーザー登録・メール確認・ログイン

第8部までで、タスク管理 API（`~/dev/task-api`）と、その画面（`web/`）ができました。でも、だれでも、どのタスクでも読んだり消したりできます。第10部のまとめとして、**ユーザー登録・メールアドレスの確認・ログイン・パスワードの再設定を足し、タスクを「自分のものだけ」にします**。練習用の IdP でのログイン（第54章）も足します。

第51〜55章で学んだことを組み合わせます。パスワードのハッシュと決まり（第51章）、セッションと Cookie と CSRF（第52章）、メールのトークン（第53章）、OpenID Connect（第54章）、ヘッダ・認可の漏れの点検（第55章）です。完成例のテスト（API 45 個・画面 34 個）が通り、API と画面の両方で `npm run check` がエラー 0 で終われば完成です。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 10〜14時間 |
| 前提 | 第8部の成果物（`~/dev/task-api` のブランチ `part08-web`）、第51〜55章、第6部の PostgreSQL（`~/dev/part06` の `compose.yaml`） |
| 作るもの | `~/dev/task-api` の API に `/api/auth/…` を足し、`/api/tasks` と `/api/events` をログインしている人だけのものにする。`web/` に、ログイン・登録・確認・再設定のページを足す |
| 確かめ方 | API: `npm run check`（テストは [solutions/test/api.test.ts](solutions/test/api.test.ts) の 30 個と [solutions/test/auth.test.ts](solutions/test/auth.test.ts) の 15 個）。画面: `web/` で `npm run check`（[solutions/web/test/](solutions/web/test/) の 34 個） |

| フォルダ | 中身 |
| --- | --- |
| [solutions/](solutions/) | 完成例（API の `task-api` パッケージと、画面の `web/`）。どちらにもテストが付いている |

> **読み方**
> - 作業は `~/dev/task-api` で、新しいブランチ `part10-auth` を作って行います（1節）。第9部の Next.js 版（`next/`）は、この部では使いません。
> - **マイグレーション 004 は、今あるタスクを全部消します**（持ち主のいないタスクは、だれのものにもできないため。3.3節）。開発用のデータなので消してかまいませんが、残したいものがあれば、先に書き写してください。
> - API のテストは、中の作りを見ません。2節の要件（道・ステータス・メール）だけを確かめるので、ファイルの分け方は自分で決めてかまいません。画面のテストは、2.8節の表の**名前**でボタンや入力欄を探します。
> - 一度に全部を書かず、3.2節の順番で、1つずつテストを通しながら進めてください。
> - 攻撃を試すのは、自分の Mac で動かしているこのアプリだけにしてください。

## この成果物で身につくことを、後でどこで使うか

| 身につくこと | 後で使う場面 |
| --- | --- |
| セッションを PostgreSQL に置き、パスワードを変えたら全部の端末のログインを消す | 第12部（サーバを2台以上にしても、ログインが続く） |
| どの SQL も持ち主で絞り、リクエストごとに「その人のサービス」を作る | 第13部（自分で決めた題材でも、人ごとのデータを漏らさない） |
| メールを待たずに送り、失敗をログに書く | 第12部 第64章（バックグラウンドジョブにして、送れなかったら送り直す） |
| テストの中で、偽の SMTP サーバと偽の IdP を起動して、外から確かめる | 第11部（テストのための偽物を、どこに置くか） |
| 本番だけ `Secure`・`__Host-` の Cookie にする | 第12部 第62章（HTTPS とリバースプロキシ、`trust proxy`） |

---

## 1. 準備

### 1.1 ブランチを作る

第8部の完成した形を残しておくため、新しいブランチで作業します（第1部 第3章）。

```sh
$ cd ~/dev/task-api
$ git status                         # 書きかけが無いこと（nothing to commit）を確かめる
$ git switch part08-web              # 第8部のブランチに移る（main に入れたなら git switch main）
$ git switch -c part10-auth          # 新しいブランチを作って、そこに移る
```

### 1.2 パッケージ・設定・テストをコピーする

完成例から、パッケージの一覧・設定の例・テストをコピーします。テストは「要件を書いたもの」なので、先に置いておき、1つずつ通していきます。`P=~/dev/part10/project-task-auth/solutions` としておくと、短く書けます。

```sh
$ P=~/dev/part10/project-task-auth/solutions
$ cp $P/package.json $P/package-lock.json $P/eslint.config.js $P/.env.example .
$ cp $P/test/*.ts test/
$ npm ci
```

| コピーしたもの | 中身 |
| --- | --- |
| `package.json`・`package-lock.json` | 第7部のものに、express-session 1.19.0・helmet 8.3.0・nodemailer 10.3.1 と、その型（`@types/express-session`・`@types/nodemailer`）を足したもの（第10部の章と同じ版） |
| `eslint.config.js` | 第7部のものに、`web/` を見ない設定を足したもの（画面は `web/` の中で lint する） |
| `.env.example` | 第10部の設定（2.7節）を足したもの。自分の `.env` と見比べて、足りない行を `.env` に足してください（`.env` はコミットしない） |
| `test/helpers.ts` | テストの道具。第7部の `api.test.ts` の前半（サーバの起動・`fetch`・SSE を読む）をここに移し、偽の SMTP サーバ・`signUp`（登録 → 確認 → ログイン）・Cookie の入れ物を足した |
| `test/api.test.ts` | 第7部の 30 個のテスト。最初にユーザーを登録してログインし、その Cookie を付けて送るように変えた（確かめることは同じ） |
| `test/auth.test.ts` | 第10部で足した 15 個のテスト（31〜45） |
| `test/fake-smtp.ts`・`test/mini-idp.ts` | 第10部の `tools/` のコピー。テストの中で、空いているポートに起動する |

画面のほうも、テストとパッケージを入れ替えます（パッケージは第8部と同じですが、`package-lock.json` をそろえておきます）。

```sh
$ cd web
$ cp $P/web/package.json $P/web/package-lock.json .
$ cp $P/web/test/*.ts* test/
$ npm ci
$ cd ..
```

### 1.3 章で作った部品をコピーする

章で書いたものを、そのまま部品として使います。`src/auth/` というフォルダを作って、完成例からコピーします。

```sh
$ mkdir src/auth
$ cp $P/src/auth/* src/auth/
$ cp $P/src/session.d.ts src/
```

| ファイル | もとになった章 | 中身 |
| --- | --- | --- |
| `password.ts` | 第51章 3節 | `hashPassword`・`verifyPassword`（Argon2id の PHC の文字列）。`dummyHash()` を足した（ユーザーがいないときも、同じ時間をかけて確かめるため） |
| `policy.ts`・`common-passwords.txt` | 第51章 4節 | `checkPassword(password, email)`（12 文字以上・よく使われるもの・メールアドレスを含むもの） |
| `tokens.ts` | 第53章 4節 | `newToken()`（32 バイトの乱数）・`hashToken()`（SHA-256。表にはハッシュだけを置く） |
| `mailer.ts` | 第53章 3.2節 | `createSmtpMailer({ host, port, from })` |
| `mails.ts` | 第53章 5.1節・練習問題 | 確認・登録済みのお知らせ・再設定のメールの中身 |
| `oidc.ts` | 第54章 5節・練習問題8 | `createOidcClient(…)` の `start()`（IdP へ送る URL と、覚える state・nonce・verifier）と `finish(code, saved)`（ID トークンを確かめた中身） |
| `pg-session-store.ts` | 第52章 2.3節の MemoryStore の代わり | express-session のセッションを、表 `sessions` に置く `PgSessionStore`。`destroyAllForUser(userId)` で、その人のセッションを全部消せる |
| `../session.d.ts` | 第52章 2節 | `req.session.userId` と `req.session.oidc` の型（宣言のマージ） |

- `pg-session-store.ts` は、章で書いていない新しい部品です。中を読んで、`get`・`set`・`destroy`・`touch` がそれぞれどの SQL を送るかを確かめてください（3.5節）

### 1.4 PostgreSQL・メール・IdP を動かす

ターミナルを3つ使います。

```sh
$ (cd ~/dev/part06 && docker compose up -d --wait)   # 1つ目: PostgreSQL（第6部 第32章）。終わったら、そのまま使ってよい
$ cd ~/dev/part10 && npm run mail                    # 2つ目: メールの受け取り口（SMTP 1025・見る所 8025）
$ cd ~/dev/part10 && npm run idp                     # 3つ目: 練習用の IdP（9640）。2.6節を作るときだけ
```

- メールの受け取り口は、Mailpit（第53章 2.1節）でもかまいません。どちらも 1025 番で受け取ります
- テスト（`npm test`）は、偽の SMTP サーバと IdP を自分で起動するので、この2つは要りません。PostgreSQL だけが要ります

---

## 2. 要件

### 2.1 ログインの API（`/api/auth/…`）

ボディは JSON です。知らない項目や形の違うものは 422（第5部 第25章の problem+json と `errors[].pointer`）にします。

| メソッドとパス | 送るもの | 成功 | 失敗 |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `{ email, password }` | 202 と `{ detail }`。**登録済みのアドレスでも同じ**（2.2節） | 422（パスワードの決まりは `#/password`） |
| `POST /api/auth/verify-email` | `{ token }` | 204 | 400（知らない・使った・期限切れ） |
| `POST /api/auth/resend-verification` | `{ email, password }` | 202（パスワードが合い、確認がまだのときだけ、メールを送る） | — |
| `POST /api/auth/login` | `{ email, password }` | 204 と `Set-Cookie`（セッション） | 401（違う。アドレスが無いときも同じ文）、403（`type` が `urn:task-api:email-not-verified`。パスワードが合ったときだけ） |
| `POST /api/auth/logout` | — | 204。セッションを消し、Cookie も消す | — |
| `POST /api/auth/logout-all` | — | 204。その人のセッションを全部消す（ほかの端末も） | 401 |
| `GET /api/auth/me` | — | 200 と `{ id, email }`。`Cache-Control: no-store` | 401 |
| `POST /api/auth/forgot-password` | `{ email }` | 202。**無いアドレスでも同じ**（あれば再設定のメール） | 422 |
| `POST /api/auth/reset-password` | `{ token, password }` | 204。その人のセッションを全部消す | 400（トークン）、422（決まり。このときトークンはまだ使える） |
| `GET /api/auth/idp/login` | — | 302 で IdP へ（2.6節） | 404（IdP の設定が無いとき） |
| `GET /api/auth/idp/callback` | `?code=…&state=…` | 303 で `/` へ | 303 で `/login?error=state`・`denied`・`idp`・`conflict` へ |

- `POST /api/auth/…` は、IP ごとに1分に `LOGIN_RATE_LIMIT_PER_MINUTE` 回まで（既定 10）。超えたら 429 と `Retry-After`（第51章 6節）。タスクの書き換えの上限（`RATE_LIMIT_PER_MINUTE`）とは別に数えます
- メールアドレスは、前後の空白を取って小文字にそろえてから使います（`Alice@Example.com` と `alice@example.com` は同じ人）

### 2.2 登録とメールアドレスの確認

- 登録すると、確認のメールを送ります。リンクは `APP_URL` + `/verify-email#token=…` です。トークンは 32 バイトの乱数で、表にはハッシュだけを置き、24 時間で切れ、1回使うと消えます（第53章 4・5節）
- 登録済みのアドレスで登録されたら、表は変えず、本人に「もう登録されています」のお知らせ（ログインと再設定のリンク）を送ります。応答は、新しい登録と同じ 202 と本文です（登録済みかどうかを、ほかの人に教えない。第53章 5.3節）
- 新しい確認のメールを送ったら、前のリンクは使えなくします
- メールは、送り終わるのを待たずに応答を返します。送れなかったら、ログに書きます（宛先は書かない）

### 2.3 ログインとセッション

- ログインできたら、**セッションの ID を作り直してから**、`userId` を入れます（セッション固定への備え。第52章 3節）
- セッションは PostgreSQL の表 `sessions` に置きます。サーバを起動し直しても、2台にしても、ログインが続きます（テスト 28・29）
- Cookie: 名前は `sid`（本番は `__Host-sid`）、`HttpOnly`・`SameSite=Lax`・`Path=/`、本番だけ `Secure`。期限は `SESSION_MAX_AGE_HOURS`（既定 168 時間）で、使うたびに延びます
- ログインするまでは、セッションを作りません（見るだけの人の行を作らない）
- `/api/tasks` と `/api/events` は、ログインしていなければ 401。セッションはあるがユーザーが消されていたら、セッションも消して 401

### 2.4 パスワードの再設定

- 再設定のリンクは `APP_URL` + `/reset-password#token=…`。30 分で切れ、1回だけ使えます
- 新しいパスワードにしたら、その人のセッションを全部消します（盗まれていたかもしれないので）。メールのリンクを開けたので、メールアドレスの確認も済んだことにします

### 2.5 タスクは自分のものだけ

- タスクに持ち主（`owner_id`）を付けます。作るときの持ち主は、いつもログインしている人です（ボディから決めない）
- ほかの人のタスクは、一覧に出ず、`GET`・`PATCH`・`DELETE` は 404 です（403 にしない。あることも教えない。第55章 7節）
- 「終わっていないタスクの題名は重ならない」と「作業中は3個まで」は、人ごとに数えます
- `Idempotency-Key` は、人ごとに覚えます（alice と bob が同じキーを使っても、別のもの）
- SSE（`/api/events`）は、自分のタスクのイベントだけを届けます

### 2.6 練習用の IdP でログイン

- `OIDC_ISSUER`・`OIDC_CLIENT_ID`・`OIDC_CLIENT_SECRET` の3つがそろっているときだけ、`/api/auth/idp/…` を使えます（1つか2つだけなら、起動のときに設定の間違いで終了コード 1）
- 戻り先（`redirect_uri`）は `APP_URL` + `/api/auth/idp/callback`。state・nonce・PKCE の verifier はセッションに入れ、1回使ったら消します（第54章 3〜5節）
- 結びつけ方（第54章 6節・練習問題7）:
  1. 前に同じ `iss` + `sub` でログインした → その人
  2. 同じメールアドレスのユーザーがいる → IdP が確かめたアドレス（`email_verified: true`）で、こちらでも確認済みのときだけ結びつける。そうでなければ `/login?error=conflict`
  3. それ以外 → 新しいユーザー（IdP が確かめたアドレスだけを入れる）

### 2.7 守りと設定

- **CSRF**: `POST`・`PATCH`・`DELETE` は、`Origin` があれば、`APP_URL` か `CORS_ORIGINS` のどれかであること。`Origin` が無ければ、`Sec-Fetch-Site` が無いか `same-origin` であること。そうでなければ 403（`SameSite=Lax` に重ねる。第52章 5節・第55章 5節）
- **ヘッダ**: helmet の既定（`Content-Security-Policy`・`X-Content-Type-Options: nosniff` など）。`X-Powered-By` は出さない（第55章 2節）
- CORS は第7部のまま（Cookie は送らせない）。画面は Vite の中継で同じオリジンから呼ぶので、CORS は使いません

足す設定（環境変数）:

| 名前 | 既定 | 中身 |
| --- | --- | --- |
| `APP_URL` | `http://localhost:5173` | 画面のオリジン。メールのリンクの頭、CSRF で通すオリジン、IdP の戻り先に使う |
| `SESSION_SECRET` | 開発では起動のたびに乱数 | 32 文字以上。本番では必須（第7部からある設定） |
| `SESSION_MAX_AGE_HOURS` | 168 | ログインが続く時間（使うたびに延びる） |
| `LOGIN_RATE_LIMIT_PER_MINUTE` | 10 | `/api/auth/…` の POST の上限。0 なら数えない |
| `SMTP_HOST`・`SMTP_PORT`・`MAIL_FROM` | `127.0.0.1`・1025・`Task App <no-reply@example.com>` | メールを渡す先と差出人 |
| `OIDC_ISSUER`・`OIDC_CLIENT_ID`・`OIDC_CLIENT_SECRET` | なし | 練習用の IdP（`http://127.0.0.1:9640`・`task-app`・`dev-only-client-secret`） |

### 2.8 画面（`web/`）

ログインしていなければ、タスクのページ（`/`・`/tasks/new`・`/tasks/:id`）を開くと、`/login?next=（開こうとしたパス）` に移ります。ログインできたら、`next` のページに戻ります（このサイトの中のパスだけ。`//` で始まるものや `https://…` は `/`）。テストは、次の名前で探します。

| ページ | URL | 見出し（h1） | 名前（ラベル・ボタン・リンク）と出す文 |
| --- | --- | --- | --- |
| ログイン | `/login` | ログイン | 欄「メールアドレス」「パスワード」、ボタン「ログイン」。違えば「メールアドレスかパスワードが違います」。確認がまだなら、ボタン「確認のメールを送り直す」。リンク「パスワードを忘れたとき」「登録する」。`?error=…` の理由も出す |
| 登録 | `/register` | 登録 | 欄「メールアドレス」「パスワード」、ボタン「登録する」。送れたら「（アドレス）にメールを送りました…」。422 は、その欄の横に |
| メールアドレスの確認 | `/verify-email#token=…` | メールアドレスの確認 | ボタン「メールアドレスを確かめる」（開いただけでは送らない）。できたら「確認できました」 |
| パスワードの再設定 | `/forgot-password` | パスワードの再設定 | 欄「メールアドレス」、ボタン「再設定のメールを送る」。送れたら「（アドレス）が登録されていれば…」 |
| 新しいパスワード | `/reset-password#token=…` | 新しいパスワード | 欄「新しいパスワード」、ボタン「パスワードを変える」。できたら「パスワードを変えました」 |
| どのページにも | — | — | ログインしていれば、メニュー（一覧・新しいタスク）と、アドレスと、ボタン「ログアウト」。していなければ、リンク「ログイン」「登録」 |

- ログアウトしたら `/login` に移り、前の人のタスクをキャッシュから消します
- どこかの API が 401 を返したら（セッションが切れた）、ログインのページに移ります
- `VITE_IDP_LOGIN=1 npm run dev` のときだけ、ログインのページにリンク「練習用の IdP でログイン」を出します

---

## 3. 作り方のヒント

### 3.1 ファイルの分け方

完成例の分け方です。★ は第10部で足したもの、☆ は変えたものです。

```text
task-api/
├── migrations/
│   ├── 003_create_users.sql        ★ users・user_identities・email_tokens・sessions
│   └── 004_add_task_owner.sql      ★ tasks に owner_id。今あるタスクは消す
├── src/
│   ├── auth/                       ★ 1.3節でコピーした部品
│   ├── repositories/
│   │   ├── pg-users.ts             ★ ユーザー・外のログイン・メールのトークン
│   │   └── pg-tasks.ts             ☆ createPgTaskRepo(db, ownerId)。どの SQL も owner_id で絞る
│   ├── services/auth.ts            ★ 登録・確認・ログイン・再設定・外のログインの決まり（HTTP を知らない）
│   ├── routes/
│   │   ├── auth.ts                 ★ /api/auth のルート
│   │   └── tasks.ts                ☆ serviceFor(req) でサービスを受け取る。冪等キーを人ごとに
│   ├── middleware/
│   │   ├── require-user.ts         ★ ログインしていなければ 401。req.user を入れる
│   │   ├── same-origin.ts          ★ CSRF への備え（Origin・Sec-Fetch-Site）
│   │   └── idempotency.ts          ☆ options.scope でキーを分ける
│   ├── lib/event-hub.ts            ☆ createUserHubs（人ごとのハブ）、sseRoute に「ハブを選ぶ関数」
│   ├── session.d.ts                ★ req.session の型
│   ├── express.d.ts                ☆ req.user を足した
│   ├── config.ts                   ☆ 2.7節の設定
│   ├── app.ts                      ☆ helmet・CSRF・セッション・/api/auth・ログインが要る道
│   └── server.ts                   ☆ ユーザー・セッション・メール・IdP を作ってつなぐ
└── web/src/
    ├── api/auth.ts                 ★ ログインの API を呼ぶ関数
    ├── queryClient.ts              ★ 401 で「ログインしていない」にする QueryClient
    ├── components/RequireLogin.tsx ★ ログインが要るページの枠
    ├── components/Field.tsx        ★ ラベル・入力・間違いの文
    ├── lib/safe-next.ts            ★ ?next= をこのサイトの中だけに
    ├── lib/token-from-hash.ts      ★ #token= を読む
    ├── pages/LoginPage.tsx ほか 4 つ ★
    ├── Layout.tsx                  ☆ メニューを、ログインしているかで変える
    └── routes.tsx                  ☆ ページを足し、タスクのページを RequireLogin の中に
```

### 3.2 進める順番

| 順番 | すること | 通るようになるテスト |
| --- | --- | --- |
| 1 | マイグレーション 003・004、`pg-users.ts`、`pg-tasks.ts` の持ち主 | （まだ無い。`npm run migrate` が通ること） |
| 2 | `services/auth.ts` の `register`・`verifyEmail`・`login`、`routes/auth.ts` の register・verify-email・login・me、`app.ts` のセッション | 31・33・34・35 |
| 3 | `require-user.ts`、リクエストごとのサービス（3.4節） | 32・36、api.test.ts の 1〜23・25〜30 |
| 4 | 人ごとの SSE（3.6節） | 37、api.test.ts の 24 |
| 5 | logout・logout-all、CSRF、helmet、回数の上限 | 38・39・41・42 |
| 6 | 再設定 | 40 |
| 7 | 設定の確かめ、IdP | 43・44・45 |
| 8 | 画面: `api/auth.ts`・`queryClient.ts`・`RequireLogin`・ログインのページ | web の auth.test.tsx の「ログイン」 |
| 9 | 画面: 登録・確認・再設定のページ、ログアウト | web の残り |

### 3.3 表を足す

`003_create_users.sql` の中心です。ほかの列や索引は、完成例を見てください。

```sql
CREATE TABLE users (
  id                integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email             text        CONSTRAINT users_email_check CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254),
  password_hash     text,       -- Argon2id の PHC 文字列（第51章 3節）
  email_verified_at timestamptz, -- NULL なら、まだ確認していない（第53章 5節）
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email ON users (email);
```

- `email` は小文字にそろえたものだけを入れられます。IdP だけでログインする人は、`email` も `password_hash` も NULL のことがあります
- `users_email` の一意索引で、同じアドレスは1人だけになります。同時に同じアドレスが登録されても、後のほうは 23505（第6部 第32章）で分かります

`004_add_task_owner.sql` は、`tasks` に `owner_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE` を足します。`NOT NULL` の列は、今ある行に値を入れられないと足せないので、先に `DELETE FROM tasks;` で消しています。題名の部分一意索引（第6部）は、`(owner_id, title)` に作り直します。

### 3.4 リクエストごとに「その人のサービス」を作る

いちばん漏れにくいのは、**どの SQL にも `owner_id = $n` を入れる**ことです（第55章 7節）。完成例は、データの層を `createPgTaskRepo(pool, ownerId)` にし、`server.ts` で、リクエストごとにサービスを作ります。

```ts
function serviceFor(req: Request) {
  const userId = req.user?.id;
  if (userId === undefined) throw new Error('requireUser の後で呼んでください'); // 組み立ての間違い（500）
  return createTaskService({
    repo: createPgTaskRepo(pool, userId), // どの SQL も、この人のタスクだけに絞る
    clock: () => new Date(),
    maxDoing: config.maxDoing,
    publish: (type, task) => hubs.for(userId).publish(type, task),
  });
}
```

- サービス（`services/tasks.ts`）は、第7部から1行も変えていません。「だれの」を知らなくても、渡されたリポジトリが絞ってくれるからです
- ルートは `createTasksRouter({ serviceFor, … })` で受け取り、各ハンドラで `serviceFor(req)` を呼びます
- 作るとき（INSERT）の `owner_id` は、ボディからではなく、このリポジトリの `ownerId` から入れます

### 3.5 セッションを PostgreSQL に置く

`app.ts` で、express-session に `PgSessionStore` を渡します（第52章 2節の設定に、`store` と `rolling` を足したもの）。

```ts
app.use('/api', session({
  name: cookieName,                     // 開発 'sid'、本番 '__Host-sid'
  secret: config.sessionSecret,
  store: sessionStore,                  // new PgSessionStore(pool)
  resave: false,
  saveUninitialized: false,             // ログインするまで作らない
  rolling: true,                        // 使うたびに期限を延ばす
  cookie: { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: config.sessionMaxAgeMs },
}));
```

- `PgSessionStore.set` は、セッションの中の `userId` を `user_id` の列にも入れます。これで `DELETE FROM sessions WHERE user_id = $1` が書け、「すべての端末からログアウト」と「再設定で全部消す」ができます
- ログアウトの Cookie を消すときは、付けたときと同じ属性（`Secure` など）で `res.clearCookie` します。`__Host-` の Cookie は、`Secure` が無いと消せません

### 3.6 SSE を人ごとにする

第7部の `createEventHub` を、人ごとに1つ作ります（`createUserHubs`）。`sseRoute` には、ハブの代わりに「リクエストからハブを選ぶ関数」も渡せるようにします。

- 止めるとき（SIGTERM）に注意: express-session は、セッションを保存してから応答を終えるので、SSE の応答が終わるのが `server.close()` の後になります。そのとき空いた接続は閉じられず、テスト 24 が「止まるまで 4 秒かかった」で失敗します。`closeAll` で、書き終わったら接続も閉じます

```ts
const socket = res.socket; // finish のときには、res から外れている
res.once('finish', () => socket?.end());
res.end(formatEvent({ event: 'shutdown', data: '…' }));
```

### 3.7 メールを待たない・時間をそろえる

- `deliver(mail)` は、`mailer.send(mail).catch(…)` だけの、待たない関数にします（第53章 7節）。登録の応答が「メールを送り終わるまで」待つと、登録済みかどうか（お知らせのメールか確認のメールか）で時間が変わるからです
- 登録は、登録済みでも `hashPassword` を計算します。ログインは、ユーザーがいなくても `dummyHash()` と比べます（第51章 5節）

### 3.8 画面: ログインしている人を、どこに置くか

ログインしている人は、**サーバが知っていること**（サーバの状態）なので、Context ではなく TanStack Query のキャッシュ（キー `['me']`）に置きます（第44章 6節の「state の置き場所」）。`useMe()` をどの部品からでも呼べ、ログイン・ログアウト・401 のときは、このキャッシュを書き換えるだけで、メニューも `RequireLogin` も変わります。

```ts
// queryClient.ts: どこかの API が 401 を返したら「ログインしていない」にする
const onError = (err: unknown) => {
  if (err instanceof ApiError && err.status === 401) queryClient.setQueryData(meKey, null);
};
new QueryClient({ queryCache: new QueryCache({ onError }), mutationCache: new MutationCache({ onError }), … });
```

- `getMe()` は、401 を「失敗」にせず `null` を返します（ログインしていない、という答え）
- `RequireLogin` は、`useMe()` が `null` なら `<Navigate to={'/login?next=…'} replace />`。SSE（`useTaskEvents`）も、ここに移します（ログインしていなければ、つないでも 401）
- 画面で隠すのは使いやすさのためです。守っているのは API（401・404）で、画面ではありません

### 3.9 メールのリンクのページ

- トークンは URL の `#` の後ろにあります。`useLocation().hash` から読みます。`#` の後ろはサーバに送られないので、アクセスログや `Referer` に残りません
- 確認のページは、開いただけでは POST しません。メールのセキュリティの仕組みが、本人より先にリンクを開くことがあるからです。StrictMode で `useEffect` が2回動いて、2回送ってしまうことも防げます

### 3.10 よく出るエラーと直し方

| 症状 | よくある原因 |
| --- | --- |
| `npm run migrate` で `column "owner_id" … contains null values` | 004 で、列を足す前に `DELETE FROM tasks;` をしていない |
| ログインは 204 なのに、次のリクエストが 401 | `saveUninitialized: false` のまま、`req.session.userId` を入れていない。または `regenerate` の後で入れずに、前のセッションに入れている |
| テスト 28・29 だけ 401 | `SESSION_SECRET` を使っていない（起動のたびに鍵が変わる）。テストは決まった値を渡します |
| テスト 24 が「4000ms かかった」 | 3.6節 |
| `POST` がすべて 403 | `APP_URL` と、画面のオリジンが違う（`127.0.0.1:5173` で開いたなど）。`localhost:5173` で開くか、`CORS_ORIGINS` に足す |
| 画面のログインが、すぐに `/login` に戻る | ログインの後に `['me']` を読み直していない（`await queryClient.invalidateQueries({ queryKey: meKey })` の後で移る） |
| IdP から戻ると `/login?error=state` | IdP のログインを始めたブラウザと、戻ってきたブラウザ（タブではなく、Cookie）が違う。または、`127.0.0.1:5173` で始めた |

---

## 4. 確かめ方

### 4.1 テスト

```sh
$ cd ~/dev/task-api
$ npm run check            # tsc → ESLint → テスト 45 個（PostgreSQL が要る。127.0.0.1:9491〜9494 を使う）
$ cd web
$ npm run check            # tsc → ESLint → テスト 34 個（API も PostgreSQL も要らない）
```

完成例のテストは、次の形で全部通ります（Node.js 24.22、PostgreSQL 16 で確かめた）。

```text
ℹ tests 45
ℹ pass 45
ℹ fail 0
```

```text
 Test Files  2 passed (2)
      Tests  34 passed (34)
```

### 4.2 目で確かめる

1.4節の3つを動かしたうえで、API と画面を起動します。

```sh
$ cd ~/dev/task-api
$ npm run migrate                                   # 003・004 を動かす（今あるタスクは消える）
$ OIDC_ISSUER=http://127.0.0.1:9640 OIDC_CLIENT_ID=task-app OIDC_CLIENT_SECRET=dev-only-client-secret npm run dev
```

```sh
$ cd ~/dev/task-api/web
$ VITE_IDP_LOGIN=1 npm run dev                      # http://localhost:5173/ を開く
```

次の順に確かめます。執筆時点では、Chromium（Playwright）で、すべてこのとおりに動くことを確かめました。

1. `http://localhost:5173/tasks/new` を開くと、`/login?next=%2Ftasks%2Fnew` に移る
2. 「登録する」から登録すると「メールを送りました」。`http://127.0.0.1:8025/api/messages` に確認のメールが届いている
3. メールのリンクを開いて「メールアドレスを確かめる」を押すと「確認できました」
4. `/login?next=%2Ftasks%2Fnew` でログインすると、新しいタスクのページに戻る。DevTools の Application → Cookies で、`sid` が HttpOnly・SameSite Lax であること、Console で `document.cookie` が `''`（読めない）ことを確かめる
5. 2つ目のタブで作ったタスクが、1つ目のタブの一覧に、SSE で出る
6. シークレットウィンドウ（別の Cookie）で bob を登録してログインすると、一覧は空。`/tasks/1`（alice のタスク）は「ページが見つかりません」
7. 「ログアウト」で `/login` に移り、戻るボタンで一覧に戻っても、ログインのページになる
8. 「パスワードを忘れたとき」から再設定のメールを送り、リンクから新しいパスワードにできる
9. 別のウィンドウで「練習用の IdP でログイン」→ alice を選ぶと、同じ alice のタスクが見える（確認済みのアドレスどうしなので結びつく）。bob を選ぶと「同じメールアドレスのアカウントがあります」（IdP の bob のアドレスは確かめられていない）

---

## 5. もっとやるなら

- **メールアドレスを変える**: 新しいアドレスに確認のメールを送り、確認できたら変える。古いアドレスには「変わりました」のお知らせを送る
- **パスワードを変えるページ**: 今のパスワードを確かめてから変え、今のセッション以外を消す（`destroyAllForUser(userId, req.sessionID)`）
- **ログインの回数の上限を、アドレスごとにも**: IP ごとだけだと、多くの IP から1つのアドレスを狙われたときに止められない（第51章 6節）
- **メールを、送れなかったら送り直す**: 第12部 第64章のジョブの列に入れる
- **Redis にセッションを置く**: 第6部 第34章の Redis と `connect-redis` に替えて、PostgreSQL と比べる

## 6. Python で作るなら

Flask では、ログインの決まりの多くを拡張に任せます。

| この成果物 | Flask |
| --- | --- |
| `hashPassword`・`verifyPassword` | Werkzeug の `generate_password_hash`・`check_password_hash`（既定は scrypt） |
| express-session + `PgSessionStore` | Flask の `session` は、中身を署名付きの Cookie に入れる（サーバに置かない）。サーバに置くなら Flask-Session |
| `requireUser`・`req.user` | Flask-Login の `@login_required`・`current_user` |
| `requireSameOrigin` | Flask-WTF の CSRF トークン（フォームに隠しの値を入れる）。API なら、同じように `Origin` を見る |
| `oidc.ts` | Authlib の Flask の連携 |
| helmet | Flask-Talisman |

Flask の `session` は、Cookie の中に中身があるので、「ほかの端末のログインを消す」ができません（鍵を替えると全員が消える）。この成果物がセッションを表に置いたのは、そのためです（第52章 8節）。

## 7. 次の部へ

第11部では、ここまでに書いたテストを見直し、テストの層（関数・API・画面・E2E）を分けて、GitHub Actions で毎回動かします。この成果物のテストは「サーバを起動して外から確かめる」ものと「偽の API で画面を確かめる」ものでした。ブラウザで本物の API まで通して確かめる E2E のテスト（4.2節を自動にしたもの）は、第11部 第58章で書きます。

---

前: [第55章 Web セキュリティの総点検](../ch55-web-security/README.md) ／ 第10部の目次: [../README.md](../README.md) ／ 次: 第11部 テストとコード品質（準備中）
