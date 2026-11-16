# 第30章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part06/ch30-sql-practice/exercises` で実行） |
| --- | --- | --- |
| 1 | [join-queries.mjs](join-queries.mjs) | `MODULE=../solutions/join-queries.mjs node --test join-queries.test.mjs` |
| 2 | [group-queries.mjs](group-queries.mjs) | `MODULE=../solutions/group-queries.mjs node --test group-queries.test.mjs` |
| 3 | [index-sql.mjs](index-sql.mjs) | `MODULE=../solutions/index-sql.mjs node --test index-sql.test.mjs` |
| 4 | このページ | — |
| 5 | [complete-task.mjs](complete-task.mjs) | `MODULE=../solutions/complete-task.mjs node --test complete-task.test.mjs` |
| 6 | [keyset-page.mjs](keyset-page.mjs) | `MODULE=../solutions/keyset-page.mjs node --test keyset-page.test.mjs` |
| 7 | [safe-update.mjs](safe-update.mjs) | `MODULE=../solutions/safe-update.mjs node --test safe-update.test.mjs` |
| 8 | [report.mjs](report.mjs) | `MODULE=../solutions/report.mjs node --test buggy-report.test.mjs` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。

---

## 問題1 JOIN でつないで読む

```js
export const openWithOwner = `
  SELECT t.title, u.name
  FROM tasks AS t
  JOIN users AS u ON u.id = t.user_id
  WHERE t.status <> 'done'
  ORDER BY t.id
`;

export const usersWithoutTasks = `
  SELECT u.name
  FROM users AS u
  LEFT JOIN tasks AS t ON t.user_id = u.id
  WHERE t.id IS NULL
`;

export const tagsOfTask4 = `
  SELECT g.name
  FROM task_tags AS tt
  JOIN tags AS g ON g.id = tt.tag_id
  WHERE tt.task_id = 4
  ORDER BY g.name
`;
```

- `usersWithoutTasks` を `JOIN`（INNER JOIN）で書くと、dave の行は JOIN の時点で消えるので、1行も出ません。相手の無い行を探すときは、必ず `LEFT JOIN … WHERE 右の表.id IS NULL` です。
- `WHERE t.id IS NULL` の `t.id` は、`t.user_id` や `t.title` でも同じ結果になります。ただ、`title` に `NULL` を許す表だと「タスクはあるが題名が無い」行も選んでしまうので、`NOT NULL` が決まっている主キーで調べるのが確実です。
- 「無い人」は、`WHERE id NOT IN (SELECT user_id FROM tasks)`（本文2.3節のサブクエリ）でも書けます。

## 問題2 GROUP BY で数える・足す

```js
export const countByUser = `
  SELECT u.name, count(*) AS n
  FROM users AS u
  JOIN tasks AS t ON t.user_id = u.id
  GROUP BY u.id
  ORDER BY u.id
`;

export const minutesByUser = `
  SELECT u.name, coalesce(sum(t.minutes), 0) AS minutes
  FROM users AS u
  LEFT JOIN tasks AS t ON t.user_id = u.id AND t.status <> 'done'
  GROUP BY u.id
  ORDER BY u.id
`;

export const popularTags = `
  SELECT g.name, count(*) AS n
  FROM tags AS g
  JOIN task_tags AS tt ON tt.tag_id = g.id
  GROUP BY g.id
  HAVING count(*) >= 2
  ORDER BY n DESC, g.name
`;
```

- `countByUser` は INNER JOIN なので、dave は出ません。dave も 0 で出したいなら、`LEFT JOIN` と `count(t.id)` にします（問題8の `tasksPerUser`）。
- `minutesByUser` で `t.status <> 'done'` を `WHERE` に書くと、dave と「全部終わった人」が消えます（本文1.2節）。`coalesce` を忘れると、その人たちが `null` になります。
- `popularTags` の `ORDER BY n DESC, g.name` は、`SELECT` で付けた `n` という名前で並べています。`ORDER BY` は `SELECT` の後で動くので、名前が使えます（本文2.2節）。`HAVING n >= 2` も SQLite では動きますが、PostgreSQL では動かないので、`HAVING count(*) >= 2` と書くのが安全です。

## 問題3 インデックスを作る

```js
export const createIndexes = `
  CREATE INDEX tasks_user_id_status ON tasks (user_id, status);
  CREATE INDEX tasks_due_date ON tasks (due_date);
`;
```

- `(user_id, status)` の順にしたので、`WHERE user_id = ?` だけの SELECT にも、このインデックスが使えます。`(status, user_id)` の順でも問題のテストは通りますが、「ある人のタスク」を探すことの方が多いので、`user_id` を先にしました。
- `user_id` だけのインデックスを作っても、1つ目の SELECT はインデックスを使います。ただし計画は `(user_id=?)` になり、`status` は、見つけた行を1つずつ見て絞ります。テストは、両方の列で絞れているかを見ています。
- 8 行しかない表では、インデックスが無くても一瞬で終わります。インデックスは、行が多くなってから効きます（本文3.1節）。

## 問題4 結果の行の数を予想する

1. (1) は **8 行**、(2) は **9 行**です。(1) の INNER JOIN では、タスクの無い dave は消えます。(2) の LEFT JOIN では、dave が `title` が `null` の1行で残ります。
2. (3) は **9 行**です。タスク 4（報告書を書く）にはタグが2つあるので、2行になります（+1）。タスク 7（旅行の計画）にはタグが無いので、LEFT JOIN で `name` が `null` の1行として残ります（INNER JOIN なら消えて 8 行になり、たまたまタスクの数と同じになります）。「行の数がタスクの数と同じだから正しい」とは限らない、という例です。
3. **dave** だけが違い、`a` は **1**、`b` は **0** です。LEFT JOIN で相手の無い dave も1行あるので `count(*)` は 1 ですが、その行の `t.id` は `NULL` なので `count(t.id)` は 0 です。ほかの人は todo のタスクが1つ以上あるので、`a` と `b` は同じです（alice 1、bob 1、carol 2）。
4. (5) は、`t.status = 'todo'` を `WHERE` に書いています。JOIN の後で絞るので、todo のタスクが無い dave の行（`t.status` が `NULL`）が消え、**3 人**（alice 1、bob 1、carol 2）になります。(4) と同じにするには、条件を `ON t.user_id = u.id AND t.status = 'todo'` に移し、`count(*)` を `count(t.id)` にします。

## 問題5 タスクを終わらせて記録を残す

```js
export const EVENTS_SQL = `
  CREATE TABLE task_events (
    id      INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    kind    TEXT    NOT NULL,
    at      TEXT    NOT NULL
  )
`;

export function completeTask(db, id, at) {
  db.exec('BEGIN');
  try {
    const r = db
      .prepare(`UPDATE tasks SET status = 'done', version = version + 1 WHERE id = ? AND status <> 'done'`)
      .run(id);
    if (r.changes === 0) throw new Error(`タスク ${id} は無いか、もう終わっています`);
    db.prepare(`INSERT INTO task_events (task_id, kind, at) VALUES (?, 'completed', ?)`).run(id, at);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
```

- 先に `SELECT` でタスクを調べてから `UPDATE` するより、`UPDATE … WHERE … AND status <> 'done'` の `changes` を見る方が、SQL が1回で済み、調べてから変えるまでの間に、ほかの人に変えられる心配もありません。
- `task_events` が無いと、`db.prepare('INSERT INTO task_events …')` の時点で例外になります。`catch` で `ROLLBACK` するので、先にした `UPDATE` も取り消されます。
- `throw err` を書き忘れると、失敗したのに呼んだ側は成功したと思います。テストの「無いタスクは例外を投げる」が失敗します。

## 問題6 カーソルでページを分ける関数

```js
export function listByDueDate(db, { limit, after = null }) {
  // limit より1つ多く取り、余りがあれば「次のページがある」と分かる
  const rows = after
    ? db
        .prepare(
          `SELECT id, title, due_date FROM tasks
           WHERE due_date IS NOT NULL AND (due_date, id) > (?, ?)
           ORDER BY due_date, id
           LIMIT ?`,
        )
        .all(after.dueDate, after.id, limit + 1)
    : db
        .prepare(
          `SELECT id, title, due_date FROM tasks
           WHERE due_date IS NOT NULL
           ORDER BY due_date, id
           LIMIT ?`,
        )
        .all(limit + 1);

  const items = rows.slice(0, limit).map((r) => ({ id: r.id, title: r.title, dueDate: r.due_date }));
  const last = items.at(-1);
  const next = rows.length > limit ? { dueDate: last.dueDate, id: last.id } : null;
  return { items, next };
}
```

- `rows.slice(0, limit)` で、余分に読んだ1行を捨てます。`next` を作るのは、捨てた後の最後の行（このページの最後）です。
- `after` があるときと無いときで SQL を2つに分けました。1つにまとめるなら、`after` が無いときに「どの行よりも前」を表す値（`('', 0)` など）を渡す方法もありますが、2つに分けた方が読みやすくなります。
- 行が足されてもずれないのは、「何行飛ばすか」ではなく「どの行の後か」で続きを読むからです（本文6節）。

## 問題7 上書きと二重作成を防ぐ関数

```js
export const KEYS_SQL = `
  CREATE TABLE idempotency_keys (
    key     TEXT PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE
  )
`;

export function renameTask(db, id, title, expectedVersion) {
  const task = db
    .prepare(
      `UPDATE tasks SET title = ?, version = version + 1
       WHERE id = ? AND version = ?
       RETURNING id, title, version`,
    )
    .get(title, id, expectedVersion);
  if (task) return { ok: true, task: { ...task } };
  // 変わらなかった理由を、後から調べる（無いのか、version が違うのか）
  const exists = db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(id);
  return { ok: false, reason: exists ? 'conflict' : 'not_found' };
}

export function createTaskOnce(db, key, { userId, title, minutes }) {
  db.exec('BEGIN');
  try {
    const seen = db.prepare('SELECT task_id FROM idempotency_keys WHERE key = ?').get(key);
    if (seen) {
      db.exec('COMMIT');
      return { id: seen.task_id, created: false };
    }
    const { id } = db
      .prepare('INSERT INTO tasks (user_id, title, minutes) VALUES (?, ?, ?) RETURNING id')
      .get(userId, title, minutes);
    db.prepare('INSERT INTO idempotency_keys (key, task_id) VALUES (?, ?)').run(key, id);
    db.exec('COMMIT');
    return { id, created: true };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
```

- `renameTask` の UPDATE は、1つの SQL なので、トランザクションに入れなくても「調べて変える」の間に割り込まれることはありません。`WHERE version = ?` が、調べることと変えることを1回で済ませています。
- 失敗の理由を調べる `SELECT` は、UPDATE の後なので、その間に消されることもあります。それでも「失敗した」ことは正しく伝わるので、困りません。
- `createTaskOnce` で、キーを覚える `INSERT` を先にし、タスクを後で作る順にもできます。どちらの順でも、同じトランザクションの中なら、途中で失敗すれば両方取り消されます。
- 本当に2つのリクエストが同時に来たときは、2つとも「キーが無い」と読む可能性があります。SQLite は書き込みを1つずつしか通さないので、ここでは起きませんが、PostgreSQL では、`idempotency_keys` の `PRIMARY KEY` が2つ目の `INSERT` を断ってくれます（第32章で、その失敗を見分ける方法を学びます）。

## 問題8 集計の関数のバグを直す

```js
// 直した所1: LEFT JOIN で相手が無い行も、count(*) は 1 と数える。t.id を数える（NULL は数えない）
export function tasksPerUser(db) {
  return db
    .prepare(`
      SELECT u.name, count(t.id) AS n
      FROM users AS u
      LEFT JOIN tasks AS t ON t.user_id = u.id
      GROUP BY u.id
      ORDER BY u.id
    `)
    .all()
    .map((r) => ({ ...r }));
}

// 直した所2: WHERE で t の列を絞ると、t が NULL の行（dave）が消える。条件を ON に移す
// 直した所3: 足すものが無いと sum は NULL。coalesce で 0 にする
export function openMinutes(db) {
  return db
    .prepare(`
      SELECT u.name, coalesce(sum(t.minutes), 0) AS minutes
      FROM users AS u
      LEFT JOIN tasks AS t ON t.user_id = u.id AND t.status <> 'done'
      GROUP BY u.id
      ORDER BY u.id
    `)
    .all()
    .map((r) => ({ ...r }));
}

// 直した所4: 1行ずつの条件は WHERE（まとめる前）、まとめた結果の条件は HAVING（まとめた後）
export function busyUsers(db, min) {
  return db
    .prepare(`
      SELECT u.name
      FROM users AS u
      JOIN tasks AS t ON t.user_id = u.id
      WHERE t.status <> 'done'
      GROUP BY u.id
      HAVING count(*) >= ?
      ORDER BY u.id
    `)
    .all(min)
    .map((r) => r.name);
}

// 直した所5: task_tags と JOIN すると、タグが2つのタスクは2行になり、minutes を2回足す。
// 「タグがあるか」は IN（サブクエリ）で調べ、行を増やさない
export function taggedMinutes(db) {
  return db
    .prepare(`
      SELECT u.name, sum(t.minutes) AS minutes
      FROM users AS u
      JOIN tasks AS t ON t.user_id = u.id
      WHERE t.id IN (SELECT task_id FROM task_tags)
      GROUP BY u.id
      ORDER BY u.id
    `)
    .all()
    .map((r) => ({ ...r }));
}
```

| 関数 | バグ | 起きていたこと |
| --- | --- | --- |
| `tasksPerUser` | LEFT JOIN なのに `count(*)` | dave が 0 ではなく 1 |
| `openMinutes` | 右の表の条件を `WHERE` に書いた | dave の行が消えた |
| `openMinutes` | `sum` を `coalesce` で囲んでいない | 上を直すと、dave が `null` |
| `busyUsers` | 1行ずつの条件 `t.status <> 'done'` を `HAVING` に書いた | グループの中の「どれか1行」の status で判断し、done のタスクも数えた |
| `taggedMinutes` | `task_tags` と JOIN して `sum` | タグが2つのタスク 4 の 120 分を2回足し、bob が 275 |

- `busyUsers` の `HAVING t.status <> 'done'` は、SQLite ではエラーになりませんが、まとめた後のグループには `status` が1つに決まらないので、SQLite はグループの中のどれか1行の値を使います。PostgreSQL では「`status` は GROUP BY に無い」というエラーになります。エラーにならないから正しい、とは限りません。
- `taggedMinutes` は、`sum(DISTINCT t.minutes)` では直りません。「同じ値の minutes」を1回にしてしまうので、違うタスクがたまたま同じ分数だと、足りなくなります。
