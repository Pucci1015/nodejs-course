# 第12部の成果物 画像添付・メール通知つきで独自ドメインに公開

第11部までで、ログインできて、テストと CI が整ったタスク管理アプリ（`~/dev/task-api` の API と `web/` の画面）ができました。でも、まだ自分の Mac の中でしか動きません。メールはその場で送るので、SMTP サーバが落ちていると届きません。サーバを2台にすると、SSE の知らせが片方の台の客にしか届きません。第12部のまとめとして、**タスクに画像を添付でき、メールを仕事の列から送り、2台以上で動き、見張れるアプリにして、コンテナにし、独自ドメインで公開します**。

第60〜66章で学んだことを組み合わせます。本番の設定・プロキシの後ろ・ヘルスチェック（第60章）、Dockerfile と Compose（第61章）、PaaS・独自ドメイン・GitHub Actions でのデプロイ（第62章）、オブジェクトストレージと署名付き URL（第63章）、BullMQ の仕事の列と決まった時刻の仕事（第64章）、ビルドした画面の配り方と `Cache-Control`（第65章）、メトリクスと台を増やすこと（第66章）です。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 10〜16時間（公開の5節は、クラウドのアカウントとドメインの準備を除く） |
| 前提 | 第11部の成果物（`~/dev/task-api` のブランチ `part11-testing`）、第60〜66章、第6部の PostgreSQL と Redis（`~/dev/part06` の `compose.yaml`）、Docker Desktop（第6部 第32章） |
| 作るもの | `~/dev/task-api` に、添付ファイルの API と画面、メールの仕事の列とワーカー、毎朝のお知らせ、Redis を通した SSE、`/readyz`・`/version`・`/metrics`、本番の設定、`Dockerfile`・`compose.yaml`・`render.yaml`・デプロイのワークフローを足す |
| 確かめ方 | `npm run check`（113 個のテスト）・`web/` の `npm run check`（37 個）・`npm run e2e`（4 個）が通り、`docker compose up` で本番と同じ形が手元で動く。公開（5節）は、自分のアカウントとドメインで行う |

| フォルダ | 中身 |
| --- | --- |
| [solutions/](solutions/) | 完成例（API の `task-api` パッケージと、画面の `web/`）。第11部の完成例に、この README の要件を足したもの |

> **読み方**
> - 作業は `~/dev/task-api` で、新しいブランチ `part12-deploy` を作って行います（1節）。
> - 第60〜66章の練習問題で書いた部品（`sniff-file.ts`・`content-disposition.ts`・`object-key.ts`・`http-metrics.ts`・`shared-hub.ts`・`mail-processor.ts`・`wait-for-version.ts` など）を、アプリに組み込むのが中心です。コピーした部品は1行目に「第NN章 練習問題N の模範解答のコピー」と書き、アプリに合わせて変えた所に `// 追加（第12部）:`・`// 変更（第12部）:` を付けます。
> - 2節の要件を見て自分で作り、つまずいたら3節のヒント、それでも分からなければ完成例（[solutions/](solutions/)）と見比べます。全部を一度に作らず、**2.2 → 2.3 → … の順に、1つ足すたびにテストを通す**と、どこで壊したかが分かります。
> - 5節（公開）は、クラウドのアカウント・独自ドメイン（年に千円〜数千円）・クレジットカードが要ります。**執筆の環境からは Render・Cloudflare・GitHub で動かせなかった**ので、5節は各サービスの説明に基づく手順です。手順や料金は変わるので、必ず公式で確認してください。読むだけで済ませて、4節（手元で本番と同じ形を動かす）までで終えてもかまいません。

## この成果物で身につくことを、後でどこで使うか

| 身につくこと | 後で使う場面 |
| --- | --- |
| ファイルを DB ではなくオブジェクトストレージに置き、署名付き URL で渡す | 第13部（自分の題材でファイルを扱うとき） |
| 時間のかかる仕事・失敗しうる仕事を、列とワーカーに回す | 第13部（メール、画像の処理、外の API の呼び出し） |
| 台を増やしても壊れない作り（状態を Redis・DB に置く） | 第13部（リアルタイムの機能） |
| 本番の設定・ヘルスチェック・メトリクス・デプロイの流れ | 第13部（自分の題材を公開する） |

---

## 1. 準備

### 1.1 ブランチを作る

```sh
$ cd ~/dev/task-api
$ git status                         # 書きかけが無いこと（nothing to commit）を確かめる
$ git switch part11-testing          # 第11部のブランチに移る（main に入れたなら git switch main）
$ git switch -c part12-deploy        # 新しいブランチを作って、そこに移る
```

### 1.2 パッケージをコピーする

完成例から、パッケージの一覧をコピーします。`P=~/dev/part12/project-task-deploy/solutions` としておくと、短く書けます。

```sh
$ P=~/dev/part12/project-task-deploy/solutions
$ cp $P/package.json $P/package-lock.json .
$ npm ci
```

| コピーしたもの | 中身 |
| --- | --- |
| `package.json`・`package-lock.json` | 第11部のものに、`@aws-sdk/client-s3`・`@aws-sdk/s3-request-presigner` 3.1161.0、`bullmq` 6.5.4、`redis` 6.3.1（第12部の章と同じ版）と、scripts の `worker`・`s3`・`mail`（2.10節）を足したもの |

`web/` のパッケージは、第11部から変えません。

### 1.3 動かしておくもの

第11部までの PostgreSQL に加え、**Redis**（第6部 第34章）・**練習用の S3**（第63章）・**偽の SMTP サーバ**（第53章）を使います。

```sh
$ (cd ~/dev/part06 && docker compose up -d --wait)   # PostgreSQL（5433）と Redis（6380）
$ cp ~/dev/part12/tools/mini-s3.ts ~/dev/part12/tools/fake-smtp.ts test/support/   # 2.10節
```

別々のターミナルで、次の2つを動かしておきます（`npm run s3`・`npm run mail` は 2.10節で足すスクリプトです。足すまでは `~/dev/part12` で同じ名前のスクリプトを動かします）。

```sh
$ npm run s3      # 練習用の S3（http://127.0.0.1:9800、バケット task-files）
$ npm run mail    # 偽の SMTP サーバ（SMTP 1025、届いたメールは http://127.0.0.1:8025/api/messages）
```

---

## 2. 要件

### 2.1 全体の形

```
ブラウザ ──https──▶ PaaS のプロキシ ──▶ app（API + 画面の dist）×2台以上 ──▶ PostgreSQL
   │                                     │  │                              ▶ Redis（仕事の列・知らせ）
   │                                     │  └─ 仕事を入れる ──▶ worker ──▶ SMTP（メール）
   └──── 署名付き URL ─────────────────────────────────────────▶ S3 互換のストレージ（画像）
```

| プロセス | 動かし方 | 役目 |
| --- | --- | --- |
| app | `npm start`（`src/server.ts`） | API・SSE・画面の配布。メールは仕事の列に入れるだけ |
| worker | `npm run worker`（`src/worker.ts`） | 列の仕事（メール・毎朝のお知らせ・孤児の掃除）を処理する |

開発とテストでは `WORKER_MODE=inline` にして、app の中でワーカーも動かします（プロセスを1つ起動するだけで済む）。本番は `separate` で、ワーカーを別のプロセスにします（第64章 7節）。

### 2.2 設定（`src/config.ts`）

第11部の設定に、次を足します。どれも Zod で確かめ、間違っていたら名前だけを書いて終了コード 1（第60章 2節）。

| 名前 | 既定（開発） | 意味 |
| --- | --- | --- |
| `TRUST_PROXY` | `0` | 前に立つプロキシの数（0〜10）。本番の PaaS では `1`（第60章 7節） |
| `APP_VERSION` | 無し | `/version` が返す版。無ければ `RENDER_GIT_COMMIT`、それも無ければ `dev` |
| `SMTP_USER`・`SMTP_PASS` | 無し | メール送信サービスのログイン。**2つそろえるか、どちらも書かない** |
| `SMTP_SECURE` | `false` | `true` なら最初から TLS（ポート 465）。`false` なら STARTTLS（587）か平文（1025） |
| `REDIS_URL` | `redis://127.0.0.1:6380` | Redis |
| `QUEUE_PREFIX` | `taskapp` | Redis のキーの頭。小文字で始まる英数字と `_`、41 文字まで |
| `WORKER_MODE` | `inline` | `inline` か `separate` |
| `DIGEST_CRON`・`DIGEST_TZ` | `0 8 * * *`・`Asia/Tokyo` | 毎朝のお知らせの時刻と、日付を決めるタイムゾーン（`Intl` で確かめる） |
| `S3_ENDPOINT`・`S3_PUBLIC_ENDPOINT` | `http://127.0.0.1:9800`・`S3_ENDPOINT` と同じ | アプリがつなぐ入口と、ブラウザに渡す署名付き URL の入口（コンテナの中と外で名前が違うため。2.9節） |
| `S3_REGION`・`S3_BUCKET` | `us-east-1`・`task-files` | リージョン（R2 なら `auto`）とバケット |
| `S3_ACCESS_KEY_ID`・`S3_SECRET_ACCESS_KEY` | `dev-only-…` | ストレージの鍵 |
| `S3_FORCE_PATH_STYLE` | `true` | `http://入口/バケット/キー` の形で呼ぶ（第63章 3節） |
| `ATTACHMENT_MAX_BYTES`・`ATTACHMENTS_PER_TASK` | `5000000`・`10` | 添付の大きさと数の上限 |
| `SWEEP_GRACE_MINUTES` | `60` | 孤児の掃除で、置いてからこの分数より新しいものは消さない |
| `STATIC_DIR` | 無し | ビルドした画面（`web/dist`）を配るとき（2.8節） |
| `METRICS_TOKEN` | 無し | `/metrics` の合言葉（32 文字以上）。無ければ、だれでも読める |

- `NODE_ENV=production` では、第11部の必須のもの（`DATABASE_URL`・`SESSION_SECRET` など）に加えて、`REDIS_URL`・`S3_ACCESS_KEY_ID`・`S3_SECRET_ACCESS_KEY`・`METRICS_TOKEN` も必須。**足りないものを全部**、名前だけ書いて終了コード 1（第60章 練習問題1）
- `.env.example` に、第12部の設定を説明つきで足す（値は開発用のものだけ）

### 2.3 添付ファイル（API）

マイグレーション `005_create_attachments.sql` で表を足します。

| 列 | 型と決まり |
| --- | --- |
| `id` | `uuid` の主キー（アプリが `randomUUID()` で作る） |
| `task_id` | `tasks(id)` への外部キー。**タスクを消すと行も消える**（`ON DELETE CASCADE`） |
| `owner_id` | 持ち主（`users(id)`） |
| `object_key` | ストレージのキー。一意 |
| `file_name` | 利用者が付けた名前。1〜200 文字 |
| `content_type`・`size`・`created_at` | 中身で決めた種類・バイト数・置いた時刻 |

| ルート | 動き |
| --- | --- |
| `GET /api/tasks/:taskId/attachments` | `{ items: [...] }`。各項目に `url`（`…/content`）を付ける |
| `POST /api/tasks/:taskId/attachments?name=…` | ボディは画像のバイトそのもの。201 + `Location` |
| `GET /api/tasks/:taskId/attachments/:id/content` | 署名付き URL（5 分）へ 302。`Cache-Control: private, no-store`。`?download=1` なら `Content-Disposition: attachment` |
| `DELETE /api/tasks/:taskId/attachments/:id` | 204。行を消してから、ストレージからも消す |

- 種類は **中身の先頭のバイトで決める**（`Content-Type` のヘッダは信じない）。PNG・JPEG・GIF・WebP だけ。それ以外は 415、空なら 400（第63章 5.2節）。SVG は中にスクリプトを書けるので受け付けない
- `ATTACHMENT_MAX_BYTES` を超えたら 413、1つのタスクに `ATTACHMENTS_PER_TASK` 個を超えたら 409
- ストレージのキーに、利用者の付けた名前を使わない（`objectKey`。第63章 練習問題）
- **ほかの人のタスク**の添付は、一覧・置く・取り出す・消すのどれも 404（タスクがあることも教えない）
- ストレージに置いてから行を入れる。行が入らなかったら、置いたものを消す

### 2.4 メールの仕事の列とワーカー（`src/jobs/`）

- 第10部の `deliver(mail)` を、その場で送る代わりに、BullMQ の列 `jobs` に `send-mail` の仕事を入れるように変える（応答を待たせない、は第10部と同じ）
- 仕事は 6 回まで、1 秒からの指数バックオフでやり直す（第64章 4節）。SMTP の **5xx は直らない失敗**として `UnrecoverableError` にし、やり直さない
- 同じ仕事を2回処理しても、メールは1通だけ（送ったことを Redis に覚える。第64章 練習問題6）
- 仕事のデータは Zod で確かめる（列は外から来るものと同じ扱い。第64章 5節）

### 2.5 毎朝のお知らせと孤児の掃除

| 仕事 | いつ | 中身 |
| --- | --- | --- |
| `daily-digest` | `DIGEST_CRON`（`DIGEST_TZ` の時刻で） | `DIGEST_TZ` での今日が期限の、終わっていないタスクを持つ人に、1人1通のメール。マイグレーション `006_create_digest_log.sql`（主キー `(user_id, day)`）で、**同じ日に2回動いても1通だけ** |
| `sweep-blobs` | 1時間ごと | ストレージにあって表に無いキー（タスクを消したときの残りなど）のうち、`SWEEP_GRACE_MINUTES` より古いものを消す |

- どちらも BullMQ の `upsertJobScheduler` で登録する。ワーカーを何台起動しても、決まった時刻の仕事は1つ（第64章 6節）

### 2.6 2台で動かす（SSE）

- タスクの知らせは、その台のハブに直接渡さず、Redis の Pub/Sub（チャンネル `${QUEUE_PREFIX}:events`）に流し、**全部の台**が受け取って、自分の台のその人のハブに渡す（第66章 7節・練習問題8）
- 流れてきたものは Zod で確かめる（`{ userId, type, data }`）
- SSE のイベントの `id` に、台ごとの頭（起動のたびに乱数）を付ける。客が別の台につなぎ直して、知らない頭の `Last-Event-ID` を送ってきたら、`reset` を送る（「途中から送り直す」は同じ台でしかできないため）

### 2.7 動かす人のためのルート（`src/routes/ops.ts`）

| ルート | 動き |
| --- | --- |
| `GET /healthz` | 何にもつながずに 200（第11部と同じ） |
| `GET /readyz` | データベース・Redis・ストレージを 2 秒の時間切れで確かめる。全部 ok なら 200、1つでもだめなら 503。**答えには名前と ok・error だけ**（エラーの中身は書かない） |
| `GET /version` | `{ "version": "…" }`（デプロイのワークフローが新しい版を待つのに使う） |
| `GET /metrics` | Prometheus の文字の形。`METRICS_TOKEN` を決めてあれば `Authorization: Bearer …` が要り、合わなければ 401（比べるのは sha256 + `timingSafeEqual`） |

`/metrics` に出す数:

| 名前 | 種類 | 中身 |
| --- | --- | --- |
| `http_requests_total` | counter | メソッド・ルート・ステータスごとの数。ルートは**パスの形**（`/api/tasks/:taskId/attachments`）で、本物の id を入れない |
| `http_request_duration_seconds` | histogram | かかった秒数 |
| `nodejs_eventloop_lag_max_seconds`・`process_resident_memory_bytes` | gauge | イベントループの遅れ・メモリ |
| `sse_connections`・`jobs_waiting` | gauge | この台の SSE の客の数・列で待っている仕事の数 |

- 500 の応答（problem+json）と、そのログに、同じ `errorId`（`randomUUID()`）を入れる（第55章 10節・第66章 2節）

### 2.8 本番の設定

| 項目 | 決まり |
| --- | --- |
| プロキシの後ろ | `app.set('trust proxy', TRUST_PROXY)`。`X-Forwarded-Proto: https` なら、本番の Cookie（`__Host-sid`・`Secure`）が付く（第60章 7節） |
| CSP | `img-src` に、ストレージの入口（`S3_PUBLIC_ENDPOINT` のオリジン）を足す。`upgrade-insecure-requests` は本番だけ |
| 画面を配る | `STATIC_DIR` があれば、API と同じサーバで画面を配る。`/assets/…` は `public, max-age=31536000, immutable`（無ければ 404）、HTML は `no-cache`、知らないパスは `index.html`（`/api` は除く。API の 404 は problem+json のまま）、`/index.html` は `/` へ 301（第65章 6節） |

### 2.9 Docker と Compose

| ファイル | 決まり |
| --- | --- |
| `Dockerfile` | マルチステージ（画面のビルド → 本番のパッケージ → 確かめる段階 → 本番）。`node:24-bookworm-slim`、`USER node`、`ARG APP_VERSION`、`STATIC_DIR=/app/public`、`HEALTHCHECK`（`/healthz`）、`EXPOSE 9490`（第61章 4・6節） |
| `.dockerignore` | `node_modules`・`.env`・`.git`・テストやビルドが作るもの |
| `compose.yaml` | プロジェクト名 `task-app`。db（postgres:18）・redis（redis:8）・s3・mail（node のイメージでテストの道具を動かす）・app・worker（`WORKER_MODE=separate`）。外に出すのは `127.0.0.1` の app 9803・s3 9801・mail 9802 だけ |

### 2.10 画面・スクリプト・テスト

画面（`web/`）は、タスクのページに「添付ファイル」の節を足します。

| 部品 | 役割と名前 |
| --- | --- |
| 見出し | `heading`「添付ファイル」 |
| ファイルを選ぶ欄 | ラベル「画像を添付」（`accept` で画像だけ）。選んだらすぐ送る |
| 画像 | `img`。`alt` はファイルの名前。`src` は `…/content`（302 でストレージへ） |
| 消すボタン | `button`「（ファイルの名前） を消す」 |
| 知らせ | 「「…」を添付しました」「「…」を消しました」（第45章の `role="status"`） |

npm scripts に `worker`・`s3`（`node test/support/mini-s3.ts`）・`mail`（`node test/support/fake-smtp.ts`）を足します。

テストは、第11部の 89 個はそのまま通り、次を足します。

| 層 | 確かめること |
| --- | --- |
| 単体（`test/unit/jobs.test.ts`） | タイムゾーンでの日付、孤児の掃除、メールの仕事（2回送らない・5xx はやり直さない） |
| 契約（`test/contract/blob-store.test.ts`） | `BlobStore` の約束を、メモリの偽物と S3（練習用の S3）の両方に |
| HTTP（`test/http/deploy.test.ts`） | 2.3〜2.8節の動き。2台のサーバでの SSE も |
| 画面（`web/test/attachments.test.tsx`） | 一覧・添付・消す |
| E2E（`e2e/attachment.spec.ts`） | 画面から画像を添付して表示され、消すと消える。ほかの人の添付の URL は 404。E2E の API は `STATIC_DIR` で画面も配る（本番と同じ形） |

### 2.11 デプロイの設定

| ファイル | 中身 |
| --- | --- |
| `render.yaml` | Render の Blueprint。web（独自ドメイン、`TRUST_PROXY=1`、`healthCheckPath: /readyz`、`preDeployCommand` でマイグレーション）・worker・keyvalue（`noeviction`）・PostgreSQL。秘密の値は `sync: false` か `generateValue` |
| `.github/workflows/deploy.yml` | `main` に入ったら、CI と同じ確かめと `docker build` の後で、Render のデプロイフックを呼び、`scripts/wait-for-version.ts` で新しい版が動くまで待つ（第62章 7節） |
| `.github/workflows/ci.yml` | `api`・`e2e` のジョブに Redis のサービスを足す |
| `.github/dependabot.yml` | `docker`（Dockerfile のベースのイメージ）を足す |

---

## 3. 作り方のヒント

### 3.1 足す順番

| 順 | 足すもの | 確かめ方 |
| --- | --- | --- |
| 1 | 設定（2.2節）と Redis の接続（`src/redis.ts`） | `npm test` で第11部の 89 個が通る（Redis を動かしておく） |
| 2 | メールを列に（2.4節） | 第10部のメールのテスト（登録・再設定）が、そのまま通る |
| 3 | 添付（2.3節） | `deploy.test.ts` の 46〜50 |
| 4 | 毎朝のお知らせ・掃除（2.5節） | 51 と単体テスト |
| 5 | Pub/Sub（2.6節） | 52 |
| 6 | 動かす人のためのルート・本番の設定・画面を配る（2.7・2.8節） | 53〜57 |
| 7 | 画面・E2E・Docker・デプロイの設定 | 4節 |

「メールを列に」を先にするのは、**今あるテストを壊さずに中身を取り替える**練習になるからです。偽の SMTP サーバに届くまで少し遅れるだけで、テストからは同じに見えます。

### 3.2 Redis の接続は役目ごとに分ける

node-redis の接続は、Pub/Sub の待ち受け（`subscribe`）を始めると、ほかのコマンドを送れなくなります（第34章 6節）。BullMQ のワーカーは、仕事を待つ間、接続をふさぎます。そこで、役目ごとに接続を分けます。

| 接続 | 使う所 |
| --- | --- |
| main | 知らせを流す（`publish`）、送ったメールを覚える、`/readyz` の `PING` |
| subscriber | 知らせを待つ（`subscribe`） |
| queue | 仕事を入れる（BullMQ の `Queue`） |
| worker（inline のときだけ） | 仕事を待つ（BullMQ の `Worker`） |

BullMQ 6.5 は、node-redis の接続をそのまま受け取れます（第64章 5節）。

### 3.3 添付のルートは、タスクのルーターより前に

添付のルートは、`app.use('/api/tasks', 添付のルーター)` を、タスクのルーターより**前**に置き、ルートにはパスの形を全部書きます（`'/:taskId/attachments'`）。こうすると、`/metrics` のルートの名前が `/api/tasks/:taskId/attachments` になります。`app.use('/api/tasks/:taskId/attachments', …)` と書くと、Express の `req.baseUrl` には本物の id が入った `/api/tasks/12/attachments` が残り、ルートの名前に id が混ざります（ラベルの組が増え続ける。第66章 練習問題6）。

ボディは `express.raw({ type: () => true, limit })` で、`Content-Type` に関わらずバイトのまま受け取ります。種類は中身で決めるので、ヘッダで絞りません。

### 3.4 署名付き URL の入口

`docker compose` で動かすと、アプリから見たストレージは `http://s3:9800`（コンテナの名前）、ブラウザから見たストレージは `http://127.0.0.1:9801` です。署名付き URL は、**ブラウザが使う名前**で作らないと、署名の `Host` が合いません（第63章 4節）。そこで、`createS3BlobStore` は、置く・消す・一覧のための client（`S3_ENDPOINT`）と、署名付き URL を作るための client（`S3_PUBLIC_ENDPOINT`）を別に作ります。本番の R2 や S3 では、2つは同じです。

### 3.5 E2E で本番と同じ形を確かめる

第11部の E2E は、画面を Vite の開発サーバで配っていました。第12部では、`npm run build` した `web/dist` を `STATIC_DIR` で API から配り、**本番と同じ1つのオリジン**で動かします。`playwright.config.ts` の `webServer` で、練習用の S3（9495）・API（9496。起動の前に `web/` をビルド）・偽の SMTP（9497・9498）を起動します。

つまずきやすい所（執筆の環境で、実際に失敗したもの）:

| 失敗 | 理由と直し方 |
| --- | --- |
| 画面のどのページも 500 | `res.sendFile` に相対パスを渡していた。`createStaticSite(dir)` の中で `path.resolve(dir)` する |
| ダウンロードしたファイルの名前が `download` になる | Chromium のヘッドレスでは、`filename*` の名前が ASCII でないと、こうなった。E2E のファイルの名前は `wall.png` にした（日本語の名前は HTTP のテストで `Content-Disposition` を確かめる） |
| SSE のテスト（第10部の 18）が失敗 | 2.6節で、イベントの `id` に台ごとの頭を付けたため。テストの期待する `id` の形を直した |
| `/version` がいつも `dev` | Dockerfile の `ARG APP_VERSION=dev` が、Render の `RENDER_GIT_COMMIT` より先に使われていた。`ARG APP_VERSION=` を空にし、設定で「`APP_VERSION` → `RENDER_GIT_COMMIT` → `dev`」の順に使う |

---

## 4. 確かめ方

### 4.1 テスト

```sh
$ (cd ~/dev/part06 && docker compose up -d --wait)   # PostgreSQL と Redis
$ npm run check               # tsc → ESLint → Prettier → 113 個のテスト
$ (cd web && npm run check)   # tsc → ESLint → 37 個のテスト
$ npm run e2e                 # 4 個
```

| どこで | 数 | 中身 |
| --- | --- | --- |
| `test/unit/` | 29 | 第11部の 25 個と、仕事の 4 個 |
| `test/contract/` | 25 | `TaskRepo` の 19 個と、`BlobStore` の約束 3 個 × 2（メモリ・S3） |
| `test/http/` | 57 | 第11部の 45 個と、`deploy.test.ts` の 12 個（46〜57） |
| `web/test/` | 37 | 第11部の 34 個と、添付の 3 個 |
| `e2e/` | 4 | 第11部の 2 個と、添付の 2 個 |

テストのサーバは、空いているポートで起動します（`freePort()`）。練習用の S3 もテストの中で空いているポートに起動し、Redis のキーの頭（`QUEUE_PREFIX`）はサーバごとのスキーマの名前にして、終わったら消します。`npm run coverage` は、執筆の環境では行の 95% でした。

### 4.2 本番と同じ形を手元で動かす

```sh
$ docker compose up -d --build --wait     # 初めてはイメージを作るので数分かかる
$ docker compose ps --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}'
SERVICE   STATUS                    PORTS
app       Up 11 seconds (healthy)   127.0.0.1:9803->9490/tcp
db        Up 13 seconds (healthy)   5432/tcp
mail      Up 13 seconds             127.0.0.1:9802->8025/tcp
redis     Up 13 seconds (healthy)   6379/tcp
s3        Up 13 seconds             127.0.0.1:9801->9800/tcp
worker    Up 5 seconds              9490/tcp
```

| オプション | 意味 |
| --- | --- |
| `--build` | 起動の前にイメージを作り直す（コードを変えたら付ける） |
| `--wait` | ヘルスチェックが healthy になるまで待ってから終わる |
| `--format 'table …'` | 出す列を選ぶ（第61章 9節） |

動いたら、外から確かめます（執筆の環境での出力）。

```sh
$ curl -s http://127.0.0.1:9803/version
{"version":"compose"}
$ curl -s http://127.0.0.1:9803/readyz
{"status":"ready","checks":{"database":"ok","redis":"ok","storage":"ok"}}
$ curl -sI http://127.0.0.1:9803/ | grep -i cache-control
Cache-Control: no-cache
$ curl -sI http://127.0.0.1:9803/assets/index-28m3ToBB.js | grep -i cache-control    # 名前は / の HTML の中から探す
Cache-Control: public, max-age=31536000, immutable
$ curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:9803/metrics
401
```

ブラウザで `http://127.0.0.1:9803` を開き、登録してみます。確認のメールは、app が列に入れ、**worker のコンテナ**が送ります。

```sh
$ docker compose logs worker --no-log-prefix | tail -1
{"level":30,…,"process":"worker","job":"send-mail","jobId":"4","result":"sent","msg":"仕事が終わりました"}
```

届いたメールは `http://127.0.0.1:9802/api/messages` で見られます。リンクの頭は `APP_URL`（`http://127.0.0.1:9803`）です。確認してログインし、タスクに画像を添付して、表示されることを確かめます。

> compose では `NODE_ENV=development` で動かしています。本番（`production`）の Cookie は `__Host-sid`・`Secure` なので、http の `127.0.0.1` ではブラウザが送らず、ログインできないためです。本番の設定の確かめは、テストの 55（必須の設定）と 57（プロキシの後ろの Cookie）でしています。

終わったら止めます。

```sh
$ docker compose down        # 止めてコンテナを消す（データベースの中身は残る）
$ docker compose down -v     # データベースの中身（ボリューム）も消す
```

---

## 5. 公開する（読むだけでもよい）

**執筆の環境からは、ここに書いた手順を動かせませんでした。** Render・Cloudflare・GitHub の説明に基づく手順です。画面の名前・料金・無料の範囲は変わるので、必ず各サービスの公式のドキュメントで確認してください。お金がかかるものは、終わったら消します（第62章 10節）。

### 5.1 用意するもの

| もの | 例 | 章 |
| --- | --- | --- |
| PaaS | Render（Blueprint で app・worker・Key Value・PostgreSQL をまとめて作る） | 第62章 8節 |
| オブジェクトストレージ | Cloudflare R2（S3 互換。外へ出す通信の料金がかからない） | 第63章 9節 |
| メール送信サービス | SMTP で送れるもの。送信元のドメインの SPF・DKIM を設定する | 第53章 8節 |
| ドメイン | レジストラで買ったもの。ここでは `example.com` と書く | 第62章 5節 |

### 5.2 手順

1. **ストレージ**: R2 でバケット `task-files` と、そのバケットだけを読み書きできる API トークン（アクセスキー）を作る。CORS は要らない（ブラウザは署名付き URL で GET するだけで、`fetch` で読まない）
2. **Render**: ダッシュボードの「New → Blueprint」で、`render.yaml` のあるリポジトリを選ぶ。`sync: false` の値（`S3_ENDPOINT`・S3 の鍵・SMTP）を入れる。最初のデプロイが終わったら `https://task-app.onrender.com/readyz` のような Render の URL で 200 を確かめる
3. **独自ドメイン**: `render.yaml` の `domains`（`app.example.com`）を自分のものに変える。レジストラの DNS に、Render が示す `CNAME`（`app` → `task-app.onrender.com` のような名前）を足す。Render が証明書を取るまで待つ（第62章 5節）
4. **確かめる**

```sh
$ dig +short app.example.com                 # Render の名前とアドレスが返る（第5章 5節）
$ curl -sI http://app.example.com/ | head -3  # https へ 301 か 308
$ curl -sI https://app.example.com/ | grep -i -E 'strict-transport|cache-control'
$ curl -s https://app.example.com/version     # デプロイしたコミット
```

5. **デプロイを自動に**: Render の各サービスの Settings から Deploy Hook の URL を取り、GitHub の Settings → Environments → `production` の Secrets に `RENDER_DEPLOY_HOOK_URL`・`RENDER_WORKER_DEPLOY_HOOK_URL` として入れる。`main` に入れると `deploy.yml` が動き、テスト → デプロイ → `/version` が新しいコミットになるまで待つ

### 5.3 うまく動かないとき

| 症状 | 確かめること |
| --- | --- |
| 起動してすぐ終わる（終了コード 1） | Render のログの最初の1行。足りない設定の名前が書いてある（2.2節） |
| `/readyz` が 503 | 答えの `checks` で、どれが `error` か。ストレージなら `S3_ENDPOINT` とバケットの名前、鍵の権限 |
| ログインしても、すぐログアウトされる | `TRUST_PROXY=1` か。無いと、プロキシからの http を見て `Secure` の Cookie を付けない（テストの 57） |
| 画像が出ない | ブラウザの DevTools の Console で CSP のエラーが無いか（`img-src` に R2 の入口のオリジン）。Network で `…/content` が 302 になっているか |
| メールが届かない | worker のログに `send-mail` の失敗が無いか。5xx なら設定の間違い（やり直さない）、4xx ならやり直している途中 |
| 毎朝のお知らせが来ない | `DIGEST_TZ`。サーバの時計は UTC なので、タイムゾーンを書かないと 9 時間ずれる |

---

## 6. 運用の点検表

公開した後に、第60章 9節の点検表と合わせて確かめます。

| 項目 | 確かめ方 |
| --- | --- |
| 秘密の値がリポジトリに無い | `git log -p` の中に、`dev-only-…` 以外の鍵やパスワードが無い（`git log -p > /tmp/log.txt` してから、エディタで `secret`・`password`・`token` を探す） |
| 秘密の値を取り替えられる | `SESSION_SECRET` を変えてデプロイすると、全員がログインし直しになる（それで済む）ことを知っている（第60章 6節） |
| 止めずに入れ替わる | デプロイの間、`~/dev/part12/ch62-cloud-deploy` で `node samples/poll.ts https://app.example.com/version` を動かし、失敗が 0 のまま版が変わる（第62章 6節） |
| 見張っている | `/metrics` を読む仕組み（第66章 8節）か、少なくとも外からの死活監視が `/healthz` を見ている |
| エラーを探せる | 500 の応答の `errorId` で、ログの1行を探せる |
| 消したタスクの画像が残らない | 掃除の仕事のログに `deleted` の数が出ている |
| お金 | 使っていないサービス・データベースを消した |

## 7. もっとやるなら

- **画像を縮める仕事**: 添付したら、列に「サムネイルを作る」仕事を入れ、ワーカーで小さな画像を作って別のキーに置く（画像の処理のパッケージが要る）
- **ブラウザから直接置く**: 署名付き URL の PUT（第63章 4節）で、API を通さずにストレージへ置き、置き終わったら API に知らせる。大きなファイルで API のメモリを使わない
- **回数の制限を Redis に**: 第11部までの回数の制限はメモリなので、台ごとに数えている。第34章の `INCR` の版にすると、全部の台で1つの数になる
- **CDN を前に置く**: Cloudflare などの CDN を前に置き、`/assets/` を CDN で覚えさせる（第65章 9節）
- **ステージング**: `render.yaml` に、もう1組（`staging`）を足し、`main` の前に確かめる場所を作る

## 8. Python で作るなら

| この成果物 | Python（Flask） |
| --- | --- |
| BullMQ と Redis | Celery（Redis か RabbitMQ）、RQ。決まった時刻の仕事は Celery beat |
| `@aws-sdk/client-s3`・署名付き URL | boto3 の `generate_presigned_url` |
| `/metrics` | `prometheus_client`（`prometheus-flask-exporter`） |
| `trust proxy` | Werkzeug の `ProxyFix`（`x_for=1, x_proto=1`） |
| Dockerfile | 同じ考え方。本番のサーバは `flask run` ではなく Gunicorn |
| Redis の Pub/Sub で SSE を全部の台に | 同じ。Flask-SSE は Redis を使う |
| Render の Blueprint | 同じ（`runtime: python` か Docker） |

## 9. 次の部へ

第13部は総合演習です。ここまでの部では、タスク管理アプリに機能を足していきました。第13部では、新しい題材（会議室の予約）を、要件と設計（第67章）から始め、作り（第68・69章）、公開の準備をして振り返る（第70章）までを、模範解答と一緒に1回通します。この部の `Dockerfile`・`compose.yaml`・`render.yaml`・デプロイのワークフローは、第13部の土台と第70章で、そのまま出発点に使います。

---

前: [第66章 監視とパフォーマンス](../ch66-monitoring/README.md) ／ 第12部の目次: [../README.md](../README.md) ／ 次: [第13部 総合演習](../../part13-capstone/README.md)
