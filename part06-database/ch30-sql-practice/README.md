# 第30章 SQL の実践

第29章では、1つのテーブルから選び、変えました。実際のアプリでは、「タスクと、その持ち主の名前」「人ごとの、残りの作業時間」のように、いくつものテーブルをつないだり、まとめたりして読みます。また、2人が同時に同じタスクを変えたり、途中で失敗したりしても、データが壊れないようにする必要があります。
この章では、そのための SQL（JOIN・GROUP BY・インデックス・トランザクション）と、Web の API でよく使う守り方（version で上書きを防ぐ、同じ注文を2回作らない、カーソルでページを分ける）を、`node:sqlite` で手を動かしながら学びます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第29章（SELECT・INSERT・UPDATE・DELETE、`?`、制約、外部キー、多対多）、第5部 第25章（ETag と `If-Match`、冪等キー、カーソルでページを分ける） |
| この章のゴール | JOIN と LEFT JOIN の違いを説明し、つないで読める / GROUP BY・HAVING で数え、足せる。WHERE と HAVING を使い分けられる / インデックスの役目を説明し、`EXPLAIN QUERY PLAN` で使われたかを確かめられる / トランザクションで「全部か、何もしないか」にできる / version と冪等キーで、上書きと二重作成を防げる / カーソルでページを分けられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`join.mjs`・`group.mjs`・`index.mjs`・`transaction.mjs`・`version-lock.mjs`・`keyset.mjs`）と、タスク管理のテーブルを作る部品 `tasks-db.mjs` |
| [exercises/](exercises/) | 練習問題。SQL を試す道具 `run-query.mjs` 付き |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、すべて `~/dev/part06/ch30-sql-practice/` で実行します（第29章の最初に `setup-part06.sh` でコピーしたフォルダです）。
>
>   ```sh
>   $ cd ~/dev/part06/ch30-sql-practice
>   ```
>
> - 「**手を動かす**」の所は、新しいファイルに書いて動かしてください。ファイルの完成形は `samples/` にあります。
> - この章でも、サーバは動かしません。npm のパッケージも使いません。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| JOIN・LEFT JOIN（1節） | 第32・33章（タスクとタグ、N+1 の問題）、第10部（ユーザーとタスク） |
| GROUP BY・HAVING（2節） | 第33章（Drizzle の `count()` と `groupBy`）、第10部（ダッシュボードの数字） |
| インデックス（3節） | 第32章（PostgreSQL の `EXPLAIN`）、第33章（スキーマにインデックスを書く） |
| トランザクション（4節） | 第31章（トランザクションの関数を作る）、第32章（PostgreSQL のトランザクション）、成果物 |
| version と冪等キー（5節） | 第31章（更新を 409 で断る）、成果物（`If-Match` と `Idempotency-Key` をデータベースで） |
| カーソルでページを分ける（6節） | 成果物（一覧 API の `?cursor=`）、第10部（無限スクロール） |

---

## 0. この章で使うテーブル

[samples/tasks-db.mjs](samples/tasks-db.mjs) の `createTasksDb()` が、メモリの中に、次の4つのテーブルを作ります。第29章の問題6で作った形と、ほぼ同じです。

```text
users           tasks                          task_tags            tags
┌────┬───────┐  ┌────┬─────────┬──────────┐   ┌─────────┬────────┐  ┌────┬────────┐
│ id │ name  │  │ id │ user_id │ title …  │   │ task_id │ tag_id │  │ id │ name   │
└────┴───────┘  └────┴─────────┴──────────┘   └─────────┴────────┘  └────┴────────┘
      ↑ 1人に         │ 多くのタスク                 ↑ 組で、多対多
      └───────────────┘
```

**users**（4人。dave はタスクを1つも持っていません）

| id | name |
| --- | --- |
| 1 | alice |
| 2 | bob |
| 3 | carol |
| 4 | dave |

**tasks**（8個。`status` は `todo`・`doing`・`done` のどれか。`minutes` は見積もりの分。`version` は5節で使い、最初はどれも 1）

| id | user_id | title | status | due_date | minutes |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 牛乳を買う | done | 2026-11-01 | 10 |
| 2 | 1 | 本を返す | todo | 2026-11-12 | 20 |
| 3 | 1 | 部屋の掃除 | doing | 2026-11-15 | 60 |
| 4 | 2 | 報告書を書く | doing | 2026-11-10 | 120 |
| 5 | 2 | 歯医者の予約 | todo | NULL | 5 |
| 6 | 2 | 洗濯 | done | 2026-11-02 | 30 |
| 7 | 3 | 旅行の計画 | todo | 2026-12-01 | 90 |
| 8 | 3 | 年賀状 | todo | 2026-12-20 | 45 |

**tags** と **task_tags**（どのタスクに、どのタグが付いているか）

| tags.id | tags.name | 付いているタスク（task_tags） |
| --- | --- | --- |
| 1 | 買い物 | 1 |
| 2 | 家 | 2, 3, 6, 8 |
| 3 | 仕事 | 4 |
| 4 | 急ぎ | 4, 5 |

手を動かす前に、部品を今のフォルダにコピーしておきます。

```sh
$ cp samples/tasks-db.mjs .
```

## 1. JOIN でテーブルをつなぐ

`tasks` には持ち主の `user_id` しかありません。名前を出すには、`users` の行と「`tasks.user_id = users.id`」でつなぎます。これが **JOIN** です。

### 1.1 手を動かす: つないで読む

`join.mjs` を作ります（完成形は [samples/join.mjs](samples/join.mjs)）。

```js
import { createTasksDb } from './tasks-db.mjs';

const db = createTasksDb();

console.log('--- タスクと、その持ち主の名前（INNER JOIN）');
console.table(db.prepare(`
  SELECT t.id, t.title, u.name
  FROM tasks AS t
  JOIN users AS u ON u.id = t.user_id
  WHERE t.status <> 'done'
  ORDER BY t.id
`).all());

console.log('--- 人と、その人のタスク（LEFT JOIN。タスクの無い人も出る）');
console.table(db.prepare(`
  SELECT u.name, t.title
  FROM users AS u
  LEFT JOIN tasks AS t ON t.user_id = u.id AND t.status = 'doing'
  ORDER BY u.id
`).all());

console.log('--- 「家」のタグが付いたタスク（多対多を2回の JOIN で）');
console.table(db.prepare(`
  SELECT t.id, t.title
  FROM tasks AS t
  JOIN task_tags AS tt ON tt.task_id = t.id
  JOIN tags AS g ON g.id = tt.tag_id
  WHERE g.name = '家'
  ORDER BY t.id
`).all());

db.close();
```

```sh
$ node join.mjs
--- タスクと、その持ち主の名前（INNER JOIN）
┌─────────┬────┬────────────────┬─────────┐
│ (index) │ id │ title          │ name    │
├─────────┼────┼────────────────┼─────────┤
│ 0       │ 2  │ '本を返す'     │ 'alice' │
│ 1       │ 3  │ '部屋の掃除'   │ 'alice' │
│ 2       │ 4  │ '報告書を書く' │ 'bob'   │
│ 3       │ 5  │ '歯医者の予約' │ 'bob'   │
│ 4       │ 7  │ '旅行の計画'   │ 'carol' │
│ 5       │ 8  │ '年賀状'       │ 'carol' │
└─────────┴────┴────────────────┴─────────┘
--- 人と、その人のタスク（LEFT JOIN。タスクの無い人も出る）
┌─────────┬─────────┬────────────────┐
│ (index) │ name    │ title          │
├─────────┼─────────┼────────────────┤
│ 0       │ 'alice' │ '部屋の掃除'   │
│ 1       │ 'bob'   │ '報告書を書く' │
│ 2       │ 'carol' │ null           │
│ 3       │ 'dave'  │ null           │
└─────────┴─────────┴────────────────┘
--- 「家」のタグが付いたタスク（多対多を2回の JOIN で）
┌─────────┬────┬──────────────┐
│ (index) │ id │ title        │
├─────────┼────┼──────────────┤
│ 0       │ 2  │ '本を返す'   │
│ 1       │ 3  │ '部屋の掃除' │
│ 2       │ 6  │ '洗濯'       │
│ 3       │ 8  │ '年賀状'     │
└─────────┴────┴──────────────┘
```

| 書き方 | 意味 |
| --- | --- |
| `FROM tasks AS t` | `tasks` に `t` という短い別名を付ける。以後 `t.title` のように「表.列」で書ける |
| `JOIN users AS u ON u.id = t.user_id` | `tasks` の各行に、`ON` の条件に合う `users` の行をつなげて、1行にする。合う相手が無い行は**消える**（`INNER JOIN` とも書く） |
| `LEFT JOIN … ON …` | 左（`FROM` に書いた表）の行は、合う相手が無くても**全部残す**。相手の列は `NULL` になる |
| `JOIN task_tags … JOIN tags …` | JOIN は何回でも続けられる。多対多は、間の組のテーブルを通って2回つなぐ |

- 両方の表に同じ名前の列（`id` など）があるので、「どちらの表の列か」を `t.id`・`u.id` のように書き分けます。
- JOIN は、頭の中で「左の表の1行ごとに、右の表から `ON` に合う行を探して、横に並べる」と考えると分かりやすくなります。合う行が2つあれば、左の行は2行になります（2.3節で大事になります）。

### 1.2 LEFT JOIN の条件は、ON と WHERE で意味が違う

2つ目の SELECT では、`t.status = 'doing'` を `ON` に書きました。これを `WHERE` に書くと、結果が変わります。`run-query.mjs`（第29章と同じ道具で、こちらは `tasks-db.mjs` のテーブルに SQL を投げます）で比べてみます。

```sh
$ node exercises/run-query.mjs "SELECT u.name, t.title FROM users AS u LEFT JOIN tasks AS t ON t.user_id = u.id WHERE t.status = 'doing'"
┌─────────┬─────────┬────────────────┐
│ (index) │ name    │ title          │
├─────────┼─────────┼────────────────┤
│ 0       │ 'alice' │ '部屋の掃除'   │
│ 1       │ 'bob'   │ '報告書を書く' │
└─────────┴─────────┴────────────────┘
```

carol と dave が消えました。SQL は、**まず JOIN で行を作り、その後で WHERE で絞ります**。dave の行は JOIN の後で `t.status` が `NULL` なので、`WHERE t.status = 'doing'` で落とされます。

| 条件を書く所 | 意味 |
| --- | --- |
| `ON` | 「どの相手とつなぐか」。合う相手が無くても、LEFT JOIN なら左の行は残る |
| `WHERE` | つないだ後の行を絞る。右の表の列で絞ると、相手の無い行（`NULL`）は消える |

逆に、この性質を使うと「相手が1つも無い行」を探せます。LEFT JOIN でつなぎ、`WHERE 右の表.id IS NULL` で、相手の無かった行だけを残します。

```sh
$ node exercises/run-query.mjs "SELECT u.name FROM users AS u LEFT JOIN tasks AS t ON t.user_id = u.id WHERE t.id IS NULL"
┌─────────┬────────┐
│ (index) │ name   │
├─────────┼────────┤
│ 0       │ 'dave' │
└─────────┴────────┘
```

## 2. GROUP BY でまとめる

「status ごとの数」「人ごとの合計」のように、行をまとめて数えたり足したりするのが **GROUP BY** です。

### 2.1 手を動かす: 数える・足す

`group.mjs` を作ります（完成形は [samples/group.mjs](samples/group.mjs)）。

```js
import { createTasksDb } from './tasks-db.mjs';

const db = createTasksDb();

console.log('--- status ごとの数');
console.table(db.prepare(`
  SELECT status, count(*) AS n
  FROM tasks
  GROUP BY status
  ORDER BY status
`).all());

console.log('--- 人ごとの、終わっていないタスクの数と、見積もりの合計（タスクの無い人も 0 で）');
console.table(db.prepare(`
  SELECT u.name, count(t.id) AS open_tasks, coalesce(sum(t.minutes), 0) AS minutes
  FROM users AS u
  LEFT JOIN tasks AS t ON t.user_id = u.id AND t.status <> 'done'
  GROUP BY u.id
  ORDER BY u.id
`).all());

console.log('--- 終わっていないタスクが 2 つ以上ある人（HAVING）');
console.table(db.prepare(`
  SELECT u.name, count(*) AS n
  FROM users AS u
  JOIN tasks AS t ON t.user_id = u.id
  WHERE t.status <> 'done'
  GROUP BY u.id
  HAVING count(*) >= 2
  ORDER BY u.id
`).all());

db.close();
```

```sh
$ node group.mjs
--- status ごとの数
┌─────────┬─────────┬───┐
│ (index) │ status  │ n │
├─────────┼─────────┼───┤
│ 0       │ 'doing' │ 2 │
│ 1       │ 'done'  │ 2 │
│ 2       │ 'todo'  │ 4 │
└─────────┴─────────┴───┘
--- 人ごとの、終わっていないタスクの数と、見積もりの合計（タスクの無い人も 0 で）
┌─────────┬─────────┬────────────┬─────────┐
│ (index) │ name    │ open_tasks │ minutes │
├─────────┼─────────┼────────────┼─────────┤
│ 0       │ 'alice' │ 2          │ 80      │
│ 1       │ 'bob'   │ 2          │ 125     │
│ 2       │ 'carol' │ 2          │ 135     │
│ 3       │ 'dave'  │ 0          │ 0       │
└─────────┴─────────┴────────────┴─────────┘
--- 終わっていないタスクが 2 つ以上ある人（HAVING）
┌─────────┬─────────┬───┐
│ (index) │ name    │ n │
├─────────┼─────────┼───┤
│ 0       │ 'alice' │ 2 │
│ 1       │ 'bob'   │ 2 │
│ 2       │ 'carol' │ 2 │
└─────────┴─────────┴───┘
```

| 書き方 | 意味 |
| --- | --- |
| `GROUP BY status` | `status` が同じ行を、1つのグループ（結果の1行）にまとめる |
| `GROUP BY u.id` | 人ごとにまとめる。名前ではなく id でまとめると、同じ名前の人がいても混ざらない |
| `count(*)` | グループの行の数 |
| `count(t.id)` | グループの中で、`t.id` が `NULL` でない行の数 |
| `sum(t.minutes)` | 足した値。足すものが1つも無い（全部 `NULL`）と、0 ではなく `NULL` になる |
| `coalesce(a, b)` | `a` が `NULL` なら `b`、そうでなければ `a`。`coalesce(sum(…), 0)` で、`NULL` を 0 にする |
| `HAVING count(*) >= 2` | まとめた後のグループを絞る |
| `ORDER BY n DESC` | `AS` で付けた名前で並べられる |

ほかに、`avg(列)`（平均）・`min(列)`・`max(列)` も同じように使えます。

### 2.2 SQL が動く順番と、WHERE・HAVING・count の使い分け

SQL は書く順番と、動く順番が違います。

```text
1. FROM と JOIN   … 表をつないで、行を作る
2. WHERE          … 1行ずつ絞る
3. GROUP BY       … まとめる
4. HAVING         … まとめたグループを絞る
5. SELECT         … 出す列を作る（count・sum を計算し、AS の名前を付ける）
6. ORDER BY       … 並べる（AS の名前が使える）
7. LIMIT          … 先頭の何行か
```

ここから、次の使い分けが出てきます。

| したいこと | 書く所 | 理由 |
| --- | --- | --- |
| 1行ごとの条件（`status <> 'done'`） | `WHERE`（LEFT JOIN なら `ON`） | まとめる前に、行を選ぶ |
| まとめた結果の条件（`count(*) >= 2`） | `HAVING` | `count` は、まとめた後でないと分からない。`WHERE count(*) >= 2` はエラーになる |
| LEFT JOIN で、相手の無い人を 0 と数える | `count(t.id)` | 相手の無い人も1行あるので、`count(*)` だと 1 になる |

`group.mjs` の2つ目で `count(*)` にすると、dave の `open_tasks` が 1 になります。試してみてください。

### 2.3 JOIN で行が増えると、合計も増える

1.1節で見たように、JOIN は、合う相手が2つあると、左の行を2行にします。タスク 4（報告書を書く、120 分）には「仕事」と「急ぎ」の2つのタグがあるので、`task_tags` とつなぐと2行になります。この状態で `sum(t.minutes)` を取ると、120 を2回足してしまいます。

```sh
$ node exercises/run-query.mjs "SELECT t.id, t.minutes, tt.tag_id FROM tasks AS t JOIN task_tags AS tt ON tt.task_id = t.id WHERE t.user_id = 2"
┌─────────┬────┬─────────┬────────┐
│ (index) │ id │ minutes │ tag_id │
├─────────┼────┼─────────┼────────┤
│ 0       │ 4  │ 120     │ 3      │
│ 1       │ 4  │ 120     │ 4      │
│ 2       │ 5  │ 5       │ 4      │
│ 3       │ 6  │ 30      │ 2      │
└─────────┴────┴─────────┴────────┘
```

「タグがあるかどうか」だけを知りたいときは、JOIN でつながずに、`IN`（かっこの中の SELECT の結果に含まれるか）で調べると、行が増えません。

```sh
$ node exercises/run-query.mjs "SELECT id, minutes FROM tasks WHERE user_id = 2 AND id IN (SELECT task_id FROM task_tags)"
┌─────────┬────┬─────────┐
│ (index) │ id │ minutes │
├─────────┼────┼─────────┤
│ 0       │ 4  │ 120     │
│ 1       │ 5  │ 5       │
│ 2       │ 6  │ 30      │
└─────────┴────┴─────────┘
```

かっこの中の SELECT を**サブクエリ**と呼びます。`id IN (1, 2, 3)` のように値を並べて書くこともできます。集計の結果がおかしいときは、`GROUP BY` を外して、まとめる前の行を見ると、原因が見つかります。

## 3. インデックスで速く探す

`WHERE user_id = ?` で探すとき、データベースは、何も工夫が無ければ、表の行を最初から最後まで全部見ます（**SCAN**）。本で言えば、1ページ目から全部めくって探すことです。**インデックス**は、本の巻末の索引のように、「この値の行はここ」をまとめた別の表で、これがあると、すぐに目当ての行へ飛べます（**SEARCH**）。

### 3.1 手を動かす: インデックスの有り無しを比べる

`index.mjs` を作ります（完成形は [samples/index.mjs](samples/index.mjs)）。20 万行の表を作り、同じ SELECT を 200 回動かす時間を比べます。

```js
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE events (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, kind TEXT NOT NULL)');

// 20 万行を足す（BEGIN と COMMIT で1つにまとめると速い。4節）
const insert = db.prepare('INSERT INTO events (user_id, kind) VALUES (?, ?)');
db.exec('BEGIN');
for (let i = 0; i < 200_000; i++) insert.run(i % 5000, i % 3 === 0 ? 'login' : 'view');
db.exec('COMMIT');

const sql = 'SELECT count(*) AS n FROM events WHERE user_id = ?';

function measure(label) {
  const stmt = db.prepare(sql);
  const start = performance.now();
  for (let i = 0; i < 200; i++) stmt.get(i);
  const ms = performance.now() - start;
  const plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(1).map((r) => r.detail);
  console.log(`${label}: 200 回で ${ms.toFixed(1)} ms  計画: ${plan.join(' / ')}`);
}

measure('インデックスなし');
db.exec('CREATE INDEX events_user_id ON events (user_id)');
measure('インデックスあり');

db.close();
```

```sh
$ node index.mjs
インデックスなし: 200 回で 916.8 ms  計画: SCAN events
インデックスあり: 200 回で 0.3 ms  計画: SEARCH events USING COVERING INDEX events_user_id (user_id=?)
```

（時間は、Mac によって変わります。）

| 書き方 | 意味 |
| --- | --- |
| `CREATE INDEX events_user_id ON events (user_id)` | `events` の `user_id` の列に、`events_user_id` という名前のインデックスを作る |
| `EXPLAIN QUERY PLAN SELECT …` | SELECT を動かさずに、「どう探すつもりか」（計画）を返す。`detail` の列に説明が入る |
| `SCAN events` | 表を全部見る |
| `SEARCH events USING INDEX …` | インデックスを使って探す。`COVERING INDEX` は「インデックスだけで答えが出せたので、表を見なかった」 |
| `performance.now()` | 今の時刻をミリ秒で返す（小数まで）。前後の差で、かかった時間が分かる |

- インデックスは、`PRIMARY KEY` と `UNIQUE` の列には、自動で作られます。外部キーの列（`user_id` など）には自動では作られないので、よく探す列には自分で作ります。
- インデックスは、ただではありません。行を足す・変えるたびにインデックスも直すので、書き込みが少し遅くなり、ファイルも大きくなります。「よく探す列」にだけ作ります。
- 20 万行を足す所で `BEGIN` と `COMMIT` を使っています。4節で説明します。

### 3.2 複数の列のインデックスと、範囲

`WHERE user_id = ? AND status = ?` のように2つの列で探すなら、2つの列を並べたインデックスを作れます。

```sql
CREATE INDEX tasks_user_id_status ON tasks (user_id, status);
```

このインデックスは、電話帳の「名字、名前」の順の並びのようなものです。`user_id` だけで探すときにも使えますが、`status` だけで探すときには使えません（名前だけでは電話帳を引けないのと同じです）。左の列から順に使われます。

`WHERE due_date BETWEEN '2026-11-01' AND '2026-11-30'`（`BETWEEN a AND b` は「`a` 以上 `b` 以下」）や `due_date < ?` のような範囲の条件にも、その列のインデックスが使われます。インデックスの中は値の順に並んでいるので、範囲の始まりに飛んで、終わりまで読めばよいからです。

本当に使われるかは、`EXPLAIN QUERY PLAN` で確かめます。

```sh
$ node exercises/run-query.mjs "EXPLAIN QUERY PLAN SELECT id FROM tasks WHERE status = 'todo'"
┌─────────┬────┬────────┬─────────┬──────────────┐
│ (index) │ id │ parent │ notused │ detail       │
├─────────┼────┼────────┼─────────┼──────────────┤
│ 0       │ 2  │ 0      │ 216     │ 'SCAN tasks' │
└─────────┴────┴────────┴─────────┴──────────────┘
```

（`run-query.mjs` は `EXPLAIN` も表で出します。見るのは `detail` の列です。）

## 4. トランザクション: 全部か、何もしないか

「alice から bob へ 30 ポイント移す」には、「bob を 30 増やす」と「alice を 30 減らす」の2つの UPDATE が要ります。1つ目の後でエラーが起きると、bob だけが増えて、ポイントが勝手に生まれてしまいます。
**トランザクション**は、いくつかの SQL を1つにまとめ、「全部成功したら確定（**COMMIT**）、途中で失敗したら全部取り消す（**ROLLBACK**）」にする仕組みです。

### 4.1 手を動かす: ポイントを移す

`transaction.mjs` を作ります（完成形は [samples/transaction.mjs](samples/transaction.mjs)）。

```js
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE points (
    name    TEXT PRIMARY KEY,
    balance INTEGER NOT NULL CHECK (balance >= 0)
  );
  INSERT INTO points (name, balance) VALUES ('alice', 100), ('bob', 0);
`);

const add = db.prepare('UPDATE points SET balance = balance + ? WHERE name = ?');

// from から to へ、amount ポイント移す。途中で失敗したら、全部なかったことにする
function transfer(from, to, amount) {
  db.exec('BEGIN');
  try {
    add.run(amount, to); // 先に増やす
    add.run(-amount, from); // 減らす（足りなければ CHECK で失敗する）
    db.exec('COMMIT');
    console.log(`OK  ${from} → ${to} ${amount}`);
  } catch (err) {
    db.exec('ROLLBACK');
    console.log(`NG  ${from} → ${to} ${amount}: ${err.message}`);
  }
}

transfer('alice', 'bob', 30);
transfer('alice', 'bob', 500); // alice は 70 しか持っていない
console.table(db.prepare('SELECT * FROM points ORDER BY name').all());
db.close();
```

```sh
$ node transaction.mjs
OK  alice → bob 30
NG  alice → bob 500: CHECK constraint failed: balance >= 0
┌─────────┬─────────┬─────────┐
│ (index) │ name    │ balance │
├─────────┼─────────┼─────────┤
│ 0       │ 'alice' │ 70      │
│ 1       │ 'bob'   │ 30      │
└─────────┴─────────┴─────────┘
```

2回目は、bob を 500 増やした後で、alice を減らす所で `CHECK` に断られました。ROLLBACK したので、先に増やした bob の 500 も取り消され、bob は 30 のままです。

| 書き方 | 意味 |
| --- | --- |
| `BEGIN` | トランザクションを始める |
| `COMMIT` | ここまでの変更を確定する。確定した後は、プログラムが落ちても残る |
| `ROLLBACK` | `BEGIN` からの変更を、全部取り消す |
| `try { … } catch (err) { … }` | `try` の中で例外が起きたら、`catch` に飛ぶ（第3部 第11章 9節） |

トランザクションの関数は、いつも次の形で書きます。

```js
db.exec('BEGIN');
try {
  // ここに、まとめたい SQL を書く。失敗させたいときは throw する
  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  throw err; // 呼んだ側にも、失敗を伝える
}
```

- `ROLLBACK` を忘れると、トランザクションが開いたままになり、次の `BEGIN` が「もう始まっている」というエラーになります。
- `catch` で `throw err` し直すと、呼んだ側が失敗を知れます。`transfer` は練習のため `console.log` で終えていますが、ふつうは投げ直します。
- 自分の都合で取り消したいとき（「タスクが見つからない」など）は、`throw new Error('…')` で `catch` に飛ばします。
- 3.1節で `BEGIN` と `COMMIT` を使ったのは、速さのためです。トランザクションの外では、1つの INSERT ごとに確定（ファイルへの書き込み）が起きますが、まとめると確定は最後の1回で済みます。

データベースの決まりでは、トランザクションは「全部か、何もしないか」（**原子性**）のほかに、「制約を破った状態で確定しない」（一貫性）、「同時に動くほかのトランザクションに、途中の状態を見せない」（独立性）、「確定したら消えない」（永続性）を守ります。4つの頭文字を取って **ACID** と呼びます。

## 5. 同時に変える事故を防ぐ

Web のアプリでは、同じデータを、何人もが、何回も変えます。トランザクションだけでは防げない、よくある事故が2つあります。

| 事故 | 例 |
| --- | --- |
| **上書きの事故**（lost update） | A さんと B さんが、同じタスクの編集画面を開く。A さんが題名を直して保存し、その後で B さんが、古い題名のまま別の所を直して保存すると、A さんの直しが消える |
| **二重作成の事故** | 「作る」を押した後、通信が切れて返事が来なかったので、もう一度押す。実は1回目も届いていて、同じタスクが2つできる |

### 5.1 手を動かす: version と冪等キー

`version-lock.mjs` を作ります（完成形は [samples/version-lock.mjs](samples/version-lock.mjs)）。

```js
import { createTasksDb } from './tasks-db.mjs';

const db = createTasksDb();

// 読んだときの version と同じときだけ変え、version を 1 増やす。変えた行を RETURNING で受け取る
const rename = db.prepare(`
  UPDATE tasks SET title = ?, version = version + 1
  WHERE id = ? AND version = ?
  RETURNING id, title, version
`);

const seenByA = db.prepare('SELECT version FROM tasks WHERE id = 2').get().version; // A さんが読む
const seenByB = db.prepare('SELECT version FROM tasks WHERE id = 2').get().version; // B さんも読む

console.log('A:', rename.get('図書館に本を返す', 2, seenByA)); // 先に変える → 変わる
console.log('B:', rename.get('本を2冊返す', 2, seenByB)); // 古い version のまま → 変わらない（undefined）

// 同じキーの2回目を断る: 冪等キーの表に、ON CONFLICT DO NOTHING で入れる
db.exec('CREATE TABLE idempotency_keys (key TEXT PRIMARY KEY, task_id INTEGER NOT NULL)');
const remember = db.prepare('INSERT INTO idempotency_keys (key, task_id) VALUES (?, ?) ON CONFLICT (key) DO NOTHING');
console.log('1回目:', remember.run('key-abc', 2).changes); // 1: 入った
console.log('2回目:', remember.run('key-abc', 3).changes); // 0: もうあったので何もしない

db.close();
```

```sh
$ node version-lock.mjs
A: [Object: null prototype] { id: 2, title: '図書館に本を返す', version: 2 }
B: undefined
1回目: 1
2回目: 0
```

**上書きの事故を防ぐ: version**（楽観的ロック）

- タスクに `version` の列を持たせ、変えるたびに 1 増やします。
- 変えるときは、「自分が読んだときの version」を `WHERE id = ? AND version = ?` に入れます。その間にほかの人が変えていれば version が増えているので、1行も合わず、何も変わりません。
- B さんには「ほかの人が先に変えました。読み直してください」と伝えます。第25章では、ETag と `If-Match` を比べて **412** で断りました。データベースの version は、その ETag の元になる値です（version が変われば ETag も変わる）。`If-Match` を使わない API では、ボディに `version` を入れてもらい、合わなければ **409 Conflict** で返します。

| 書き方 | 意味 |
| --- | --- |
| `SET version = version + 1` | 今の値に 1 を足す。`=` の右に、その列の今の値を使える |
| `RETURNING id, title, version` | 変えた後の行を、SELECT のように返す。`get()` で受け取り、1行も変わらなければ `undefined` |
| `run(…).changes` | `RETURNING` を使わないなら、変わった行の数で「変わったか」が分かる |

- 1行も変わらなかったとき、それが「タスクが無い」からか「version が違う」からかは、`UPDATE` の結果だけでは分かりません。もう一度 `SELECT 1 FROM tasks WHERE id = ?` で、行があるかを調べます（`SELECT 1` は、列の中身は要らず、行があるかだけを知りたいときの書き方です）。

**二重作成の事故を防ぐ: 冪等キー**

- **冪等**（べきとう）は、「1回しても何回しても、結果が同じ」ことです。
- 頼む側が、注文ごとに、ばらばらな文字列（**冪等キー**）を作ってリクエストに付けます（第25章の `Idempotency-Key` ヘッダ。第25章ではメモリの `Map` に覚えましたが、ここではデータベースに覚えます）。もう一度送るときも、同じキーを付けます。
- サーバは、キーを `PRIMARY KEY` の表に覚えておき、2回目に同じキーが来たら、作らずに、1回目に作ったものを返します。

| 書き方 | 意味 |
| --- | --- |
| `INSERT … ON CONFLICT (key) DO NOTHING` | `key` が `PRIMARY KEY`・`UNIQUE` とぶつかったら、エラーにせず、何もしない（`changes` が 0） |
| `INSERT … RETURNING id` | 足した行の `id` を受け取る。`run()` の `lastInsertRowid` と同じ値を、行として受け取れる |

- 「キーを調べる」「タスクを作る」「キーを覚える」は、1つのトランザクションにまとめます。途中で失敗したのにキーだけ残ると、次に同じキーで頼まれたとき、タスクが無いのに「もう作った」と答えてしまいます。

## 6. カーソルでページを分ける

第29章では、`LIMIT 10 OFFSET 20`（20 行飛ばして 10 行）でページを分けました。この方法には、2つの弱点があります。

- **遅くなる**: `OFFSET 100000` は、10 万行を読んでから捨てます。後ろのページほど遅くなります。
- **ずれる**: 1ページ目を見ている間に、前の方に1行増えると、2ページ目の最初に、1ページ目の最後の行がもう一度出ます（行が消えると、逆に1行抜けます）。

そこで、「何行飛ばすか」ではなく、「**最後に見た行より後**」を `WHERE` で選びます。最後に見た行を表すものを**カーソル**と呼びます（キーセット方式とも呼びます）。第25章の `paginate` は、メモリの配列で同じことをしました。ここでは、それを SQL でします。

### 6.1 手を動かす: 締め切りの順にページを分ける

`keyset.mjs` を作ります（完成形は [samples/keyset.mjs](samples/keyset.mjs)）。

```js
import { createTasksDb } from './tasks-db.mjs';

const db = createTasksDb();

// 締め切りの早い順、同じ締め切りなら id の順。「最後に見た行より後」を WHERE で選ぶ
const firstPage = db.prepare(`
  SELECT id, due_date, title FROM tasks
  WHERE due_date IS NOT NULL
  ORDER BY due_date, id
  LIMIT ?
`);
const nextPage = db.prepare(`
  SELECT id, due_date, title FROM tasks
  WHERE due_date IS NOT NULL
    AND (due_date, id) > (?, ?)
  ORDER BY due_date, id
  LIMIT ?
`);

let rows = firstPage.all(3);
let page = 1;
while (rows.length > 0) {
  console.log(`--- ${page} ページ目`);
  console.table(rows);
  const last = rows.at(-1); // 最後に見た行
  rows = nextPage.all(last.due_date, last.id, 3);
  page += 1;
}

db.close();
```

```sh
$ node keyset.mjs
--- 1 ページ目
┌─────────┬────┬──────────────┬────────────────┐
│ (index) │ id │ due_date     │ title          │
├─────────┼────┼──────────────┼────────────────┤
│ 0       │ 1  │ '2026-11-01' │ '牛乳を買う'   │
│ 1       │ 6  │ '2026-11-02' │ '洗濯'         │
│ 2       │ 4  │ '2026-11-10' │ '報告書を書く' │
└─────────┴────┴──────────────┴────────────────┘
--- 2 ページ目
┌─────────┬────┬──────────────┬──────────────┐
│ (index) │ id │ due_date     │ title        │
├─────────┼────┼──────────────┼──────────────┤
│ 0       │ 2  │ '2026-11-12' │ '本を返す'   │
│ 1       │ 3  │ '2026-11-15' │ '部屋の掃除' │
│ 2       │ 7  │ '2026-12-01' │ '旅行の計画' │
└─────────┴────┴──────────────┴──────────────┘
--- 3 ページ目
┌─────────┬────┬──────────────┬──────────┐
│ (index) │ id │ due_date     │ title    │
├─────────┼────┼──────────────┼──────────┤
│ 0       │ 8  │ '2026-12-20' │ '年賀状' │
└─────────┴────┴──────────────┴──────────┘
```

| 書き方 | 意味 |
| --- | --- |
| `ORDER BY due_date, id` | 締め切りの順。同じ締め切りなら id の順。**最後に、重ならない列（id）を必ず入れる**。入れないと、同じ締め切りの行の順が決まらず、ページの境目で重なったり抜けたりする |
| `(due_date, id) > (?, ?)` | 2つの値の組を、辞書のように比べる。「`due_date` が大きい。または、`due_date` が同じで `id` が大きい」と同じ意味 |
| `rows.at(-1)` | 配列の最後の要素。`rows[rows.length - 1]` と同じ |

- 日付を `'2026-11-01'` の形の文字列で持つと、文字列の順と日付の順が同じになるので、`<`・`>`・`ORDER BY` がそのまま使えます。
- `due_date` が `NULL` のタスク（歯医者の予約）は、`>` で比べられないので、`WHERE due_date IS NOT NULL` で外しています。
- `ORDER BY` と同じ並びのインデックス（`(due_date, id)`）があれば、どのページも、カーソルの位置に飛んで読み始めるだけなので、後ろのページでも遅くなりません。

**次のページがあるかを知る**: `keyset.mjs` は、空のページが来るまで読みました。API では、「次のページがあるか」を、最後のページで知らせたいことがあります。そのときは、`LIMIT` に「欲しい数 + 1」を渡します。返ってきた行が欲しい数より多ければ、次のページがあります（余った1行は返さず、捨てます）。

```text
欲しい数 3 → LIMIT 4 で読む
  4 行来た → 3 行を返し、「次がある」（カーソルは 3 行目）
  3 行以下 → 全部返し、「次は無い」
```

## 7. Flask との対応

| やりたいこと | Flask（sqlite3 / SQLAlchemy） | この章 |
| --- | --- | --- |
| つないで読む | `JOIN` を書いた SQL / `db.session.query(Task, User).join(User)` | `JOIN … ON …` を書いた SQL |
| まとめる | `GROUP BY` を書いた SQL / `func.count(Task.id)` と `.group_by(User.id)` | `GROUP BY`・`count`・`sum` |
| トランザクション | `with conn:`（sqlite3。抜けるとき COMMIT か ROLLBACK）/ `db.session.commit()`・`db.session.rollback()` | `BEGIN`・`COMMIT`・`ROLLBACK` を自分で |
| version で上書きを防ぐ | SQLAlchemy の `version_id_col`（裏で `WHERE version = ?` を付ける） | `WHERE id = ? AND version = ?` を自分で |
| ページ分け | Flask-SQLAlchemy の `paginate()`（裏では `LIMIT`・`OFFSET`） | カーソル（`(due_date, id) > (?, ?)`） |

Flask-SQLAlchemy では、`db.session` に変更をためておき、`db.session.commit()` で確定します。これは、セッションが裏で `BEGIN` し、`commit()` で `COMMIT` を送っているからです。この章では、それを自分で書きました。第31章では、この形を関数にまとめ、何度も書かずに済むようにします。

## まとめ

- `JOIN … ON …` で、外部キーをたどってテーブルをつなぐ。相手の無い行も残したいときは `LEFT JOIN`。LEFT JOIN の右の表の条件は `ON` に書く（`WHERE` に書くと、相手の無い行が消える）。
- `GROUP BY` でまとめ、`count`・`sum` で数える・足す。1行ずつの条件は `WHERE`、まとめた結果の条件は `HAVING`。相手の無い行を 0 と数えるなら `count(列)`、`sum` の `NULL` は `coalesce` で 0 に。
- JOIN で行が増えると、合計も増える。「あるかどうか」だけなら `IN (SELECT …)`。
- よく探す列には `CREATE INDEX`。使われたかは `EXPLAIN QUERY PLAN` で、`SCAN` ではなく `SEARCH` になっているかを見る。
- 一緒に成功させたい SQL は、`BEGIN`・`COMMIT`、失敗したら `ROLLBACK`（そして投げ直す）。
- 上書きの事故は `WHERE version = ?` で防ぎ、409 で知らせる。二重作成は冪等キーで防ぐ。
- 大きな一覧は、`OFFSET` ではなく、カーソル（最後に見た行）でページを分ける。`ORDER BY` の最後に id を入れる。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用2問・発展2問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- SQLite 公式「SELECT」（JOIN・GROUP BY・HAVING）: https://www.sqlite.org/lang_select.html
- SQLite 公式「EXPLAIN QUERY PLAN」: https://www.sqlite.org/eqp.html
- SQLite 公式「Transaction」: https://www.sqlite.org/lang_transaction.html
- SQLite 公式「UPSERT」（`ON CONFLICT`）: https://www.sqlite.org/lang_upsert.html
- SQLite 公式「RETURNING」: https://www.sqlite.org/lang_returning.html
- SQLite 公式「Row Values」（`(a, b) > (?, ?)`）: https://www.sqlite.org/rowvalue.html
- PostgreSQL 公式ドキュメント（日本語）「テーブル間を結合」: https://www.postgresql.jp/docs/current/tutorial-join.html

---

前: [第29章 リレーショナル DB と SQL](../ch29-sql-basics/README.md) ／ 次: [第31章 Node.js からデータベースを使う](../ch31-node-db/README.md) ／ 部の目次: [第6部 データベース](../README.md)
