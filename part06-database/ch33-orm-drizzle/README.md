# 第33章 ORM とマイグレーション（Drizzle）

第31・32章では、SQL を文字列で書き、行（`due_date`）とオブジェクト（`dueDate`）の変換も自分で書きました。この章では、その部分を **ORM**（Object-Relational Mapping。表の行と JavaScript のオブジェクトを対応づける道具）に任せます。使うのは **Drizzle ORM** と、マイグレーションの SQL を作る **drizzle-kit** です。
第32章のタスクの API を、データベースの所だけ Drizzle に取り替えるのが、この章のゴールです。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第32章（PostgreSQL、`pg` の `Pool`、`$1`、トランザクション、エラーコード、SQL のファイルでマイグレーション）、第30章（JOIN、GROUP BY、version） |
| この章のゴール | ORM の良い所と気をつける所を説明できる / Drizzle でスキーマ（表の形）を書ける / drizzle-kit でマイグレーションを作って当てられる / クエリビルダで選ぶ・足す・変える・消すを書ける / `toSQL()` と `SQL_LOG=1` で、送る SQL を確かめられる / N+1 に気づき、JOIN か `db.query` の `with` で直せる / Drizzle のトランザクションを使い、包まれたエラーを `err.cause` で見分けられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`schema.mjs`・`drizzle.config.js`・`drizzle/`・`db.mjs`・`seed.mjs`・`queries.mjs`・`relations.mjs`・`tx.mjs`・`drizzle-task-repo.mjs`・`pg-errors.mjs`・`server.mjs`） |
| [exercises/](exercises/) | 練習問題（テストは PostgreSQL を使う） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part06/ch33-orm-drizzle/` で実行します。手を動かして作るファイルは、このフォルダの直下に置きます。
>
>   ```sh
>   $ cd ~/dev/part06/ch33-orm-drizzle
>   ```
>
> - PostgreSQL を先に動かしておきます（`docker compose up -d --wait`。第32章 2節）。
> - この章は、データベース **ch33** を使います。`compose.yaml` が、最初に PostgreSQL を動かしたときに作ってあります（[../docker/postgres-init/01-databases.sql](../docker/postgres-init/01-databases.sql)）。第32章の `app` とは別なので、`tasks` の名前がぶつかりません。
> - 7節で、ポート **9447** でサーバを動かします。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| Drizzle のスキーマと drizzle-kit（2・3節） | 第6部の成果物では使わない（`pg` のまま）。第10部（認証のユーザーの表）、自分のアプリ |
| クエリビルダと `toSQL()`（4節） | 第10部、第12部（遅い SQL を探す） |
| N+1（5節） | 第8部（画面に一覧を出す API）、第12部 第63章（性能を測る） |
| トランザクションと `err.cause`（6節） | 第10部、成果物（409・422 の読み替え） |
| リポジトリの形をそろえる（7節） | 成果物（リポジトリを取り替えても、API はそのまま）、第11部 第57章（テストで取り替える） |

---

## 0. ORM とは

第32章の `pg-task-repo.mjs` では、次のことを全部、自分で書きました。

- SQL の文字列（`'UPDATE tasks SET … WHERE id = $3'`）と、`$1`・`$2` の番号合わせ
- 列の名前の変換（`due_date` ↔ `dueDate`）
- 使ってよい列の名前の一覧（`COLUMNS`）

ORM を使うと、表の形を JavaScript で一度書けば、こうしたことを ORM がしてくれます。

```js
// 第32章（pg）
await pool.query('SELECT title FROM tasks WHERE status = $1 ORDER BY id', ['todo']);
// この章（Drizzle）
await db.select({ title: tasks.title }).from(tasks).where(eq(tasks.status, 'todo')).orderBy(asc(tasks.id));
```

| | SQL を文字列で書く（第31・32章） | ORM（この章） |
| --- | --- | --- |
| 書きまちがい | 実行するまで分からない（`titel` と書いても、動かすまでエラーにならない） | 列は `tasks.title` のような JavaScript の値なので、エディタが候補を出し、まちがいに気づきやすい |
| 列の名前の変換 | 自分で書く | ORM がする（`dueDate` で書けば、SQL では `due_date`） |
| 条件を組み合わせる | 文字列をつなぐので、まちがえやすい | `and(…)` に条件を足していくだけ |
| 複雑な SQL | そのまま書ける | ORM の関数に無いものは、`sql` という部品で SQL を混ぜる |
| 送られる SQL | 見たまま | 見えにくい。**`toSQL()` やログで、必ず確かめる** |

ORM は「SQL を知らなくてよくする道具」ではありません。ORM が作る SQL を読めないと、遅い SQL や、思っていないデータの変え方に気づけません。第29〜32章の SQL の知識は、この章でもそのまま使います。

Node.js の ORM はいくつかあります（Prisma・TypeORM・Sequelize・MikroORM など）。この教材では、SQL に近い書き方で、送る SQL を想像しやすい **Drizzle** を使います。

## 1. Drizzle の部品

| 部品 | 何をするか | いつ動くか |
| --- | --- | --- |
| `drizzle-orm` | クエリビルダ（`db.select()…`）。中で `pg` を使って SQL を送る | アプリが動いている間 |
| `drizzle-kit` | スキーマ（表の形を書いた JavaScript）を読んで、マイグレーションの SQL のファイルを作る道具（コマンド） | 開発中に、表の形を変えたとき |

```text
schema.mjs（表の形）──drizzle-kit generate──▶ drizzle/0000_….sql（マイグレーション）
                                                     │
                                  drizzle-kit migrate か、アプリの migrate()
                                                     ▼
                                               PostgreSQL の表
```

どちらも `setup-part06.sh` で、`~/dev/part06/node_modules` に入っています。

`~/dev/part06` で `npm audit`（入れたパッケージに、知られた弱点が無いかを調べるコマンド）を動かすと、`drizzle-kit` が使う `esbuild` について「moderate」の知らせが出ます。これは「開発用のサーバを動かしたときに、ほかのサイトから中身を読まれる」という種類のものです。drizzle-kit は、開発中に手元でコマンドとして動かすだけで、アプリと一緒に本番に出すものではないので、この教材ではそのままにします。`npm audit fix --force` は、版を大きく変えて動かなくなることがあるので、動かさないでください。

## 2. スキーマを書く

### 2.1 手を動かす: 表の形を JavaScript で書く

第32章の `tasks` と、タグの表 `tags`・`task_tags` を、Drizzle のスキーマで書きます。`schema.mjs` を作ります（完成形は [samples/schema.mjs](samples/schema.mjs)）。

```js
import { relations, sql } from 'drizzle-orm';
import { check, date, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// pgTable('表の名前', { JavaScript の名前: 列の型('列の名前') … }, (表) => [制約・インデックス])
export const tasks = pgTable(
  'tasks',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: text().notNull(),
    status: text().notNull().default('todo'),
    dueDate: date('due_date'), // date は '2026-11-12' の文字列のまま（第32章 4.2節の落とし穴が無い）
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    version: integer().notNull().default(1),
  },
  (t) => [
    check('tasks_title_check', sql`length(${t.title}) BETWEEN 1 AND 100`),
    check('tasks_status_check', sql`${t.status} IN ('todo', 'doing', 'done')`),
    uniqueIndex('tasks_open_title').on(t.title).where(sql`${t.status} <> 'done'`),
  ],
);

export const tags = pgTable('tags', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull().unique(),
});

export const taskTags = pgTable(
  'task_tags',
  {
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] })],
);

// 表どうしのつながり（5節の db.query の with で使う）。SQL の外部キーとは別に、Drizzle に教える
export const tasksRelations = relations(tasks, ({ many }) => ({
  taskTags: many(taskTags),
}));
export const tagsRelations = relations(tags, ({ many }) => ({
  taskTags: many(taskTags),
}));
export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, { fields: [taskTags.taskId], references: [tasks.id] }),
  tag: one(tags, { fields: [taskTags.tagId], references: [tags.id] }),
}));
```

| 書いたもの | 意味（SQL では） |
| --- | --- |
| `pgTable('tasks', { … }, (t) => [ … ])` | `CREATE TABLE tasks (…)`。2つ目は列、3つ目は制約とインデックス |
| `id: integer().primaryKey().generatedAlwaysAsIdentity()` | `id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY` |
| `title: text().notNull()` | `title text NOT NULL`。列の名前を書かなければ、JavaScript の名前（`title`）がそのまま列の名前になる |
| `dueDate: date('due_date')` | `due_date date`。JavaScript では `dueDate`、SQL では `due_date` |
| `.default('todo')`・`.defaultNow()` | `DEFAULT 'todo'`・`DEFAULT now()` |
| `timestamp('created_at', { withTimezone: true })` | `created_at timestamptz` |
| `check('名前', sql\`…\`)` | `CONSTRAINT 名前 CHECK (…)`。`sql` は、SQL をそのまま書く部品。`${t.title}` は列の名前になる |
| `uniqueIndex('名前').on(t.title).where(…)` | `CREATE UNIQUE INDEX 名前 ON tasks (title) WHERE …`（第31章 3節の、部分ユニークインデックス） |
| `.unique()` | `UNIQUE` |
| `.references(() => tasks.id, { onDelete: 'cascade' })` | `REFERENCES tasks (id) ON DELETE CASCADE`。`() =>` と関数にするのは、まだ書いていない表も指せるように |
| `primaryKey({ columns: [ … ] })` | `PRIMARY KEY (task_id, tag_id)`（2つの列を合わせた主キー） |
| `relations(…)` | 「タスクは task_tags をたくさん持つ」のような、表どうしのつながりを Drizzle に教える（5節で使う）。表は変わらない |

- 制約に名前を付けておく（`tasks_title_check`）と、エラーの `err.constraint` で見分けられます（第32章 7節）。
- `date` の列は、Drizzle では `'2026-11-12'` の文字列のままです。第32章 4.2節の「1日ずれる」落とし穴はありません。

## 3. drizzle-kit でマイグレーションを作る

### 3.1 手を動かす: 設定を書いて generate

drizzle-kit の設定 `drizzle.config.js` を、章のフォルダの直下に作ります（完成形は [samples/drizzle.config.js](samples/drizzle.config.js)。完成形は `samples/` の中を指していますが、自分で書くものは次のとおりです）。

```js
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './schema.mjs',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/ch33',
  },
});
```

| 書いたもの | 意味 |
| --- | --- |
| `dialect: 'postgresql'` | PostgreSQL 用の SQL を作る |
| `schema` | スキーマのファイル。パスは「コマンドを打ったフォルダ」から数える |
| `out` | マイグレーションのファイルを置くフォルダ |
| `dbCredentials.url` | `migrate` のときのつなぎ先（データベース ch33） |

```sh
$ npx drizzle-kit generate --name create_tasks
No config path provided, using default 'drizzle.config.js'
3 tables
tags 2 columns 0 indexes 0 fks
task_tags 2 columns 0 indexes 2 fks
tasks 8 columns 1 indexes 0 fks

[✓] Your SQL migration file ➜ drizzle/0000_create_tasks.sql 🚀
```

| コマンド | 意味 |
| --- | --- |
| `npx drizzle-kit` | `node_modules` に入った drizzle-kit を動かす（`npx` は、入れたパッケージのコマンドを動かす道具） |
| `generate` | スキーマと、前に作ったときの形（`drizzle/meta/` に覚えている）を比べて、違いを SQL のファイルにする |
| `--name create_tasks` | ファイルの名前の後ろの部分。付けないと、でたらめな英単語になる |

設定のファイルを指定しないと、今のフォルダの `drizzle.config.js` が読まれます。できたファイルを見てみます。

```sh
$ cat drizzle/0000_create_tasks.sql
```

```sql
CREATE TABLE "tags" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "task_tags" (
	"task_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "task_tags_task_id_tag_id_pk" PRIMARY KEY("task_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "tasks_title_check" CHECK (length("tasks"."title") BETWEEN 1 AND 100),
	CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" IN ('todo', 'doing', 'done'))
);
--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_open_title" ON "tasks" USING btree ("title") WHERE "tasks"."status" <> 'done';
```

- 第32章で手で書いた SQL と、ほぼ同じものができています。drizzle-kit は SQL を**作る**だけで、**中身は自分で読んで確かめます**。
- `--> statement-breakpoint` は、SQL の区切りの印です。
- `drizzle/meta/` には、今の形（`0000_snapshot.json`）と、マイグレーションの一覧（`_journal.json`）が入ります。次に `generate` したとき、この形と比べます。**手で書き換えないでください。**

### 3.2 手を動かす: migrate で当てる

```sh
$ npx drizzle-kit migrate
[✓] migrations applied successfully!
$ docker compose exec postgres psql -U app -d ch33 -c '\dt'
```

`tags`・`task_tags`・`tasks` の3つの表ができています。済んだマイグレーションは、`drizzle` というスキーマの `__drizzle_migrations` の表に覚えています（第32章 8.1節の `schema_migrations` と同じ役目です）。

```sh
$ docker compose exec postgres psql -U app -d ch33 -c 'SELECT id, created_at FROM drizzle.__drizzle_migrations'
```

### 3.3 表の形を変えるときの手順

1. `schema.mjs` を書き換える（列を足す、など）。
2. `npx drizzle-kit generate --name 何をしたか` で、新しい SQL のファイルを作る。
3. できた SQL を読んで確かめる。
4. `npx drizzle-kit migrate`（か、アプリの起動のときの `migrate()`。7.2節）で当てる。
5. スキーマと `drizzle/` を、一緒に Git にコミットする。

第32章 8.1節と同じく、**一度当てたマイグレーションのファイルは、書き換えません**。直したいときは、新しいマイグレーションを足します（練習問題8）。

> `npx drizzle-kit push` という、ファイルを作らずにデータベースを直接スキーマに合わせるコマンドもあります。試しに作るときには便利ですが、何をしたかが残らないので、この教材では使いません。

## 4. 読み書きする

### 4.1 手を動かす: つないで、行を入れる

`db.mjs` を作ります（完成形は [samples/db.mjs](samples/db.mjs)）。

```js
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.mjs';

// 第33章は、compose.yaml が作ったデータベース ch33 を使う（第32章の app とは別。tasks の名前がぶつからないように）
export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/ch33';

// SQL_LOG=1 を付けて動かすと、Drizzle が送った SQL を表示する
export const db = drizzle(DATABASE_URL, { schema, logger: process.env.SQL_LOG === '1' });

// 中で使っている pg のプールを閉じる
export const closeDb = () => db.$client.end();
```

| 書いたもの | 意味 |
| --- | --- |
| `drizzle(URL, { schema, logger })` | 中で `pg` のプール（第32章 5節）を作り、Drizzle の `db` を返す。`schema` は 5節の `db.query` で使う |
| `logger: true` | 送った SQL を表示する。ここでは、`SQL_LOG=1` を付けて動かしたときだけ |
| `db.$client` | 中の `pg` のプール。`end()` で接続を閉じる |

`seed.mjs` を作ります（完成形は [samples/seed.mjs](samples/seed.mjs)）。

```js
import { sql } from 'drizzle-orm';
import { closeDb, db } from './db.mjs';
import { tags, taskTags, tasks } from './schema.mjs';

// 全部消して、id の番号も 1 に戻してから入れる。Drizzle の関数に無い SQL は、db.execute(sql`…`) で送れる
await db.execute(sql`TRUNCATE tasks, tags RESTART IDENTITY CASCADE`);

const inserted = await db
  .insert(tasks)
  .values([
    { title: '牛乳を買う', status: 'done', dueDate: '2026-11-01', completedAt: new Date('2026-11-01T03:00:00Z'), version: 2 },
    { title: '本を返す', dueDate: '2026-11-12' },
    { title: '部屋の掃除', status: 'doing', dueDate: '2026-11-15', version: 2 },
    { title: "Let's ストレッチ" },
    { title: '報告書を書く', dueDate: '2026-11-10' },
  ])
  .returning({ id: tasks.id, title: tasks.title });
console.log('タスク:', inserted);

const [home, urgent] = await db.insert(tags).values([{ name: '家' }, { name: '急ぎ' }]).returning();
await db.insert(taskTags).values([
  { taskId: inserted[1].id, tagId: home.id },
  { taskId: inserted[2].id, tagId: home.id },
  { taskId: inserted[4].id, tagId: urgent.id },
]);
console.log('タグ:', [home, urgent]);

await closeDb();
```

```sh
$ node seed.mjs
タスク: [
  { id: 1, title: '牛乳を買う' },
  { id: 2, title: '本を返す' },
  { id: 3, title: '部屋の掃除' },
  { id: 4, title: "Let's ストレッチ" },
  { id: 5, title: '報告書を書く' }
]
タグ: [ { id: 1, name: '家' }, { id: 2, name: '急ぎ' } ]
```

| 書いたもの | SQL では |
| --- | --- |
| `db.insert(tasks).values({ … })` | `INSERT INTO tasks (…) VALUES (…)`。配列を渡すと、何行も1回で |
| `.returning()` | `RETURNING *`。`.returning({ id: tasks.id })` なら、その列だけ |
| `db.execute(sql\`…\`)` | Drizzle の関数に無い SQL を、そのまま送る |

- 渡さなかった列（`status`・`createdAt` など）は、表の `DEFAULT` が入ります。
- 渡す値は、Drizzle が `$1`・`$2` にして送ります。`"Let's ストレッチ"` の `'` も、そのまま入ります。

### 4.2 手を動かす: 選ぶ・変える

`queries.mjs` を作ります（完成形は [samples/queries.mjs](samples/queries.mjs)）。

```js
import { and, asc, count, desc, eq, ilike, isNotNull, lt, ne, sql } from 'drizzle-orm';
import { closeDb, db } from './db.mjs';
import { tasks } from './schema.mjs';

// SELECT title, due_date FROM tasks WHERE status <> 'done' AND due_date IS NOT NULL ORDER BY due_date
const open = await db
  .select({ title: tasks.title, dueDate: tasks.dueDate })
  .from(tasks)
  .where(and(ne(tasks.status, 'done'), isNotNull(tasks.dueDate)))
  .orderBy(asc(tasks.dueDate));
console.log('締め切りのある、終わっていないタスク:', open);

// 組み立てたクエリは、await する前なら .toSQL() で SQL を見られる
const query = db.select().from(tasks).where(ilike(tasks.title, '%let%')).limit(5);
console.log('toSQL:', query.toSQL());
console.log('結果:', await query);

// GROUP BY と count()
console.log('status ごと:', await db.select({ status: tasks.status, n: count() }).from(tasks).groupBy(tasks.status).orderBy(desc(count())));

// UPDATE … WHERE id = ? AND version = ? RETURNING …（第30章 5節の version）
const [first] = await db.select().from(tasks).where(eq(tasks.title, '本を返す'));
const renamed = await db
  .update(tasks)
  .set({ title: '図書館に本を返す', version: sql`${tasks.version} + 1`, updatedAt: new Date() })
  .where(and(eq(tasks.id, first.id), eq(tasks.version, first.version)))
  .returning({ id: tasks.id, title: tasks.title, version: tasks.version });
console.log('変えた:', renamed);

// 同じ version でもう一度 → 1行も合わないので []
console.log('古い version で:', await db.update(tasks).set({ title: '別の題名' }).where(and(eq(tasks.id, first.id), eq(tasks.version, first.version))).returning());

// 締め切りが 2026-11-11 より前で、終わっていないもの
console.log('期限切れ:', await db.select({ title: tasks.title }).from(tasks).where(and(lt(tasks.dueDate, '2026-11-11'), ne(tasks.status, 'done'))));

// 元に戻す
await db.update(tasks).set({ title: '本を返す' }).where(eq(tasks.id, first.id));
await closeDb();
```

```sh
$ node queries.mjs
締め切りのある、終わっていないタスク: [
  { title: '報告書を書く', dueDate: '2026-11-10' },
  { title: '本を返す', dueDate: '2026-11-12' },
  { title: '部屋の掃除', dueDate: '2026-11-15' }
]
toSQL: {
  sql: 'select "id", "title", "status", "due_date", "created_at", "updated_at", "completed_at", "version" from "tasks" where "tasks"."title" ilike $1 limit $2',
  params: [ '%let%', 5 ]
}
結果: [
  {
    id: 4,
    title: "Let's ストレッチ",
    status: 'todo',
    dueDate: null,
    createdAt: 2026-11-11T09:02:13.596Z,
    updatedAt: 2026-11-11T09:02:13.596Z,
    completedAt: null,
    version: 1
  }
]
status ごと: [
  { status: 'todo', n: 3 },
  { status: 'doing', n: 1 },
  { status: 'done', n: 1 }
]
変えた: [ { id: 2, title: '図書館に本を返す', version: 2 } ]
古い version で: []
期限切れ: [ { title: '報告書を書く' } ]
```

| Drizzle | SQL |
| --- | --- |
| `db.select().from(tasks)` | `SELECT * FROM tasks`（列は全部、JavaScript の名前で返る） |
| `db.select({ title: tasks.title })` | `SELECT title`。結果のキーの名前は、自分で付けた `title` |
| `.where(eq(tasks.status, 'todo'))` | `WHERE status = $1` |
| `ne`・`lt`・`gt`・`lte`・`gte` | `<>`・`<`・`>`・`<=`・`>=` |
| `isNull(列)`・`isNotNull(列)` | `IS NULL`・`IS NOT NULL` |
| `like(列, '%x%')`・`ilike(列, '%x%')` | `LIKE`・`ILIKE`（大文字と小文字を区別しない。第32章 練習問題1） |
| `inArray(列, [ … ])` | `IN (…)` |
| `and(条件, 条件)`・`or(条件, 条件)` | `AND`・`OR` |
| `.orderBy(asc(列), desc(列))` | `ORDER BY 列 ASC, 列 DESC` |
| `.limit(5)` | `LIMIT 5` |
| `count()`・`.groupBy(列)` | `count(*)`・`GROUP BY`。Drizzle の `count()` は **number** で返る（第32章の `::int` が要らない） |
| `db.update(tasks).set({ … }).where(…)` | `UPDATE tasks SET … WHERE …` |
| `sql\`${tasks.version} + 1\`` | `version + 1`（データベースの中で計算する。第32章 6.2節） |
| `db.delete(tasks).where(…)` | `DELETE FROM tasks WHERE …` |
| `クエリ.toSQL()` | `await` する前のクエリから、送る SQL と値を取り出す（送らない） |

送った SQL を全部見たいときは、`SQL_LOG=1` を前に付けて動かします（`db.mjs` の `logger`）。

```sh
$ SQL_LOG=1 node queries.mjs
Query: select "title", "due_date" from "tasks" where ("tasks"."status" <> $1 and "tasks"."due_date" is not null) order by "tasks"."due_date" asc -- params: ["done"]
…
```

**気をつけること**（練習問題4で確かめます）:

- `db.update(tasks).set({ … })` に `.where()` を付け忘れると、**全部の行**が変わります。`db.delete(tasks)` も同じです。Drizzle は止めてくれません。
- `.where(undefined)` は「条件なし」になります。`and()` に1つも条件を渡さないと `undefined` が返るので、条件を組み立てるときは気をつけます。
- `.set({ titel: 'x' })` のように、無い列の名前を渡しても、Drizzle はエラーにせず、**黙って捨てます**。

## 5. つながった表と N+1

### 5.1 手を動かす: SQL を何回送っているか数える

「全部のタスクと、そのタグ」を、3つのやり方で読みます。`relations.mjs` を作ります（完成形は [samples/relations.mjs](samples/relations.mjs)）。

```js
import { drizzle } from 'drizzle-orm/node-postgres';
import { asc, eq } from 'drizzle-orm';
import { DATABASE_URL } from './db.mjs';
import * as schema from './schema.mjs';
import { tags, taskTags, tasks } from './schema.mjs';

// 送った SQL の数を数える logger
let queries = 0;
const db = drizzle(DATABASE_URL, { schema, logger: { logQuery: () => queries++ } });
async function measure(label, fn) {
  queries = 0;
  const result = await fn();
  console.log(`${label}: SQL ${queries} 回`, JSON.stringify(result));
}

// 1. タスクを読んでから、タスクごとにタグを読む（タスクが N 個なら、1 + N 回）
await measure('1. タスクごとに読む ', async () => {
  const list = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).orderBy(asc(tasks.id));
  for (const t of list) {
    const rows = await db.select({ name: tags.name }).from(taskTags).innerJoin(tags, eq(tags.id, taskTags.tagId)).where(eq(taskTags.taskId, t.id));
    t.tags = rows.map((r) => r.name);
  }
  return list;
});

// 2. JOIN で1回に読み、JavaScript でまとめる
await measure('2. JOIN で1回      ', async () => {
  const rows = await db
    .select({ id: tasks.id, title: tasks.title, tag: tags.name })
    .from(tasks)
    .leftJoin(taskTags, eq(taskTags.taskId, tasks.id))
    .leftJoin(tags, eq(tags.id, taskTags.tagId))
    .orderBy(asc(tasks.id), asc(tags.name));
  const byId = new Map();
  for (const r of rows) {
    if (!byId.has(r.id)) byId.set(r.id, { id: r.id, title: r.title, tags: [] });
    if (r.tag !== null) byId.get(r.id).tags.push(r.tag);
  }
  return [...byId.values()];
});

// 3. relations を使う db.query（Drizzle が1つの SQL にしてくれる）
await measure('3. db.query の with ', async () => {
  const list = await db.query.tasks.findMany({
    columns: { id: true, title: true },
    with: { taskTags: { columns: {}, with: { tag: { columns: { name: true } } } } },
    orderBy: (t, { asc }) => [asc(t.id)],
  });
  return list.map((t) => ({ id: t.id, title: t.title, tags: t.taskTags.map((x) => x.tag.name) }));
});

await db.$client.end();
```

```sh
$ node relations.mjs
1. タスクごとに読む : SQL 6 回 [{"id":1,"title":"牛乳を買う","tags":[]},{"id":2,"title":"本を返す","tags":["家"]},…]
2. JOIN で1回      : SQL 1 回 [{"id":1,"title":"牛乳を買う","tags":[]},{"id":2,"title":"本を返す","tags":["家"]},…]
3. db.query の with : SQL 1 回 [{"id":1,"title":"牛乳を買う","tags":[]},{"id":2,"title":"本を返す","tags":["家"]},…]
```

結果は同じですが、1つ目は SQL を 6 回送っています。タスクの一覧で1回、タスクごとに1回ずつ（5回）です。タスクが N 個なら 1 + N 回になるので、これを **N+1 の問題**と呼びます。

- 1回の SQL には、ネットワークの往復の時間がかかります（同じ Mac の中でも 0.1〜1 ミリ秒、別のサーバなら数ミリ秒）。タスクが 1000 個なら 1001 回です。
- ORM を使うと、`for` の中で `await db.select()…` を書きやすいので、N+1 が起きやすくなります。「`for` の中に `await db.`」を見たら、疑ってください。

| 直し方 | 書き方 |
| --- | --- |
| JOIN で1回に読み、JavaScript でまとめる | `.leftJoin(表, eq(…))`。`LEFT JOIN` なので、タグの無いタスクも残る（第30章 1節） |
| relations を使う `db.query` | `db.query.tasks.findMany({ with: { taskTags: { with: { tag: true } } } })`。Drizzle が1つの SQL にする |
| `inArray` でまとめて読む | 一覧の id を集め、`where(inArray(taskTags.taskId, ids))` で1回に（SQL は 2 回） |

`db.query` は、2節で書いた `relations` を使います。`columns` で欲しい列を選び、`with` でつながった表を付けます。

## 6. トランザクションとエラー

### 6.1 手を動かす: db.transaction と err.cause

`tx.mjs` を作ります（完成形は [samples/tx.mjs](samples/tx.mjs)）。

```js
import { count, eq } from 'drizzle-orm';
import { closeDb, db } from './db.mjs';
import { tags, taskTags, tasks } from './schema.mjs';

const countTasks = async () => (await db.select({ n: count() }).from(tasks))[0].n;
console.log('最初:', await countTasks());

// db.transaction(async (tx) => { … }) の中では、db の代わりに tx を使う。例外を投げると ROLLBACK
try {
  await db.transaction(async (tx) => {
    const [t] = await tx.insert(tasks).values({ title: '窓を拭く' }).returning();
    const [g] = await tx.insert(tags).values({ name: '掃除' }).onConflictDoNothing().returning();
    console.log('トランザクションの中:', t.id, g);
    await tx.insert(tasks).values({ title: '本を返す' }); // 終わっていない「本を返す」がもうある → 23505
  });
} catch (err) {
  // Drizzle は、pg のエラーを DrizzleQueryError で包む。元のエラーは err.cause
  console.log('失敗:', err.constructor.name);
  console.log('  err.cause.code:', err.cause?.code, ' err.cause.constraint:', err.cause?.constraint);
}
console.log('取り消された後:', await countTasks(), ' タグ「掃除」:', await db.select().from(tags).where(eq(tags.name, '掃除')));

// 自分の判断で取り消すときは tx.rollback()（例外を投げて抜ける）
try {
  await db.transaction(async (tx) => {
    await tx.delete(taskTags);
    const left = (await tx.select({ n: count() }).from(taskTags))[0].n;
    if (left === 0) tx.rollback(); // やっぱりやめる
  });
} catch (err) {
  console.log('rollback():', err.constructor.name);
}
console.log('task_tags:', (await db.select({ n: count() }).from(taskTags))[0].n, '行（消えていない）');
await closeDb();
```

```sh
$ node tx.mjs
最初: 5
トランザクションの中: 6 { id: 3, name: '掃除' }
失敗: DrizzleQueryError
  err.cause.code: 23505  err.cause.constraint: tasks_open_title
取り消された後: 5  タグ「掃除」: []
rollback(): TransactionRollbackError
task_tags: 3 行（消えていない）
```

| 書いたもの | 意味 |
| --- | --- |
| `db.transaction(async (tx) => { … })` | プールから接続を1本借りて `BEGIN`。関数が終われば `COMMIT`、例外なら `ROLLBACK` して投げ直す。最後に接続を返す（第32章 6.1節の `withTransaction` と同じ） |
| `tx.insert(…)` | 中では、`db` の代わりに **`tx`** を使う。`db` を使うと、別の接続で、トランザクションの外で動いてしまう |
| `.onConflictDoNothing()` | `ON CONFLICT DO NOTHING`（もうあれば、何もしない） |
| `err.cause` | Drizzle は、`pg` のエラーを `DrizzleQueryError` で包んで投げる。元のエラー（`code`・`constraint` がある）は `err.cause` |
| `tx.rollback()` | 自分の判断で取り消す。`TransactionRollbackError` を投げて抜ける |

- `err.code` を見ても、`undefined` です。**`err.cause?.code`** で見分けます。第32章の `statusForPgError` には、`err.cause ?? err` を渡します（7.2節）。
- `err.message` には、送った SQL と値が入っています。利用者に見せないでください（第32章 7節の `err.detail` と同じ）。

## 7. タスクの API を Drizzle に

### 7.1 手を動かす: リポジトリの Drizzle 版

`drizzle-task-repo.mjs` を作ります（完成形は [samples/drizzle-task-repo.mjs](samples/drizzle-task-repo.mjs)）。第32章の `pg-task-repo.mjs` と見比べてください。

```js
import { and, asc, eq, getTableColumns } from 'drizzle-orm';
import { tasks } from './schema.mjs';

// timestamptz は Date で来るので、第5部と同じ ISO 8601 の文字列にする
const iso = (d) => (d === null ? null : d.toISOString());

function toTask(row) {
  if (!row) return null;
  return { ...row, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt), completedAt: iso(row.completedAt) };
}

// tasks の列の JavaScript の名前（id は除く）。Drizzle は、知らない名前を黙って捨てるので、ここで断る
const COLUMN_KEYS = Object.keys(getTableColumns(tasks)).filter((k) => k !== 'id');
function pickColumns(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k === 'id') continue;
    if (!COLUMN_KEYS.includes(k)) throw new Error(`知らない項目です: ${k}`);
    out[k] = v;
  }
  return out;
}

// db には、drizzle() の戻り値か、db.transaction が渡す tx のどちらを渡してもよい
export function createDrizzleTaskRepo(db) {
  return {
    async list() {
      return (await db.select().from(tasks).orderBy(asc(tasks.id))).map(toTask);
    },

    async get(id) {
      const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
      return toTask(row);
    },

    async insert(fields) {
      const [row] = await db.insert(tasks).values(pickColumns(fields)).returning();
      return toTask(row);
    },

    async update(id, fields, { expectedVersion } = {}) {
      const values = pickColumns(fields);
      if (Object.keys(values).length === 0) return this.get(id);
      const where = expectedVersion === undefined ? eq(tasks.id, id) : and(eq(tasks.id, id), eq(tasks.version, expectedVersion));
      const [row] = await db.update(tasks).set(values).where(where).returning();
      return toTask(row);
    },

    async remove(id, { expectedVersion } = {}) {
      const where = expectedVersion === undefined ? eq(tasks.id, id) : and(eq(tasks.id, id), eq(tasks.version, expectedVersion));
      const deleted = await db.delete(tasks).where(where).returning({ id: tasks.id });
      return deleted.length > 0;
    },
  };
}
```

- 関数の名前と、渡すもの・返すもの（`list`・`get`・`insert`・`update`・`remove`）は、第31・32章と同じです。リポジトリの形をそろえておくと、中身を取り替えても、API のプログラムは変えなくて済みます。
- `$1` の番号合わせ、`due_date` ↔ `dueDate` の変換が無くなりました。
- `getTableColumns(tasks)` は、表の列の `{ JavaScript の名前: 列 }` を返します。Drizzle は知らない名前を黙って捨てる（4.2節）ので、ここで断ります。
- `timestamptz` は `Date` で返るので、`toTask` で ISO 8601 の文字列にします（第32章と同じ）。

### 7.2 手を動かす: Drizzle に保存するタスクの API

`server.mjs` を作ります。第32章の `server.mjs` から、上の方（つなぐ所・マイグレーション・リポジトリ）と、エラーの読み替えの1行だけを変えます（完成形は [samples/server.mjs](samples/server.mjs)。`pg-errors.mjs` は第32章と同じものを [samples/pg-errors.mjs](samples/pg-errors.mjs) からコピーします）。

```js
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, closeDb } from './db.mjs';
import { createDrizzleTaskRepo } from './drizzle-task-repo.mjs';
import { statusForPgError } from './pg-errors.mjs';

const PORT = 9447;
// drizzle-kit generate で作った SQL のファイルを、まだなら動かす（済んだものは drizzle.__drizzle_migrations に覚える）
await migrate(db, { migrationsFolder: path.join(import.meta.dirname, 'drizzle') });
const repo = createDrizzleTaskRepo(db);

class HttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
  }
}
const parseId = (s) => (/^[1-9]\d{0,8}$/.test(s) ? Number(s) : null);

function mustBeString(value, name, { nullable = false } = {}) {
  if (typeof value === 'string' || (nullable && value === null)) return value;
  throw new HttpError(422, `${name} は文字列で送ってください`);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/api/tasks', async (req, res) => {
  res.json(await repo.list());
});

app.get('/api/tasks/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const task = id && (await repo.get(id));
  if (!task) throw new HttpError(404, `タスク ${req.params.id} はありません`);
  res.json(task);
});

app.post('/api/tasks', async (req, res) => {
  const title = mustBeString(req.body?.title, 'title');
  const dueDate = mustBeString(req.body?.dueDate ?? null, 'dueDate', { nullable: true });
  const task = await repo.insert({ title, dueDate });
  res.status(201).location(`/api/tasks/${task.id}`).json(task);
});

app.patch('/api/tasks/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const { version, title, status } = req.body ?? {};
  if (!Number.isInteger(version)) throw new HttpError(400, 'version（読んだときの版）を送ってください');
  const now = new Date();
  const fields = { updatedAt: now, version: version + 1 };
  if (title !== undefined) fields.title = mustBeString(title, 'title');
  if (status !== undefined) {
    fields.status = mustBeString(status, 'status');
    fields.completedAt = status === 'done' ? now : null;
  }
  const task = id && (await repo.update(id, fields, { expectedVersion: version }));
  if (task) return res.json(task);
  if (!(id && (await repo.get(id)))) throw new HttpError(404, `タスク ${req.params.id} はありません`);
  throw new HttpError(409, 'ほかの人が先に変えました。読み直してください');
});

app.delete('/api/tasks/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!(id && (await repo.remove(id)))) throw new HttpError(404, `タスク ${req.params.id} はありません`);
  res.sendStatus(204);
});

const DB_DETAIL = {
  409: 'ほかのデータとぶつかりました（同じ題名の、終わっていないタスクがあります）',
  422: '送られた値が決まりに合いません（題名は 1〜100 文字、status は todo・doing・done、dueDate は YYYY-MM-DD）',
};
app.use((err, req, res, next) => {
  // Drizzle は pg のエラーを DrizzleQueryError で包むので、元のエラー（err.cause）で見分ける
  const dbStatus = statusForPgError(err.cause ?? err);
  const known = err instanceof HttpError || err.expose === true;
  const status = known ? err.status : (dbStatus ?? 500);
  if (status === 500) console.error(err);
  res.status(status).type('application/problem+json').json({
    type: 'about:blank',
    title: http.STATUS_CODES[status],
    status,
    detail: known ? err.message : (DB_DETAIL[dbStatus] ?? 'サーバの中でエラーが起きました'),
  });
});

const server = app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/api/tasks で待っています（Ctrl+C で止める）`));

process.on('SIGINT', () => {
  server.close(async () => {
    await closeDb();
    process.exit(0);
  });
});
```

| 変えた所 | 第32章 | この章 |
| --- | --- | --- |
| つなぐ | `createPool({ max: 10 })` | `db.mjs` の `db` |
| マイグレーション | 自分で書いた `migrate(pool, 'migrations')` | Drizzle の `migrate(db, { migrationsFolder })`。3節の `drizzle/` を、まだなら当てる |
| リポジトリ | `createPgTaskRepo(pool)` | `createDrizzleTaskRepo(db)` |
| エラーの読み替え | `statusForPgError(err)` | `statusForPgError(err.cause ?? err)` |
| 止める | `pool.end()` | `closeDb()` |

```sh
$ node server.mjs
http://127.0.0.1:9447/api/tasks で待っています（Ctrl+C で止める）
```

別のターミナルで、第32章 8.3節と同じことを試します。

```sh
$ curl -s http://127.0.0.1:9447/api/tasks/2
{"id":2,"title":"本を返す","status":"todo","dueDate":"2026-11-12",…,"version":2}
$ curl -s -X POST -H 'content-type: application/json' -d '{"title":"本を返す"}' http://127.0.0.1:9447/api/tasks
{"type":"about:blank","title":"Conflict","status":409,"detail":"ほかのデータとぶつかりました（同じ題名の、終わっていないタスクがあります）"}
$ curl -s -X POST -H 'content-type: application/json' -d '{"title":"x","dueDate":"2026-13-45"}' http://127.0.0.1:9447/api/tasks
{"type":"about:blank","title":"Unprocessable Entity","status":422,"detail":"送られた値が決まりに合いません（…、dueDate は YYYY-MM-DD）"}
```

（4.2節の `queries.mjs` で「本を返す」の version が 2 になっています。`node seed.mjs` で入れ直すと 1 に戻ります。）

## 8. ORM を使うか、SQL を書くか

| 場面 | 向いているもの |
| --- | --- |
| ふつうの読み書き（1つの表、JOIN、条件の組み合わせ） | クエリビルダ。列の名前のまちがいに気づきやすく、条件を組み立てやすい |
| つながった表をまとめて読む | `db.query` の `with`、か JOIN |
| ウィンドウ関数・`FOR UPDATE SKIP LOCKED`・複雑な集計 | `sql\`…\`` を混ぜる、か `db.execute(sql\`…\`)`。無理に ORM の関数で書かない |
| 表の形を変える | drizzle-kit の `generate`（できた SQL は必ず読む） |

`sql\`…\`` の中の `${値}` も、文字列に埋め込まれず、`$1` として送られます。ただし、`sql.raw(文字列)` は、文字列をそのまま SQL に入れる（第31章 1節の、危ない書き方と同じ）ので、利用者から来た値には使いません。

この教材の第6部の成果物は、第32章の `pg` のまま作ります（SQL を直接読み書きできることを優先）。Drizzle は、第10部以降で使う場面があります。

## 9. Flask との対応

| やりたいこと | Flask（Python） | この章 |
| --- | --- | --- |
| ORM | SQLAlchemy（Flask-SQLAlchemy） | Drizzle ORM |
| 表の形を書く | `class Task(db.Model): title = db.Column(db.Text, nullable=False)` | `pgTable('tasks', { title: text().notNull() })` |
| マイグレーションを作る | Alembic（Flask-Migrate）の `flask db migrate -m "…"` | `npx drizzle-kit generate --name …` |
| マイグレーションを当てる | `flask db upgrade` | `npx drizzle-kit migrate`、か `migrate(db, { migrationsFolder })` |
| 選ぶ | `db.session.execute(db.select(Task).where(Task.status == 'todo'))` | `db.select().from(tasks).where(eq(tasks.status, 'todo'))` |
| つながった表 | `relationship()`、`selectinload(Task.tags)`（N+1 を避ける） | `relations()`、`db.query.tasks.findMany({ with: … })` |
| トランザクション | `db.session.commit()`・`rollback()` | `db.transaction(async (tx) => …)` |
| 送った SQL を見る | `SQLALCHEMY_ECHO = True` | `logger: true` |

SQLAlchemy は、行を Python のオブジェクトにして、そのオブジェクトを書き換えると `commit()` で UPDATE を送る、という作りです（Unit of Work）。Drizzle は、そうした「オブジェクトの変化を見張る」仕組みを持たず、`db.update()` を呼んだときに UPDATE を送ります。送る SQL が見えやすいのが Drizzle、Python のオブジェクトとして扱いやすいのが SQLAlchemy です。

## まとめ

- ORM は、表の形を一度 JavaScript で書けば、SQL の組み立てと、列の名前の変換をしてくれる。ただし、送る SQL は `toSQL()` や `SQL_LOG=1` で確かめる。
- スキーマは `pgTable('表', { 列 }, (t) => [制約])`。制約には名前を付ける。
- `npx drizzle-kit generate --name …` で SQL のファイルを作り、読んで確かめてから `migrate` で当てる。当てたファイルと `drizzle/meta/` は書き換えない。
- `db.select().from().where().orderBy()`・`db.insert().values().returning()`・`db.update().set().where()`・`db.delete().where()`。`where` の付け忘れ、`where(undefined)`、無い列の名前は、Drizzle が止めてくれない。
- `for` の中の `await db.…` は N+1。JOIN か `db.query` の `with` で、SQL の回数を減らす。
- `db.transaction(async (tx) => …)` の中では `tx` を使う。エラーは `DrizzleQueryError` に包まれるので、`err.cause.code` で見分ける。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。テストは PostgreSQL を使うので、先に `docker compose up -d --wait` で動かしておきます。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Drizzle ORM 公式: https://orm.drizzle.team/docs/overview （「Schema」「Select」「Insert」「Update」「Delete」「Joins」「Query」「Transactions」）
- Drizzle 公式「Migrations」: https://orm.drizzle.team/docs/migrations
- Drizzle 公式「drizzle-kit generate」: https://orm.drizzle.team/docs/drizzle-kit-generate
- Drizzle 公式「Relational queries」: https://orm.drizzle.team/docs/rqb
- SQLAlchemy 公式「ORM Quick Start」: https://docs.sqlalchemy.org/en/20/orm/quickstart.html
- Alembic 公式「Tutorial」: https://alembic.sqlalchemy.org/en/latest/tutorial.html

---

前: [第32章 Docker と PostgreSQL](../ch32-docker-postgres/README.md) ／ 次: [第34章 キャッシュと Redis 入門](../ch34-redis/README.md) ／ 部の目次: [第6部 データベース](../README.md)
