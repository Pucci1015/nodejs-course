# 第32章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part06/ch32-docker-postgres/exercises` で実行） |
| --- | --- | --- |
| 1 | [pg-queries.mjs](pg-queries.mjs) | `MODULE=../solutions/pg-queries.mjs node --test pg-queries.test.mjs` |
| 2 | [comments-sql.mjs](comments-sql.mjs) | `MODULE=../solutions/comments-sql.mjs node --test comments-sql.test.mjs` |
| 3 | [with-client.mjs](with-client.mjs) | `MODULE=../solutions/with-client.mjs node --test with-client.test.mjs` |
| 4 | このページ | — |
| 5 | [task-tags.mjs](task-tags.mjs) | `MODULE=../solutions/task-tags.mjs node --test task-tags.test.mjs` |
| 6 | [job-queue.mjs](job-queue.mjs) | `MODULE=../solutions/job-queue.mjs node --test job-queue.test.mjs` |
| 7 | [pg-problem.mjs](pg-problem.mjs) | `MODULE=../solutions/pg-problem.mjs node --test pg-problem.test.mjs` |
| 8 | [safe-migrate.mjs](safe-migrate.mjs) | `MODULE=../solutions/safe-migrate.mjs node --test safe-migrate.test.mjs` |
| 9 | [store.mjs](store.mjs) | `MODULE=../solutions/store.mjs node --test buggy-store.test.mjs` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。どのテストも、先に `docker compose up -d --wait` で PostgreSQL を動かしておきます。`with-transaction.mjs`・`pg-errors.mjs`・`pg-test.mjs` は、解答が `import` するので、`exercises/` と同じものを置いてあります。

---

## 問題1 `$1` で値を渡して探す

```js
export async function findByStatus(pool, status) {
  const { rows } = await pool.query('SELECT title FROM tasks WHERE status = $1 ORDER BY id', [status]);
  return rows.map((r) => r.title);
}

export async function searchTitle(pool, word) {
  // ILIKE は、英字の大文字と小文字を区別しない LIKE（PostgreSQL の LIKE は区別する）
  const { rows } = await pool.query('SELECT id, title FROM tasks WHERE title ILIKE $1 ORDER BY id', [`%${word}%`]);
  return rows;
}

export async function countByStatus(pool) {
  // count(*) は bigint なので、pg は文字列で返す。::int で整数にしてから受け取る
  const { rows } = await pool.query('SELECT status, count(*)::int AS n FROM tasks GROUP BY status');
  const counts = { todo: 0, doing: 0, done: 0 };
  for (const r of rows) counts[r.status] = r.n;
  return counts;
}

export async function overdue(pool, { date, limit }) {
  const { rows } = await pool.query(
    `SELECT title FROM tasks
     WHERE status <> 'done' AND due_date < $1
     ORDER BY due_date, id
     LIMIT $2`,
    [date, limit],
  );
  return rows.map((r) => r.title);
}
```

- 第31章（SQLite）との違いは、`?` が `$1`・`$2` になること、`await` が要ること、`LIKE` が `ILIKE` になること、`count(*)` に `::int` が要ることの4つです。
- `countByStatus` で `::int` を忘れると、`{ todo: '3', … }` のように文字列になり、テストの `deepEqual` で失敗します。`Number(r.n)` で直す書き方でもかまいません。
- `ILIKE` は PostgreSQL だけの書き方です。ほかのデータベースでも動く書き方は `lower(title) LIKE lower($1)` です。

## 問題2 PostgreSQL の型で表を作る

```js
export const COMMENTS_SQL = `
  CREATE TABLE comments (
    id         integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id    integer     NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    body       text        NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX comments_task_id_created_at ON comments (task_id, created_at);
`;
```

- `REFERENCES tasks (id) ON DELETE CASCADE` で、タスクを消すとコメントも消えます。`ON DELETE CASCADE` を書かないと、コメントのあるタスクは消せなくなります（`23503`）。どちらにするかは、アプリの決まりで選びます。
- 外部キーの列（`task_id`）には、インデックスが自動では作られません（第30章 3.1節）。`(task_id, created_at)` のインデックスは、「あるタスクのコメントを古い順に」探すのにも、タスクを消したときに、消すコメントを探すのにも使われます。
- `length(body)` は、PostgreSQL では文字の数です（バイトの数ではありません）。日本語の 500 文字も通ります。

## 問題3 接続を借りて必ず返す

```js
export async function withClient(pool, fn) {
  const client = await pool.connect();
  try {
    return await fn(client); // await を付けないと、fn が終わる前に finally に進み、使っている途中の接続を返してしまう
  } finally {
    client.release();
  }
}

export async function withTransaction(pool, fn) {
  return withClient(pool, async (client) => {
    await client.query('BEGIN');
    try {
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}
```

- `withClient` の `return await fn(client)` の `await` が大事です。`await` が無いと、`return` した時点（`fn` の Promise ができた時点）で `finally` が動き、`fn` がまだ SQL を送っている接続を、プールに返してしまいます。ほかのリクエストが同じ接続を借りると、2つの処理の SQL が混ざります。
- `withTransaction` は、`withClient` に「BEGIN から COMMIT・ROLLBACK まで」の関数を渡しています。接続を返すことは `withClient` に任せたので、`finally` を書かなくて済みます。

## 問題4 Docker と Compose

1. `stop` の後は**残っています**。コンテナは止まっただけで、消えていません。`down` の後も**残っています**。コンテナは消えますが、データはボリューム `pgdata` に置いてあり、ボリュームは消えないからです。`up` で作り直したコンテナが、同じボリュームをつなぎます。`down -v` の後は**残っていません**。`-v` でボリュームも消したので、PostgreSQL は空のデータから始めます（`docker/postgres-init` の SQL も、もう一度動きます）。
2. `127.0.0.1:` を付けないと、Mac のすべてのネットワークの口（Wi-Fi など）で 5433 番を待ちます。同じ Wi-Fi（カフェなど）にいるほかの人の PC からも、PostgreSQL につなげるようになります。パスワードは `compose.yaml` に書いてあり、だれでも分かる `dev-only-password` なので、つながれたら、データを読まれたり消されたりします。開発用のデータベースは、`127.0.0.1` だけで待たせます。
3. `docker-entrypoint-initdb.d` の SQL は、**データ（ボリューム）が空のとき**に1回だけ動きます。もうデータがあるので、足した行は動きません。データを消さずに作るなら、`docker compose exec postgres psql -U app -d app -c 'CREATE DATABASE ch35 OWNER app'` のように、自分で SQL を動かします。消してよいなら、`docker compose down -v` の後に `docker compose up -d --wait` すると、全部の SQL が最初から動きます。
4. `compose.yaml` の `ports: "127.0.0.1:5433:5432"` で変わっています。左が Mac の側（127.0.0.1 の 5433 番）、右がコンテナの側（5432 番）で、Docker が、Mac の 5433 番に来たつなぎを、コンテナの 5432 番に送ります。
5. `docker compose up -d` は、コンテナを**起動した**時点で戻ります。PostgreSQL は、起動してから受け付けられるようになるまで（特に最初の起動では、データの準備で）数秒かかるので、その間に `node first-pg.mjs` を動かすと、`ECONNREFUSED` や `the database system is starting up` で失敗することがあります。`--wait` は、すべてのコンテナが `healthy`（`healthcheck` の `pg_isready` が成功した状態）になるまで待ちます。`healthcheck` が無いと、`--wait` は「起動した」ことしか待てません。

## 問題5 タスクにタグを付ける

```js
export async function setTags(pool, taskId, names) {
  const unique = [...new Set(names)]; // 同じ名前が2回あっても1つに
  await withTransaction(pool, async (client) => {
    await client.query('DELETE FROM task_tags WHERE task_id = $1', [taskId]);
    for (const name of unique) {
      // 無ければ作る。あれば何もしない（第30章 5節の ON CONFLICT）
      await client.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
      // タスクが無ければ、ここで外部キーのエラー（23503）になり、全部取り消される
      await client.query('INSERT INTO task_tags (task_id, tag_id) SELECT $1, id FROM tags WHERE name = $2', [taskId, name]);
    }
  });
  return tagsOf(pool, taskId);
}

export async function tagsOf(pool, taskId) {
  const { rows } = await pool.query(
    `SELECT g.name
     FROM task_tags AS tt
     JOIN tags AS g ON g.id = tt.tag_id
     WHERE tt.task_id = $1
     ORDER BY g.name`,
    [taskId],
  );
  return rows.map((r) => r.name);
}

export async function tasksWithTags(pool) {
  // array_agg で、まとめた行の値を配列にする。タグの無いタスクは、LEFT JOIN で g.name が NULL の1行になるので、
  // FILTER で NULL を除き、何も残らなければ coalesce で空の配列 '{}' にする
  const { rows } = await pool.query(`
    SELECT t.id, t.title,
           coalesce(array_agg(g.name ORDER BY g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS tags
    FROM tasks AS t
    LEFT JOIN task_tags AS tt ON tt.task_id = t.id
    LEFT JOIN tags AS g ON g.id = tt.tag_id
    GROUP BY t.id
    ORDER BY t.id
  `);
  return rows;
}
```

- `setTags` の最後の `tagsOf(pool, taskId)` は、トランザクションの外（COMMIT の後）で読んでいます。`withTransaction` の中で `client` を使って読んでもかまいません。
- タスクが無いと、`task_tags` に入れる所で外部キーのエラー（`23503`）になり、`withTransaction` が ROLLBACK するので、その前に `tags` に作ったタグも取り消されます。テストの「タグも作らない」は、それを確かめています。
- `ON CONFLICT (name) DO NOTHING` の代わりに、先に `SELECT` で調べてから `INSERT` すると、2人が同時に同じ新しいタグを付けたとき、両方が「無い」と読んで `INSERT` し、片方が `23505` で失敗します。`ON CONFLICT` は、調べることと入れることを1つの SQL でします。
- `tasksWithTags` を JavaScript でまとめる書き方は、次のとおりです。

  ```js
  const { rows } = await pool.query(`
    SELECT t.id, t.title, g.name
    FROM tasks AS t
    LEFT JOIN task_tags AS tt ON tt.task_id = t.id
    LEFT JOIN tags AS g ON g.id = tt.tag_id
    ORDER BY t.id, g.name
  `);
  const byId = new Map();
  for (const r of rows) {
    if (!byId.has(r.id)) byId.set(r.id, { id: r.id, title: r.title, tags: [] });
    if (r.name !== null) byId.get(r.id).tags.push(r.name);
  }
  return [...byId.values()];
  ```

## 問題6 仕事を取り合わない列

```js
export async function enqueue(pool, kind) {
  const { rows } = await pool.query('INSERT INTO jobs (kind) VALUES ($1) RETURNING id', [kind]);
  return rows[0].id;
}

export async function claimNext(pool, worker) {
  return withTransaction(pool, async (client) => {
    // FOR UPDATE で行をロックし、SKIP LOCKED で、ほかの人がロック中の行は飛ばして次を見る
    const { rows } = await client.query(`
      SELECT id, kind FROM jobs
      WHERE status = 'waiting'
      ORDER BY id
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);
    if (rows.length === 0) return null;
    await client.query(`UPDATE jobs SET status = 'running', worker = $1 WHERE id = $2`, [worker, rows[0].id]);
    return rows[0];
  });
}

export async function finish(pool, id) {
  const r = await pool.query(`UPDATE jobs SET status = 'done', finished_at = now() WHERE id = $1 AND status = 'running'`, [id]);
  return r.rowCount === 1;
}
```

- `FOR UPDATE` だけ（`SKIP LOCKED` なし）でも、同じ仕事を2回渡すことはありません。ただし、2人目は1人目の COMMIT を待たされ、待った後に「その行はもう `waiting` ではない」と分かると、0 行が返ります（PostgreSQL は、待った後に条件を確かめ直すため）。まだ仕事が残っているのに、`null` を返してしまうことがあります。`SKIP LOCKED` なら、ロック中の行を飛ばして次の行を取るので、待たされず、取りこぼしもありません。
- `claimNext` を `UPDATE jobs SET status = 'running', worker = $1 WHERE id = (SELECT id FROM jobs WHERE status = 'waiting' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id, kind` のように、1つの SQL で書くこともできます。トランザクションの関数が要らなくなります。
- 本物の仕事の列では、作業者が途中で落ちたときのために、「`running` のまま長い時間が過ぎたものを `waiting` に戻す」仕組みも要ります。第12部 第64章で、Redis を使う BullMQ で扱います。

## 問題7 エラーを、制約の名前で分かる文に

```js
// 制約の名前 → 利用者に見せる文。制約の名前は、テーブルを作ったときに決まる（名前を書かなければ、表_列_check のように自動で付く）
const UNIQUE_DETAIL = {
  tasks_open_title: '同じ題名の、終わっていないタスクがあります',
};
const CHECK_DETAIL = {
  tasks_title_check: 'title は 1〜100 文字です',
  tasks_status_check: 'status は todo・doing・done のどれかです',
};

export function toProblem(err) {
  if (!(err instanceof pg.DatabaseError)) return null;
  switch (err.code) {
    case PG.UNIQUE_VIOLATION:
      return { status: 409, detail: UNIQUE_DETAIL[err.constraint] ?? 'ほかのデータとぶつかりました' };
    case PG.CHECK_VIOLATION:
      return { status: 422, detail: CHECK_DETAIL[err.constraint] ?? '送られた値が決まりに合いません' };
    case PG.NOT_NULL_VIOLATION:
      return { status: 422, detail: `${err.column} は必ず送ってください` };
    case PG.FOREIGN_KEY_VIOLATION:
      return { status: 422, detail: 'つながる先のデータがありません' };
    case PG.INVALID_TEXT_REPRESENTATION:
    case PG.INVALID_DATETIME_FORMAT:
    case PG.DATETIME_FIELD_OVERFLOW:
      return { status: 422, detail: '値の形が違います（日付は YYYY-MM-DD）' };
    default:
      return { status: 500, detail: 'サーバの中でエラーが起きました' };
  }
}
```

- 制約の名前は、`CREATE TABLE` の中で `CONSTRAINT tasks_title_length CHECK (…)` のように、自分で付けることもできます。名前を付けておくと、`toProblem` の表が読みやすくなり、テーブルを作り直しても名前が変わりません。
- `err.detail`（`Key (title)=(本を返す) already exists.`）には送られた値が入っているので、`detail` には使いません。

## 問題8 同時に起動しても安全なマイグレーション

```js
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// アドバイザリロックの番号。同じデータベースを使うほかのプログラムと重ならない数なら、何でもよい
const LOCK_KEY = 32_0008;

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

export async function migrate(pool, dir) {
  // ロックは「接続ごと」に持つので、最初から最後まで、同じ接続を使う
  const client = await pool.connect();
  try {
    // ほかのプロセスが migrate の途中なら、終わるまでここで待つ
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          name       text PRIMARY KEY,
          checksum   text NOT NULL,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      const done = new Map((await client.query('SELECT name, checksum FROM schema_migrations')).rows.map((r) => [r.name, r.checksum]));
      const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

      // 先に全部を読み、動かした後で書き換えられたファイルが無いかを確かめる（1つでもあれば、何も動かさない）
      const todo = [];
      for (const file of files) {
        const sql = await fs.readFile(path.join(dir, file), 'utf8');
        const sum = sha256(sql);
        if (done.has(file)) {
          if (done.get(file) !== sum) throw new Error(`${file} は、動かした後で書き換えられています`);
        } else {
          todo.push({ file, sql, sum });
        }
      }

      const applied = [];
      for (const { file, sql, sum } of todo) {
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [file, sum]);
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw new Error(`${file} に失敗しました: ${err.message}`, { cause: err });
        }
        applied.push(file);
      }
      return applied;
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}
```

- アドバイザリロックは、取った接続が切れると自動で外れます。それでも `finally` で外すのは、接続をプールに返した後も、その接続はプールの中でつながったままなので、ロックが残ってしまうからです。
- ロックの代わりに、全部を1つのトランザクションにして `pg_advisory_xact_lock`（COMMIT・ROLLBACK で自動で外れるロック）を使う方法もあります。その場合、途中のファイルが失敗すると、前のファイルもまとめて取り消されます。問題の決まり（前のファイルは残る）とは違うので、ここではファイルごとにトランザクションにしました。
- `checksum` で「書き換えられた」と分かったら、どう直すかは人が決めます。ふつうは、書き換えたファイルを元に戻し、直したい内容を新しいファイル（`004_…sql`）にします。

## 問題9 PostgreSQL を使う関数のバグを直す

```js
export function createTaskStore(pool) {
  return {
    async countOpen() {
      // 直した所1: count(*) は bigint なので、pg は文字列 '4' で返す。::int で整数にする
      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM tasks WHERE status <> 'done'`);
      return rows[0].n;
    },

    async search(word) {
      // 直した所2: PostgreSQL の LIKE は、英字の大文字と小文字を区別する。区別しないのは ILIKE
      const { rows } = await pool.query('SELECT id FROM tasks WHERE title ILIKE $1 ORDER BY id', [`%${word}%`]);
      return rows.map((r) => r.id);
    },

    async rename(id, title, expectedVersion) {
      const { rows } = await pool.query(
        // 直した所3: $ の番号が、値の配列の位置と合っていなかった（id は 2 番目、expectedVersion は 3 番目）
        'UPDATE tasks SET title = $1, version = version + 1 WHERE id = $2 AND version = $3 RETURNING id, title, version',
        [title, id, expectedVersion],
      );
      return rows[0] ?? null;
    },

    async completeMany(ids) {
      return withTransaction(pool, async (client) => {
        for (const id of ids) {
          // 直した所4: pool.query は別の接続で動くので、トランザクションの外になる。渡された client を使う
          const r = await client.query(`UPDATE tasks SET status = 'done', completed_at = now() WHERE id = $1 AND status <> 'done'`, [id]);
          if (r.rowCount === 0) throw new Error(`タスク ${id} は無いか、もう終わっています`);
        }
        return ids.length;
      });
    },

    async firstTodo() {
      // 直した所5: 早く return すると release されず、接続がプールに戻らなかった。finally で必ず返す
      // （1つの SQL だけなら、pool.query を使えば、借りて返すことを pg がしてくれる）
      const client = await pool.connect();
      try {
        const { rows } = await client.query(`SELECT id, title FROM tasks WHERE status = 'todo' ORDER BY id LIMIT 1`);
        return rows[0] ?? null;
      } finally {
        client.release();
      }
    },
  };
}
```

| メソッド | バグ | 起きていたこと |
| --- | --- | --- |
| `countOpen` | `count(*)` をそのまま返した | `'4'`（文字列） |
| `search` | `LIKE` を使った | `'let'` で `Let's ストレッチ` が見つからない |
| `rename` | `$` の番号が、値の配列と合っていなかった | `bind message supplies 3 parameters, but prepared statement "" requires 2` |
| `completeMany` | トランザクションの中で `pool.query` を使った | 別の接続で動くので、失敗しても 2 と 3 が done のまま残った |
| `firstTodo` | 早い `return` で `release` を飛ばした | 接続がプールに戻らず、接続 1 本のプールでは、次の呼び出しが `timeout exceeded when trying to connect` |
