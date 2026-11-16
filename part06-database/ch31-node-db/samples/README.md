# 第31章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [quote.mjs](quote.mjs) | 値を SQL に書き込むと `'` で壊れること、`?` と `$名前` で渡すと壊れないこと | 1.1 |
| [row-map.mjs](row-map.mjs) | 行（`due_date`）をタスク（`dueDate`）に変換する `toTask` | 2.1 |
| [task-repo.mjs](task-repo.mjs) | 部品: `createSqliteTaskRepo(db)`。第5部と同じ形（`list`・`get`・`insert`・`update`・`remove`）のリポジトリ | 3.1 |
| [repo-try.mjs](repo-try.mjs) | リポジトリを試す（`expectedVersion`、知らない項目） | 3.1 |
| [with-transaction.mjs](with-transaction.mjs) | 部品: `withTransaction(db, fn)` | 4.1 |
| [tx.mjs](tx.mjs) | `withTransaction` を試す（途中の失敗で、全部取り消される） | 4.1 |
| [migrations.mjs](migrations.mjs) | 部品: `MIGRATIONS` と `migrate(db)`（`PRAGMA user_version`） | 5.1 |
| [migrate-try.mjs](migrate-try.mjs) | ファイルのデータベース `app.db` にマイグレーションをかける | 5.1 |
| [sqlite-errors.mjs](sqlite-errors.mjs) | 部品: `statusForDbError(err)`。制約のエラーを 409・422 に | 6.1 |
| [db-errors.mjs](db-errors.mjs) | どの制約で断られたかを、`errcode` で見分ける | 6.1 |
| [server.mjs](server.mjs) | タスクを `tasks.db` に保存する Express の API（ポート 9427） | 7.1 |

## 部品

| ファイル | 内容 |
| --- | --- |
| [task-db.mjs](task-db.mjs) | `createTaskDb()`: メモリの中に、`tasks` と5つのタスクを作って返す（本文0節の表） |

## 動かし方

`~/dev/part06/ch31-node-db` で動かします。

```sh
$ cd ~/dev/part06/ch31-node-db
$ node samples/quote.mjs
$ node samples/migrate-try.mjs     # 今いるフォルダに app.db を作る
$ node samples/server.mjs          # 今いるフォルダに tasks.db を作る。Ctrl+C で止める
```

- `server.mjs` は、ポート 9427 で待ちます。別のターミナルから `curl -s http://127.0.0.1:9427/api/tasks` で試します
- `server.mjs` のデータベースのファイルは、環境変数 `TASKS_DB` で変えられます（例: `TASKS_DB=other.db node samples/server.mjs`）
- `app.db`・`tasks.db` は、消してかまいません（消すと、空のデータベースから作り直します）
