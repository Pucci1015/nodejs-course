# 第33章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part06/ch33-orm-drizzle/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | コメントの表のスキーマを書く | [comments-schema.mjs](comments-schema.mjs)、[comments-schema.test.mjs](comments-schema.test.mjs) | 2 |
| 2 | 基本 | クエリビルダで探す | [builder-queries.mjs](builder-queries.mjs)、[builder-queries.test.mjs](builder-queries.test.mjs) | 4.2 |
| 3 | 基本 | あるものだけ条件を付ける | [list-query.mjs](list-query.mjs)、[list-query.test.mjs](list-query.test.mjs) | 4.2 |
| 4 | 基本 | Drizzle が止めてくれないこと（調べる問題） | このページ | 4.2, 5 |
| 5 | 応用 | タスクにタグを付ける（トランザクション・`with`） | [task-tags.mjs](task-tags.mjs)、[task-tags.test.mjs](task-tags.test.mjs) | 5, 6 |
| 6 | 応用 | N+1 を直す | [tag-report.mjs](tag-report.mjs)、[tag-report.test.mjs](tag-report.test.mjs) | 5 |
| 7 | 応用 | ページ分け・完了・題名の変更 | [task-actions.mjs](task-actions.mjs)、[task-actions.test.mjs](task-actions.test.mjs) | 4.2, 6 |
| 8 | 発展 | 列を足すマイグレーションを作る | [app-schema.mjs](app-schema.mjs)、[app-schema.test.mjs](app-schema.test.mjs)、[drizzle.config.js](drizzle.config.js)、[drizzle/](drizzle/) | 3 |

**発展**（8）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

- テストは PostgreSQL を使います。先に `docker compose up -d --wait` で動かしておきます。動いていないと、`PostgreSQL につながりません` というエラーになります。
- テストは、テストごとに PostgreSQL の中に新しい**スキーマ**（`test_` で始まる名前）を作り、そこに `tasks`・`tags`・`task_tags` と、本文 4.1節と同じ5つのタスク・2つのタグ（タスク 2・3 に「家」、5 に「急ぎ」）を入れてから、関数を呼びます。終わるとスキーマごと消します。本文で作った表には触りません（[drizzle-test.mjs](drizzle-test.mjs)。書き換えなくてよいファイルです）。
- テストが渡す `db` は、本文 4.1節の `db` と同じように使えます（`db.select()`・`db.transaction()`・`db.query.tasks` …）。
- 表の形は、本文2節と同じ [schema.mjs](schema.mjs) を `import` して使います。[pg-errors.mjs](pg-errors.mjs) は、本文7.2節と同じ部品です。
- 問題4以外は、`○○.mjs` の「ここを書く」を埋め（問題8は手順に従い）、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。

---

## 基本

### 問題1 コメントの表のスキーマを書く

第32章の練習問題2で SQL で書いた `comments` の表を、Drizzle のスキーマで [comments-schema.mjs](comments-schema.mjs) に書いてください（本文2節）。`export const comments = pgTable(…)` にします。

| JavaScript の名前 | 列の名前 | 決まり |
| --- | --- | --- |
| `id` | `id` | 1, 2, 3, … と自動で付く主キー |
| `taskId` | `task_id` | 整数。空にできない。`tasks` の `id` を指す。タスクを消すと、そのコメントも消える |
| `body` | `body` | 文字列。空にできない。1〜500 文字（制約の名前は `comments_body_check`） |
| `createdAt` | `created_at` | タイムゾーン付きの日時。空にできない。入れなければ今の時刻 |

```sh
$ node --test comments-schema.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- テストは、書いたスキーマから drizzle-kit に `CREATE TABLE` の SQL を作らせ、テスト用のスキーマで動かしてから、行を入れて確かめます。
- 本文2節の `taskTags` の `taskId` が、ほぼそのまま使えます。

### 問題2 クエリビルダで探す

第32章の練習問題1の4つの関数を、[builder-queries.mjs](builder-queries.mjs) に、Drizzle のクエリビルダで書いてください（本文4.2節）。SQL を文字列で書かず、`sql` のタグ付きテンプレートや `db.execute` も使いません。

| 関数 | 返すもの |
| --- | --- |
| `findByStatus(db, status)` | `status` が同じタスクの `title` の配列（`id` の順） |
| `searchTitle(db, word)` | `title` に `word` を含むタスクの `{ id, title }` の配列（`id` の順）。英字の大文字と小文字は区別しない |
| `countByStatus(db)` | `{ todo: 数, doing: 数, done: 数 }`。数は number。1つも無い status も `0` |
| `overdue(db, { date, limit })` | 終わっていなくて、`dueDate` が `date`（`'2026-11-13'` のような文字列）より前のタスクの `title` の配列（`dueDate` の順に、`limit` 個まで） |

```sh
$ node --test builder-queries.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- `db.select({ title: tasks.title })` の結果は `[{ title: … }, …]` なので、`.map((r) => r.title)` で配列にします。
- 本文4.2節の表の `ilike`・`count()`・`groupBy`・`and`・`ne`・`lt`・`limit` を使います。

### 問題3 あるものだけ条件を付ける

一覧の API で、URL の `?status=todo&q=本&sort=dueDate` のように、来た条件だけで絞り込むことがよくあります。[list-query.mjs](list-query.mjs) の `listQuery(db, options)` を書いてください（本文4.2節）。

- 返すのは、**`await` する前のクエリ**です（関数は `async` にしません）。テストは、返ったものを `await` して結果を見たり、`.toSQL()` で SQL を見たりします。
- 結果の行は `{ id, title, status, dueDate }` です。

| `options` | 意味 | 渡されなければ |
| --- | --- | --- |
| `status` | `status` が同じもの | 絞らない |
| `q` | `title` に `q` を含むもの（大文字と小文字を区別しない） | 絞らない |
| `dueBefore` | `dueDate` が `dueBefore` より前のもの | 絞らない |
| `sort` | 並べる列。`SORTABLE`（書いてあります）の名前だけ使える。同じ値なら `id` の順 | `'id'` |
| `order` | `'asc'`（小さい順）か `'desc'`（大きい順） | `'asc'` |
| `limit` | 1〜100 の整数 | `20` |

- 何も渡されなければ、SQL に `WHERE` を付けません。
- `sort`・`order`・`limit` が決まりに合わなければ、データベースに何も送らずに `RangeError` を投げます。`sort` が `'toString'` のときも `RangeError` です。

```sh
$ node --test list-query.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- 条件を配列に1つずつ `push` し、`.where(and(...conditions))` に渡します。`and()` は、条件が1つも無ければ `undefined` を返し、`.where(undefined)` は `WHERE` を付けません（本文4.2節の「気をつけること」）。
- `asc` と `desc` は関数なので、`const direction = order === 'asc' ? asc : desc;` のように、変数に入れて呼べます。
- `SORTABLE[sort]` を使う前に、`Object.hasOwn(SORTABLE, sort)` で、その名前を自分で書いたかを確かめます（`'toString'` は、どのオブジェクトも元から持っている名前です）。
- `.orderBy()` には、いくつでも並べ方を渡せます。

### 問題4 Drizzle が止めてくれないこと（調べる問題）

次の問いに、文章で答えてください（本文4.2・5節）。確かめるときは、クエリに `.toSQL()` を付けて、**送らずに** SQL を見ます。`~/dev/part06/ch33-orm-drizzle` に、次のようなファイル `try4.mjs` を作って動かします。

```js
import { and, eq } from 'drizzle-orm';
import { closeDb, db } from './db.mjs';
import { tasks } from './schema.mjs';

console.log(db.update(tasks).set({ title: 'x' }).toSQL());
// ここに、確かめたいクエリを足す（await しない。.toSQL() を付ける）
await closeDb();
```

1. `db.update(tasks).set({ title: 'x' })` を `await` すると、何が起きますか。`toSQL()` の SQL を見て答えてください。
2. 次の関数で、`ids` に `[]` が渡されると、何が起きますか。直すには、どうすればよいでしょうか。

   ```js
   async function removeMany(db, ids) {
     const conditions = ids.map((id) => eq(tasks.id, id));
     await db.delete(tasks).where(or(...conditions)); // or も and と同じく、空なら undefined を返す
   }
   ```

3. `db.update(tasks).set({ titel: '図書館に本を返す' }).where(eq(tasks.id, 2))` の `toSQL()` は、どうなりますか。本文7.1節のリポジトリで `pickColumns` を書いたのはなぜですか。
4. 本文5節の `relations.mjs` の1つ目の書き方で、タスクが 1000 個、1回の SQL の往復に 2 ミリ秒かかるとき、一覧を作るのに SQL の往復だけで何秒かかりますか。2つ目の書き方ならどうですか。
5. `db.transaction(async (tx) => { … })` の中で、うっかり `tx` ではなく `db` を使って INSERT すると、トランザクションが ROLLBACK したとき、その行はどうなりますか。理由も書いてください。

---

## 応用

### 問題5 タスクにタグを付ける

第32章の練習問題5の3つの関数を、[task-tags.mjs](task-tags.mjs) に、Drizzle で書いてください（本文5・6節）。テストの表には、最初からタグ「家」「急ぎ」があります。

| 関数 | 仕様 |
| --- | --- |
| `setTags(db, taskId, names)` | タスク `taskId` のタグを、`names`（タグの名前の配列）に**置き換える**。無いタグは作る。同じ名前が2回あっても1つ。付いたタグの名前を、名前の順に返す。無いタスクなら例外を投げ、タグも作らない |
| `tagsOf(db, taskId)` | タスク `taskId` のタグの名前の配列（名前の順）。無ければ `[]` |
| `tasksWithTags(db)` | 全部のタスクの `{ id, title, tags }` の配列（`id` の順）。`tags` はタグの名前の配列（名前の順）。**SQL は 2 回まで** |

```sh
$ node --test task-tags.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- `setTags` は `db.transaction(async (tx) => { … })` の中で、`tx` を使って書きます。手順は「今のタグを外す（`task_tags` から消す）→ タグを作る（`.onConflictDoNothing()`）→ 名前でタグを読む（`inArray`）→ `task_tags` に入れる」です。無いタスクなら、最後の INSERT が外部キーのエラー（23503）になり、全部取り消されます。
- 重なりを除くのは `[...new Set(names)]` です。`names` が空なら、外すだけで `[]` を返します（空の配列を `values()` に渡すとエラーになります）。
- `tasksWithTags` は、本文5節の3つ目（`db.query.tasks.findMany` の `with`）か、2つ目（JOIN）を使います。

### 問題6 N+1 を直す

[tag-report.mjs](tag-report.mjs) の `slowReport(db)` は、タグごとに、付いているタスクの数と、終わっていないタスクの題名を返します。正しく動きますが、タグが N 個あると SQL を 1 + N 回送ります。同じ結果を返す `fastReport(db)` を、**SQL 2 回まで**で書いてください（本文5節）。

```js
[
  { tag: '家', total: 2, open: ['本を返す', '部屋の掃除'] },
  { tag: '急ぎ', total: 1, open: ['報告書を書く'] },
]
```

- タグの名前の順。`open` は、タスクの `id` の順です。
- タスクの付いていないタグも、`{ tag: '空', total: 0, open: [] }` のように入ります。
- `slowReport` は書き換えないでください（テストが、答え合わせに使います）。

```sh
$ node --test tag-report.test.mjs
ℹ pass 3
ℹ fail 0
```

ヒント:

- `tags` から `leftJoin` で `task_tags`、`tasks` とつなぎ、1回で読みます。タスクの付いていないタグは、`title` と `status` が `null` の行が1つ来ます（第30章 1節）。
- 読んだ行を、`Map`（タグの名前 → `{ tag, total, open }`）にまとめます。`Map` は入れた順を覚えているので、SQL でタグの名前の順に並べておけば、`[...map.values()]` もその順になります。

### 問題7 ページ分け・完了・題名の変更

[task-actions.mjs](task-actions.mjs) に、3つの関数を書いてください（本文4.2・6節）。

| 関数 | 仕様 |
| --- | --- |
| `listPage(db, { after = 0, limit })` | `id` が `after` より大きいタスクの `{ id, title }` を、`id` の順に `limit` 個。返すのは `{ items, next }`。続きがあれば `next` は `items` の最後の `id`、無ければ `null`。SQL は 1 回 |
| `complete(db, id, { expectedVersion })` | version が `expectedVersion` のときだけ、`status` を `'done'`、`completedAt` と `updatedAt` を今の時刻にし、version を 1 増やす。変えたら `{ id, status, version, completedAt }`（`completedAt` は Date）、version が違う・タスクが無いなら `null` |
| `rename(db, id, title)` | 題名を変える。変えたら `{ ok: true, task: { id, title } }`。タスクが無ければ `{ ok: false, reason: 'not-found' }`、終わっていない同じ題名があれば `'duplicate'`、題名が決まり（1〜100 文字）に合わなければ `'invalid'`。ほかのエラーは投げ直す |

```sh
$ node --test task-actions.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- `listPage` は、第30章 6節（キーセット）と同じく、`limit + 1` 個読んで、あふれたら続きがあると分かります。
- version を 1 増やすのは、本文4.2節の `sql\`${tasks.version} + 1\`` です。
- `rename` のエラーは `DrizzleQueryError` に包まれています。`err.cause?.code` を、`pg-errors.mjs` の `PG.UNIQUE_VIOLATION`・`PG.CHECK_VIOLATION` と比べます（本文6節）。

---

## 発展

### 問題8 列を足すマイグレーションを作る

[app-schema.mjs](app-schema.mjs) には、`tasks` の表のスキーマがあり、[drizzle/](drizzle/) には、それを作る最初のマイグレーション `0000_create_tasks.sql` があります（本番のデータベースに、もう当ててあるつもりで考えます）。この表に**優先度**の列を足し、drizzle-kit でマイグレーションを作ってください（本文3節）。

| JavaScript の名前 | 列の名前 | 決まり |
| --- | --- | --- |
| `priority` | `priority` | 整数。空にできない。入れなければ `2`。1〜3 だけ（制約の名前は `tasks_priority_check`） |

手順:

1. `app-schema.mjs` の「ここに … を足す」の2か所を書きます。
2. `exercises/` で、次のコマンドを打ちます。`exercises/` の [drizzle.config.js](drizzle.config.js) が読まれます（この問題では、データベースにはつなぎません）。

   ```sh
   $ npx drizzle-kit generate --name add_priority
   [✓] Your SQL migration file ➜ drizzle/0001_add_priority.sql 🚀
   ```

3. できた `drizzle/0001_add_priority.sql` を読み、何をする SQL かを確かめます。
4. テストを動かします。テストは、`0000` を当てて行を入れてから `0001` を当て、今ある行の `priority` が `2` になることも確かめます。

```sh
$ node --test app-schema.test.mjs
ℹ pass 5
ℹ fail 0
```

- `drizzle/` の中のファイルは、手で書き換えないでください。
- まちがえて作ってしまったとき（名前を付け忘れた、2回作った など）は、`npx drizzle-kit drop` で、最後に作ったマイグレーションを選んで消してから、作り直します（`drop` は、ファイルと `drizzle/meta/` の記録を一緒に消すコマンドです。まだどこにも当てていないものにだけ使います）。

ヒント:

- `NOT NULL` の列を、行がもうある表に足すときは、`DEFAULT` が要ります。無いと、今ある行に入れる値が無いので、`ALTER TABLE` が失敗します。
- 制約は、本文2節の `check('名前', sql\`…\`)` です。`BETWEEN 1 AND 3` が使えます。
- テストの「スキーマを最後に変えた後で generate してある」は、スキーマを書き換えた後に `generate` を忘れると失敗します。
