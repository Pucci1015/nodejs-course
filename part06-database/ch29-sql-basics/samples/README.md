# 第29章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [first-db.mjs](first-db.mjs) | メモリの中のデータベースに、テーブルを作り、行を足して読む | 2.1 |
| [file-db.mjs](file-db.mjs) | ファイル（`visits.db`）に保存する。動かすたびに行が増える | 2.2 |
| [select.mjs](select.mjs) | `WHERE`・`ORDER BY`・`LIMIT`・`IS NULL`・`LIKE` で選ぶ | 3.1 |
| [change.mjs](change.mjs) | `INSERT`・`UPDATE`・`DELETE` と `?`、`changes`・`lastInsertRowid` | 4.1 |
| [constraints.mjs](constraints.mjs) | `NOT NULL`・`UNIQUE`・`CHECK`・`DEFAULT` で、間違ったデータを断る | 5.1 |
| [foreign-key.mjs](foreign-key.mjs) | 外部キーと `ON DELETE CASCADE`、`PRAGMA foreign_keys = ON` | 6.2 |

## 部品

| ファイル | 内容 |
| --- | --- |
| [books.mjs](books.mjs) | `createBooksDb()`: メモリの中に、10 冊の `books` テーブルを作って返す（`select.mjs`・`change.mjs` が使う。中身は読まなくてよい） |

## 動かし方

`~/dev/part06/ch29-sql-basics` で動かします。

```sh
$ cd ~/dev/part06/ch29-sql-basics
$ node samples/select.mjs
$ node samples/file-db.mjs        # 今いるフォルダに visits.db を作る
```

- サーバは動かしません。どれも、結果を出して終わります
- `file-db.mjs` が作る `visits.db` は、消してかまいません（消すと、数え直しになります）
