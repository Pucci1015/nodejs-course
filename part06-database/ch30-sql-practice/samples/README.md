# 第30章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [join.mjs](join.mjs) | `JOIN`・`LEFT JOIN`、多対多を2回の JOIN でつなぐ | 1.1 |
| [group.mjs](group.mjs) | `GROUP BY`・`count`・`sum`・`coalesce`・`HAVING` | 2.1 |
| [index.mjs](index.mjs) | 20 万行の表で、インデックスの有り無しの速さと `EXPLAIN QUERY PLAN` を比べる | 3.1 |
| [transaction.mjs](transaction.mjs) | `BEGIN`・`COMMIT`・`ROLLBACK` で、ポイントを「全部か、何もしないか」で移す | 4.1 |
| [version-lock.mjs](version-lock.mjs) | `WHERE version = ?` と `RETURNING` で上書きを防ぐ。`ON CONFLICT DO NOTHING` で冪等キー | 5.1 |
| [keyset.mjs](keyset.mjs) | `(due_date, id) > (?, ?)` で、最後に見た行の続きからページを読む | 6.1 |

## 部品

| ファイル | 内容 |
| --- | --- |
| [tasks-db.mjs](tasks-db.mjs) | `createTasksDb()`: メモリの中に、users・tasks・tags・task_tags と少しのデータを作って返す（本文0節の表。`index.mjs`・`transaction.mjs` 以外が使う） |

## 動かし方

`~/dev/part06/ch30-sql-practice` で動かします。

```sh
$ cd ~/dev/part06/ch30-sql-practice
$ node samples/join.mjs
$ node samples/index.mjs        # 20 万行を作るので、数秒かかる
```

- サーバは動かしません。どれも、結果を出して終わります
- どれもメモリの中のデータベースを使うので、ファイルは作りません
