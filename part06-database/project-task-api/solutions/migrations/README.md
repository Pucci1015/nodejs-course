# migrations — マイグレーションの SQL

`src/db/migrate.mjs` が、名前の順に、まだのものだけを動かします（済んだものは表 `schema_migrations` に、ファイルの中身のチェックサムと一緒に覚えます）。サーバの起動のときにも動きます。

| ファイル | すること |
| --- | --- |
| [001_create_tasks.sql](001_create_tasks.sql) | 表 `tasks`、題名の部分ユニークインデックス `tasks_open_title`、並べ方ごとの索引 |
| [002_create_idempotency_keys.sql](002_create_idempotency_keys.sql) | 表 `idempotency_keys`（Idempotency-Key で覚えた応答） |

- 一度動かしたファイルは、書き換えません。書き換えると、起動のときに「動かした後で書き換えられています」で止まります。直したいときは、`003_….sql` を足します（第32章 8.1節）。
- 番号は 3 桁で 0 を埋めます（`010_` でも順番が崩れないように）。
