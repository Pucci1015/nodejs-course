# 第31章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part06/ch31-node-db/exercises/` で行います。最初に `cd exercises` で移動してください（`cd ~/dev/part06/ch31-node-db/exercises` と打っても構いません）。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 値を `?` で渡して探す | [find-tasks.mjs](find-tasks.mjs)、[find-tasks.test.mjs](find-tasks.test.mjs) | 1.1 |
| 2 | 基本 | 並べ方を許可リストで選ぶ | [order-by.mjs](order-by.mjs)、[order-by.test.mjs](order-by.test.mjs) | 1.2 |
| 3 | 基本 | マイグレーションを足す | [add-migration.mjs](add-migration.mjs)、[add-migration.test.mjs](add-migration.test.mjs) | 5 |
| 4 | 基本 | 安全な書き方を見分ける（調べる問題） | このページ | 1, 2, 4 |
| 5 | 応用 | リポジトリにメソッドを足す | [task-repo.mjs](task-repo.mjs)、[task-repo.test.mjs](task-repo.test.mjs) | 2, 3 |
| 6 | 応用 | 何件もまとめて「全部か、何もしないか」 | [bulk-tasks.mjs](bulk-tasks.mjs)、[bulk-tasks.test.mjs](bulk-tasks.test.mjs) | 4 |
| 7 | 応用 | 制約のエラーを、分かる文にする | [db-problem.mjs](db-problem.mjs)、[db-problem.test.mjs](db-problem.test.mjs) | 6 |
| 8 | 発展 | ETag と If-Match で守るタスクの API | [task-app.mjs](task-app.mjs)、[task-app.test.mjs](task-app.test.mjs) | 3, 6, 7 |
| 9 | 発展 | リポジトリのバグを直す | [buggy-repo.mjs](buggy-repo.mjs)、[buggy-repo.test.mjs](buggy-repo.test.mjs) | 1〜4 |

**発展**（8・9）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

- 問題4以外は、`○○.mjs` の「ここを書く」を埋め（問題9はバグを直し）、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。最初は、どのテストもほぼすべて失敗します。
- テーブルは、どのテストでも、本文0節の5つのタスクから始まります（[task-db.mjs](task-db.mjs)。書き換えなくてよいファイルです）。
- [with-transaction.mjs](with-transaction.mjs)（本文4節）と [sqlite-errors.mjs](sqlite-errors.mjs)（本文6節）は、本文と同じ部品です。書き換えなくてよいファイルです。
- 関数を少し試したいときは、`node -e` で呼べます（`-e` は、続く文字列を JavaScript として動かすオプション）。

  ```sh
  $ node -e "import('./find-tasks.mjs').then(async (f) => { const { createTaskDb } = await import('./task-db.mjs'); console.log(f.findByStatus(createTaskDb(), 'todo')); })"
  ```

---

## 基本

### 問題1 値を `?` で渡して探す

[find-tasks.mjs](find-tasks.mjs) に、タスクを探す関数を4つ書いてください（本文1.1節）。どの関数も、値を `?` か `$名前` で渡します。SQL の文字列に `${…}` で値を書き込むと、テストの最後の1つが失敗します。

| 関数 | 返すもの |
| --- | --- |
| `findByStatus(db, status)` | `status` が同じタスクの `title` の配列（`id` の順） |
| `searchTitle(db, word)` | `title` に `word` を含むタスクの `{ id, title }` の配列（`id` の順）。`word` に `'` があっても動く |
| `dueBetween(db, from, to)` | `due_date` が `from` 以上 `to` 以下のタスクの `id` の配列（`due_date` の順、同じなら `id` の順） |
| `overdue(db, { date, limit })` | 終わっていなくて（`done` でない）、`due_date` が `date` より前のタスクの `title` の配列（`due_date` の順に、`limit` 個まで）。`$date` と `$limit` の名前で渡す |

```sh
$ node --test find-tasks.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- `searchTitle` は、本文の `quote.mjs` の「よい書き方」と同じ形です。`{ ...row }` で、ふつうのオブジェクトにして返します（第29章の解答と同じです）。
- `BETWEEN a AND b` は第30章 3.2節です。`LIMIT` にも `$limit` のように値を渡せます。
- `due_date` が `NULL` のタスクは、`<` や `BETWEEN` で比べると「分からない」になり、選ばれません（第29章 3.1節）。

### 問題2 並べ方を許可リストで選ぶ

一覧の API の `?sort=-dueDate` のような指定を、`ORDER BY` の後ろに書く文字列に直す関数 `orderByClause(sort)` と、それを使う `listIds(db, sort)` を、[order-by.mjs](order-by.mjs) に書いてください（本文1.2節）。

| `sort` | 戻り値 |
| --- | --- |
| `'dueDate'` | `'due_date ASC, id ASC'` |
| `'-createdAt'`（`-` が付くと大きい順） | `'created_at DESC, id ASC'` |
| `'title'` | `'title ASC, id ASC'` |
| `'id'`・`'-id'` | `'id ASC'`・`'id DESC'`（id のときは、後ろに id を付けない） |
| `undefined`（書かない） | `'id ASC'` |
| それ以外（`'owner'`・`'due_date'`・`'title desc'`・`''`・`'toString'` など） | `RangeError` を投げる |

`listIds(db, sort)` は、`` `SELECT id FROM tasks ORDER BY ${orderByClause(sort)}` `` で、全部のタスクの id を返します。

```sh
$ node --test order-by.test.mjs
ℹ pass 4
ℹ fail 0
```

ヒント:

- 使える名前は `id`・`title`・`dueDate`・`createdAt` の4つです。本文1.2節の `SORTABLE` の形の表を作ります。
- `sort.startsWith('-')` で `-` が付いているか、`sort.slice(1)` で `-` を除いた残りが分かります。
- 引数の既定値（`function f(sort = 'id')`）を使うと、`undefined` のときの値を決められます。
- `listIds` で `orderByClause` が投げた `RangeError` は、そのまま外に出てかまいません。

### 問題3 マイグレーションを足す

[add-migration.mjs](add-migration.mjs) には、本文5節の `MIGRATIONS`（手順 1〜3）と `migrate` が入っています。後ろに、手順を2つ足してください（本文5節）。1〜3 と `migrate` は書き換えません。

| 手順 | すること |
| --- | --- |
| 4 | `tasks` に `priority` の列を足す。整数で、`NULL` は許さず、書かなければ `2`。`1`〜`3` 以外は断る |
| 5 | `WHERE status = ? ORDER BY due_date` が、探すのにも並べるのにもインデックスを使えるように、インデックスを作る |

```sh
$ node --test add-migration.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- 手順4は1つの `ALTER TABLE … ADD COLUMN …` の文です。列の後ろに、`NOT NULL`・`DEFAULT`・`CHECK` を並べて書けます（第29章 5節、本文5.1節の注意）。
- 手順5は、第30章 3.2節の「複数の列のインデックス」です。`status` で絞った後、`due_date` の順に並んでいれば、並べ替えの手間が要りません。テストは、`EXPLAIN QUERY PLAN` に `USE TEMP B-TREE FOR ORDER BY`（並べ替えのための一時的な表）が出ないことを確かめます。
- テストは、版 3 まで進んだデータベースに行を入れてから、4・5 を足す場合も確かめます。

### 問題4 安全な書き方を見分ける（調べる問題）

次の (A)〜(F) は、どれも Web アプリのデータの層に書かれていたコードです。`req.query.word`・`req.query.sort`・`req.body` は、利用者が送ってきた値です。それぞれ「安全」か「危ない」かを答え、危ないものは、何が起きるかと、どう直すかを書いてください（本文1・2・4節）。

```js
// (A)
db.prepare(`SELECT * FROM tasks WHERE title LIKE '%${req.query.word}%'`).all();
// (B)
db.prepare('SELECT * FROM tasks WHERE title LIKE ?').all(`%${req.query.word}%`);
// (C)
db.prepare(`SELECT * FROM tasks ORDER BY ${req.query.sort}`).all();
// (D)
const col = { title: 'title', dueDate: 'due_date' }[req.query.sort] ?? 'id';
db.prepare(`SELECT * FROM tasks ORDER BY ${col}`).all();
// (E)
db.prepare('INSERT INTO tasks (title, due_date, created_at, updated_at) VALUES (?, ?, ?, ?)')
  .run(req.body.title, req.body.dueDate, new Date(), new Date());
// (F)
await withTransaction(db, async () => {
  const task = await repo.insert({ /* … */ });
  await repo.update(task.id, { /* … */ });
});
```

1. (A)〜(F) のそれぞれについて、「安全」か「危ない」かと、その理由。
2. (D) では、`{ … }[req.query.sort]` に、`req.query.sort` が `'toString'` のときは何が入りますか。それで困ることはありますか（`?? 'id'` の働きも考えてください）。
3. (A) を見つけたとき、「`'` を取り除いてから入れれば安全」という直し方は、なぜよくないのでしょうか。

---

## 応用

### 問題5 リポジトリにメソッドを足す

[task-repo.mjs](task-repo.mjs) は、本文3節のリポジトリです。ここに、メソッドを3つ足してください（本文2・3節）。どのメソッドも、タスクの形（`dueDate` などキャメルケース。本文の `toTask`）で返します。

| メソッド | 返すもの |
| --- | --- |
| `findByStatus(status)` | `status` が同じタスクの配列（`id` の順） |
| `countByStatus()` | `{ todo: 数, doing: 数, done: 数 }`。1つも無い status も `0` |
| `listPage({ limit, after })` | `id` が `after` より大きいタスクを `id` の順に `limit` 個と、次のページの `after` に渡す値。`{ items, nextAfter }`。次が無ければ `nextAfter` は `null`。1ページ目では `after` を書かない（`0` として扱う） |

```js
await repo.listPage({ limit: 2 });            // → { items: [タスク1, タスク2], nextAfter: 2 }
await repo.listPage({ limit: 2, after: 2 });  // → { items: [タスク3, タスク4], nextAfter: 4 }
await repo.listPage({ limit: 2, after: 4 });  // → { items: [タスク5], nextAfter: null }
```

```sh
$ node --test task-repo.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- `countByStatus` は、第30章 2節の `GROUP BY status` です。結果に出てこない status のために、先に `{ todo: 0, doing: 0, done: 0 }` を作っておき、そこに入れていきます。
- `listPage` は、第30章 6節の「`LIMIT` に欲しい数 + 1」です。カーソルは id だけなので、`WHERE id > ?` で足ります。
- メソッドの中では、`toTask`（同じファイルの上にあります）を `map` に渡して変換します。

### 問題6 何件もまとめて「全部か、何もしないか」

[bulk-tasks.mjs](bulk-tasks.mjs) に、2つの関数を書いてください。どちらも、本文4節の `withTransaction` を使います。

| 関数 | すること |
| --- | --- |
| `importTasks(db, titles, now)` | `titles`（題名の配列）のタスクを全部作り（`created_at`・`updated_at` は `now`、ほかは既定の値）、作った id の配列を返す。1つでも作れなければ、1つも作らずに例外。例外のメッセージには、何件目（1 から数える）で失敗したかを `2 件目` のように入れる |
| `completeMany(db, ids, now)` | `ids` のタスクを全部 `done` にし（`completed_at`・`updated_at` は `now`、`version` は 1 増やす）、変えた数を返す。無い id や、もう `done` のものが1つでもあれば、何も変えずに例外 |

```sh
$ node --test bulk-tasks.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- `withTransaction(db, () => { … })` の中では、`prepare` した文を直接使います（リポジトリの `async` のメソッドは使いません。本文4.1節）。
- 何件目かを知るには、`titles.map((title, i) => …)` の2つ目の引数 `i`（0 から数える）を使います。1つの INSERT を `try`・`catch` で囲み、`catch` で `throw new Error(…, { cause: err })` と投げ直せば、`withTransaction` が取り消してくれます。
- `completeMany` は、第30章 練習問題5の `completeTask` と同じく、`UPDATE … WHERE id = ? AND status <> 'done'` の `changes` が 0 なら例外にします。
- テストは、外側の `withTransaction` の中で2つの関数を呼び、外側が失敗したら、全部取り消されるかも確かめます。

### 問題7 制約のエラーを、分かる文にする

本文7節のサーバは、データベースのエラーを「ほかのデータとぶつかりました」のような、おおまかな文で返しました。[db-problem.mjs](db-problem.mjs) の `toProblem(err)` を、どの制約で断られたかで文を変えるように書いてください（本文6節）。

| エラー | 戻り値 |
| --- | --- |
| UNIQUE で、`err.message` に `tasks.title` を含む | `{ status: 409, detail: '同じ題名の、終わっていないタスクがあります' }` |
| UNIQUE（ほか）・PRIMARY KEY | `{ status: 409, detail: 'ほかのデータとぶつかりました' }` |
| CHECK で、`err.message` に `length(title)` を含む | `{ status: 422, detail: 'title は 1〜100 文字です' }` |
| CHECK で、`err.message` に `status IN` を含む | `{ status: 422, detail: 'status は todo・doing・done のどれかです' }` |
| CHECK（ほか） | `{ status: 422, detail: '送られた値が決まりに合いません' }` |
| NOT NULL（`err.message` は `NOT NULL constraint failed: tasks.列`） | `{ status: 422, detail: '列 は必ず送ってください' }`（`列` は、その列の名前。例: `title は必ず送ってください`） |
| 外部キー | `{ status: 422, detail: 'つながる先のデータがありません' }` |
| ほかのデータベースのエラー | `{ status: 500, detail: 'サーバの中でエラーが起きました' }` |
| データベースのエラーでない（`null`・`undefined` も） | `null` |

```sh
$ node --test db-problem.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- エラーの番号は、[sqlite-errors.mjs](sqlite-errors.mjs) の `SQLITE` にあります（`SQLITE.CONSTRAINT_UNIQUE` など）。本文の `statusForDbError` と同じく、`switch (err.errcode)` で分けます。
- 文字列を含むかは `err.message.includes('…')` で分かります。
- NOT NULL の列の名前は、正規表現 `/NOT NULL constraint failed: \w+\.(\w+)/` の `exec` で取り出せます（第4部 第18章）。`\w+` は英数字と `_` の並び、`\.` は `.` そのもの、`( … )` で囲んだ所が `m[1]` に入ります。
- PostgreSQL のエラーには、断った制約の名前が `err.constraint` として別に入っています。文の中から探さなくてよいので、第32章では、もっと確かに見分けられます。

---

## 発展

### 問題8 ETag と If-Match で守るタスクの API

[task-app.mjs](task-app.mjs) の `createTaskApp(db)` に、ルートを4つ足してください（本文6・7節、第5部 第25章）。本文の `server.mjs` は、ボディの `version` で上書きの事故を防ぎました。この問題では、第25章と同じく、`ETag` と `If-Match` のヘッダで防ぎます。ETag は、タスクの `version` を `"` で囲んだもの（version が 3 なら `"3"`）にします。

| ルート | 返すもの |
| --- | --- |
| `GET /api/tasks/:id` | 200 とタスク。`ETag` ヘッダ。無ければ 404 |
| `POST /api/tasks`（ボディ `{ title, dueDate }`） | 201 と作ったタスク。`Location: /api/tasks/id` と `ETag: "1"`。`title` が文字列でない・`dueDate` が文字列でも `null` でもない（書かないのは可）なら 422。題名が重なれば 409、長さが合わなければ 422（データベースの制約。エラーのミドルウェアが読み替える） |
| `PATCH /api/tasks/:id`（ボディ `{ title, status }` のどれか） | 無ければ 404。`If-Match` が無ければ 428、`"数"` の形でなければ 400、今の ETag と違えば 412。合えば変えて（`updatedAt` を今に、`version` を 1 増やし、`status` が `done` なら `completedAt` を今に、そうでなければ `null` に）、200 とタスクと新しい `ETag` |
| `DELETE /api/tasks/:id` | 無ければ 404。`If-Match` は PATCH と同じ（428・400・412）。合えば消して 204 |

エラーは、どれも Problem Details（`application/problem+json`）で返します。ファイルの下の方にあるエラーのミドルウェアは書いてあるので、`throw new HttpError(404, '…')` のように投げれば、その形で返ります。データベースの制約のエラーは、`throw` しなくても（そのまま例外が出れば）、ミドルウェアが 409・422 に読み替えます。

```sh
$ node --test task-app.test.mjs
ℹ pass 6
ℹ fail 0
```

自分で試すときは、`node task-app.mjs` で、ポート 9428 で動かせます（ファイルの最後の `if (import.meta.main)` は、「`node task-app.mjs` のように直接動かしたときだけ」の意味です。テストから `import` したときは、サーバを立てません）。

```sh
$ curl -i http://127.0.0.1:9428/api/tasks/2
$ curl -i -X PATCH -H 'content-type: application/json' -H 'If-Match: "1"' -d '{"status":"done"}' http://127.0.0.1:9428/api/tasks/2
```

`-i` は、応答のヘッダも出すオプションです。

ヒント:

- `If-Match` は `req.get('If-Match')` で読めます。`"3"` の形かは `/^"(\d{1,9})"$/` で確かめ、`m[1]` を `Number` にします。
- 404 → 428 → 400 → 412 の順に確かめます（無いタスクには、`If-Match` を確かめる前に 404）。確かめる所は、PATCH と DELETE で同じなので、関数にまとめると楽です。
- 確かめた後で、`repo.update(id, fields, { expectedVersion })` にも version を渡します。確かめてから変えるまでの間に、ほかの人が変えていたら、`null` が返るので 412 にします。
- 型の確かめ方は、本文の `server.mjs` の `mustBeString` と同じです。

### 問題9 リポジトリのバグを直す

[buggy-repo.mjs](buggy-repo.mjs) の `createBuggyRepo(db)` には、合わせて 5 か所のバグがあります。次の仕様に合わせて直してください（本文1〜4節）。

| メソッド | 仕様 |
| --- | --- |
| `findByTitle(title)` | 題名がちょうど `title` のタスク（いちばん小さい id のもの）。無ければ `null`。`'` を含む題名でも探せる |
| `insert({ title, dueDate, now })` | タスクを作り、タスクの形（`dueDate` などキャメルケース）で返す |
| `update(id, fields, { expectedVersion })` | `fields` の名前（`dueDate` などキャメルケース）の列を変え、変えた後のタスクを返す。知らない名前があれば例外。`expectedVersion` を渡されたら、今の version が同じときだけ変え、違えば `null` |
| `completeAll(ids, now)` | 全部を `done` にして数を返す。1つでも失敗したら、全部取り消して例外。失敗の後も、次の呼び出しが動く |

```sh
$ node --test buggy-repo.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- テストの失敗のメッセージ（`no such column`・`near "s": syntax error` など）が、どの節の話かを考えます。
- `update` のバグは2つあります。1つは本文3.1節の `column(key)`、もう1つは第30章 5節です。
- `completeAll` の `catch` で何が足りないかは、本文4.1節の `withTransaction` と比べると分かります。
