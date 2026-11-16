# migrations

第32章 8.1節の `migrate.mjs` が、名前の順に1回ずつ動かす SQL のファイルです。

| ファイル | 内容 |
| --- | --- |
| [001_create_tasks.sql](001_create_tasks.sql) | タスクのテーブル |
| [002_open_title_unique.sql](002_open_title_unique.sql) | 終わっていないタスクの題名が重ならない（部分インデックス） |
| [003_add_completed_at.sql](003_add_completed_at.sql) | `completed_at` の列を足す |

- 名前の先頭の数で順番が決まるので、新しいファイルは `004_…sql` のように、続きの数で足します
- 一度動かしたファイルは書き換えません（第31章 5節）
