# 第31章 Node.js からデータベースを使う

第29・30章では、SQL そのものを学びました。この章では、それを Web アプリの中で使う形にします。第5部 第26章では、アプリを「ルート → サービス → データの層（リポジトリ）」の3つの層に分け、データの層はメモリの `Map` で書きました。この章では、同じ形のデータの層を SQLite で書き、Express の API につなぎます。
その途中で、Web アプリでデータベースを使うときに必ず守ること（値は `?` で渡す、列の名前は決めた中から選ぶ、テーブルの形をマイグレーションで変える、制約のエラーを 409・422 にする）を、1つずつ手を動かして確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第29・30章、第5部 第25章（Problem Details、ETag と `If-Match`）、第26章（3つの層、リポジトリ） |
| この章のゴール | 値を `?` で渡す理由を説明でき、列の名前は決めた表から選べる / 行（`due_date`）とタスク（`dueDate`）を変換できる / 第5部と同じ形のリポジトリを SQLite で書ける / トランザクションの関数を作って使える / マイグレーションでテーブルの形を順に変えられる / 制約のエラーを見分けて 409・422 で返せる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形と部品（`quote.mjs`・`row-map.mjs`・`task-repo.mjs`・`repo-try.mjs`・`with-transaction.mjs`・`tx.mjs`・`migrations.mjs`・`migrate-try.mjs`・`sqlite-errors.mjs`・`db-errors.mjs`・`server.mjs`）と、タスクのテーブルを作る部品 `task-db.mjs` |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、すべて `~/dev/part06/ch31-node-db/` で実行します。
>
>   ```sh
>   $ cd ~/dev/part06/ch31-node-db
>   ```
>
> - 「**手を動かす**」の所は、新しいファイルに書いて動かしてください。ファイルの完成形は `samples/` にあります。
> - 7節で、ポート **9427** でサーバを動かします。止めるときは、そのターミナルで Ctrl+C を押します。
> - 7節のサーバは Express を使います。Express は、第29章の最初に `setup-part06.sh` で `~/dev/part06/node_modules` に入っています。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| 値は `?`、列の名前は決めた表から（1節） | 第32章（PostgreSQL の `$1`）、第10部 第55章（インジェクションをまとめて扱う） |
| 行とタスクの変換、リポジトリ（2・3節） | 第32章（同じ形の PostgreSQL 版）、第33章（Drizzle 版）、成果物 |
| トランザクションの関数（4節） | 第32章（PostgreSQL では接続を1つ借りて行う）、成果物 |
| マイグレーション（5節） | 第32章（SQL のファイルで）、第33章（drizzle-kit で作る）、成果物 |
| 制約のエラーを 409・422 に（6節） | 第32章（PostgreSQL のエラーコード 23505 など）、成果物 |

---

## 0. この章で使うテーブル

[samples/task-db.mjs](samples/task-db.mjs) の `createTaskDb()` が、メモリの中に `tasks` を作ります。列は、第5部の成果物のタスク（`id`・`title`・`status`・`dueDate`・`createdAt`・`updatedAt`・`completedAt`・`version`）に合わせてあります。

| id | title | status | due_date | version |
| --- | --- | --- | --- | --- |
| 1 | 牛乳を買う | done | 2026-11-01 | 2 |
| 2 | 本を返す | todo | 2026-11-12 | 1 |
| 3 | 部屋の掃除 | doing | 2026-11-15 | 2 |
| 4 | Let's ストレッチ | todo | NULL | 1 |
| 5 | 報告書を書く | todo | 2026-11-10 | 1 |

（`created_at`・`updated_at`・`completed_at` もあります。`created_at` は id の順に新しくなります。）

決まり（制約）は次のとおりです。最後の `tasks_open_title` は6節で説明します。

```sql
title   TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100)
status  TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done'))
CREATE UNIQUE INDEX tasks_open_title ON tasks (title) WHERE status <> 'done';
```

手を動かす前に、部品を今のフォルダにコピーしておきます。

```sh
$ cp samples/task-db.mjs .
```

## 1. 値は `?` で渡す

第29章から、値は `?` で渡してきました。この節では、その理由を確かめます。

### 1.1 手を動かす: 値を SQL に書き込むと壊れる

検索の欄に `Let's` と打たれたとします。`quote.mjs` を作ります（完成形は [samples/quote.mjs](samples/quote.mjs)）。

```js
import { createTaskDb } from './task-db.mjs';

const db = createTaskDb();
const word = "Let's"; // 利用者が検索の欄に打った文字だとする

// よくない書き方: 値を SQL の文字列に、そのまま書き込む
try {
  const sql = `SELECT id, title FROM tasks WHERE title LIKE '%${word}%'`;
  console.log('作った SQL:', sql);
  console.log(db.prepare(sql).all());
} catch (err) {
  console.log('エラー:', err.message);
}

// よい書き方: SQL には ? だけを書き、値は別に渡す
const rows = db.prepare('SELECT id, title FROM tasks WHERE title LIKE ?').all(`%${word}%`);
console.log('? で渡した結果:', rows);

// 名前で渡す: SQL に $名前 と書き、オブジェクトで渡す
const task = db.prepare('SELECT id, title FROM tasks WHERE status = $status AND id > $minId').all({ status: 'todo', minId: 2 });
console.log('名前で渡した結果:', task);

db.close();
```

```sh
$ node quote.mjs
作った SQL: SELECT id, title FROM tasks WHERE title LIKE '%Let's%'
エラー: near "s": syntax error
? で渡した結果: [ [Object: null prototype] { id: 4, title: "Let's ストレッチ" } ]
名前で渡した結果: [
  [Object: null prototype] { id: 4, title: "Let's ストレッチ" },
  [Object: null prototype] { id: 5, title: '報告書を書く' }
]
```

値を `${word}` で SQL に書き込むと、`Let's` の `'` が「文字列の終わり」と読まれ、その後ろの `s%'` が SQL の続きとして読まれました。ここでは文法の間違いで済みましたが、これは「**利用者が打った文字が、SQL の一部として読まれる**」ということです。悪意のある人は、`'` の後ろに SQL として意味のある文字を続けて、条件を変えたり、ほかのデータを読んだりできます。これを **SQL インジェクション**と呼び、Web アプリの代表的な弱点の1つです。

`?` で渡すと、データベースは SQL の文の形を先に決め（`prepare`）、値は後から「ただの値」として入れます。値の中にどんな文字があっても、SQL の文の形は変わりません。

| 書き方 | 意味 |
| --- | --- |
| `prepare('… LIKE ?').all(値)` | `?` に、前から順に値が入る |
| `` `%${word}%` `` を値にする | `LIKE` の `%` は、SQL ではなく、渡す値の側に付ける |
| `prepare('… status = $status').all({ status: 'todo' })` | `$名前` と書き、オブジェクトで渡す。値が多いときに、順番の間違いが起きない（`:名前`・`@名前` とも書ける） |

**値を SQL の文字列に書き込まない**。これだけ守れば、SQL インジェクションは起きません。`'` を `''` に置き換える、のような自分で考えた手当ては、抜けが出やすいので使いません。

### 1.2 `?` で渡せないもの: 列の名前

`?` で渡せるのは「値」だけです。テーブルや列の名前、`ASC`・`DESC`、`PRAGMA` の数は、`?` にできません。

```sh
$ node -e "import('./task-db.mjs').then(({ createTaskDb }) => console.log(createTaskDb().prepare('SELECT id FROM tasks ORDER BY ?').all('title')))"
```

これはエラーにはなりませんが、`'title'` という**文字列の値**で並べることになり、どの行も同じ値なので、並び替わりません。

一覧の API で `?sort=dueDate` のように並べ方を選ばせたいときは、**決めた表から選ぶ**（許可リスト）ようにします。

```js
const SORTABLE = { id: 'id', title: 'title', dueDate: 'due_date' };
if (!Object.hasOwn(SORTABLE, key)) throw new RangeError(`並べ替えに使えない項目です: ${key}`);
const sql = `SELECT * FROM tasks ORDER BY ${SORTABLE[key]}`; // 書き込むのは、自分で書いた列の名前だけ
```

- 外から来た `key` は、SQL に入れません。入れるのは、表の中の、自分で書いた文字列（`'due_date'`）だけです。
- `Object.hasOwn(obj, key)` は、`obj` が `key` という名前を**自分で**持っているか、です。`SORTABLE[key]` だけで調べると、`toString` のように、どのオブジェクトも持っている名前が通ってしまいます。

## 2. 行とタスクの形を変換する

データベースの列は `due_date` のように `_` でつなぎ（スネークケース）、JavaScript と JSON では `dueDate` のように大文字でつなぎます（キャメルケース）。第5部の API は `dueDate` で返していたので、データの層で変換します。

### 2.1 手を動かす: 行をタスクにする

`row-map.mjs` を作ります（完成形は [samples/row-map.mjs](samples/row-map.mjs)）。

```js
import { createTaskDb } from './task-db.mjs';

// データベースの列の名前（スネークケース）→ JavaScript の名前（キャメルケース）
function toTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    version: row.version,
  };
}

const db = createTaskDb();
const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(2);
console.log('データベースの行:', row);
console.log('タスク:', toTask(row));
console.log('無い id:', toTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(99)));
console.log('JSON にすると:', JSON.stringify(toTask(row)));
db.close();
```

```sh
$ node row-map.mjs
データベースの行: [Object: null prototype] {
  id: 2,
  title: '本を返す',
  status: 'todo',
  due_date: '2026-11-12',
  …
}
タスク: {
  id: 2,
  title: '本を返す',
  status: 'todo',
  dueDate: '2026-11-12',
  …
}
無い id: null
JSON にすると: {"id":2,"title":"本を返す","status":"todo","dueDate":"2026-11-12",…}
```

- 変換を1か所（`toTask`）にまとめておくと、列を足したときに直す所が1つで済みます。
- `get()` は、行が無いと `undefined` を返します。`toTask` は、それを `null` にします（第5部のメモリのリポジトリも、無いときは `null` でした）。
- `toTask` が作るのは、ふつうのオブジェクトです。`[Object: null prototype]` ではないので、テストの `deepEqual` でも、そのまま比べられます。

値の型も、JavaScript とデータベースで少し違います。

| JavaScript | SQLite に `?` で渡すと | 読み出すと |
| --- | --- | --- |
| 文字列 | `TEXT` | 文字列 |
| 数（整数） | `INTEGER` | 数 |
| `null` | `NULL` | `null` |
| `true`・`false` | `1`・`0` | 数の `1`・`0`（`true` には戻らない） |
| `undefined` | エラー（`TypeError: Provided value cannot be bound`） | — |
| オブジェクト（`{ … }`・`Date` も） | 2つ目からの引数ならエラー。**1つ目の引数だと、エラーにならず `NULL` になる**（1つ目のオブジェクトは「`$名前` の値の入れ物」と取られ、`?` には何も入らない） | `null` |

最後の行に気を付けてください。`.run(new Date())` のように `Date` を1つ目に渡すと、エラーにならずに `NULL` が入ります。日時は、`new Date().toISOString()` の文字列（`'2026-11-11T08:25:10.154Z'`）にしてから渡します。
この形の文字列は、文字列の順と時刻の順が同じなので、`ORDER BY` や `<` がそのまま使えます（第30章 6節の日付と同じ理由です）。

## 3. リポジトリを SQLite で書く

第5部 第26章のリポジトリ（`createMemoryTaskRepo`）は、`list`・`get`・`insert`・`update`・`remove` の5つを持っていました。同じ名前・同じ引数・同じ戻り値で SQLite 版を作れば、サービスの層とルートの層は1行も変えずに、データの置き場所だけを取り替えられます。

### 3.1 手を動かす: SQLite のリポジトリ

`task-repo.mjs` を作ります（完成形は [samples/task-repo.mjs](samples/task-repo.mjs)）。

```js

// JavaScript の名前 → 列の名前。ここに無い名前は、SQL に入れない（1節: 列の名前は ? で渡せないので、決めた中から選ぶ）
const COLUMNS = {
  title: 'title',
  status: 'status',
  dueDate: 'due_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  completedAt: 'completed_at',
  version: 'version',
};

function column(key) {
  if (!Object.hasOwn(COLUMNS, key)) throw new Error(`知らない項目です: ${key}`);
  return COLUMNS[key];
}

function toTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    version: row.version,
  };
}

export function createSqliteTaskRepo(db) {
  // 毎回同じ SQL は、最初に1回だけ prepare しておく
  const listStmt = db.prepare('SELECT * FROM tasks ORDER BY id');
  const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');

  return {
    async list() {
      return listStmt.all().map(toTask);
    },

    async get(id) {
      return toTask(getStmt.get(id));
    },

    async insert(fields) {
      const keys = Object.keys(fields);
      const cols = keys.map(column).join(', ');
      const marks = keys.map(() => '?').join(', ');
      const row = db
        .prepare(`INSERT INTO tasks (${cols}) VALUES (${marks}) RETURNING *`)
        .get(...keys.map((k) => fields[k]));
      return toTask(row);
    },

    // expectedVersion を渡されたら、今の version が同じときだけ変える。無い・違うときは null
    async update(id, fields, { expectedVersion } = {}) {
      const keys = Object.keys(fields).filter((k) => k !== 'id'); // id は変えさせない
      if (keys.length === 0) return this.get(id);
      const sets = keys.map((k) => `${column(k)} = ?`).join(', ');
      const values = keys.map((k) => fields[k]);
      let sql = `UPDATE tasks SET ${sets} WHERE id = ?`;
      values.push(id);
      if (expectedVersion !== undefined) {
        sql += ' AND version = ?';
        values.push(expectedVersion);
      }
      return toTask(db.prepare(`${sql} RETURNING *`).get(...values));
    },

    async remove(id, { expectedVersion } = {}) {
      const r =
        expectedVersion === undefined
          ? db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
          : db.prepare('DELETE FROM tasks WHERE id = ? AND version = ?').run(id, expectedVersion);
      return r.changes > 0;
    },
  };
}
```

続けて、試す `repo-try.mjs` を作ります（完成形は [samples/repo-try.mjs](samples/repo-try.mjs)）。

```js
import { createTaskDb } from './task-db.mjs';
import { createSqliteTaskRepo } from './task-repo.mjs';

const db = createTaskDb();
const repo = createSqliteTaskRepo(db);

const now = new Date().toISOString();
const created = await repo.insert({ title: '花に水をやる', status: 'todo', dueDate: null, createdAt: now, updatedAt: now, completedAt: null, version: 1 });
console.log('insert:', created);

console.log('update（version 1 のつもり）:', await repo.update(created.id, { title: '花と木に水をやる', version: 2 }, { expectedVersion: 1 }));
console.log('update（古い version 1 のまま）:', await repo.update(created.id, { title: '別の題名', version: 2 }, { expectedVersion: 1 }));

console.log('remove:', await repo.remove(created.id));
console.log('get（消した後）:', await repo.get(created.id));
console.log('list の題名:', (await repo.list()).map((t) => t.title));

try {
  await repo.update(2, { owner: 'bob' });
} catch (err) {
  console.log('知らない項目:', err.message);
}
db.close();
```

```sh
$ node repo-try.mjs
insert: {
  id: 6,
  title: '花に水をやる',
  status: 'todo',
  dueDate: null,
  createdAt: '2026-11-11T08:25:10.154Z',
  …
  version: 1
}
update（version 1 のつもり）: { id: 6, title: '花と木に水をやる', …, version: 2 }
update（古い version 1 のまま）: null
remove: true
get（消した後）: null
list の題名: [ '牛乳を買う', '本を返す', '部屋の掃除', "Let's ストレッチ", '報告書を書く' ]
知らない項目: 知らない項目です: owner
```

| 書いたもの | 意味 |
| --- | --- |
| `COLUMNS` と `column(key)` | JavaScript の名前を列の名前に直す表。表に無い名前は例外にする（1.2節の許可リスト） |
| `db.prepare(…)` を `createSqliteTaskRepo` の最初に | 毎回同じ SQL は、最初に1回だけ準備しておく。何回も `get` するときに速い |
| `INSERT INTO tasks (${cols}) VALUES (${marks})` | 渡された項目の数だけ、列の名前と `?` を並べる。`cols` には `COLUMNS` の中の文字列だけが入る |
| `keys.map(() => '?').join(', ')` | 項目が3つなら `'?, ?, ?'` |
| `RETURNING *` | 足した・変えた後の行を、全部の列で返す（第30章 5節） |
| `.get(...values)` | 配列を `...` で広げて、`?` に前から順に渡す |
| `async list() { … }` | SQLite は同期で動くので `async` は要らないが、メモリ版と同じ形（Promise を返す）にそろえる。第32章の PostgreSQL 版は、本当に `await` が要る |
| `return this.get(id)` | 変える項目が無ければ、今のタスクを返す。`this` は、このオブジェクト（リポジトリ）自身 |

- `update` に渡す `fields` の名前（`title`・`dueDate` など）は、サービスの層が決めます。外から来たボディをそのまま渡すことはありませんが、それでも許可リストを通します。データの層の入口で守っておくと、上の層に間違いがあっても、SQL に知らない名前が入ることはありません。
- `expectedVersion` は、第30章 5節の `WHERE id = ? AND version = ?` です。メモリ版と同じく、無い・違うときは `null` を返します。どちらだったかは、呼んだ側が `get` で調べます（7節）。

## 4. トランザクションの関数

第30章 4節では、`BEGIN`・`COMMIT`・`ROLLBACK` と `try`・`catch` を毎回書きました。何回も使うので、関数にまとめます。

### 4.1 手を動かす: `withTransaction`

`with-transaction.mjs` を作ります（完成形は [samples/with-transaction.mjs](samples/with-transaction.mjs)）。

```js

// fn を1つのトランザクションの中で動かし、fn の戻り値を返す。fn が例外を投げたら、全部取り消して投げ直す
// fn は同期の関数にする（DatabaseSync は同期なので。await をはさむと、その間にほかの処理の SQL が混ざる）
export function withTransaction(db, fn) {
  if (db.isTransaction) return fn(); // もう外側のトランザクションの中なら、そこに加わる
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
```

試す `tx.mjs` を作ります（完成形は [samples/tx.mjs](samples/tx.mjs)）。

```js
import { createTaskDb } from './task-db.mjs';
import { withTransaction } from './with-transaction.mjs';

const db = createTaskDb();
const now = '2026-11-11T00:00:00.000Z';
const insert = db.prepare(`INSERT INTO tasks (title, created_at, updated_at) VALUES (?, ?, ?) RETURNING id`);
const count = () => db.prepare('SELECT count(*) AS n FROM tasks').get().n;

const ids = withTransaction(db, () => [insert.get('窓を拭く', now, now).id, insert.get('靴を洗う', now, now).id]);
console.log('足した id:', ids, '件数:', count());

try {
  withTransaction(db, () => {
    insert.get('棚を作る', now, now);
    insert.get('', now, now); // 空の題名は CHECK で断られる
  });
} catch (err) {
  console.log('失敗:', err.message, '件数:', count(), '（棚を作る も取り消された）');
}
console.log('トランザクションは閉じている:', !db.isTransaction);
db.close();
```

```sh
$ node tx.mjs
足した id: [ 6, 7 ] 件数: 7
失敗: CHECK constraint failed: length(title) BETWEEN 1 AND 100 件数: 7 （棚を作る も取り消された）
トランザクションは閉じている: true
```

| 書いたもの | 意味 |
| --- | --- |
| `withTransaction(db, fn)` | 関数 `fn` を受け取り、トランザクションの中で呼ぶ。`fn` の戻り値を、そのまま返す |
| `db.isTransaction` | 今トランザクションの中なら `true` |
| `if (db.isTransaction) return fn();` | 外側のトランザクションの中で呼ばれたら、新しく `BEGIN` せず（2回 `BEGIN` するとエラー）、外側に加わる。外側が取り消されれば、一緒に取り消される |

- `fn` は**同期の関数**にします。`DatabaseSync` は、SQL を1つずつその場で動かすので、`fn` の中に `await` があると、待っている間に、ほかのリクエストの SQL が同じトランザクションに混ざってしまいます。そのため、リポジトリ（`async` のメソッド）は `withTransaction` の中では使わず、`prepare` した文を直接使います。
- PostgreSQL では、接続（クライアント）を1つ借りて、その接続でトランザクションをするので、`await` を使えます。第32章で、`async` 版の `withTransaction` を作ります。

## 5. マイグレーション: テーブルの形を順に変える

アプリを作っていくと、「終わった時刻の列を足したい」「インデックスを足したい」のように、テーブルの形を変えたくなります。手元のデータベースなら消して作り直せますが、利用者のデータが入ったデータベースは消せません。
そこで、テーブルの形の変え方を「手順の列」として書いておき、データベースごとに「どこまで済んだか」を覚えておいて、まだの手順だけを動かします。これを**マイグレーション**と呼びます。

### 5.1 手を動かす: 手順を並べて、順に動かす

`migrations.mjs` を作ります（完成形は [samples/migrations.mjs](samples/migrations.mjs)）。

```js

// 並べた順に1回ずつ動かす。一度配った手順は書き換えず、変えたいときは後ろに足す
export const MIGRATIONS = [
  // 1: タスクのテーブル
  `CREATE TABLE tasks (
     id         INTEGER PRIMARY KEY,
     title      TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
     status     TEXT    NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
     due_date   TEXT,
     created_at TEXT    NOT NULL,
     updated_at TEXT    NOT NULL,
     version    INTEGER NOT NULL DEFAULT 1
   )`,
  // 2: 終わっていないタスクの中では、題名が重ならない
  `CREATE UNIQUE INDEX tasks_open_title ON tasks (title) WHERE status <> 'done'`,
  // 3: 終わった時刻の列を足す
  `ALTER TABLE tasks ADD COLUMN completed_at TEXT`,
];

// 今の版（PRAGMA user_version）より後の手順を、1つずつトランザクションの中で動かす
export function migrate(db, migrations = MIGRATIONS) {
  const from = db.prepare('PRAGMA user_version').get().user_version;
  for (let v = from; v < migrations.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(migrations[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`); // PRAGMA には ? が使えない。v は自分のコードの数なので、書き込んでよい
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`マイグレーション ${v + 1} に失敗しました: ${err.message}`, { cause: err });
    }
  }
  return { from, to: Math.max(from, migrations.length) };
}
```

ファイルのデータベースにかけて試す `migrate-try.mjs` を作り、2回動かします（完成形は [samples/migrate-try.mjs](samples/migrate-try.mjs)）。

```js
import { DatabaseSync } from 'node:sqlite';
import { migrate } from './migrations.mjs';

const db = new DatabaseSync('app.db');
const { from, to } = migrate(db);
console.log(from === to ? `もう最新です（版 ${to}）` : `版 ${from} → ${to} にしました`);
console.log('列:', db.prepare('PRAGMA table_info(tasks)').all().map((c) => c.name).join(', '));
db.close();
```

```sh
$ node migrate-try.mjs
版 0 → 3 にしました
列: id, title, status, due_date, created_at, updated_at, version, completed_at
$ node migrate-try.mjs
もう最新です（版 3）
列: id, title, status, due_date, created_at, updated_at, version, completed_at
```

| 書いたもの | 意味 |
| --- | --- |
| `PRAGMA user_version` | SQLite のファイルに1つだけ持てる、自由に使える整数。最初は 0。ここでは「済んだ手順の数」（版）に使う |
| `PRAGMA user_version = 3` | 版を書き込む。`PRAGMA` には `?` が使えないので、数を文字列に入れる（自分のコードが作る数なので、安全） |
| `ALTER TABLE tasks ADD COLUMN completed_at TEXT` | 今あるテーブルに列を足す。今ある行のその列は `NULL`（`DEFAULT` を書けばその値） |
| `PRAGMA table_info(tasks)` | テーブルの列の一覧を、1列1行で返す。`name` が列の名前 |
| `new Error('…', { cause: err })` | 新しいエラーに、元のエラーを `cause` として付ける。元の詳しい理由が消えない |

- 手順は、1つずつ別のトランザクションで動かし、成功したら版を上げます。途中で失敗すると、その手順と版の書き込みが一緒に取り消されるので、「列は足したのに版が古い」状態になりません（SQLite では、`CREATE`・`ALTER` もトランザクションで取り消せます）。
- **一度ほかの人やサーバに配った手順は、書き換えません。** もう動いた手順を書き換えても、版が先に進んだデータベースでは、二度と動かないからです。直したいときは、直す手順を後ろに足します。
- `ALTER TABLE … ADD COLUMN` で `NOT NULL` の列を足すときは、`DEFAULT` が必要です（今ある行に入れる値が要るので）。例: `ADD COLUMN priority INTEGER NOT NULL DEFAULT 2`。
- 作り直したいときは、`app.db` を消してから、もう一度 `node migrate-try.mjs` を動かします（`rm app.db`。`rm` はファイルを消すコマンドで、ゴミ箱には入りません）。

Flask では、**Flask-Migrate**（中身は Alembic）が同じことをします。`flask db migrate` で手順のファイルを作り、`flask db upgrade` で動かし、済んだ版をデータベースの `alembic_version` という表に覚えます。第33章では、drizzle-kit で同じことをします。

## 6. 制約のエラーを 409・422 にする

第5部の成果物では、「終わっていないタスクの中で、題名が重ならない」を、サービスの層で `repo.list()` を読んで確かめていました。これには穴があります。2つのリクエストが同時に来ると、どちらも「まだ無い」と読んでから足すので、重なってしまいます。
データベースの制約にすれば、「調べる」と「足す」をデータベースが1回で行うので、同時に来ても必ず片方が断られます。

```sql
CREATE UNIQUE INDEX tasks_open_title ON tasks (title) WHERE status <> 'done';
```

- `CREATE UNIQUE INDEX` は、`UNIQUE` の制約を、インデックスとして作ります。
- 後ろの `WHERE status <> 'done'` は、「この条件に合う行だけを、インデックスに入れる」です（**部分インデックス**）。終わったタスクは入らないので、終わったタスクと同じ題名は付けられます。

### 6.1 手を動かす: どの制約で断られたかを見分ける

まず、エラーを HTTP のステータスコードに読み替える部品 `sqlite-errors.mjs` を作ります（完成形は [samples/sqlite-errors.mjs](samples/sqlite-errors.mjs)）。

```js

// node:sqlite のエラーは err.code が 'ERR_SQLITE_ERROR'。どの制約かは err.errcode（SQLite の拡張エラーコード）で分かる
export const SQLITE = {
  CONSTRAINT_CHECK: 275,
  CONSTRAINT_FOREIGNKEY: 787,
  CONSTRAINT_NOTNULL: 1299,
  CONSTRAINT_PRIMARYKEY: 1555,
  CONSTRAINT_UNIQUE: 2067,
};

// 制約のエラーなら、返すべきステータスコード。それ以外（SQL の書き間違い・接続の失敗など）は null（500 にする）
export function statusForDbError(err) {
  if (err?.code !== 'ERR_SQLITE_ERROR') return null;
  switch (err.errcode) {
    case SQLITE.CONSTRAINT_UNIQUE:
    case SQLITE.CONSTRAINT_PRIMARYKEY:
      return 409; // ほかのデータとぶつかった
    case SQLITE.CONSTRAINT_CHECK:
    case SQLITE.CONSTRAINT_NOTNULL:
    case SQLITE.CONSTRAINT_FOREIGNKEY:
      return 422; // 送られた値が決まりに合わない
    default:
      return null;
  }
}
```

試す `db-errors.mjs` を作ります（完成形は [samples/db-errors.mjs](samples/db-errors.mjs)）。

```js
import { createTaskDb } from './task-db.mjs';
import { statusForDbError } from './sqlite-errors.mjs';

const db = createTaskDb();
const insert = db.prepare('INSERT INTO tasks (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)');
const now = '2026-11-11T00:00:00.000Z';

const tries = [
  ['本を返す', 'todo'], // 終わっていない「本を返す」がもうある
  ['牛乳を買う', 'todo'], // 「牛乳を買う」は done なので、ぶつからない
  ['x'.repeat(101), 'todo'], // 101 文字
  ['昼寝', 'sleeping'], // 決まっていない status
  [null, 'todo'], // 題名が無い
];
for (const [title, status] of tries) {
  try {
    insert.run(title, status, now, now);
    console.log(`OK   ${String(title).slice(0, 10)}`);
  } catch (err) {
    console.log(`${statusForDbError(err)}  errcode=${err.errcode}  ${err.message}`);
  }
}

try {
  db.prepare('SELECT * FROM taskz').all(); // 表の名前の書き間違い
} catch (err) {
  console.log(`${statusForDbError(err)} errcode=${err.errcode}  ${err.message}（制約ではないので 500 にする）`);
}
db.close();
```

```sh
$ node db-errors.mjs
409  errcode=2067  UNIQUE constraint failed: tasks.title
OK   牛乳を買う
422  errcode=275  CHECK constraint failed: length(title) BETWEEN 1 AND 100
422  errcode=275  CHECK constraint failed: status IN ('todo', 'doing', 'done')
422  errcode=1299  NOT NULL constraint failed: tasks.title
null errcode=1  no such table: taskz（制約ではないので 500 にする）
```

| 書いたもの | 意味 |
| --- | --- |
| `err.code === 'ERR_SQLITE_ERROR'` | `node:sqlite` が投げた、SQLite のエラー |
| `err.errcode` | SQLite のエラーの番号。制約のエラーは、どの制約かで番号が違う（2067 は UNIQUE、275 は CHECK、1299 は NOT NULL、787 は外部キー、1555 は主キー） |
| `err.message` | エラーの文。どの列・どの決まりで断られたかが書いてある |
| `?.`（`err?.code`） | `err` が `null`・`undefined` なら、エラーにせず `undefined` にする |
| `switch (値) { case A: case B: return …; default: … }` | 値が `A` か `B` なら、その下を動かす。どれにも合わなければ `default` |

- **409 Conflict**: ほかのデータとぶつかった（重なった）。送り直しても、相手を変えない限り、また断られる。
- **422 Unprocessable Content**: 送られた値そのものが、決まりに合わない（第5部 第25章）。
- 制約ではないエラー（表の名前の間違い、ファイルが壊れている、など）は、利用者のせいではないので、500 にします。
- `err.message` には、表や列の名前が入っています。利用者に見せる文（`detail`）には、そのまま入れず、決めた文にします（7節）。中の作りを外に見せないためです。

**どこで確かめるか**の分け方は、次のとおりです。

| 確かめること | 確かめる所 | 理由 |
| --- | --- | --- |
| 型（文字列か、数か） | ルート（7節の `mustBeString`） | `undefined` やオブジェクトを `?` に渡すと、例外（500）になるか、黙って `NULL` になる（2.1節）。どちらも、利用者に分かる 422 にならない |
| 長さ・選べる値 | データベースの CHECK（とルート） | どこから書き込んでも守られる。分かりやすい文を返したいときは、ルートやサービスでも確かめる |
| 重ならない | データベースの UNIQUE | 同時に来ても守れるのは、データベースだけ |

## 7. Express の API につなぐ

ここまでの部品を、Express の API にまとめます。

### 7.1 手を動かす: SQLite に保存するタスクの API

`server.mjs` を作ります（完成形は [samples/server.mjs](samples/server.mjs)）。`import` する `migrations.mjs`・`task-repo.mjs`・`sqlite-errors.mjs` は、5・3・6節で作ったものです。

```js
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import { migrate } from './migrations.mjs';
import { createSqliteTaskRepo } from './task-repo.mjs';
import { statusForDbError } from './sqlite-errors.mjs';

const PORT = 9427;
const db = new DatabaseSync(process.env.TASKS_DB ?? 'tasks.db');
const { from, to } = migrate(db);
if (from !== to) console.log(`データベースを版 ${from} → ${to} にしました`);
const repo = createSqliteTaskRepo(db);

class HttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
  }
}
const parseId = (s) => (/^[1-9]\d{0,8}$/.test(s) ? Number(s) : null);

// 型だけは、ここで確かめる。undefined は ? に渡すと TypeError（500）になり、オブジェクトは黙って NULL になる（2節）
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
  const task = await repo.get(parseId(req.params.id));
  if (!task) throw new HttpError(404, `タスク ${req.params.id} はありません`);
  res.json(task);
});

app.post('/api/tasks', async (req, res) => {
  const title = mustBeString(req.body?.title, 'title');
  const dueDate = mustBeString(req.body?.dueDate ?? null, 'dueDate', { nullable: true });
  const now = new Date().toISOString();
  // 題名の長さや重なりは、ここでは確かめない。データベースの制約に任せ、エラーを 409・422 に読み替える
  const task = await repo.insert({ title, status: 'todo', dueDate, createdAt: now, updatedAt: now, completedAt: null, version: 1 });
  res.status(201).location(`/api/tasks/${task.id}`).json(task);
});

// 変えるときは、読んだときの version を送ってもらう（第30章 5節）
app.patch('/api/tasks/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const { version, title, status } = req.body ?? {};
  if (!Number.isInteger(version)) throw new HttpError(400, 'version（読んだときの版）を送ってください');
  const fields = { updatedAt: new Date().toISOString(), version: version + 1 };
  if (title !== undefined) fields.title = mustBeString(title, 'title');
  if (status !== undefined) {
    fields.status = mustBeString(status, 'status');
    fields.completedAt = status === 'done' ? fields.updatedAt : null;
  }
  const task = await repo.update(id, fields, { expectedVersion: version });
  if (task) return res.json(task);
  if (!(await repo.get(id))) throw new HttpError(404, `タスク ${req.params.id} はありません`);
  throw new HttpError(409, 'ほかの人が先に変えました。読み直してください');
});

app.delete('/api/tasks/:id', async (req, res) => {
  if (!(await repo.remove(parseId(req.params.id)))) throw new HttpError(404, `タスク ${req.params.id} はありません`);
  res.sendStatus(204);
});

// エラーを Problem Details にする。データベースの制約のエラーは 409・422 に読み替える
// データベースのエラーの文（表や列の名前が入っている）は、そのまま利用者に見せない
const DB_DETAIL = {
  409: 'ほかのデータとぶつかりました（同じ題名の、終わっていないタスクがあります）',
  422: '送られた値が決まりに合いません（題名は 1〜100 文字、status は todo・doing・done）',
};
app.use((err, req, res, next) => {
  const dbStatus = statusForDbError(err);
  const known = err instanceof HttpError || err.expose === true; // expose: express.json() の「JSON が壊れている」(400) など
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

// Ctrl+C で止めるときに、データベースを閉じる
process.on('SIGINT', () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
```

```sh
$ node server.mjs
データベースを版 0 → 3 にしました
http://127.0.0.1:9427/api/tasks で待っています（Ctrl+C で止める）
```

別のターミナルを開き（Terminal の「シェル」→「新規ウインドウ」、または ⌘N）、`cd ~/dev/part06/ch31-node-db` してから、curl で試します。`-s` は進み具合を出さない、`-X` はメソッド、`-H` はヘッダ、`-d` はボディです（第2部 第6章）。

```sh
$ curl -s -X POST -H 'content-type: application/json' -d '{"title":"牛乳を買う","dueDate":"2026-11-20"}' http://127.0.0.1:9427/api/tasks
{"id":1,"title":"牛乳を買う","status":"todo","dueDate":"2026-11-20","createdAt":"…","updatedAt":"…","completedAt":null,"version":1}
$ curl -s -X POST -H 'content-type: application/json' -d '{"title":"牛乳を買う"}' http://127.0.0.1:9427/api/tasks
{"type":"about:blank","title":"Conflict","status":409,"detail":"ほかのデータとぶつかりました（同じ題名の、終わっていないタスクがあります）"}
$ curl -s -X POST -H 'content-type: application/json' -d '{"title":""}' http://127.0.0.1:9427/api/tasks
{"type":"about:blank","title":"Unprocessable Entity","status":422,"detail":"送られた値が決まりに合いません（題名は 1〜100 文字、status は todo・doing・done）"}
$ curl -s -X PATCH -H 'content-type: application/json' -d '{"version":1,"status":"done"}' http://127.0.0.1:9427/api/tasks/1
{"id":1,"title":"牛乳を買う","status":"done",…,"completedAt":"…","version":2}
$ curl -s -X PATCH -H 'content-type: application/json' -d '{"version":1,"title":"x"}' http://127.0.0.1:9427/api/tasks/1
{"type":"about:blank","title":"Conflict","status":409,"detail":"ほかの人が先に変えました。読み直してください"}
```

サーバを Ctrl+C で止めて、もう一度 `node server.mjs` で動かし、`curl -s http://127.0.0.1:9427/api/tasks` を試してください。第5部のメモリ版と違い、作ったタスクが残っています（`tasks.db` に保存されています）。2回目の起動では、マイグレーションはもう済んでいるので「版 … にしました」は出ません。

| 書いたもの | 意味 |
| --- | --- |
| `process.env.TASKS_DB ?? 'tasks.db'` | データベースのファイルの名前。環境変数で変えられる（第5部 第26章） |
| `migrate(db)` を起動のときに | サーバが動き始める前に、テーブルの形を最新にする |
| `mustBeString(value, name)` | 文字列でなければ 422（6節の「型はルートで」） |
| `HttpError` | ステータスコードを持つエラー。エラーのミドルウェアで、その番号で返す |
| `err.expose === true` | `express.json()` が投げる「JSON が壊れている」(400) などのエラーは、`expose` が `true` で、文をそのまま見せてよい |
| `DB_DETAIL[dbStatus]` | データベースのエラーは、決めた文で返す（6節） |
| `process.on('SIGINT', …)` | Ctrl+C で止めるときに、受け付けをやめ（`server.close`）、データベースを閉じてから終わる（第5部 第26章 8節） |

- PATCH で 409 を返す前に `repo.get(id)` で調べているのは、`update` が `null` を返した理由が「無い」のか「version が違う」のかを分けるためです（第30章 5節）。
- `DatabaseSync` は**同期**で動くので、SQL を動かしている間、Node.js はほかのリクエストを受け付けられません（第3部 第13章の「イベントループを止める処理」）。この章のような小さな表なら一瞬ですが、重い SQL があると、その間、全員が待たされます。第32章の PostgreSQL のクライアントは、SQL を別のサーバに送って結果を待つ（非同期）ので、この心配がありません。

## 8. Flask との対応

| やりたいこと | Flask | この章 |
| --- | --- | --- |
| 値を渡す | `cur.execute('… WHERE id = ?', (id,))`。f 文字列で SQL を作らない | `prepare('… WHERE id = ?').get(id)`。テンプレート文字列で値を SQL に入れない |
| データベースとつなぐ | リクエストごとに `g.db` に開き、`teardown_appcontext` で閉じる | サーバに1つ開き、止めるときに閉じる |
| データの層 | Flask-SQLAlchemy のモデル（`Task.query…`）か、自分で書いた関数 | リポジトリ（`createSqliteTaskRepo`） |
| マイグレーション | Flask-Migrate（Alembic）の `flask db upgrade` | `MIGRATIONS` と `PRAGMA user_version` |
| 制約のエラー | `sqlalchemy.exc.IntegrityError` を `except` して `abort(409)` | `err.errcode` を見て 409・422 |

Flask の公式チュートリアル（Flaskr）は、リクエストごとに `sqlite3.connect` で開き直しています。Python の `sqlite3` は、作ったスレッドでしか使えないことがあるためです。Node.js はスレッド1つで全部のリクエストを順に扱うので、1つの接続を使い回せます。

## まとめ

- 値は `?`（または `$名前`）で渡す。SQL の文字列に、外から来た値を書き込まない。これで SQL インジェクションは起きない。
- 列の名前・`ASC`/`DESC` は `?` にできないので、決めた表（許可リスト）から選ぶ。`Object.hasOwn` で調べる。
- 行（`due_date`）とタスク（`dueDate`）の変換は、データの層の1か所（`toTask`）で行う。`undefined`・`Date` などのオブジェクトは `?` にうまく渡せない（例外か、黙って `NULL`）ので、型はルートで確かめる。
- メモリ版と同じ形（`list`・`get`・`insert`・`update`・`remove`）のリポジトリを作れば、上の層を変えずに取り替えられる。
- `withTransaction(db, fn)` で「全部か、何もしないか」をまとめる。`DatabaseSync` では `fn` を同期にする。
- テーブルの形は、マイグレーションの手順を後ろに足して変える。配った手順は書き換えない。
- 重ならない決まりは、データベースの `UNIQUE`（部分インデックスも使える）で守り、`errcode` を見て 409・422 にする。エラーの文はそのまま見せない。

## 練習問題

[exercises/README.md](exercises/README.md) に9問あります（基本4問・応用3問・発展2問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Node.js 公式「SQLite」（`prepare`・名前付きの値・`isTransaction`）: https://nodejs.org/api/sqlite.html
- SQLite 公式「Result and Error Codes」（拡張エラーコード）: https://www.sqlite.org/rescode.html
- SQLite 公式「Partial Indexes」: https://www.sqlite.org/partialindex.html
- SQLite 公式「ALTER TABLE」: https://www.sqlite.org/lang_altertable.html
- SQLite 公式「PRAGMA user_version」: https://www.sqlite.org/pragma.html#pragma_user_version
- OWASP「SQL Injection Prevention Cheat Sheet」: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- Flask 公式チュートリアル「Define and Access the Database」: https://flask.palletsprojects.com/en/stable/tutorial/database/

---

前: [第30章 SQL の実践](../ch30-sql-practice/README.md) ／ 次: [第32章 Docker と PostgreSQL](../ch32-docker-postgres/README.md) ／ 部の目次: [第6部 データベース](../README.md)
