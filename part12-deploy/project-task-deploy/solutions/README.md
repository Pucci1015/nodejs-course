# 第12部の成果物 完成例（`task-api` パッケージと `web/`）

要件とヒントは [../README.md](../README.md) にあります。第11部の完成例（API と画面）に、画像の添付・メールの仕事の列とワーカー・毎朝のお知らせ・Redis を通した SSE・動かす人のためのルート・本番の設定・Docker とデプロイの設定を足したものです。

| ファイル・フォルダ                                                                                             | 中身                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [package.json](package.json)、[package-lock.json](package-lock.json)                                           | 第11部のものに、`@aws-sdk/client-s3`・`@aws-sdk/s3-request-presigner`・`bullmq`・`redis` と、scripts（`worker`・`s3`・`mail`）を足した |
| [tsconfig.json](tsconfig.json)                                                                                 | 第11部の設定で、`include` に `scripts` を足した                                                                                        |
| [eslint.config.js](eslint.config.js)、[.prettierrc.json](.prettierrc.json)、[.prettierignore](.prettierignore) | 第11部と同じ                                                                                                                           |
| [Dockerfile](Dockerfile)、[.dockerignore](.dockerignore)                                                       | 本番のイメージ（4つの段階: 画面のビルド → 本番のパッケージ → 確かめる → 本番）                                                         |
| [compose.yaml](compose.yaml)                                                                                   | 本番と同じ形（app・worker・PostgreSQL・Redis・S3・メール）を手元で動かす                                                               |
| [render.yaml](render.yaml)                                                                                     | Render の Blueprint（Render では動かしていない）                                                                                       |
| [playwright.config.ts](playwright.config.ts)                                                                   | E2E の設定。練習用の S3（9495）・API と画面（9496）・偽の SMTP サーバ（9497・9498）を起動する                                          |
| [e2e/](e2e/)                                                                                                   | E2E のテスト（4 個）と道具                                                                                                             |
| [.github/](.github/)                                                                                           | `ci.yml`（Redis を足した）・`deploy.yml`（新しく足した）・Dependabot の設定                                                            |
| [scripts/](scripts/)                                                                                           | `wait-for-version.ts`（デプロイの後で、新しい版が動くまで待つ）                                                                        |
| [mise.toml](mise.toml)                                                                                         | Node.js のバージョン                                                                                                                   |
| [.env.example](.env.example)                                                                                   | 設定の例。第12部の設定を足した                                                                                                         |
| [.gitignore](.gitignore)                                                                                       | 第11部と同じ                                                                                                                           |
| [migrations/](migrations/)                                                                                     | マイグレーションの SQL。`005_create_attachments.sql`・`006_create_digest_log.sql` を足した                                             |
| [src/](src/)                                                                                                   | API とワーカーのコード。足した所・変えた所に `// 追加（第12部）:`・`// 変更（第12部）:`                                                |
| [test/](test/)                                                                                                 | テスト。全部で 113 個（単体 29・契約 25・HTTP 57）                                                                                     |
| [web/](web/)                                                                                                   | 画面（`task-web` パッケージ）。タスクのページに添付ファイルの節を足した（テスト 37 個）                                                |

## 動かし方

PostgreSQL と Redis を先に動かします（第6部 第32章 2節）。

```sh
$ (cd ~/dev/part06 && docker compose up -d --wait)
$ cp -R ~/dev/part12/project-task-deploy/solutions ~/dev/task-api-example12
$ cd ~/dev/task-api-example12
$ npm ci
$ npm run check            # tsc → ESLint → Prettier → 113 個のテスト
$ (cd web && npm ci && npm run check)   # 画面: tsc → ESLint → 37 個のテスト
$ npx playwright install chromium       # E2E のブラウザ（第11部で入れていれば、すぐ終わる）
$ npm run e2e              # E2E（4 個）。web/ をビルドしてから始まる
```

開発のサーバとして動かすときは、別々のターミナルで、練習用の S3 と偽の SMTP サーバも動かします。

```sh
$ npm run s3               # http://127.0.0.1:9800
$ npm run mail             # SMTP 1025、届いたメールは http://127.0.0.1:8025/api/messages
$ npm run dev              # API（9490）。WORKER_MODE=inline なので、ワーカーも中で動く
$ (cd web && npm run dev)  # 画面（5173）
```

本番と同じ形をコンテナで動かすときは、[../README.md](../README.md) の 4.2節です（`docker compose up -d --build --wait` → `http://127.0.0.1:9803`）。

- テストは、サーバも練習用の S3 も空いているポートで起動します。E2E のポートは 9495〜9498 です。`npm run dev`（9490）・`npm run s3`（9800）・`npm run mail`（1025・8025）・`docker compose`（9801〜9803）を動かしたままでも、ぶつかりません
- テストと E2E が使う Redis のキーは、頭がスキーマの名前（`test_…`・`e2e`）なので、開発の `taskapp:…` には触りません

## 作りの要点（第11部から変えた所）

- **組み立ては `src/server.ts` だけ**: Redis の接続（役目ごとに3つ、inline なら4つ）、`createS3BlobStore`、`createJobQueue`、`createEventBus`、`createMetrics` を作って、`createApp` に渡します。サービス（`src/services/tasks.ts`）は第7部から変えていません。`publish` に渡す関数を「その台のハブ」から「Redis に流す」に替えただけで、2台で動くようになりました
- **ファイルの置き場所は `BlobStore` の形（`src/storage/blob-store.ts`）で隠す**: ルートとワーカーは S3 を知りません。テストの偽物（`test/support/memory-blob-store.ts`）と S3 の版に、同じ契約テスト（`test/contract/blob-store.test.ts`）を動かしています
- **メールは列に入れるだけ**: `deliver` が `jobs.enqueueMail` に変わっただけで、認証のサービス（`src/services/auth.ts`）は第10部のままです。送れなければワーカーがやり直し、5xx ならやめます
- **ワーカーの入口は2つ**: `WORKER_MODE=inline` なら `server.ts` の中で、`separate` なら `src/worker.ts` で、同じ `startJobWorker` を動かします
- **止めるときの順番**: SSE を閉じて受け付けをやめる（`server.close`）→ ワーカー（処理中の仕事を終える）→ Pub/Sub → 列 → Redis → ストレージの client → データベース。後ろのものほど、前のものが使うので、後で閉じます

## テストが確かめないこと

- Render・Cloudflare R2・メール送信サービス・独自ドメイン・GitHub Actions の上で本当に動くか。執筆の環境からは動かせなかったので、`render.yaml`・`deploy.yml` は YAML として読めることと、中のコマンドが手元（Node.js 24.22、PostgreSQL 16、Redis 7）で通ることだけを確かめました
- `compose.yaml` は、執筆の環境の Docker で `docker compose up -d --build --wait` し、`/readyz`・`/version`・画面の `Cache-Control`・登録のメールがワーカーのコンテナから届くことを確かめました（[../README.md](../README.md) の 4.2節）。Apple Silicon の Mac では動かしていません（イメージは CPU に合わせて作られるので、同じように動くはずです。第61章 8節）
- 本番の HTTPS の後ろでの Cookie は、`X-Forwarded-Proto: https` を付けたテスト（57）で確かめただけです
