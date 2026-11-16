# 第32章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [schema.sql](schema.sql) | psql に流し込んで、`tasks` を作り直す SQL（5つのタスク入り） | 3.1 |
| [db.mjs](db.mjs) | 部品: `createPool()`・`DATABASE_URL`。`date` を文字列で受け取る設定 | 4.1 |
| [first-pg.mjs](first-pg.mjs) | `pool.query` と `$1`、`rows`・`rowCount`、`pool.end()` | 4.1 |
| [types.mjs](types.mjs) | PostgreSQL の型が JavaScript の何になるか。`date` の1日ずれる落とし穴 | 4.2 |
| [pool.mjs](pool.mjs) | プールの接続の数と待ち。`pool.connect()` と `release()` | 5.2 |
| [with-transaction.mjs](with-transaction.mjs) | 部品: `withTransaction(pool, async (client) => …)` | 6.1 |
| [pg-tx.mjs](pg-tx.mjs) | `withTransaction` でポイントを移す | 6.1 |
| [lock.mjs](lock.mjs) | 同時に数を増やすと合わなくなること。`n = n + 1` と `FOR UPDATE` | 6.2 |
| [pg-errors.mjs](pg-errors.mjs) | 部品: `PG`（エラーコード）と `statusForPgError(err)` | 7.1 |
| [errors-try.mjs](errors-try.mjs) | エラーの `code`・`constraint`・`column` を見る | 7.1 |
| [migrate.mjs](migrate.mjs) | 部品: `migrate(pool, dir)`。`migrations/` の SQL のファイルを順に動かす。単独でも動く | 8.1 |
| [migrations/](migrations/) | マイグレーションの SQL のファイル（3つ） | 8.1 |
| [pg-task-repo.mjs](pg-task-repo.mjs) | 部品: `createPgTaskRepo(db)`。第31章と同じ形のリポジトリ | 8.2 |
| [server.mjs](server.mjs) | タスクを PostgreSQL に保存する Express の API（ポート 9437） | 8.3 |

## 動かし方

先に、PostgreSQL を動かしておきます（`~/dev/part06` か、その中のフォルダで）。

```sh
$ cd ~/dev/part06/ch32-docker-postgres
$ docker compose up -d --wait
$ docker compose exec -T postgres psql -U app -d app < samples/schema.sql   # tasks を作り直す
$ node samples/first-pg.mjs
```

- `server.mjs` と `migrate.mjs` は、マイグレーションで `tasks` を作ります。`schema.sql` で作った `tasks` が残っていると `relation "tasks" already exists` で失敗するので、先に `docker compose exec postgres psql -U app -d app -c 'DROP TABLE tasks'` で消します（本文8.1節）
- 逆に、マイグレーションで作った後に `schema.sql` を流すと、`tasks` は作り直されますが、`schema_migrations` は残ります。最初からやり直すときは `docker compose exec postgres psql -U app -d app -c 'DROP TABLE IF EXISTS tasks, schema_migrations'` で両方消します
- つなぎ先は、環境変数 `DATABASE_URL` で変えられます
