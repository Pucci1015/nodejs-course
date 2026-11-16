# 第32章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part06/ch32-docker-postgres/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | `$1` で値を渡して探す | [pg-queries.mjs](pg-queries.mjs)、[pg-queries.test.mjs](pg-queries.test.mjs) | 4 |
| 2 | 基本 | PostgreSQL の型で表を作る | [comments-sql.mjs](comments-sql.mjs)、[comments-sql.test.mjs](comments-sql.test.mjs) | 3 |
| 3 | 基本 | 接続を借りて必ず返す | [with-client.mjs](with-client.mjs)、[with-client.test.mjs](with-client.test.mjs) | 5, 6.1 |
| 4 | 基本 | Docker と Compose（調べる問題） | このページ | 1, 2 |
| 5 | 応用 | タスクにタグを付ける（多対多・配列） | [task-tags.mjs](task-tags.mjs)、[task-tags.test.mjs](task-tags.test.mjs) | 4.2, 6.1 |
| 6 | 応用 | 仕事を取り合わない列（`SKIP LOCKED`） | [job-queue.mjs](job-queue.mjs)、[job-queue.test.mjs](job-queue.test.mjs) | 6.2 |
| 7 | 応用 | エラーを、制約の名前で分かる文に | [pg-problem.mjs](pg-problem.mjs)、[pg-problem.test.mjs](pg-problem.test.mjs) | 7 |
| 8 | 発展 | 同時に起動しても安全なマイグレーション | [safe-migrate.mjs](safe-migrate.mjs)、[safe-migrate.test.mjs](safe-migrate.test.mjs) | 8.1 |
| 9 | 発展 | PostgreSQL を使う関数のバグを直す | [buggy-store.mjs](buggy-store.mjs)、[buggy-store.test.mjs](buggy-store.test.mjs) | 4〜6 |

**発展**（8・9）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

- テストは PostgreSQL を使います。先に `docker compose up -d --wait` で動かしておきます（`docker compose ps` で `healthy` なら大丈夫です）。動いていないと、`PostgreSQL につながりません` というエラーになります。
- テストは、テストごとに PostgreSQL の中に新しい**スキーマ**（テーブルを入れる箱。`test_` で始まる名前）を作り、そこに本文3節と同じ5つのタスクを入れてから、関数を呼びます。テストが終わると、スキーマごと消します。本文で作った `tasks` には触りません（[pg-test.mjs](pg-test.mjs)。書き換えなくてよいファイルです）。
- 問題4以外は、`○○.mjs` の「ここを書く」を埋め（問題9はバグを直し）、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。
- [with-transaction.mjs](with-transaction.mjs)（本文6.1節）と [pg-errors.mjs](pg-errors.mjs)（本文7節）は、本文と同じ部品です。

---

## 基本

### 問題1 `$1` で値を渡して探す

[pg-queries.mjs](pg-queries.mjs) に、タスクを探す関数を4つ書いてください（本文4節）。第31章の練習問題1を、PostgreSQL で書き直す問題です。どの関数も `async` で、`pool.query` を使います。

| 関数 | 返すもの |
| --- | --- |
| `findByStatus(pool, status)` | `status` が同じタスクの `title` の配列（`id` の順） |
| `searchTitle(pool, word)` | `title` に `word` を含むタスクの `{ id, title }` の配列（`id` の順）。英字の大文字と小文字は区別しない（`'let'` で `Let's ストレッチ` が見つかる） |
| `countByStatus(pool)` | `{ todo: 数, doing: 数, done: 数 }`。数は number。1つも無い status も `0` |
| `overdue(pool, { date, limit })` | 終わっていなくて、`due_date` が `date` より前のタスクの `title` の配列（`due_date` の順に、`limit` 個まで） |

```sh
$ node --test pg-queries.test.mjs
ℹ pass 4
ℹ fail 0
```

ヒント:

- PostgreSQL の `LIKE` は、英字の大文字と小文字を**区別します**（SQLite とは違います）。区別しないで探すのは `ILIKE` です。使い方は `LIKE` と同じです。
- `count(*)` は文字列で返ってきます（本文4.2節）。`count(*)::int` にします。
- `pool.query` の結果の行は、ふつうのオブジェクトなので、`rows` をそのまま返せます。

### 問題2 PostgreSQL の型で表を作る

タスクに付けるコメントの表 `comments` を作る SQL を、[comments-sql.mjs](comments-sql.mjs) の `COMMENTS_SQL` に書いてください（本文3節）。テストは、`tasks` がある所で、この SQL を動かします。

| 列 | 決まり |
| --- | --- |
| `id` | 1, 2, 3, … と自動で付く主キー |
| `task_id` | `tasks` の `id` を指す外部キー。`NULL` は不可。タスクを消したら、そのコメントも消える |
| `body` | 文字列。`NULL` は不可。1〜500 文字 |
| `created_at` | タイムゾーンつきの時刻。`NULL` は不可。書かなければ今の時刻 |

加えて、「あるタスクのコメントを、古い順に」読むためのインデックスを、`(task_id, created_at)` の順で作ってください。

```sh
$ node --test comments-sql.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- 本文3.1節の `schema.sql` と、第29章 6節の外部キー（`REFERENCES … ON DELETE CASCADE`）を組み合わせます。PostgreSQL では、外部キーは最初から守られます（SQLite の `PRAGMA foreign_keys = ON` は要りません）。
- 文を2つ書くので、それぞれの終わりに `;` を付けます。
- テストは、断られたときのエラーコード（`23503`・`23514`・`23502`）も確かめます（本文7節の表）。

### 問題3 接続を借りて必ず返す

[with-client.mjs](with-client.mjs) に、2つの関数を書いてください（本文5・6.1節）。

| 関数 | すること |
| --- | --- |
| `withClient(pool, fn)` | プールから接続を1本借りて `fn(client)` を呼び、その戻り値を返す。`fn` が成功しても失敗しても（例外を投げても）、接続を返す |
| `withTransaction(pool, fn)` | `withClient` を使って接続を借り、`BEGIN` → `fn(client)` → `COMMIT`。`fn` が失敗したら `ROLLBACK` して、同じ例外を投げ直す。`fn` の戻り値を返す |

```sh
$ node --test with-client.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- 本文の `with-transaction.mjs` を、「借りて返す」所（`withClient`）と「トランザクション」の所に分ける問題です。
- `return fn(client)` と `return await fn(client)` は、`try … finally` の中では意味が違います。`await` が無いと、`fn` が終わる前に `finally` に進み、使っている途中の接続を返してしまいます。テストの3つ目が、それを確かめます。
- テストは、接続が1本しかないプールで、失敗の後にもう一度借りられるか（返し忘れていないか）を確かめます。

### 問題4 Docker と Compose（調べる問題）

次の問いに、文章で答えてください（本文1・2節）。[../../compose.yaml](../../compose.yaml) を見ながら考えます。

1. `docker compose stop`・`docker compose down`・`docker compose down -v` を、それぞれ動かした後、`docker compose up -d --wait` で動かし直しました。本文3節で作った `tasks` の行は、それぞれ残っていますか。理由も書いてください。
2. `ports:` を `"5433:5432"`（`127.0.0.1:` を付けない）にすると、何が変わりますか。パスワードが `dev-only-password` のままだと、どんな心配がありますか。
3. `docker/postgres-init/01-databases.sql` に、`CREATE DATABASE ch35 OWNER app;` の行を足して `docker compose up -d --wait` しましたが、`\l` に `ch35` が出ません。なぜでしょうか。`ch35` を作るには、どうすればよいでしょうか（データを消さない方法と、消す方法の2つ）。
4. Node.js のプログラムは `127.0.0.1:5433` につなぎますが、PostgreSQL はコンテナの中で `5432` 番で待っています。どこで番号が変わっていますか。
5. `compose.yaml` に `healthcheck` が無いと、`docker compose up -d` の直後に `node first-pg.mjs` を動かしたとき、何が起きることがありますか。`--wait` は何を待っていますか。

---

## 応用

### 問題5 タスクにタグを付ける（多対多・配列）

[task-tags.mjs](task-tags.mjs) に、タスクにタグを付ける関数を3つ書いてください（本文4.2・6.1節、第29章 6節、第30章 1・5節）。テストは、`TAGS_SQL`（書いてあります。`tags` と `task_tags` の表）を動かしてから呼びます。

| 関数 | すること |
| --- | --- |
| `setTags(pool, taskId, names)` | タスク `taskId` のタグを `names` に**置き換える**（前のタグは外す）。無いタグは `tags` に作る。同じ名前が2回あっても1つにする。付いたタグの名前の配列（名前の順）を返す。タスクが無ければ、例外（`23503`）を投げ、タグも作らない |
| `tagsOf(pool, taskId)` | タスク `taskId` のタグの名前の配列（名前の順）。無ければ `[]` |
| `tasksWithTags(pool)` | 全部のタスクの `{ id, title, tags }` の配列（`id` の順）。`tags` は名前の配列（名前の順）。タグが無ければ `[]` |

```sh
$ node --test task-tags.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- `setTags` は、`withTransaction` の中で「`task_tags` からこのタスクの行を消す → 名前ごとに、`tags` に無ければ作り（`INSERT … ON CONFLICT (name) DO NOTHING`。第30章 5節）、`task_tags` に組を入れる」とします。組を入れる所は、`INSERT INTO task_tags (task_id, tag_id) SELECT $1, id FROM tags WHERE name = $2` のように、`VALUES` の代わりに `SELECT` の結果を入れられます。
- 重なりを除くのは `[...new Set(names)]` です（`Set` は本文8.1節）。
- `tasksWithTags` は、2通りの書き方があります。
  - SQL で: PostgreSQL の `array_agg(列 ORDER BY 列)` は、`GROUP BY` でまとめた行の値を、**配列**にします。`pg` は、それを JavaScript の配列で返します。タグの無いタスクは、LEFT JOIN で名前が `NULL` の1行になるので、`array_agg(g.name ORDER BY g.name) FILTER (WHERE g.name IS NOT NULL)` で `NULL` を除きます。何も残らないと `NULL` になるので、`coalesce(…, '{}')`（`'{}'` は空の配列）で囲みます。
  - JavaScript で: LEFT JOIN の結果の行（タスク1つにつき、タグの数だけ行がある）を、`id` ごとにまとめます。

### 問題6 仕事を取り合わない列（`SKIP LOCKED`）

メールの送信のような、時間のかかる仕事を、表に「待ち」として入れておき、何人もの作業者（ワーカー）が1つずつ取って片付ける仕組みを、**仕事の列**（ジョブキュー）と呼びます。[job-queue.mjs](job-queue.mjs) に、3つの関数を書いてください（本文6.2節）。テストは `JOBS_SQL`（書いてあります）で表を作ってから呼びます。

| 関数 | すること |
| --- | --- |
| `enqueue(pool, kind)` | 仕事を1つ足し、`id` を返す（`status` は `waiting`） |
| `claimNext(pool, worker)` | `waiting` の仕事のうち、`id` のいちばん小さいものを1つ取り、`status` を `running`、`worker` を `worker` にして、`{ id, kind }` を返す。無ければ `null`。**何人が同時に呼んでも、同じ仕事を2人に渡さない** |
| `finish(pool, id)` | `running` の仕事を `done` にし、`finished_at` を今の時刻にして `true`。`running` でなければ（無い・待ち・もう終わった）`false` |

```sh
$ node --test job-queue.test.mjs
ℹ pass 3
ℹ fail 0
```

ヒント:

- `claimNext` は、`withTransaction` の中で「`SELECT … FOR UPDATE SKIP LOCKED` で1行選んでロック → `UPDATE` で `running` に」とします。本文6.2節の最後の SQL です。
- `FOR UPDATE` を付けないと、2人が同時に同じ行を選び、同じ仕事を2回してしまいます。テストの3つ目（8人が同時に取る）が、それを確かめます。
- 今の時刻は、SQL の `now()` で入れられます。
- `finish` は1つの `UPDATE … WHERE id = $1 AND status = 'running'` で書け、`rowCount` で変わったかが分かります。

### 問題7 エラーを、制約の名前で分かる文に

[pg-problem.mjs](pg-problem.mjs) の `toProblem(err)` を書いてください（本文7節）。第31章の練習問題7の、PostgreSQL 版です。PostgreSQL のエラーは、制約の名前（`err.constraint`）や列の名前（`err.column`）が分かれて入っているので、エラーの文を探さずに見分けられます。

| エラー | 戻り値 |
| --- | --- |
| `23505` で、制約が `tasks_open_title` | `{ status: 409, detail: '同じ題名の、終わっていないタスクがあります' }` |
| `23505`（ほか） | `{ status: 409, detail: 'ほかのデータとぶつかりました' }` |
| `23514` で、制約が `tasks_title_check` | `{ status: 422, detail: 'title は 1〜100 文字です' }` |
| `23514` で、制約が `tasks_status_check` | `{ status: 422, detail: 'status は todo・doing・done のどれかです' }` |
| `23514`（ほか） | `{ status: 422, detail: '送られた値が決まりに合いません' }` |
| `23502` | `{ status: 422, detail: '列 は必ず送ってください' }`（`列` は `err.column`） |
| `23503` | `{ status: 422, detail: 'つながる先のデータがありません' }` |
| `22P02`・`22007`・`22008` | `{ status: 422, detail: '値の形が違います（日付は YYYY-MM-DD）' }` |
| ほかの PostgreSQL のエラー | `{ status: 500, detail: 'サーバの中でエラーが起きました' }` |
| PostgreSQL のエラーでない | `null` |

```sh
$ node --test pg-problem.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- 「PostgreSQL のエラーか」は、`err instanceof pg.DatabaseError` で調べます（`instanceof` は、そのクラスから作られたかを調べる演算子。第3部 第11章）。`err.code` だけで調べると、`code` を持つほかのエラー（`ECONNREFUSED` など）や、自分で `code` を付けたエラーを取り違えます。テストは、それも確かめます。
- エラーコードは、[pg-errors.mjs](pg-errors.mjs) の `PG` にあります（`PG.UNIQUE_VIOLATION` など）。
- 制約の名前から文を引く表（`{ tasks_open_title: '…' }`）を作り、`表[err.constraint] ?? '…'` とすると、`switch` が短くなります。

---

## 発展

### 問題8 同時に起動しても安全なマイグレーション

本文8.1節の `migrate` には、2つの弱い所があります。

- サーバを2台同時に起動すると、2台が同時に同じファイルを動かそうとして、エラーになります。
- 動かした後でファイルを書き換えても、気付きません（第31章 5節「配った手順は書き換えない」）。

[safe-migrate.mjs](safe-migrate.mjs) の `migrate(pool, dir)` を、次のように書いてください。

| 決まり | 内容 |
| --- | --- |
| 動かすもの | `dir` の中の `.sql` のファイルを名前の順に。まだ動かしていないものだけ。動かしたファイルの名前の配列を返す |
| 1つずつトランザクション | ファイルごとに `BEGIN`・`COMMIT`。失敗したら `ROLLBACK` し、ファイルの名前を入れたメッセージの例外を投げる（それより前のファイルは残る） |
| 同時に1つだけ | 最初から最後まで、アドバイザリロック（`pg_advisory_lock`）を持つ。ほかの `migrate` は、終わるまで待つ |
| 書き換えに気付く | `schema_migrations` に、ファイルの名前と一緒に、中身のハッシュ（`checksum` の列）を覚える。動かしたファイルの中身が変わっていたら、何も動かさずに、ファイルの名前を入れたメッセージの例外を投げる |
| 片付け | 成功しても失敗しても、ロックを外し、接続を返す |

```sh
$ node --test safe-migrate.test.mjs
ℹ pass 4
ℹ fail 0
```

ヒント:

- アドバイザリロックは、**接続ごと**に持ちます。`pool.query('SELECT pg_advisory_lock(1)')` では、ロックを取った接続がすぐプールに返され、その後の SQL は別の接続で動くかもしれません。`pool.connect()` で1本借りて、最初から最後まで、その接続で SQL を送ります。外すのは `SELECT pg_advisory_unlock(同じ番号)` です。番号は、自分で決めた整数（例: `320008`）にします。
- ロックを取ってから `CREATE TABLE IF NOT EXISTS schema_migrations` をします。ロックの前にすると、同時に2つが表を作ろうとして、エラーになることがあります。
- ハッシュは `crypto.createHash('sha256').update(文字列).digest('hex')` で作れます（第3部 第15章）。同じ中身なら、いつも同じ 64 文字になり、1文字でも違えば、まったく違う文字列になります。
- 「書き換えたファイルがあれば何も動かさない」ために、先に全部のファイルを読んでハッシュを比べ、問題が無いと分かってから動かし始めます。
- ロックと接続の片付けは、`try … finally` を2つ重ねると、取りこぼしません（外側で `release`、内側で `unlock`）。

### 問題9 PostgreSQL を使う関数のバグを直す

[buggy-store.mjs](buggy-store.mjs) の `createTaskStore(pool)` には、合わせて 5 か所のバグがあります。次の仕様に合わせて直してください（本文4〜6節）。

| メソッド | 仕様 |
| --- | --- |
| `countOpen()` | 終わっていないタスクの数（number） |
| `search(word)` | `title` に `word` を含むタスクの `id` の配列（`id` の順）。英字の大文字と小文字は区別しない |
| `rename(id, title, expectedVersion)` | version が合えば題名を変えて version を 1 増やし、`{ id, title, version }`。合わなければ `null` |
| `completeMany(ids)` | 全部を `done` にして数を返す。1つでも失敗したら、全部取り消して例外 |
| `firstTodo()` | `todo` のタスクのうち `id` のいちばん小さいものの `{ id, title }`。無ければ `null`。何回呼んでも、接続を返す |

```sh
$ node --test buggy-store.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- テストの失敗のメッセージ（`'4' !== 4`、`bind message supplies 3 parameters, but prepared statement "" requires 2`、`timeout exceeded when trying to connect` など）が、本文のどの節の話かを考えます。
- `completeMany` は、本文6.1節の「`fn` の中で使う接続」を読み直してください。
