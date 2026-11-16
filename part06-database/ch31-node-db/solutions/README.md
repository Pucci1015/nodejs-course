# 第31章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part06/ch31-node-db/exercises` で実行） |
| --- | --- | --- |
| 1 | [find-tasks.mjs](find-tasks.mjs) | `MODULE=../solutions/find-tasks.mjs node --test find-tasks.test.mjs` |
| 2 | [order-by.mjs](order-by.mjs) | `MODULE=../solutions/order-by.mjs node --test order-by.test.mjs` |
| 3 | [add-migration.mjs](add-migration.mjs) | `MODULE=../solutions/add-migration.mjs node --test add-migration.test.mjs` |
| 4 | このページ | — |
| 5 | [task-repo.mjs](task-repo.mjs) | `MODULE=../solutions/task-repo.mjs node --test task-repo.test.mjs` |
| 6 | [bulk-tasks.mjs](bulk-tasks.mjs) | `MODULE=../solutions/bulk-tasks.mjs node --test bulk-tasks.test.mjs` |
| 7 | [db-problem.mjs](db-problem.mjs) | `MODULE=../solutions/db-problem.mjs node --test db-problem.test.mjs` |
| 8 | [task-app.mjs](task-app.mjs) | `MODULE=../solutions/task-app.mjs node --test task-app.test.mjs` |
| 9 | [repo.mjs](repo.mjs) | `MODULE=../solutions/repo.mjs node --test buggy-repo.test.mjs` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。`task-db.mjs`・`with-transaction.mjs`・`sqlite-errors.mjs` は、解答が `import` するので、`exercises/` と同じものを置いてあります。

---

## 問題1 値を `?` で渡して探す

```js
export function findByStatus(db, status) {
  return db.prepare('SELECT title FROM tasks WHERE status = ? ORDER BY id').all(status).map((r) => r.title);
}

export function searchTitle(db, word) {
  // % は SQL の中ではなく、渡す値の側に付ける
  return db
    .prepare('SELECT id, title FROM tasks WHERE title LIKE ? ORDER BY id')
    .all(`%${word}%`)
    .map((r) => ({ ...r }));
}

export function dueBetween(db, from, to) {
  return db
    .prepare('SELECT id FROM tasks WHERE due_date BETWEEN ? AND ? ORDER BY due_date, id')
    .all(from, to)
    .map((r) => r.id);
}

export function overdue(db, { date, limit }) {
  return db
    .prepare(
      `SELECT title FROM tasks
       WHERE status <> 'done' AND due_date < $date
       ORDER BY due_date, id
       LIMIT $limit`,
    )
    .all({ date, limit })
    .map((r) => r.title);
}
```

- `searchTitle` の `` `%${word}%` `` は、SQL ではなく、`all()` に渡す**値**を作っています。値の中に `'` があっても、SQL の形は変わりません。
- `word` に `%` や `_` があると、`LIKE` の「何文字でもよい」「1文字」として働きます（`'%'` で探すと全部が合う）。SQL インジェクションではありませんが、文字そのものとして探したいときは、`LIKE ? ESCAPE '\'` と書き、値の中の `%`・`_` の前に `\` を付けます。
- `overdue` は、`$date`・`$limit` の名前で渡しました。`{ date, limit }` は `{ date: date, limit: limit }` の短い書き方です。名前で渡すと、`?` の順番を数えなくてよくなります。

## 問題2 並べ方を許可リストで選ぶ

```js
// 外から来る名前 → 列の名前。ここに無いものは、SQL に入れない
const SORTABLE = {
  id: 'id',
  title: 'title',
  dueDate: 'due_date',
  createdAt: 'created_at',
};

export function orderByClause(sort = 'id') {
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  if (!Object.hasOwn(SORTABLE, key)) throw new RangeError(`並べ替えに使えない項目です: ${key}`);
  const dir = desc ? 'DESC' : 'ASC';
  if (key === 'id') return `id ${dir}`;
  return `${SORTABLE[key]} ${dir}, id ASC`; // 同じ値のときの順を、id で決める
}

export function listIds(db, sort) {
  return db
    .prepare(`SELECT id FROM tasks ORDER BY ${orderByClause(sort)}`)
    .all()
    .map((r) => r.id);
}
```

- `Object.hasOwn(SORTABLE, key)` の代わりに `SORTABLE[key] !== undefined` と書くと、`'toString'` が通ってしまいます（どのオブジェクトも、`toString` を受け継いで持っているため）。テストの `'toString'`・`'__proto__'` は、それを確かめています。
- `'due_date'`（列の名前そのもの）を断るのは、外に見せる名前（`dueDate`）と中の名前（`due_date`）を分けておくためです。後で列の名前を変えても、API の使い方は変わりません。
- `id` のときに後ろに `, id ASC` を付けないのは、`ORDER BY id DESC, id ASC` が意味の無い重なりになるからです（付けても結果は同じです）。

## 問題3 マイグレーションを足す

```js
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
  // 4: 優先度（1 高い・2 ふつう・3 低い）。今ある行には DEFAULT の 2 が入る
  `ALTER TABLE tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3)`,
  // 5: 「status ごとに、締め切りの順」で探すためのインデックス
  `CREATE INDEX tasks_status_due_date ON tasks (status, due_date)`,
];
```

- 手順4で `DEFAULT 2` を書かないと、`NOT NULL` の列を足せません（今ある行に入れる値が無いため）。SQLite は `Cannot add a NOT NULL column with default value NULL` というエラーで断ります。
- 手順5を `(due_date, status)` の順にすると、`status = ?` で絞るのにインデックスを使えず、テストが失敗します。「`=` で絞る列を先、並べる列を後」が、複数の列のインデックスの決まった形です（第30章 3.2節の電話帳）。
- 手順1〜3は書き換えていません。もし手順1の `CREATE TABLE` に `priority` を足してしまうと、すでに版 3 まで進んだデータベースでは手順1が二度と動かないので、そこには `priority` が入らないままになります。テストの「版 3 で使っていたデータベースに足す」が、それを確かめています。

## 問題4 安全な書き方を見分ける

1. それぞれの答え:
   - **(A) 危ない。** `req.query.word` が SQL の文字列に書き込まれています。`'` を含む値で SQL が壊れ、悪意のある人は SQL の意味を変えられます（SQL インジェクション）。(B) の形に直します。
   - **(B) 安全。** 値は `?` で渡しています。`%` を付けているのは値の側です。
   - **(C) 危ない。** 列の名前の所に、外から来た文字列をそのまま書き込んでいます。`?` で渡せない所なので、許可リストで選びます（(D) か、問題2の形）。
   - **(D) ほぼ安全**（2. を参照）。SQL に入るのは、表の中の自分で書いた文字列か `'id'` だけです。
   - **(E) 危ない（動かない）。** `new Date()` は `?` に渡せないので、`TypeError` で 500 になります（2つ目からの引数のオブジェクトはエラー。1つ目の引数なら、黙って `NULL` になります）。`req.body.dueDate` を送らなかったときも、`undefined` は渡せずに 500 です。日時は `toISOString()` の文字列にし、ボディの値は型を確かめ、無ければ `null` にしてから渡します。
   - **(F) 危ない。** `withTransaction` は同期の関数を受け取る作りです。`async` の関数を渡すと、`fn()` は Promise をすぐに返し、`await` の続き（`repo.update`）が動く前に `COMMIT` されます。`update` が失敗しても、`catch` には届かず、`ROLLBACK` されません。`DatabaseSync` では、`prepare` した文を直接、同期で使います（本文4.1節）。
2. `{ … }['toString']` は、オブジェクトが受け継いでいる `toString` の**関数**です。`undefined` ではないので `?? 'id'` は働かず、`` `${col}` `` が `function toString() { [native code] }` という文字列になり、SQL の文法のエラー（500）になります。SQL の意味は変えられないので、インジェクションにはなりませんが、利用者のせいで 500 が出るのは困ります。`Object.hasOwn` で調べるか、`Object.create(null)` で作った表（`toString` を持たない）を使います。
3. 「危ない文字」を自分で数え上げると、抜けが出ます。`'` のほかにも、データベースの種類によって意味のある文字（`\` など）や、文字コードの違いを使う方法があり、全部を正しく取り除くのは難しいからです。また、`'` を取り除くと、`Let's` のような正しい値まで変わってしまいます。`?` で渡せば、データベースが「これは値」と分かったうえで扱うので、どんな文字でも、そのまま正しく保存・検索できます。

## 問題5 リポジトリにメソッドを足す

```js
    // ここから下が、練習問題5 で足したもの

    async findByStatus(status) {
      return db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY id').all(status).map(toTask);
    },

    async countByStatus() {
      const counts = { todo: 0, doing: 0, done: 0 }; // 1つも無い status も 0 で返すために、先に 0 を入れておく
      for (const row of db.prepare('SELECT status, count(*) AS n FROM tasks GROUP BY status').all()) {
        counts[row.status] = row.n;
      }
      return counts;
    },

    async listPage({ limit, after = 0 }) {
      const rows = db.prepare('SELECT * FROM tasks WHERE id > ? ORDER BY id LIMIT ?').all(after, limit + 1);
      const items = rows.slice(0, limit).map(toTask);
      return { items, nextAfter: rows.length > limit ? items.at(-1).id : null };
    },
  };
}
```

- `countByStatus` の `for … of` は、`GROUP BY` の結果の行を1つずつ取り出し、`counts` に入れています。`done` のタスクが1つも無ければ、`done` の行は結果に出ないので、最初の `0` のまま残ります。
- `listPage` で `limit + 1` 個読み、`slice(0, limit)` で `limit` 個に切ります。読んだ数が `limit` より多ければ、次のページがあります（第30章 6節）。
- `items.at(-1).id` は、このページの最後のタスクの id です。

## 問題6 何件もまとめて「全部か、何もしないか」

```js
import { withTransaction } from './with-transaction.mjs';

export function importTasks(db, titles, now) {
  const insert = db.prepare('INSERT INTO tasks (title, created_at, updated_at) VALUES (?, ?, ?) RETURNING id');
  return withTransaction(db, () =>
    titles.map((title, i) => {
      try {
        return insert.get(title, now, now).id;
      } catch (err) {
        // 何件目で失敗したかを足して投げ直す（元のエラーは cause に残す）
        throw new Error(`${i + 1} 件目（${title}）が作れません: ${err.message}`, { cause: err });
      }
    }),
  );
}

export function completeMany(db, ids, now) {
  const complete = db.prepare(`
    UPDATE tasks SET status = 'done', completed_at = ?, updated_at = ?, version = version + 1
    WHERE id = ? AND status <> 'done'
  `);
  return withTransaction(db, () => {
    for (const id of ids) {
      if (complete.run(now, now, id).changes === 0) throw new Error(`タスク ${id} は無いか、もう終わっています`);
    }
    return ids.length;
  });
}
```

- `importTasks` の内側の `try`・`catch` は、何件目かを足して投げ直すためのものです。投げ直した例外が `withTransaction` の `catch` に届き、そこで `ROLLBACK` されます。
- `titles.map(…)` の結果（id の配列）が、`withTransaction` の戻り値になります。
- テストの最後の「外側のトランザクションの中で呼ぶ」では、`withTransaction` が `db.isTransaction` を見て、新しく `BEGIN` せずに外側に加わります。外側が失敗すると、2つの関数がした変更も、まとめて取り消されます。

## 問題7 制約のエラーを、分かる文にする

```js
import { SQLITE } from './sqlite-errors.mjs';

// NOT NULL のエラーの文 'NOT NULL constraint failed: tasks.title' から、列の名前を取り出す
const NOT_NULL_COLUMN = /NOT NULL constraint failed: \w+\.(\w+)/;

export function toProblem(err) {
  if (err?.code !== 'ERR_SQLITE_ERROR') return null;
  const msg = err.message;
  switch (err.errcode) {
    case SQLITE.CONSTRAINT_UNIQUE:
      if (msg.includes('tasks.title')) return { status: 409, detail: '同じ題名の、終わっていないタスクがあります' };
      return { status: 409, detail: 'ほかのデータとぶつかりました' };
    case SQLITE.CONSTRAINT_PRIMARYKEY:
      return { status: 409, detail: 'ほかのデータとぶつかりました' };
    case SQLITE.CONSTRAINT_FOREIGNKEY:
      return { status: 422, detail: 'つながる先のデータがありません' };
    case SQLITE.CONSTRAINT_CHECK:
      if (msg.includes('length(title)')) return { status: 422, detail: 'title は 1〜100 文字です' };
      if (msg.includes('status IN')) return { status: 422, detail: 'status は todo・doing・done のどれかです' };
      return { status: 422, detail: '送られた値が決まりに合いません' };
    case SQLITE.CONSTRAINT_NOTNULL: {
      const m = NOT_NULL_COLUMN.exec(msg);
      return { status: 422, detail: m ? `${m[1]} は必ず送ってください` : '送られていない値があります' };
    }
    default:
      // SQL の書き間違いなど。中身は利用者に見せず、500 にする
      return { status: 500, detail: 'サーバの中でエラーが起きました' };
  }
}
```

- `err?.code` の `?.` で、`err` が `undefined` のときもエラーにならずに `null` を返せます。
- `case SQLITE.CONSTRAINT_NOTNULL: { … }` の `{ }` は、`case` の中で `const` を使うためのものです（`switch` 全体で名前がぶつからないように）。
- エラーの文から表や列の名前を探すのは、SQLite の文の書き方が変わると壊れる、弱いやり方です。PostgreSQL では、エラーに `constraint`（制約の名前）・`column`（列の名前）が別に入っているので、それを使います（第32章）。

## 問題8 ETag と If-Match で守るタスクの API

```js
  const etag = (task) => `"${task.version}"`;

  // If-Match: "3" から 3 を取り出し、今のタスクの version と比べる。無ければ 428、形が違えば 400、違えば 412
  function mustMatch(req, current) {
    const header = req.get('If-Match');
    if (header === undefined) throw new HttpError(428, 'If-Match（読んだときの ETag）を送ってください');
    const m = /^"(\d{1,9})"$/.exec(header);
    if (!m) throw new HttpError(400, 'If-Match の形が違います（例: "3"）');
    if (Number(m[1]) !== current.version) throw new HttpError(412, 'ほかの人が先に変えました。読み直してください');
  }

  function mustBeString(value, name, { nullable = false } = {}) {
    if (typeof value === 'string' || (nullable && value === null)) return value;
    throw new HttpError(422, `${name} は文字列で送ってください`);
  }

  async function mustGet(idText) {
    const task = await repo.get(parseId(idText));
    if (!task) throw new HttpError(404, `タスク ${idText} はありません`);
    return task;
  }

  app.get('/api/tasks/:id', async (req, res) => {
    const task = await mustGet(req.params.id);
    res.set('ETag', etag(task)).json(task);
  });

  app.post('/api/tasks', async (req, res) => {
    const title = mustBeString(req.body?.title, 'title');
    const dueDate = mustBeString(req.body?.dueDate ?? null, 'dueDate', { nullable: true });
    const now = new Date().toISOString();
    const task = await repo.insert({ title, status: 'todo', dueDate, createdAt: now, updatedAt: now, completedAt: null, version: 1 });
    res.status(201).location(`/api/tasks/${task.id}`).set('ETag', etag(task)).json(task);
  });

  app.patch('/api/tasks/:id', async (req, res) => {
    const current = await mustGet(req.params.id); // 無ければ 404
    mustMatch(req, current);
    const fields = { updatedAt: new Date().toISOString(), version: current.version + 1 };
    if (req.body?.title !== undefined) fields.title = mustBeString(req.body.title, 'title');
    if (req.body?.status !== undefined) {
      fields.status = mustBeString(req.body.status, 'status');
      fields.completedAt = fields.status === 'done' ? fields.updatedAt : null;
    }
    // 確かめた後に、ほかの人が変えたかもしれないので、UPDATE でも version を確かめる
    const task = await repo.update(current.id, fields, { expectedVersion: current.version });
    if (!task) throw new HttpError(412, 'ほかの人が先に変えました。読み直してください');
    res.set('ETag', etag(task)).json(task);
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    const current = await mustGet(req.params.id);
    mustMatch(req, current);
    if (!(await repo.remove(current.id, { expectedVersion: current.version }))) {
      throw new HttpError(412, 'ほかの人が先に変えました。読み直してください');
    }
    res.sendStatus(204);
  });
```

- PATCH と DELETE は、どちらも「`mustGet` で 404 → `mustMatch` で 428・400・412」の順にしました。第25章の `evaluatePreconditions` と同じく、無いものには、先に 404 を返します。
- `mustMatch` で version を確かめた後、`repo.update` にも `expectedVersion` を渡しています。`mustGet` と `update` の間に `await` があるので、その間に、ほかのリクエストが同じタスクを変えるかもしれません。`UPDATE … WHERE version = ?` は、確かめることと変えることを1つの SQL でするので、その隙間がありません。
- ETag を `"version"` にしたのは、version が変われば必ず ETag も変わるからです。第25章のように、本文のハッシュから作る方法もありますが、データベースに version があれば、それを使うのがいちばん簡単です。

## 問題9 リポジトリのバグを直す

```js
export function createBuggyRepo(db) {
  return {
    async findByTitle(title) {
      // 直した所1: 値を SQL に書き込むと、' を含む題名で SQL が壊れる。? で渡す
      return toTask(db.prepare('SELECT * FROM tasks WHERE title = ? ORDER BY id').get(title));
    },

    async insert({ title, dueDate = null, now }) {
      const r = db
        .prepare('INSERT INTO tasks (title, due_date, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .run(title, dueDate, now, now);
      // 直した所2: 行のまま返していた（due_date・null prototype）。toTask でタスクの形にする
      return toTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(r.lastInsertRowid));
    },

    async update(id, fields, { expectedVersion } = {}) {
      const keys = Object.keys(fields);
      // 直した所3: dueDate のような名前は列の名前ではない。決めた表（COLUMNS）で列の名前に直し、無い名前は断る
      const sets = keys
        .map((k) => {
          if (!Object.hasOwn(COLUMNS, k)) throw new Error(`知らない項目です: ${k}`);
          return `${COLUMNS[k]} = ?`;
        })
        .join(', ');
      const values = keys.map((k) => fields[k]);
      // 直した所4: expectedVersion を使っていなかった。渡されたら WHERE に足す
      if (expectedVersion === undefined) {
        return toTask(db.prepare(`UPDATE tasks SET ${sets} WHERE id = ? RETURNING *`).get(...values, id));
      }
      return toTask(db.prepare(`UPDATE tasks SET ${sets} WHERE id = ? AND version = ? RETURNING *`).get(...values, id, expectedVersion));
    },

    async completeAll(ids, now) {
      const complete = db.prepare(`UPDATE tasks SET status = 'done', completed_at = ?, version = version + 1 WHERE id = ? AND status <> 'done'`);
      db.exec('BEGIN');
      try {
        for (const id of ids) {
          if (complete.run(now, id).changes === 0) throw new Error(`タスク ${id} は無いか、もう終わっています`);
        }
        db.exec('COMMIT');
        return ids.length;
      } catch (err) {
        db.exec('ROLLBACK'); // 直した所5: 取り消さないと、先に done にした分が残り、トランザクションも開いたままになる
        throw err;
      }
    },
  };
}
```

| メソッド | バグ | 起きていたこと |
| --- | --- | --- |
| `findByTitle` | 値を SQL の文字列に書き込んでいた | `Let's ストレッチ` で `near "s": syntax error` |
| `insert` | 行をそのまま返していた | `due_date`・`created_at` のまま、`[Object: null prototype]` |
| `update` | `fields` の名前を、そのまま列の名前にしていた | `dueDate` で `no such column: dueDate`。知らない名前も SQL に入ってしまう |
| `update` | `expectedVersion` を使っていなかった | 古い version でも上書きした |
| `completeAll` | `catch` で `ROLLBACK` していなかった | 先に done にした分が残り、トランザクションも開いたままで、次の `BEGIN` が失敗する |
