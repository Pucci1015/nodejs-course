# 第6部の成果物 完成例（`task-api` パッケージ）

要件とヒントは [../README.md](../README.md) にあります。第5部の完成例（`part05-express/project-task-api/solutions`）から、データの層を PostgreSQL に替えたものです。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [package.json](package.json)、[package-lock.json](package-lock.json) | `npm start`・`npm run dev`・`npm run migrate`・`npm test`。第5部のパッケージに `pg` を足した |
| [mise.toml](mise.toml) | Node.js のバージョン |
| [.env.example](.env.example) | 設定の例。`.env` にコピーして使う。`DATABASE_URL` を足した |
| [.gitignore](.gitignore) | `node_modules/` と `.env` をコミットしない |
| [migrations/](migrations/) | 第6部: マイグレーションの SQL |
| [src/](src/) | API のコード |
| [test/](test/) | 外から HTTP で確かめるテスト（30 個） |

## 動かし方

PostgreSQL を先に動かします（第32章 2節）。データベース `taskapi` は、`compose.yaml` が最初に作ってあります。

```sh
$ cd ~/dev/part06 && docker compose up -d --wait
$ cp -R ~/dev/part06/project-task-api/solutions ~/dev/task-api-example6
$ cd ~/dev/task-api-example6
$ npm ci             # package-lock.json のとおりに入れる
$ cp .env.example .env
$ npm start          # 起動のときにマイグレーションを動かす。http://127.0.0.1:9460/api/tasks
$ npm test           # 30 個のテスト（127.0.0.1:9461 と 9462 を使う）
```

- 中身を見るときは `docker compose exec postgres psql -U app -d taskapi -c 'SELECT id, title, status, version FROM tasks'` です（`docker compose` は `~/dev/part06` の中で打ちます）。
- 最初からやり直すときは `docker compose exec postgres psql -U app -d taskapi -c 'DROP TABLE IF EXISTS tasks, idempotency_keys, schema_migrations'` で表を消し、`npm start` で作り直します。

## 作りの要点（第5部から変えた所）

- **組み立ては server.mjs だけ**: `loadConfig` → pino → `createPool` → `migrate` → `createPgTaskRepo`・`createPgIdempotencyStore` → `createEventHub` → `createTaskService` → `sseRoute` → `createApp` → `listen`。替えたのは、データの層を作る所と、止めるときに `pool.end()` する所です
- **足したもの・変えたものの印**: 第6部で足した所は `// 追加（第6部）:`、変えた所は `// 変更（第6部）:` です
- **一覧は1つの SQL**: 絞り込み・並べ方・ページ分けを、`listPage` の1つの SQL（キーセット）にしました。第5部では、全部のタスクを読んでから JavaScript で並べ替えていました
- **同時に来ても正しい**: 版の確かめは `UPDATE … WHERE version = $n`、題名の重なりは部分ユニークインデックス、冪等キーは `INSERT … ON CONFLICT DO NOTHING` で、データベースが1つずつ決めます（テスト 26・27・29）
- **起動のときにマイグレーション**: アドバイザリロックつきなので、2台が同時に起動しても大丈夫です（テスト 29 は、同じデータベースのサーバを2台動かします）
- **変えていないもの**: ルートの層の大部分、サービスの決まり、SSE、回数の制限（メモリのまま）

## テストが確かめないこと

- ログの中身（秘密の値が書かれていないか）。テスト 30 は、データベースにつなげないときの URL だけを確かめます。`LOG_LEVEL=info npm start` で動かして、目で確かめてください
- 作業中（`doing`）の数の上限を、同時に超えようとしたとき（サービスが数えてから変えるまでの間に、ほかの人も変えられる。[../README.md](../README.md) の 5節）
- `SHUTDOWN_TIMEOUT_MS` の時間切れ
