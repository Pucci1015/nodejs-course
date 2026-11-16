# 第37章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part07/ch37-ts-node/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | JavaScript のプログラムに型を付ける | [wordcount.mjs](wordcount.mjs) → `wordcount.ts`、[wordcount.test.ts](wordcount.test.ts) | 3 |
| 2 | 基本 | 環境変数から設定を読む | [config.ts](config.ts)、[config.test.ts](config.test.ts) | 3 |
| 3 | 基本 | 型の付いた Express のルータ | [routes.ts](routes.ts)、[routes.test.ts](routes.test.ts) | 5 |
| 4 | 基本 | 型の除去で動かない書き方（調べる問題） | [strip-try.ts](strip-try.ts) | 1 |
| 5 | 応用 | メモリのリポジトリ | [memory-repo.ts](memory-repo.ts)、[memory-repo.test.ts](memory-repo.test.ts) | 4.1・4.2 |
| 6 | 応用 | PostgreSQL のリポジトリ | [pg-repo.ts](pg-repo.ts)、[pg-repo.test.ts](pg-repo.test.ts) | 4.3 |
| 7 | 応用 | ESLint が見つけたバグを直す | [lint-fix.ts](lint-fix.ts)、[lint-fix.test.ts](lint-fix.test.ts) | 6 |
| 8 | 発展 | 型の付いた API（problem+json・If-Match） | [app.ts](app.ts)、[app.test.ts](app.test.ts) | 5、第5部 第25章 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第35・36章と同じです。問題4以外は、`○○.ts` を書き、`node --test ○○.test.ts` ですべてのテストが通れば完成です。「型: tsc のエラーが無い」のテストは、`○○.ts`（と、あれば `○○.check.ts`）を tsc で確かめます。

この章の問題は、どれも `any` を使わずに書きます。問題8以外は `as` も使いません（テストが確かめます）。

書き換えなくてよい、問題で使うファイル:

| ファイル | 中身 |
| --- | --- |
| [task-repo.ts](task-repo.ts) | 問題3・5・6・8 で使う型。`Task`（`dueDate`・`updatedAt`・`version` がある）・`NewTask`・`TaskPatch`・`TaskFilter`・`interface TaskRepo`。本文の `todo-api` の `task.ts` より項目が多い |
| [fake-repo.ts](fake-repo.ts) | テストで使う、`TaskRepo` の偽物（呼ばれた順を `calls` に残す） |
| `typecheck.ts`・`type-assert.ts`・`○○.check.ts` | テストが型を確かめるための部品（第35章と同じ） |

---

## 基本

### 問題1 JavaScript のプログラムに型を付ける

[wordcount.mjs](wordcount.mjs) は、テキストのファイルの行・語・文字の数と、よく出る語を数える CLI です。これを `wordcount.ts` にコピーして、型を付けてください（本文3節）。

```sh
$ cp wordcount.mjs wordcount.ts
$ npx tsc
（略）
wordcount.ts:5:27 - error TS7006: Parameter 'text' implicitly has an 'any' type.
（略）
```

- `cp 元 先` は、ファイルをコピーするコマンドです（第1部 第1章）。
- `npx tsc` は、このフォルダの `tsconfig.json` を使って、フォルダの中を全部確かめます。`wordcount.check.ts` のエラーも出ますが、`wordcount.ts` の型を正しく付ければ消えます。ほかの問題のファイルのエラーは、気にしなくてかまいません。

| 関数 | 引数 | 戻り値 |
| --- | --- | --- |
| `countText` | `text`（文字列） | `{ lines: number; words: number; chars: number }` |
| `topWords` | `text`（文字列）、`n`（数） | `{ word: string; count: number }[]` |
| `main` | `argv`（文字列の配列） | 終了コードの数の Promise |

戻り値の型も、関数に書いてください。

```sh
$ node wordcount.ts sample.txt 2
3行 17語 58文字
4 the
2 on
$ node --test wordcount.test.ts
ℹ pass 5
ℹ fail 0
```

ヒント: 引数の型を全部書いても、`wordcount.check.ts` の `topWords` の行のエラーが残ります。`new Map()` のように、中身を渡さずに作った `Map` は、キーと値の型が分からないので `Map<any, any>` になります。`new Map<キーの型, 値の型>()` と書きます（第36章 4節）。

### 問題2 環境変数から設定を読む

[config.ts](config.ts) の `loadConfig(env)` を書いてください（本文3節）。型と `ConfigError` は書いてあります。`env` には、ふだんは `process.env` を渡します（テストでは、ふつうのオブジェクトを渡します）。

| 環境変数 | 設定の項目 | 無いとき | 正しい値 |
| --- | --- | --- | --- |
| `PORT` | `port` | `9470` | 1〜65535 の整数 |
| `HOST` | `host` | `'127.0.0.1'` | 何でもよい |
| `LOG_LEVEL` | `logLevel` | `'info'` | `debug`・`info`・`warn`・`error` |
| `NODE_ENV` | `env` | `'development'` | `development`・`test`・`production` |
| `DATABASE_URL` | `databaseUrl` | `null` | 何でもよい。ただし `env` が `production` なら必須 |

- 空の文字列（`PORT=`）は、「無い」と同じに扱います。
- 正しくない値があれば、`ConfigError` を投げます。**間違いを全部集めて**、`problems` に、次の文で入れます（`（）` の中は、渡された値）。

```text
PORT は 1〜65535 の整数です（99999）
LOG_LEVEL は debug・info・warn・error のどれかです（verbose）
NODE_ENV は development・test・production のどれかです（staging）
production では DATABASE_URL が必須です
```

```sh
$ node --test config.test.ts
ℹ pass 7
ℹ fail 0
```

ヒント:
- `NodeJS.ProcessEnv` の値は `string | undefined` です（本文3節の表）。
- `'verbose'` のような文字列を `LogLevel` に入れるには、型ガード（`function isLogLevel(text: string): text is LogLevel`。第36章 3節）で確かめます。`as` は使いません。
- `Number('1.5')` は `1.5`、`Number('abc')` は `NaN` です。`Number.isInteger` で整数かを確かめられます。

### 問題3 型の付いた Express のルータ

[routes.ts](routes.ts) の `createTaskRouter(repo)` に、3つのルートを書いてください（本文5節）。`repo` は [task-repo.ts](task-repo.ts) の `TaskRepo` です。テストは、このルータを `app.use('/api/tasks', …)` に付けて確かめます。`express.Router()` は、第5部 第24章で使ったものと同じです。

| メソッドとパス | 動き |
| --- | --- |
| `GET /` | `repo.list()` の結果を返す。`?status=done` なら `repo.list({ status: 'done' })` |
| `GET /:id` | `repo.get(id)` のタスクを返す |
| `DELETE /:id` | `repo.remove(id)` で消して、204（ボディ無し） |

エラーは、どれも `{ "error": "…" }` の JSON で返します。

| 場合 | 状態コード | error |
| --- | --- | --- |
| `status` が `todo`・`doing`・`done` のどれでもない。`?status=todo&status=done` のように2つ以上ある | 400 | `status は todo・doing・done のどれかです` |
| id のタスクが無い。id が 1 以上の整数の形でない（`abc`・`0`・`1.5`・`01`） | 404 | `タスクが見つかりません` |

```sh
$ node --test routes.test.ts
ℹ pass 6
ℹ fail 0
```

ヒント:
- `req.query.status` は、文字列とは限りません（本文5.1節の表）。`?status=todo&status=done` なら配列です。型ガードで「`Status` かどうか」を確かめれば、配列もはじけます。
- パスの id は `Request<{ id: string }>` で文字列として受け取ります。「1 以上の整数の形」は、正規表現 `/^[1-9]\d*$/`（1〜9 で始まり、数字だけが続く）で確かめられます。
- 応答の型は `Response<Task[] | { error: string }>` のように書けます。

### 問題4 型の除去で動かない書き方（調べる問題）

[strip-try.ts](strip-try.ts) は、Node.js の型の除去では動かない書き方を3種類使っています（本文1.1節の表）。次のコマンドを動かして、問いに答えてください。答えは [../solutions/README.md](../solutions/README.md) にあります。

```sh
$ node strip-try.ts
$ npx tsx strip-try.ts
$ npx tsc
```

1. `node strip-try.ts` は、どの書き方でエラーになりましたか。その書き方をコメントにして（行の先頭に `//` を付けて）動かし直すと、次はどの書き方でエラーになりますか。3つ全部について、エラーの文（`TypeScript … is not supported in strip-only mode`）を書き出してください。終わったら、コメントを外して元に戻します。
2. `npx tsx strip-try.ts` は何と出力しましたか。`Size.M` が `1`、`Size[2]` が `'L'` になる理由を考えてください。
3. `npx tsc` は、`strip-try.ts` に何個のエラー（`TS1294`）を出しましたか。書き方は3種類なのに、その数になるのはなぜですか。どの tsconfig の設定が、このエラーを出していますか（第7部の [tsconfig.base.json](../../tsconfig.base.json) を読む）。
4. 3つの書き方を、この教材の書き方（型の除去で動く書き方）に書き直すと、どうなりますか。紙かエディタで書いてみてください（テストはありません）。

---

## 応用

### 問題5 メモリのリポジトリ

[memory-repo.ts](memory-repo.ts) の `createMemoryTaskRepo(now)` を書いてください（本文4.1・4.2節）。戻り値は [task-repo.ts](task-repo.ts) の `TaskRepo` です。各メソッドの決まりは、`task-repo.ts` のコメントにも書いてあります。

| メソッド | 動き |
| --- | --- |
| `create(input)` | id は 1, 2, 3, … の順（消した id は使い回さない）。`status` は省略なら `'todo'`、`dueDate` は省略なら `null`。`createdAt`・`updatedAt` は `now().toISOString()`、`version` は 1 |
| `get(id)` | 無ければ `null` |
| `list(filter)` | id の小さい順。`status` で絞り込む。`dueBefore` は「`dueDate` がその日より前」（`dueDate` が `null` のものは入らない）。両方あれば両方 |
| `update(id, patch, options)` | `patch` に**ある**項目だけ変える（`dueDate: null` は「締め切りを消す」）。`version` を 1 増やし、`updatedAt` を `now()` に。無いか、`options.expectedVersion` が今の `version` と違えば `null` で、何も変えない |
| `remove(id)` | 消したら `true`、無ければ `false` |

- 引数の `now` は、今の時刻を返す関数です。テストでは、決まった時刻を返す関数を渡します。
- 返したタスクを、呼んだ側が書き換えても、中のデータが変わらないようにします（写しを返す。`{ ...t }`）。

```sh
$ node --test memory-repo.test.ts
ℹ pass 8
ℹ fail 0
```

ヒント:
- 本文4.2節と同じく、`Map<number, Task>` に入れます。
- 日付の `'YYYY-MM-DD'` の文字列は、`<` でそのまま比べられます（`'2026-11-10' < '2026-11-15'` は true）。
- `update` で `patch.title !== undefined` のように1つずつ確かめると、「無い」と「`null`」を区別できます。

### 問題6 PostgreSQL のリポジトリ

[pg-repo.ts](pg-repo.ts) に、PostgreSQL の `tasks` の表を使うリポジトリを書いてください（本文4.3節）。テストは本物のデータベースを使わず、`Queryable`（`query` を持つもの）の偽物を渡して、**送った SQL の文字列と値**を確かめます。

表の列（第6部と同じ形）:

| 列 | PostgreSQL の型 | pg から来る値 |
| --- | --- | --- |
| `id` | integer | number |
| `title` | text | string |
| `status` | text | `'todo'`・`'doing'`・`'done'` |
| `due_date` | date | `'YYYY-MM-DD'` の文字列か null |
| `created_at`・`updated_at` | timestamptz | `Date` |
| `version` | integer | number |

1. 1行の型 `TaskRow` と、行を `Task` にする `toTask(row)` を書いて、`export` します（`created_at` → `createdAt` は `toISOString()` で文字列に）。
2. `createPgTaskRepo(db)` を書きます。`db.query<TaskRow>(SQL, 値の配列)` を使い、**値は必ず `$1`・`$2` で渡します**（第6部 第31・32章）。テストが確かめる SQL は次のとおりです（空白1つまで同じにします）。

| メソッド | SQL（値） |
| --- | --- |
| `get(1)` | `SELECT * FROM tasks WHERE id = $1`（`[1]`） |
| `list()` | `SELECT * FROM tasks ORDER BY id`（`[]`） |
| `list({ status: 'done' })` | `SELECT * FROM tasks WHERE status = $1 ORDER BY id`（`['done']`） |
| `list({ dueBefore: '2026-12-01' })` | `SELECT * FROM tasks WHERE due_date < $1 ORDER BY id`（`['2026-12-01']`） |
| `list({ status: 'todo', dueBefore: '2026-12-01' })` | `SELECT * FROM tasks WHERE status = $1 AND due_date < $2 ORDER BY id`（`['todo', '2026-12-01']`） |
| `create({ title: 'x', status: 'doing' })` | `INSERT INTO tasks (title, status, due_date) VALUES ($1, $2, $3) RETURNING *`（`['x', 'doing', null]`）。省略は `'todo'` と `null` |
| `update(1, { status: 'done', dueDate: null })` | `UPDATE tasks SET status = $1, due_date = $2, version = version + 1, updated_at = now() WHERE id = $3 RETURNING *`（`['done', null, 1]`） |
| `update(1, { title: 'b' }, { expectedVersion: 2 })` | `UPDATE tasks SET title = $1, version = version + 1, updated_at = now() WHERE id = $2 AND version = $3 RETURNING *`（`['b', 1, 2]`） |
| `update(1, {})` | `UPDATE tasks SET version = version + 1, updated_at = now() WHERE id = $1 RETURNING *`（`[1]`） |
| `remove(1)` | `DELETE FROM tasks WHERE id = $1`（`[1]`）。`rowCount` が 1 以上なら `true` |

- `update` の SET の順は、`title`・`status`・`due_date` の順です。
- `get` と `update` は、行が無ければ `null` を返します。

```sh
$ node --test pg-repo.test.ts
ℹ pass 7
ℹ fail 0
```

`pg-repo.check.ts` は、本物の `pg.Pool` と、トランザクションの `pg.PoolClient`（第6部 第32章）を、あなたの `createPgTaskRepo` に渡せるかを確かめます。

ヒント:
- 値を足すたびに、`values.push(値)` してから `` `status = $${values.length}` `` と書くと、番号がずれません（`$$` の最初の `$` はそのままの文字、次の `${…}` が埋め込み）。
- `rows[0]` の型は、`noUncheckedIndexedAccess` の設定で `TaskRow | undefined` です（第35章）。
- pg の型では、`rowCount` は `number | null` です。

### 問題7 ESLint が見つけたバグを直す

[lint-fix.ts](lint-fix.ts) は、tsc のエラーはありませんが、ESLint が8つのエラーを出します。エラーのある4つの関数は、どれも**本当に間違った動き**をします。関数の上のコメントの動きになるように直してください（本文6節）。

```sh
$ cd ../..                                      # 第7部のフォルダ（eslint.config.js のある所）
$ npx eslint ch37-ts-node/exercises/lint-fix.ts
$ cd ch37-ts-node/exercises
$ node --test lint-fix.test.ts
ℹ pass 7
ℹ fail 0
```

`cd ../..` は、2つ上のフォルダに移るコマンドです。`npx eslint` は、どのフォルダで動かしても `eslint.config.js` を探して使いますが、第7部のフォルダで動かすと確実です。

| 関数 | 今の間違い | 直した後の動き |
| --- | --- | --- |
| `sendAll` | `send` を待たずに `0` を返す | 1つずつ順番に送り、全部終わってから数を返す。途中で失敗したら、そのエラーで reject する |
| `loadAll` | 結果がそろう前に、空の配列を返す | 全部を待ち、ids の順に並べて返す |
| `every` | `job` の失敗を、だれも受け取らない | 失敗を `onError` に渡す |
| `valueOf` | `value` が数でも返してしまう（any） | `value` が文字列のときだけ返し、そうでなければ `null` |

- `// eslint-disable…` のコメントでエラーを消すのは禁止です（テストが確かめます）。
- ESLint の出力の右端の名前（`@typescript-eslint/no-floating-promises` など）で、本文6節の表や、参考資料の typescript-eslint のページを調べてください。

ヒント:
- `forEach` は、渡した関数が返す Promise を待ちません。`for (const m of messages) { await … }` なら、1つずつ待てます（第3部 第12章）。
- 全部を同時に動かして待つには `Promise.all` です。結果は、渡した順に並びます。
- `setInterval` に渡す関数の中で `job().catch(onError)` と書けば、失敗を受け取れます。
- `JSON.parse` の結果を `unknown` の変数に入れて、`typeof data === 'object' && data !== null && 'value' in data` のように絞り込みます（第36章 1節）。

---

## 発展

### 問題8 型の付いた API（problem+json・If-Match）

[app.ts](app.ts) の `createApp(repo)` に、タスクの API を書いてください。`repo` は [task-repo.ts](task-repo.ts) の `TaskRepo` です。第5部 第25章の API の決まり（problem+json・ETag・If-Match）を、型を付けて書く問題です。

ルート:

| メソッドとパス | 成功 | 決まり |
| --- | --- | --- |
| `GET /api/tasks` | 200、タスクの配列 | `?status=`（`todo`・`doing`・`done`）と `?dueBefore=`（`YYYY-MM-DD`）で絞り込む。形が違えば 400 |
| `GET /api/tasks/:id` | 200、タスク。`ETag: "version"`（例: `"4"`） | 無い・id の形が違う（`abc`）なら 404 |
| `POST /api/tasks` | 201、タスク。`Location: /api/tasks/新しいid`・`ETag` | ボディを確かめて `repo.create` |
| `PATCH /api/tasks/:id` | 200、タスク。新しい `ETag` | ボディを確かめて `repo.update`。`If-Match: "4"` があれば `expectedVersion: 4` |
| `DELETE /api/tasks/:id` | 204 | 無ければ 404 |
| それ以外の URL | — | 404 |

ボディ（POST と PATCH）の決まり:

| 項目 | 正しい値 | POST | PATCH |
| --- | --- | --- | --- |
| `title` | 前後の空白を除いて 1〜100文字の文字列。除いたものを保存する | 必須 | 省略できる（`null` は間違い） |
| `status` | `todo`・`doing`・`done` | 省略できる | 省略できる |
| `dueDate` | `YYYY-MM-DD` の形の文字列か `null` | 省略できる | 省略できる |
| ほかの項目 | 知らない項目は間違い | | |

- ボディがオブジェクトでない（配列など）なら 422。PATCH で項目が1つも無ければ 422。
- 間違いは**全部集めて** 422 にし、`errors: [{ "field": "title", "message": "…" }, …]` に入れます（`field` は項目の名前）。
- JSON として読めないボディは 400 です。
- PATCH で、id のタスクが無ければ 404、`If-Match` の版が今の `version` と違えば 412 です。`If-Match` が無ければ、版を確かめずに変えます。

エラーは、どれも problem+json（`Content-Type: application/problem+json`）で返します。

```json
{ "type": "about:blank", "title": "Not Found", "status": 404, "detail": "タスクが見つかりません" }
```

| status | title |
| --- | --- |
| 400 | `Bad Request` |
| 404 | `Not Found` |
| 412 | `Precondition Failed` |
| 422 | `Unprocessable Content` |
| 500 | `Internal Server Error` |

思っていなかったエラー（`repo` が投げたエラーなど）は 500 にし、エラーの文は応答に**入れません**（`console.error` でログにだけ書く）。データベースの接続文字列などが、外に漏れないようにするためです。`detail` は `サーバでエラーが起きました` のような、決まった文にします。

```sh
$ node --test app.test.ts
ℹ pass 10
ℹ fail 0
```

ヒント:
- 本文5.1節の `todo-api` の `HttpError` とエラーのミドルウェアを、problem+json を返すように広げると書けます。
- `repo.update` は、「無い」ときも「版が違う」ときも `null` を返します。`null` だったら `repo.get(id)` で、どちらかを確かめます。
- `express.json()` は、読めない JSON を受け取ると、`SyntaxError` で `status` が 400 の項目を持つエラーを、エラーのミドルウェアに渡します。`err instanceof SyntaxError && 'status' in err && err.status === 400` で見分けられます。
- 応答のヘッダは `res.set('ETag', …)`・`res.location(…)`、Content-Type は `res.type('application/problem+json')` で付けます（第5部）。
