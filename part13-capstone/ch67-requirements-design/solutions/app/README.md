# room-booking — 会議室の予約（第13部 総合演習）

社内の会議室を、Web の画面から予約するアプリです。第13部の4つの章で、要件を決め、設計し、実装し、テストし、公開します。

このフォルダは、その出発点の**土台**です。第12部までに作ったタスク管理アプリから、タスク・添付ファイル・毎朝のお知らせ・冪等キー・SSE を取り除き、どの題材でも使う部分だけを残しました。

| 残したもの             | 中身                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| ログイン               | 登録・メールの確認・ログイン・ログアウト・パスワードの再設定・練習用の IdP（第10部） |
| 設定                   | `loadConfig`（本番で必須のものを名前だけ書いて止まる。第60章）                       |
| データベース           | PostgreSQL のプールとマイグレーション（第6部）。表はユーザーとセッションだけ         |
| 仕事の列               | BullMQ とワーカー。今はメールを送る仕事だけ（第64章）                                |
| 動かす人のためのルート | `/healthz`・`/readyz`・`/version`・`/metrics`（第60・66章）                          |
| 画面                   | ログイン・登録・確認・再設定のページと、最初のページ（`web/`）                       |
| テスト                 | API 25 個（単体 9・HTTP 16）、画面 14 個、E2E 1 個                                   |

## 動かし方

```sh
$ docker compose up -d --wait   # PostgreSQL（5434）と Redis（6381）
$ npm ci
$ npm run check                 # tsc → ESLint → Prettier → テスト
$ (cd web && npm ci && npm run check)
$ npm run e2e                   # 画面から通すテスト（Chromium）
```

開発のサーバは、3つのターミナルで動かします。

```sh
$ npm run mail                  # 偽の SMTP サーバ（1025）。届いたメールは http://127.0.0.1:8025/api/messages
$ npm run dev                   # API（http://127.0.0.1:9900）。ワーカーも中で動く
$ (cd web && npm run dev)       # 画面（http://localhost:5174）
```

| ポート     | 使うもの                            |
| ---------- | ----------------------------------- |
| 9900       | 開発の API                          |
| 5174       | 開発の画面（Vite）                  |
| 5434・6381 | `compose.yaml` の PostgreSQL・Redis |
| 1025・8025 | 偽の SMTP サーバ                    |
| 9906〜9908 | E2E                                 |
| テスト     | 空いているポート（`freePort`）      |

| ファイル・フォルダ                                                                                                                       | 中身                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [src/](src/)                                                                                                                             | API のコード                                    |
| [migrations/](migrations/)                                                                                                               | マイグレーションの SQL                          |
| [test/](test/)                                                                                                                           | API のテスト                                    |
| [e2e/](e2e/)                                                                                                                             | 画面から通すテスト                              |
| [web/](web/)                                                                                                                             | 画面                                            |
| [compose.yaml](compose.yaml)                                                                                                             | 開発とテストの PostgreSQL・Redis                |
| [playwright.config.ts](playwright.config.ts)                                                                                             | E2E の設定                                      |
| [.env.example](.env.example)                                                                                                             | 設定の例（`cp .env.example .env`）              |
| [package.json](package.json)・[tsconfig.json](tsconfig.json)・[eslint.config.js](eslint.config.js)・[.prettierrc.json](.prettierrc.json) | パッケージ・TypeScript・ESLint・Prettier の設定 |
| [mise.toml](mise.toml)                                                                                                                   | Node.js のバージョン                            |
