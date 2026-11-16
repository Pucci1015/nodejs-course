# 第33章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part06/ch33-orm-drizzle/exercises` で実行） |
| --- | --- | --- |
| 1 | [comments-schema.mjs](comments-schema.mjs) | `MODULE=../solutions/comments-schema.mjs node --test comments-schema.test.mjs` |
| 2 | [builder-queries.mjs](builder-queries.mjs) | `MODULE=../solutions/builder-queries.mjs node --test builder-queries.test.mjs` |
| 3 | [list-query.mjs](list-query.mjs) | `MODULE=../solutions/list-query.mjs node --test list-query.test.mjs` |
| 4 | このページ | — |
| 5 | [task-tags.mjs](task-tags.mjs) | `MODULE=../solutions/task-tags.mjs node --test task-tags.test.mjs` |
| 6 | [tag-report.mjs](tag-report.mjs) | `MODULE=../solutions/tag-report.mjs node --test tag-report.test.mjs` |
| 7 | [task-actions.mjs](task-actions.mjs) | `MODULE=../solutions/task-actions.mjs node --test task-actions.test.mjs` |
| 8 | [app-schema.mjs](app-schema.mjs)、[drizzle/](drizzle/) | `MODULE=../solutions/app-schema.mjs node --test app-schema.test.mjs` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。どのテストも、先に `docker compose up -d --wait` で PostgreSQL を動かしておきます。`schema.mjs`・`pg-errors.mjs`・`drizzle-test.mjs` は、解答が `import` するので、`exercises/` と同じものを置いてあります。

---

## 問題1 コメントの表のスキーマを書く

```js
export const comments = pgTable(
  'comments',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    // references の中は「関数」にする（() => tasks.id）。表どうしが、どちらが先に書かれていても指せるように
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    body: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('comments_body_check', sql`length(${t.body}) BETWEEN 1 AND 500`)],
);
```

- `references(() => tasks.id, …)` は、外部キーの制約になります。drizzle-kit は、`comments_task_id_tasks_id_fk` という名前を付けます。
- `check` の中の `${t.body}` は、`"comments"."body"` という列の名前になります。値ではないので、`$1` にはなりません。

## 問題2 クエリビルダで探す

```js
export async function findByStatus(db, status) {
  const rows = await db.select({ title: tasks.title }).from(tasks).where(eq(tasks.status, status)).orderBy(asc(tasks.id));
  return rows.map((r) => r.title);
}

export async function searchTitle(db, word) {
  // ilike に渡す値も、Drizzle が $1 にして送る（「'」が入っていても大丈夫）
  return db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(ilike(tasks.title, `%${word}%`)).orderBy(asc(tasks.id));
}

export async function countByStatus(db) {
  // Drizzle の count() は number で返る（第32章の ::int が要らない）
  const rows = await db.select({ status: tasks.status, n: count() }).from(tasks).groupBy(tasks.status);
  const counts = { todo: 0, doing: 0, done: 0 };
  for (const r of rows) counts[r.status] = r.n;
  return counts;
}

export async function overdue(db, { date, limit }) {
  const rows = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(and(ne(tasks.status, 'done'), lt(tasks.dueDate, date)))
    .orderBy(asc(tasks.dueDate))
    .limit(limit);
  return rows.map((r) => r.title);
}
```

- `searchTitle` は、`db.select()…` のクエリをそのまま `return` しています。`async` の関数の中で、`await` が付いていなくても、返したクエリは呼んだ側の `await` で送られます（Drizzle のクエリは `then` を持っているため）。
- `overdue` の `lt(tasks.dueDate, date)` は、`dueDate` が `NULL` の行では「分からない」になり、選ばれません（第29章）。

## 問題3 あるものだけ条件を付ける

```js
const SORTABLE = {
  id: tasks.id,
  title: tasks.title,
  dueDate: tasks.dueDate,
  createdAt: tasks.createdAt,
};

export function listQuery(db, { status, q, dueBefore, sort = 'id', order = 'asc', limit = 20 } = {}) {
  // Object.hasOwn で調べる（SORTABLE['toString'] のような、元から持っている名前を通さない）
  if (!Object.hasOwn(SORTABLE, sort)) throw new RangeError(`並べ替えに使えない名前です: ${sort}`);
  if (order !== 'asc' && order !== 'desc') throw new RangeError(`order は asc か desc です: ${order}`);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError(`limit は 1〜100 の整数です: ${limit}`);

  // 条件は、渡されたものだけを配列に入れる。and() は、undefined を飛ばし、空なら WHERE を付けない
  const conditions = [];
  if (status !== undefined) conditions.push(eq(tasks.status, status));
  if (q !== undefined) conditions.push(ilike(tasks.title, `%${q}%`));
  if (dueBefore !== undefined) conditions.push(lt(tasks.dueDate, dueBefore));

  const direction = order === 'asc' ? asc : desc;
  return db
    .select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate })
    .from(tasks)
    .where(and(...conditions))
    .orderBy(direction(SORTABLE[sort]), asc(tasks.id)) // 同じ値のときの順を決めるため、最後に id
    .limit(limit);
}
```

- 並べる列は、利用者から来た文字列を SQL に入れず、`SORTABLE` に自分で書いた列だけを使います（第31章 練習問題2と同じ考え方）。`Object.hasOwn` を使わずに `SORTABLE[sort]` だけで調べると、`'toString'` のような、どのオブジェクトも元から持っている名前が通ってしまいます。
- `limit` の確かめは、Drizzle の `.limit()` に変な値を渡さないためです。`'10'`（文字列）も断ります。

## 問題4 Drizzle が止めてくれないこと（調べる問題）

1. `toSQL()` は `{ sql: 'update "tasks" set "title" = $1', params: [ 'x' ] }` で、`WHERE` がありません。`await` すると、**全部のタスク**の題名を `x` に変えようとします。この表では、終わっていないタスクの題名が重なるので `tasks_open_title`（23505）で失敗し、1つの SQL なので全部取り消されますが、その制約が無い表なら、全部の行が書き換わります。`update` と `delete` には、必ず `where` を付けます。
2. `or()` は条件が1つも無いと `undefined` を返し、`.where(undefined)` は `WHERE` を付けないので、`DELETE FROM tasks` になり、**全部のタスクが消えます**（`task_tags` も `ON DELETE CASCADE` で消えます）。直し方は、先に `if (ids.length === 0) return;` で抜けるか、`inArray(tasks.id, ids)` を使うことです。Drizzle の `inArray` は、空の配列なら `where false`（1行も選ばない）にします。
3. `{ sql: 'update "tasks" set  where "tasks"."id" = $1', params: [ 2 ] }` になります。無い列の名前は黙って捨てられ、`SET` の後ろが空の SQL になります（送ると、文法のエラー）。`{ title: 'a', titel: 'b' }` のように正しい名前と混ざっていると、エラーにもならず、`titel` だけが黙って無視されます。リポジトリの `pickColumns` は、知らない名前が来たら例外にして、このまちがいに気づけるようにしています。
4. 1つ目は 1 + 1000 = 1001 回なので、1001 × 2 ミリ秒 = 約 2 秒です。2つ目は 1 回なので約 0.002 秒です（送る行の量が増える分は、ずっと小さい）。API の応答が 2 秒かかると、使う人は「遅い」と感じます。
5. `db` で送った INSERT は、プールの**別の接続**で、トランザクションの外で動き、すぐに確定します。`tx` のトランザクションが ROLLBACK しても、その行は**残ります**。さらに、プールの接続が1本しか無いと、`tx` が接続を持ったまま `db` が空きを待ち続け、止まってしまうこともあります（第32章 5節）。

## 問題5 タスクにタグを付ける

```js
export async function setTags(db, taskId, names) {
  const unique = [...new Set(names)];
  // 途中で失敗したら（無いタスクなど）、作ったタグも消えるように、全部を1つのトランザクションで
  return db.transaction(async (tx) => {
    await tx.delete(taskTags).where(eq(taskTags.taskId, taskId));
    if (unique.length === 0) return [];
    // もうあるタグは作らない（ON CONFLICT DO NOTHING）
    await tx
      .insert(tags)
      .values(unique.map((name) => ({ name })))
      .onConflictDoNothing();
    const rows = await tx.select().from(tags).where(inArray(tags.name, unique)).orderBy(asc(tags.name));
    await tx.insert(taskTags).values(rows.map((tag) => ({ taskId, tagId: tag.id })));
    return rows.map((tag) => tag.name);
  });
}

export async function tagsOf(db, taskId) {
  const rows = await db
    .select({ name: tags.name })
    .from(taskTags)
    .innerJoin(tags, eq(tags.id, taskTags.tagId))
    .where(eq(taskTags.taskId, taskId))
    .orderBy(asc(tags.name));
  return rows.map((r) => r.name);
}

export async function tasksWithTags(db) {
  // relations を使う db.query は、with の分もまとめて1つの SQL にする
  const list = await db.query.tasks.findMany({
    columns: { id: true, title: true },
    with: { taskTags: { columns: {}, with: { tag: { columns: { name: true } } } } },
    orderBy: (t, { asc }) => [asc(t.id)],
  });
  return list.map((t) => ({ id: t.id, title: t.title, tags: t.taskTags.map((x) => x.tag.name).sort() }));
}
```

- `setTags` が無いタスクで失敗したとき、トランザクションの中で作ったタグ（`新しいタグ`）も、ROLLBACK で消えます。
- `tasksWithTags` の `db.query` は、`with` の分も合わせて SQL を1回だけ送ります。`with` の中の行の順は決まっていないので、JavaScript の `sort()` で名前の順にしています。

## 問題6 N+1 を直す

```js
export async function fastReport(db) {
  // tags から LEFT JOIN でつなぐ（タスクの付いていないタグも1行残る。そのとき title と status は null）
  const rows = await db
    .select({ tag: tags.name, title: tasks.title, status: tasks.status })
    .from(tags)
    .leftJoin(taskTags, eq(taskTags.tagId, tags.id))
    .leftJoin(tasks, eq(tasks.id, taskTags.taskId))
    .orderBy(asc(tags.name), asc(tasks.id));
  // 1回で読んだ行を、タグごとにまとめる（Map は入れた順を保つので、タグの名前の順のまま）
  const byTag = new Map();
  for (const r of rows) {
    if (!byTag.has(r.tag)) byTag.set(r.tag, { tag: r.tag, total: 0, open: [] });
    if (r.title === null) continue;
    const entry = byTag.get(r.tag);
    entry.total += 1;
    if (r.status !== 'done') entry.open.push(r.title);
  }
  return [...byTag.values()];
}
```

- SQL は1回です。`tags` から `leftJoin` しているので、タスクの付いていないタグ「空」も、`title` が `null` の1行として来ます。
- `orderBy(asc(tags.name), asc(tasks.id))` で、タグの名前の順と、タグの中のタスクの `id` の順を、SQL で決めています。

## 問題7 ページ分け・完了・題名の変更

```js
export async function listPage(db, { after = 0, limit }) {
  // limit より1つ多く読み、あふれたら「続きがある」（第30章 6節）
  const rows = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(gt(tasks.id, after))
    .orderBy(asc(tasks.id))
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const next = rows.length > limit ? items.at(-1).id : null;
  return { items, next };
}

export async function complete(db, id, { expectedVersion }) {
  const now = new Date();
  const [row] = await db
    .update(tasks)
    // version + 1 はデータベースの中で計算させる（読んでから足すと、同時に動いたときに数え漏れる）
    .set({ status: 'done', completedAt: now, updatedAt: now, version: sql`${tasks.version} + 1` })
    .where(and(eq(tasks.id, id), eq(tasks.version, expectedVersion)))
    .returning({ id: tasks.id, status: tasks.status, version: tasks.version, completedAt: tasks.completedAt });
  return row ?? null;
}

export async function rename(db, id, title) {
  try {
    const [row] = await db.update(tasks).set({ title }).where(eq(tasks.id, id)).returning({ id: tasks.id, title: tasks.title });
    return row ? { ok: true, task: row } : { ok: false, reason: 'not-found' };
  } catch (err) {
    // Drizzle は pg のエラーを包んで投げる。元のエラー（code が入っている）は err.cause
    const code = err.cause?.code;
    if (code === PG.UNIQUE_VIOLATION) return { ok: false, reason: 'duplicate' };
    if (code === PG.CHECK_VIOLATION) return { ok: false, reason: 'invalid' };
    throw err; // 知らないエラーは、握りつぶさずに投げ直す
  }
}
```

- `listPage` は、`count(*)` を別に数えずに、`limit + 1` 個読むだけで「続きがあるか」が分かります（第30章 6節）。
- `rename` で知らないエラー（たとえば `title` が `null` のときの 23502）を `{ ok: false }` にしてしまうと、バグに気づけなくなります。分かるものだけを読み替え、ほかは投げ直します。

## 問題8 列を足すマイグレーションを作る

`app-schema.mjs` に足すもの:

```js
    // NOT NULL の列を、行がもうある表に足すときは、DEFAULT が要る（今ある行に入れる値）
    priority: integer().notNull().default(2),
```

```js
    check('tasks_priority_check', sql`${t.priority} BETWEEN 1 AND 3`),
```

`npx drizzle-kit generate --name add_priority` で作った [drizzle/0001_add_priority.sql](drizzle/0001_add_priority.sql):

```sql
ALTER TABLE "tasks" ADD COLUMN "priority" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_priority_check" CHECK ("tasks"."priority" BETWEEN 1 AND 3);
```

- `ALTER TABLE … ADD COLUMN … DEFAULT 2 NOT NULL` で、今ある行には `2` が入ります。`DEFAULT` が無いと、今ある行の `priority` が `NULL` になり、`NOT NULL` に合わないので失敗します。
- `drizzle/meta/_journal.json` に `0001_add_priority` が足され、`0001_snapshot.json` に、足した後の形が入ります。次に `generate` するときは、この形と比べます。
- 模範解答の `drizzle/` は、`solutions/` で `npx drizzle-kit generate --name add_priority` を動かして作りました（`solutions/drizzle.config.js` を使います）。
