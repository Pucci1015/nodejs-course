# 第29章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part06/ch29-sql-basics/exercises/` で行います。最初に `cd exercises` で移動してください（`cd ~/dev/part06/ch29-sql-basics/exercises` と打っても構いません）。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | SELECT で選ぶ | [select-queries.mjs](select-queries.mjs)、[select-queries.test.mjs](select-queries.test.mjs) | 3 |
| 2 | 基本 | INSERT・UPDATE・DELETE で変える | [change-queries.mjs](change-queries.mjs)、[change-queries.test.mjs](change-queries.test.mjs) | 4 |
| 3 | 基本 | 制約のあるテーブルを作る | [create-table.mjs](create-table.mjs)、[create-table.test.mjs](create-table.test.mjs) | 5 |
| 4 | 基本 | 1つの表を分ける（調べる問題） | このページ | 6 |
| 5 | 応用 | `?` を使って本を足す・探す関数 | [book-store.mjs](book-store.mjs)、[book-store.test.mjs](book-store.test.mjs) | 2, 3, 4 |
| 6 | 応用 | タスク管理のテーブルを外部キーでつなぐ | [schema.mjs](schema.mjs)、[schema.test.mjs](schema.test.mjs) | 5, 6 |
| 7 | 発展 | タスクを SQLite に保存する CLI | [todo-db.mjs](todo-db.mjs)、[todo-db.test.mjs](todo-db.test.mjs) | 2〜4 |
| 8 | 発展 | 一覧と更新の関数のバグを直す | [buggy-report.mjs](buggy-report.mjs)、[buggy-report.test.mjs](buggy-report.test.mjs) | 3, 4 |

**発展**（7・8）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

- 問題4以外は、`○○.mjs` の「ここを書く」を埋め（問題8はバグを直し）、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。最初は、どのテストもすべて失敗します。
- 問題1〜3・6は、SQL を JavaScript の文字列（`` `…` ``）の中に書きます。`-- ここを書く` の行は、SQL のコメント（`--` から行の終わりまで）なので、消して SQL を書いてください。
- 問題1・2の SQL は、テストの前に [run-query.mjs](run-query.mjs) で試せます。`node run-query.mjs select-queries.mjs unread` のように、ファイルと名前を渡すと、そのファイルの中の SQL を `books` に投げて、結果を表で見せます。
- `books` のテーブルは、どのテストでも、本文3節の 10 冊から始まります（[books.mjs](books.mjs)。書き換えなくてよいファイルです）。

---

## 基本

### 問題1 SELECT で選ぶ

[select-queries.mjs](select-queries.mjs) に、`books` から選ぶ SELECT を4つ書いてください（本文3節）。

| 名前 | 選ぶもの | 取り出す列 | 並べ方・数 |
| --- | --- | --- | --- |
| `unread` | 未読（`read_at` が無い）の本 | `title` | `title` の順 |
| `recent` | 2020 年以降に出た本 | `title`、`year` | 新しい順に 3 冊 |
| `aboutSql` | `title` に `SQL` を含む本 | `id`、`title` | `id` の順 |
| `thickTech` | `genre` が `tech` で、`pages` が 300 以上の本 | `title`、`pages` | `pages` の多い順 |

```sh
$ node run-query.mjs select-queries.mjs recent
┌─────────┬────────────────┬──────┐
│ (index) │ title          │ year │
├─────────┼────────────────┼──────┤
│ 0       │ 'SQL の練習帳' │ 2024 │
│ 1       │ 'Node.js 入門' │ 2023 │
│ 2       │ 'Web の仕組み' │ 2022 │
└─────────┴────────────────┴──────┘
$ node --test select-queries.test.mjs
ℹ pass 4
ℹ fail 0
```

ヒント:

- 本文の `select.mjs` の3つの SELECT と同じ形です。
- 「2020 年以降」は 2020 を含みます（`>=`）。
- 「無い」は `IS NULL` です。`= NULL` では1冊も選ばれません。

### 問題2 INSERT・UPDATE・DELETE で変える

[change-queries.mjs](change-queries.mjs) に、`books` を変える SQL を4つ書いてください（本文4節）。値は SQL の中に直接書きます（`?` は使いません）。

| 名前 | すること |
| --- | --- |
| `addBook` | 題名 `庭づくり`、著者 `eve`、2026 年、150 ページ、ジャンル `hobby` の本を足す（`read_at` と `rating` は書かない） |
| `markRead` | id が 2 の本の `read_at` を `'2026-11-01'` にする |
| `rateRead` | 読み終わっていて（`read_at` がある）、`rating` が無い本の `rating` を 3 にする |
| `removeOld` | 1990 年より前に出た本を消す |

```sh
$ node run-query.mjs change-queries.mjs removeOld
{ changes: 2, lastInsertRowid: 10 }
実行した後の books:
…（id 4 と 9 の無い表）
$ node --test change-queries.test.mjs
ℹ pass 4
ℹ fail 0
```

ヒント:

- `run-query.mjs` は、変える SQL のときに、変わった行の数（`changes`）と、変えた後の表を見せます。
- 文字列は `'…'` で囲み、数は囲みません。
- `rateRead` は、条件が2つです（`AND`）。「ある」は `IS NOT NULL` です。

### 問題3 制約のあるテーブルを作る

会員のテーブル `members` を作る `CREATE TABLE` を、[create-table.mjs](create-table.mjs) の `createMembers` に書いてください（本文5節）。

| 列 | 型 | 決まり |
| --- | --- | --- |
| `id` | 整数 | 主キー（値を渡さなければ自動で付く） |
| `email` | 文字列 | 必ずある。同じ値の会員を2人作れない |
| `name` | 文字列 | 必ずある。1〜20 文字 |
| `age` | 整数 | 無くてもよい。あれば 0 以上 |
| `plan` | 文字列 | 必ずある。`free` か `pro`。渡さなければ `free` |

```sh
$ node --test create-table.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- 本文の `constraints.mjs` の `users` テーブルに、`age` を足したものです。
- `CHECK (age >= 0)` は、`age` が `NULL` のときは通ります（`NULL` との比べは「分からない」になり、`CHECK` は「偽」のときだけ断るため）。だから「無くてもよい、あれば 0 以上」は、これだけで書けます。

### 問題4 1つの表を分ける（調べる問題）

ある本屋の注文を、1つの表で記録していました。

| order_id | ordered_at | customer_name | customer_email | book_title | book_price | quantity |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-11-01 | alice | alice@example.com | はじめての SQL | 2400 | 1 |
| 1 | 2026-11-01 | alice | alice@example.com | 星の図鑑 | 1800 | 2 |
| 2 | 2026-11-03 | bob | bob@example.com | はじめての SQL | 2400 | 1 |
| 3 | 2026-11-05 | alice | alice@example.com | パンの教科書 | 1500 | 1 |

次の問いに、文章で答えてください（本文6節）。

1. alice のメールアドレスが変わりました。この表では、何行を直す必要がありますか。1行だけ直し忘れると、何が起きますか。
2. 「はじめての SQL」の値段が 2600 円に変わりました。過去の注文の行の `book_price` も 2600 に直してよいでしょうか。直すと何が困りますか。
3. まだ一度も注文していないお客さんや、まだ一度も売れていない本は、この表に書けますか。
4. この表を、`customers`・`books`・`orders`・`order_items` の4つのテーブルに分けます。それぞれのテーブルの列を書き、どの列が主キーで、どの列が外部キーかを示してください。2. の答えを踏まえて、値段をどこに持つかも決めてください。

---

## 応用

### 問題5 `?` を使って本を足す・探す関数

[book-store.mjs](book-store.mjs) に、`books` を使う関数を4つ作ってください（本文2〜4節）。どの関数も、1つ目の引数にデータベース（`createBooksDb()` が返したもの）を受け取ります。値は必ず `?` で渡してください。

| 関数 | すること | 返すもの |
| --- | --- | --- |
| `addBook(db, { title, author, year, pages, genre })` | 本を1冊足す | 足した本の id（数） |
| `findByAuthor(db, author)` | その著者の本を、`year` の古い順に | `[{ id, title, year }, …]`（ふつうのオブジェクトの配列。無ければ `[]`） |
| `markRead(db, id, date)` | その本の `read_at` を `date` にする | 変えたら `true`、その id が無ければ `false` |
| `countUnread(db)` | 未読の冊数を数える | 数 |

```sh
$ node --test book-store.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- 本文の `change.mjs` と `file-db.mjs` の書き方を使います。`run` の結果の `lastInsertRowid` と `changes`、`get()` で1行だけ受け取る、などです。
- `lastInsertRowid` は `Number(…)` で数にします。
- `all()` の行は「プロトタイプの無いオブジェクト」です。`map((row) => ({ ...row }))` で、ふつうのオブジェクトに写します（`...row` は、`row` の項目を全部、新しいオブジェクトに入れる書き方。第3部 第11章）。
- テストには、題名に `'` が入った本（`eve's garden`）を足すものがあります。`?` で渡していれば、何もしなくても通ります。

### 問題6 タスク管理のテーブルを外部キーでつなぐ

[schema.mjs](schema.mjs) の `schema` に、4つのテーブルを作る SQL を書いてください（本文5・6節）。テストは、`PRAGMA foreign_keys = ON` をしてから、この SQL を `db.exec` で実行します。

| テーブル | 列と決まり |
| --- | --- |
| `users` | `id`（主キー）、`email`（必ずある、同じ値は不可） |
| `tasks` | `id`（主キー）、`user_id`（必ずある、`users.id` を指す。人が消えたらタスクも消える）、`title`（必ずある、1〜100 文字）、`status`（必ずある、`todo`・`doing`・`done` のどれか、既定は `todo`） |
| `tags` | `id`（主キー）、`name`（必ずある、同じ値は不可） |
| `task_tags` | `task_id`（`tasks.id` を指す）と `tag_id`（`tags.id` を指す）。どちらも必ずある。2つの組が主キー。タスクかタグが消えたら、その組も消える |

```sh
$ node --test schema.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- 本文の `foreign-key.mjs`（`REFERENCES …`・`ON DELETE CASCADE`）と、6.3節（組の主キー `PRIMARY KEY (task_id, tag_id)`）を合わせます。
- 4つの `CREATE TABLE` を `;` で区切って、1つの文字列に並べます。
- `tasks` は `users` を指すので、`users` より後に作ります。

---

## 発展

### 問題7 タスクを SQLite に保存する CLI

[todo-db.mjs](todo-db.mjs) に、タスクを SQLite のファイルに保存するコマンドを作ってください（本文2〜4節、第3部 第16章）。データベースのファイルは、環境変数 `TODO_DB` があればその名前、無ければ今いるフォルダの `todo.db` です。

| コマンド | 標準出力 | 終了コード |
| --- | --- | --- |
| `node todo-db.mjs add 題名` | `追加しました: 番号 題名` | 0 |
| `node todo-db.mjs list` | 番号の順に `[ ] 番号 題名`（終わったものは `[x]`）。1つも無ければ `タスクはありません` | 0 |
| `node todo-db.mjs done 番号` | `完了にしました: 番号` | 0 |
| `node todo-db.mjs rm 番号` | `消しました: 番号` | 0 |

- `done`・`rm` で、その番号のタスクが無ければ、標準エラー出力に `タスク 番号 はありません` と出し、終了コード 1
- コマンドが無い・知らない、`add`・`done`・`rm` の後ろに何も無いときは、標準エラー出力に `使い方: …` で始まる説明を出し、終了コード 2
- テーブルが無ければ作る。何回動かしても、前のタスクが残っている

```sh
$ node todo-db.mjs add 牛乳を買う
追加しました: 1 牛乳を買う
$ node todo-db.mjs add 本を返す
追加しました: 2 本を返す
$ node todo-db.mjs done 1
完了にしました: 1
$ node todo-db.mjs list
[x] 1 牛乳を買う
[ ] 2 本を返す
$ node todo-db.mjs rm 9; echo $?
タスク 9 はありません
1
$ node --test todo-db.test.mjs
ℹ pass 7
ℹ fail 0
```

ヒント:

- 本文の `file-db.mjs`（`CREATE TABLE IF NOT EXISTS`）と `change.mjs`（`run` の `changes`）を使います。「無い番号」は、`changes` が 0 かで分かります。
- 終了コードは `process.exitCode = 数` で決めます（第3部 第16章）。
- 最後に `db.close()` で閉じます。途中で `return` する所があるので、`try { … } finally { db.close(); }` にすると、閉じ忘れません。
- テストは、一時フォルダの `todo.db` を使います。自分で試すときにできた `todo.db` は、いらなければ消してかまいません。

### 問題8 一覧と更新の関数のバグを直す

[buggy-report.mjs](buggy-report.mjs) の6つの関数には、合わせて 6 か所のバグがあります。次の仕様に合わせて直してください（本文3・4節）。

| 関数 | 仕様 |
| --- | --- |
| `unreadTitles(db)` | 未読の本の題名の配列を、id の順に |
| `newestFirst(db, limit)` | `{ id, title, year }` を新しい順に `limit` 冊。同じ年なら id の小さい順 |
| `techOrScience(db, minPages)` | `genre` が `tech` か `science` で、`pages` が `minPages` 以上の本の id の配列（id の順） |
| `page(db, n, size)` | id の順に並べて、`n` ページ目（1 から数える）の id の配列。1 ページは `size` 冊 |
| `addBook(db, book)` | 本を1冊足し、id を返す |
| `markAuthorRead(db, author, date)` | その著者の、まだ読んでいない本の `read_at` を `date` にし、変えた冊数を返す |

```sh
$ node --test buggy-report.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- 本文3.1節の表の注意（`NULL` の比べ方、`AND` と `OR`、`LIMIT … OFFSET …`）と、4.1節の注意（`WHERE` の付け忘れ）を読み直してください。
- `?` には、前から順に値が入ります。列の並びと値の並びが合っているかを確かめます。
- テストが失敗したら、`node run-query.mjs "SQL"` で、関数の中の SQL を直接試すと、どこが違うかが分かります。
