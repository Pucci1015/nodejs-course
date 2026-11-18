# 第11部の成果物 完成例（`task-api` パッケージと `web/`）

要件とヒントは [../README.md](../README.md) にあります。第10部の完成例（API と画面）に、層ごとのテスト（単体・契約）・E2E・ESLint と Prettier の整備・GitHub Actions を足したものです。アプリの動きは、第10部から変えていません。

| ファイル・フォルダ                                                       | 中身                                                                                                                                                                             |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [package.json](package.json)、[package-lock.json](package-lock.json)     | 第10部のものに、`@playwright/test`・`prettier`・`eslint-config-prettier`・`eslint-plugin-regexp` と、scripts（`format`・`format:check`・`test:unit`・`coverage`・`e2e`）を足した |
| [tsconfig.json](tsconfig.json)                                           | 第10部と同じ設定で、`include` に `e2e` と `playwright.config.ts` を足した                                                                                                        |
| [eslint.config.js](eslint.config.js)                                     | 第10部の設定に、eslint-plugin-regexp・eslint-config-prettier を足した。regexp のうち書き方の好みだけのルールは止めた                                                             |
| [.prettierrc.json](.prettierrc.json)、[.prettierignore](.prettierignore) | Prettier の設定（第59章 5節）と、整えないもの                                                                                                                                    |
| [playwright.config.ts](playwright.config.ts)                             | E2E の設定。偽の SMTP サーバ（9497・9498）・API（9495）・画面（9496）を起動する                                                                                                  |
| [e2e/](e2e/)                                                             | E2E のテスト（2 個）と道具                                                                                                                                                       |
| [.github/](.github/)                                                     | GitHub Actions のワークフロー（`ci.yml`）と Dependabot の設定                                                                                                                    |
| [mise.toml](mise.toml)                                                   | Node.js のバージョン                                                                                                                                                             |
| [.env.example](.env.example)                                             | 設定の例。第10部と同じ                                                                                                                                                           |
| [.gitignore](.gitignore)                                                 | 第10部のものに、`test-results/`・`playwright-report/`・`coverage/` を足した                                                                                                      |
| [migrations/](migrations/)                                               | マイグレーションの SQL。第10部と同じ                                                                                                                                             |
| [src/](src/)                                                             | API のコード。変えたのは、ESLint の指摘で直した正規表現1か所（`config.ts`、`// 変更（第11部）:`）と、Prettier で整えた見た目だけ                                                 |
| [test/](test/)                                                           | テスト。層ごとのフォルダ（`unit/`・`contract/`・`http/`）と道具（`support/`）に分けた。全部で 89 個                                                                              |
| [web/](web/)                                                             | 画面（`task-web` パッケージ）。`lint` に `--max-warnings 0` を付けたほかは、第10部と同じ（Prettier で整えた）                                                                    |

## 動かし方

PostgreSQL を先に動かします（第6部 第32章 2節）。

```sh
$ (cd ~/dev/part06 && docker compose up -d --wait)
$ cp -R ~/dev/part11/project-task-quality/solutions ~/dev/task-api-example11
$ cd ~/dev/task-api-example11
$ npm ci
$ npm run check            # tsc → ESLint → Prettier → 89 個のテスト
$ npm run coverage         # テストを動かして、src/ のカバレッジを表にする（行が 85% を下回ると失敗）
$ (cd web && npm ci && npm run check)   # 画面: tsc → ESLint → 34 個のテスト
$ npx playwright install chromium       # E2E のブラウザ（1回だけ）
$ npm run e2e              # E2E（2 個）。web/ の npm ci が先に要る
```

- `npm run e2e` は、データベース `taskapi` の中に、スキーマ `e2e` を毎回作り直します。開発で使う `public` のテーブルには触りません
- テストと E2E が使うポートは、9491〜9498 です。`npm run dev`（9490）と `web/` の `npm run dev`（5173）を動かしたままでも、ぶつかりません

## 作りの要点（第10部から変えた所）

- **テストを層で分けた**: `test/unit/`（データベースもサーバも要らない。0.2 秒ほど）、`test/contract/`（偽物と PostgreSQL のリポジトリに同じ約束を確かめる）、`test/http/`（サーバを起動して HTTP で確かめる。第10部の 45 個）。`npm run test:unit` で、単体テストだけを速く動かせます
- **偽物のリポジトリを、契約テストで本物とそろえた**: `test/support/memory-tasks.ts`（第8部の練習用の API のもの）は、`findOpenByTitle` が中のオブジェクトをそのまま返していました。契約テストの「返したタスクを書き換えても、覚えているものは変わらない」で見つかったので直しました（`// 修正（第11部）:`）
- **E2E は「準備は API、確かめたいことは画面」**: 通しの流れ（登録 → メール → 確認 → ログイン → 作る → ログアウト）は1つのテストで画面から。「別の人に見えない」のテストは、準備（2人の登録と alice のタスク）を API で済ませ、bob の画面だけを操作します
- **CI は3つのジョブ**: `api`（PostgreSQL のサービスつき）と `web` は同時に、両方が通ったら `e2e`。どれも `npm ci --ignore-scripts` で入れ、`npm audit --omit=dev --audit-level=high` で本番のパッケージの重い脆弱性を見ます

## テストが確かめないこと

- GitHub の上で、ワークフローが本当に動くか。執筆の環境からは GitHub で動かせなかったので、YAML として正しく読めることと、各ジョブのコマンドが手元（Node.js 24.22、PostgreSQL 16）で通ることだけを確かめました。自分のリポジトリに push して、Actions のタブで確かめてください（[../README.md](../README.md) の 5節）
- メールの見た目・本番の Cookie・練習用の IdP でのログインの画面の流れ（第10部と同じ。IdP は `test/http/auth.test.ts` で API だけを確かめています）
