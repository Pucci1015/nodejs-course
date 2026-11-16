# 第33章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [schema.mjs](schema.mjs) | 部品: Drizzle のスキーマ（`tasks`・`tags`・`taskTags` と relations） | 2.1 |
| [drizzle.config.js](drizzle.config.js) | drizzle-kit の設定（`samples/` の中を指している。本文で書くものは章のフォルダに置く） | 3.1 |
| [drizzle/](drizzle/) | `drizzle-kit generate` で作ったマイグレーション（`0000_create_tasks.sql` と `meta/`） | 3.1 |
| [db.mjs](db.mjs) | 部品: `db`・`closeDb()`・`DATABASE_URL`（データベース ch33）。`SQL_LOG=1` で SQL を表示 | 4.1 |
| [seed.mjs](seed.mjs) | 5つのタスクと2つのタグを入れ直す。`insert`・`returning`・`db.execute` | 4.1 |
| [queries.mjs](queries.mjs) | `select`・`where`・`orderBy`・`count`・`update`・`toSQL()` | 4.2 |
| [relations.mjs](relations.mjs) | N+1 と、JOIN・`db.query` の `with` での直し方。SQL の回数を数える | 5.1 |
| [tx.mjs](tx.mjs) | `db.transaction`・`tx.rollback()`・`err.cause` | 6.1 |
| [drizzle-task-repo.mjs](drizzle-task-repo.mjs) | 部品: `createDrizzleTaskRepo(db)`。第31・32章と同じ形のリポジトリ | 7.1 |
| [pg-errors.mjs](pg-errors.mjs) | 部品: 第32章 7節と同じ `PG`・`statusForPgError(err)` | 7.2 |
| [server.mjs](server.mjs) | タスクの API の Drizzle 版（ポート 9447） | 7.2 |

## 動かし方

先に、PostgreSQL を動かしておきます（`~/dev/part06` か、その中のフォルダで）。

```sh
$ cd ~/dev/part06/ch33-orm-drizzle
$ docker compose up -d --wait
$ npx drizzle-kit migrate --config samples/drizzle.config.js   # samples/drizzle/ のマイグレーションで表を作る
$ node samples/seed.mjs
$ node samples/queries.mjs
```

- `--config samples/drizzle.config.js` は、使う設定のファイルを指定するオプションです。付けないと、今のフォルダの `drizzle.config.js`（本文3.1節で自分で書いたもの）が読まれます。
- 本文3節で自分の `drizzle/` から表をもう作ってあれば、`migrate` は要りません（`samples/server.mjs` も、起動のときに `samples/drizzle/` を当てようとしますが、表がもうあれば何もしません）。
- 表を全部消して最初からやり直すときは `docker compose exec postgres psql -U app -d ch33 -c 'DROP TABLE IF EXISTS task_tags, tags, tasks; DROP SCHEMA IF EXISTS drizzle CASCADE'` を動かします（`drizzle` のスキーマには、済んだマイグレーションの記録があります）。
- つなぎ先は、環境変数 `DATABASE_URL` で変えられます。
