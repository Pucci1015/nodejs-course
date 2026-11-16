# 第30章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part06/ch30-sql-practice/exercises/` で行います。最初に `cd exercises` で移動してください（`cd ~/dev/part06/ch30-sql-practice/exercises` と打っても構いません）。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | JOIN でつないで読む | [join-queries.mjs](join-queries.mjs)、[join-queries.test.mjs](join-queries.test.mjs) | 1 |
| 2 | 基本 | GROUP BY で数える・足す | [group-queries.mjs](group-queries.mjs)、[group-queries.test.mjs](group-queries.test.mjs) | 2 |
| 3 | 基本 | インデックスを作る | [index-sql.mjs](index-sql.mjs)、[index-sql.test.mjs](index-sql.test.mjs) | 3 |
| 4 | 基本 | 結果の行の数を予想する（調べる問題） | このページ | 1, 2 |
| 5 | 応用 | タスクを終わらせて記録を残す（トランザクション） | [complete-task.mjs](complete-task.mjs)、[complete-task.test.mjs](complete-task.test.mjs) | 4 |
| 6 | 応用 | カーソルでページを分ける関数 | [keyset-page.mjs](keyset-page.mjs)、[keyset-page.test.mjs](keyset-page.test.mjs) | 6 |
| 7 | 発展 | 上書きと二重作成を防ぐ関数 | [safe-update.mjs](safe-update.mjs)、[safe-update.test.mjs](safe-update.test.mjs) | 4, 5 |
| 8 | 発展 | 集計の関数のバグを直す | [buggy-report.mjs](buggy-report.mjs)、[buggy-report.test.mjs](buggy-report.test.mjs) | 1, 2 |

**発展**（7・8）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

- 問題4以外は、`○○.mjs` の「ここを書く」を埋め（問題8はバグを直し）、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。最初は、どのテストもほぼすべて失敗します。
- 問題1〜3は、SQL を JavaScript の文字列（`` `…` ``）の中に書きます。`-- ここを書く` の行は SQL のコメントなので、消して SQL を書いてください。
- 問題1・2の SQL は、テストの前に [run-query.mjs](run-query.mjs) で試せます。`node run-query.mjs join-queries.mjs openWithOwner` のように、ファイルと名前を渡すと、そのファイルの中の SQL を動かして、結果を表で見せます。`node run-query.mjs "SELECT …"` で、SQL を直接試すこともできます。
- テーブルは、どのテストでも、本文0節の users・tasks・tags・task_tags から始まります（[tasks-db.mjs](tasks-db.mjs)。書き換えなくてよいファイルです）。

---

## 基本

### 問題1 JOIN でつないで読む

[join-queries.mjs](join-queries.mjs) に、SELECT を3つ書いてください（本文1節）。

| 名前 | 選ぶもの | 取り出す列 | 並べ方 |
| --- | --- | --- | --- |
| `openWithOwner` | 終わっていない（`status` が `done` でない）タスクと、その持ち主 | タスクの `title`、人の `name` | タスクの `id` の順 |
| `usersWithoutTasks` | タスクを1つも持っていない人 | `name` | 決めなくてよい |
| `tagsOfTask4` | タスク 4（報告書を書く）に付いているタグ | タグの `name` | `name` の順 |

```sh
$ node run-query.mjs join-queries.mjs tagsOfTask4
┌─────────┬────────┐
│ (index) │ name   │
├─────────┼────────┤
│ 0       │ '仕事' │
│ 1       │ '急ぎ' │
└─────────┴────────┘
$ node --test join-queries.test.mjs
ℹ pass 4
ℹ fail 0
```

ヒント:

- `openWithOwner` は、本文の `join.mjs` の1つ目とほぼ同じです。取り出す列だけが違います。
- `usersWithoutTasks` は、本文1.2節の最後の形です。テストは、タスクを全部消した人も出るかを確かめます。
- `tagsOfTask4` は、`task_tags` と `tags` の2つをつなげば足ります（`tasks` は要りません）。

### 問題2 GROUP BY で数える・足す

[group-queries.mjs](group-queries.mjs) に、SELECT を3つ書いてください（本文2節）。

| 名前 | 1行に出すもの | 出す人・タグ | 並べ方 |
| --- | --- | --- | --- |
| `countByUser` | `name` と、その人の全部のタスクの数 `n` | タスクのある人だけ（dave は出なくてよい） | 人の `id` の順 |
| `minutesByUser` | `name` と、その人の終わっていない（todo か doing の）タスクの `minutes` の合計 `minutes` | 全員。タスクの無い人も、全部終わった人も `0` | 人の `id` の順 |
| `popularTags` | タグの `name` と、付いているタスクの数 `n` | 2つ以上のタスクに付いたタグだけ | `n` の多い順。同じなら `name` の順 |

```sh
$ node run-query.mjs group-queries.mjs minutesByUser
┌─────────┬─────────┬─────────┐
│ (index) │ name    │ minutes │
├─────────┼─────────┼─────────┤
│ 0       │ 'alice' │ 80      │
│ 1       │ 'bob'   │ 125     │
│ 2       │ 'carol' │ 135     │
│ 3       │ 'dave'  │ 0       │
└─────────┴─────────┴─────────┘
$ node --test group-queries.test.mjs
ℹ pass 4
ℹ fail 0
```

ヒント:

- `minutesByUser` は、本文の `group.mjs` の2つ目から、要る列だけを残した形です。テストは、全部のタスクを done にしても `0`（`null` ではない）になるかを確かめます。
- `popularTags` の「2つ以上」は、まとめた後の条件なので `HAVING` です。

### 問題3 インデックスを作る

[index-sql.mjs](index-sql.mjs) の `createIndexes` に、`CREATE INDEX` の文を書いてください（本文3節）。次の2つの SELECT が、どちらもインデックスを使う（`EXPLAIN QUERY PLAN` が `SCAN tasks` ではなく `SEARCH tasks USING … INDEX` になる）ようにします。

```sql
SELECT id FROM tasks WHERE user_id = ? AND status = ?
SELECT id FROM tasks WHERE due_date BETWEEN ? AND ?
```

- 1つ目は、`user_id` と `status` の**両方**でインデックスを使って絞ってください（計画に `(user_id=? AND status=?)` と出ます）。
- 文を2つ書くときは、それぞれの終わりに `;` を付けます。インデックスの名前は自由です。

```sh
$ node run-query.mjs "EXPLAIN QUERY PLAN SELECT id FROM tasks WHERE user_id = 1 AND status = 'todo'"
（インデックスを作る前なので、detail は 'SCAN tasks'）
$ node --test index-sql.test.mjs
ℹ pass 4
ℹ fail 0
```

ヒント:

- `run-query.mjs` は、毎回、インデックスの無いテーブルから始めます。作った後の計画は、テストの失敗のメッセージで見られます。
- 本文3.2節の「電話帳」の話を読み直してください。

### 問題4 結果の行の数を予想する（調べる問題）

次の SQL を動かす**前に**、結果が何行になるか、`count` の値が何になるかを、本文0節の表を見て予想し、理由を書いてください。予想を書いた後で、`node run-query.mjs "…"` で動かして確かめます（本文1・2節）。

```sql
-- (1)
SELECT u.name, t.title FROM users AS u JOIN tasks AS t ON t.user_id = u.id;
-- (2)
SELECT u.name, t.title FROM users AS u LEFT JOIN tasks AS t ON t.user_id = u.id;
-- (3)
SELECT t.title, g.name FROM tasks AS t LEFT JOIN task_tags AS tt ON tt.task_id = t.id LEFT JOIN tags AS g ON g.id = tt.tag_id;
-- (4)
SELECT u.name, count(*) AS a, count(t.id) AS b FROM users AS u LEFT JOIN tasks AS t ON t.user_id = u.id AND t.status = 'todo' GROUP BY u.id;
-- (5)
SELECT u.name, count(*) AS n FROM users AS u LEFT JOIN tasks AS t ON t.user_id = u.id WHERE t.status = 'todo' GROUP BY u.id;
```

1. (1) と (2) は、それぞれ何行ですか。1行の違いは、誰の行ですか。
2. (3) は何行ですか。タスクは 8 個なのに、8 行にならない理由を書いてください。
3. (4) で、`a` と `b` が違う値になる人は誰で、それぞれ何になりますか。
4. (5) は (4) と何が違い、結果の人数はどうなりますか。(4) と同じ結果にするには、どこを直しますか。

---

## 応用

### 問題5 タスクを終わらせて記録を残す（トランザクション）

[complete-task.mjs](complete-task.mjs) の `completeTask(db, id, at)` を書いてください（本文4節）。`EVENTS_SQL`（書いてあります）は、タスクに起きたことの記録の表 `task_events` を作ります。テストは、この表を作ってから関数を呼びます。

`completeTask(db, id, at)` は、次の2つを、**1つのトランザクションで**します。

1. タスク `id` の `status` を `'done'` にし、`version` を 1 増やす。
2. `task_events` に、`task_id` が `id`、`kind` が `'completed'`、`at` が引数の `at` の行を1つ足す。

- タスクが無いときと、もう `done` のときは、例外を投げ、何も変えない。
- 2. が失敗したら（テストは、`task_events` の表を消して失敗させます）、1. も取り消して、例外を投げる。
- 失敗した後も、次の `completeTask` が使える（トランザクションが開いたまま残らない）。

```sh
$ node --test complete-task.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- 本文4.1節の最後の「いつもの形」を使います。`catch` では `ROLLBACK` してから、受け取った例外を投げ直します。
- 「無い」と「もう done」は、`UPDATE … WHERE id = ? AND status <> 'done'` の `changes` が 0 かどうかで、まとめて分かります。0 なら `throw new Error('…')` で `catch` に飛ばします。

### 問題6 カーソルでページを分ける関数

[keyset-page.mjs](keyset-page.mjs) の `listByDueDate(db, { limit, after })` を書いてください（本文6節）。締め切り（`due_date`）のあるタスクを、締め切りの早い順（同じなら `id` の順）に、`limit` 個ずつ返します。

| 引数・戻り値 | 内容 |
| --- | --- |
| `limit` | 1ページの数 |
| `after` | 前のページの `next`。1ページ目では `null`（書かなければ `null`） |
| 戻り値 `items` | `{ id, title, dueDate }` の配列（列の名前 `due_date` を `dueDate` にする） |
| 戻り値 `next` | 次のページがあれば、このページの最後のタスクの `{ dueDate, id }`。無ければ `null` |

```js
listByDueDate(db, { limit: 3 });
// → { items: [{ id: 1, title: '牛乳を買う', dueDate: '2026-11-01' }, { id: 6, … }, { id: 4, … }],
//     next: { dueDate: '2026-11-10', id: 4 } }
listByDueDate(db, { limit: 3, after: { dueDate: '2026-11-10', id: 4 } });
// → items は id 2, 3, 7。next は { dueDate: '2026-12-01', id: 7 }
```

```sh
$ node --test keyset-page.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- 本文の `keyset.mjs` の2つの SELECT を使い、`after` が `null` かどうかで使い分けます。
- 「次のページがあるか」は、本文6.1節の最後の「`LIMIT` に欲しい数 + 1」で調べます。7 個を `limit: 7` で読むと、`next` は `null` です（空の2ページ目を作らない）。
- テストは、同じ締め切りのタスクを足しても、ページの境目で重ならず抜けないかも確かめます。

---

## 発展

### 問題7 上書きと二重作成を防ぐ関数

[safe-update.mjs](safe-update.mjs) に、2つの関数を書いてください（本文4・5節）。`KEYS_SQL`（書いてあります）は、冪等キーの表 `idempotency_keys` を作ります。

**`renameTask(db, id, title, expectedVersion)`**: タスクの題名を変える。

| 場合 | 戻り値 |
| --- | --- |
| タスクがあり、`version` が `expectedVersion` と同じ | 題名を変え、`version` を 1 増やし、`{ ok: true, task: { id, title, version } }`（変えた後の値） |
| タスクはあるが、`version` が違う | 何も変えず、`{ ok: false, reason: 'conflict' }` |
| タスクが無い | `{ ok: false, reason: 'not_found' }` |

**`createTaskOnce(db, key, { userId, title, minutes })`**: 冪等キー `key` を使って、タスクを1つ作る。

| 場合 | 戻り値 |
| --- | --- |
| 初めてのキー | タスクを作り、キーとタスクの id を `idempotency_keys` に覚え、`{ id, created: true }` |
| 前に使ったキー | 作らずに、そのとき作ったタスクの id で `{ id, created: false }` |

- タスクが作れなかったとき（テストは `minutes: 0` で `CHECK` に失敗させます）は、例外を投げ、キーも残さない（次に同じキーで、正しい値なら作れる）。

```sh
$ node --test safe-update.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- `renameTask` は、本文の `version-lock.mjs` の UPDATE をそのまま使えます。`get()` が `undefined` のときだけ、`SELECT 1 FROM tasks WHERE id = ?` で、無いのか version が違うのかを調べます（本文5.1節）。
- `RETURNING` で受け取った行は `[Object: null prototype]` なので、テストの `deepEqual` に合わせるには `{ ...行 }` でふつうのオブジェクトにします（第29章の解答と同じです）。
- `createTaskOnce` は、「キーを探す → 無ければタスクを作る（`INSERT … RETURNING id`）→ キーを覚える」を1つのトランザクションにします。前に使ったキーのときは、`COMMIT` してから返します（`BEGIN` したままにしない）。

### 問題8 集計の関数のバグを直す

[buggy-report.mjs](buggy-report.mjs) の4つの関数には、合わせて 5 か所のバグがあります。次の仕様に合わせて直してください（本文1・2節）。どの関数も、`{ name, … }` の配列（または名前の配列）を、人の `id` の順に返します。

| 関数 | 仕様 |
| --- | --- |
| `tasksPerUser(db)` | 全員の `{ name, n }`。`n` はタスクの数で、無い人は `0` |
| `openMinutes(db)` | 全員の `{ name, minutes }`。`minutes` は終わっていないタスクの `minutes` の合計で、無い人は `0` |
| `busyUsers(db, min)` | 終わっていないタスクが `min` 個以上ある人の `name` の配列 |
| `taggedMinutes(db)` | タグが1つ以上付いたタスクの `minutes` の合計 `{ name, minutes }`。そういうタスクのある人だけ。タグが2つあっても、そのタスクの `minutes` は1回だけ足す |

```sh
$ node --test buggy-report.test.mjs
ℹ pass 4
ℹ fail 0
```

ヒント:

- 本文2.2節の表（`WHERE` と `HAVING`、`count(*)` と `count(列)`）と、2.1節の `coalesce`、2.3節（JOIN で行が増える）を読み直してください。
- `openMinutes` には、バグが2つあります。1つ直すと、テストの失敗のメッセージが変わります。
- 関数の SQL を `node run-query.mjs "…"` で動かし、`GROUP BY` を外して、まとめる前の行を見ると、どこで数がずれるかが分かります。
