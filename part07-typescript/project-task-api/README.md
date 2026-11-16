# 第7部の成果物 タスク管理 API を TypeScript に

第6部で、タスク管理 API（`~/dev/task-api`）のデータを PostgreSQL に置きました。第7部のまとめとして、**この API を、動きを変えずに TypeScript に書き換えます**。

第35〜38章で学んだことを組み合わせます。基本の型と `tsconfig.json`（第35章）、判別できるユニオン・ジェネリクス・`satisfies`（第36章）、`node` で `.ts` を動かす・Express とデータの層の型・ESLint（第37章）、Zod で境界を確かめる（第38章）です。第6部の 30 個のテストがそのまま通り、さらに `npm run check`（`tsc` と ESLint とテスト）がエラー 0 で終われば完成です。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 6〜10時間 |
| 前提 | 第6部の成果物（`~/dev/task-api` のブランチ `part06-postgres`）、第35〜38章 |
| 作るもの | `~/dev/task-api` の新しいブランチ。`src/` と `test/` のファイルがすべて `.ts` で、`npm start`（`node src/server.ts`）で `http://127.0.0.1:9490/api/tasks` に立ち上がるもの |
| 確かめ方 | `npm run check`。テストは完成例の [solutions/test/api.test.ts](solutions/test/api.test.ts)（30 個） |

| フォルダ | 中身 |
| --- | --- |
| [solutions/](solutions/) | 完成例（`task-api` パッケージ）。外から HTTP で確かめるテスト付き |

> **読み方**
> - 作業は、第6部で作った `~/dev/task-api` で行います。1節で、Git のブランチを作ってから始めます。
> - PostgreSQL は、第6部のものをそのまま使います（`~/dev/part06` で `docker compose up -d --wait`）。
> - ビルドはしません。第37章と同じく、`node` が型を取り除いて、`.ts` をそのまま動かします。`tsc` は確かめるだけです。
> - 一度に全部を `.ts` にすると、エラーが数百個出て、どこから直せばよいか分からなくなります。3.2節の順番で、1つずつ替えて、そのつど `npx tsc` とテストを動かしてください。

## この成果物で身につくことを、後でどこで使うか

| 身につくこと | 後で使う場面 |
| --- | --- |
| 動いている JavaScript を、少しずつ TypeScript にする | 仕事で、TypeScript の無い古いコードを引き継いだとき |
| 層と層の間の形を `interface` で決める（`TaskRepo`・`IdempotencyStore`） | 第11部 第57章（テストで偽物に取り替える。偽物も同じ型に合わせる） |
| 外から来るもの（ボディ・クエリ・環境変数・データベースの JSON）を Zod で確かめる | 第8部（画面が API の応答を確かめる）、第10部（ログインのトークンの中身） |
| `npm run check` で、型・ESLint・テストをまとめて確かめる | 第11部 第59章（GitHub Actions で、プッシュのたびに動かす） |

---

## 1. 準備

### 1.1 ブランチを作る

第6部の完成した形を残しておくため、新しいブランチで作業します（第1部 第3章）。

```sh
$ cd ~/dev/task-api
$ git status                         # 書きかけが無いこと（nothing to commit）を確かめる
$ git switch part06-postgres         # 第6部のブランチに移る（main に入れたなら git switch main）
$ git switch -c part07-typescript    # 新しいブランチを作って、そこに移る
```

- うまくいかなくなったら、`git switch part06-postgres` で第6部の形に戻れます。

### 1.2 パッケージを入れる

型を確かめる道具は、開発のときだけ使うので、`-D`（`--save-dev` の短い書き方）で `devDependencies` に入れます（第3部 第14章 6節）。版は、第7部の章で使ったものと同じです。

```sh
$ npm install --save-exact -D typescript@6.0.3 @types/node@24.19.2 @types/express@5.0.6 @types/pg@8.23.1 @types/cors@2.8.19
$ npm install --save-exact -D eslint@10.13.0 @eslint/js@10.0.1 typescript-eslint@8.72.1
```

- `--save-exact` は、`package.json` に `^` を付けずに、ちょうどその版を書くオプションです（`^` の意味は第3部 第14章 8節）。
- `@types/cors` は、第37章では使わなかった `cors` の型です（第37章 2節: パッケージに型が付いていなければ、`@types/パッケージ名` を探す）。`zod`・`pino` は、パッケージに型が入っているので、`@types` は要りません。

### 1.3 設定のファイルを持ってくる

`tsconfig.json` と `eslint.config.js` は、第7部のものをコピーします。`P=~/dev/part07` としておくと、短く書けます。

```sh
$ P=~/dev/part07
$ cp $P/tsconfig.base.json tsconfig.json
$ cp $P/project-task-api/solutions/eslint.config.js .
```

コピーした `tsconfig.json` の最後に、確かめるフォルダを足します（`tsconfig.base.json` は、どのフォルダを確かめるかを書いていないので、そのままだと `node_modules` 以外の全部を見に行きます）。

```jsonc
  },
  "include": ["src", "test"]
}
```

`eslint.config.js` は、第37章 6節のものの最後に、テストのための設定（`test/` では `any` への注意を止める）を足したものです。理由は、ファイルの中のコメントを読んでください。

`package.json` の `scripts` を、次のように替えます（`.mjs` を `.ts` に、確かめる3つを足す）。

```json
"scripts": {
  "start": "node --env-file-if-exists=.env src/server.ts",
  "dev": "node --watch --env-file-if-exists=.env src/server.ts",
  "migrate": "node --env-file-if-exists=.env src/db/migrate.ts",
  "typecheck": "tsc",
  "lint": "eslint .",
  "test": "node --test \"test/*.test.ts\"",
  "check": "npm run typecheck && npm run lint && npm test"
},
```

### 1.4 PostgreSQL を動かす

```sh
$ (cd ~/dev/part06 && docker compose up -d --wait)
```

---

## 2. 要件

### 2.1 TypeScript で動く

- `src/` と `test/` のファイルは、すべて `.ts` にする（`.mjs` を残さない）。`migrations/` の SQL はそのまま
- `node src/server.ts` で動く。ビルド（`tsc` で `.js` を作る）はしない。だから、第37章 1.1節の「型を取り除くだけで動く書き方」だけを使う（`enum`・引数のプロパティ・`namespace` の中の値は使わない。`tsconfig.json` の `erasableSyntaxOnly` が見張る）
- `PORT` の既定を `9490` にする（第6部は `9460`）。テストは `9491`・`9492` を使う

### 2.2 型で守る

- `npm run typecheck`（`tsc`）と `npm run lint`（ESLint）が、エラー 0 で終わる
- `src/` に `any` を書かない（ESLint の `no-explicit-any`。`req.body` のような「元から any」のものは、Zod で確かめてから使う）
- `as` は、`as const` を除いて、**`server.ts` の `server.address() as AddressInfo` の1か所だけ**にする。ほかは、絞り込み・型ガード・Zod・`satisfies` で書ける
- `src/types.ts` を作り、層と層の間でやりとりする形を、ここにまとめる。少なくとも次のものを書く
  - `Status`・`Task`・`Sort`（第36章 7節の「一覧を1か所に書いて、型を作る」）
  - データの層の形 `interface TaskRepo`（`listPage`・`get`・`findOpenByTitle`・`countByStatus`・`insert`・`update`・`remove`）
  - 冪等キーの置き場所の形 `interface IdempotencyStore`（`claim`・`complete`・`delete`・`purgeExpired`）と、覚えているもの `IdempotencyRecord`（判別できるユニオン。3.5節）
- Express の `Request` に足した `req.id`・`req.log` は、宣言のマージで型を足す（第37章 5.2節）

### 2.3 境界で確かめる

外から来るものは、型を書いただけでは守れません（第38章 1節）。次の5つは、Zod で確かめてから使います。

| 外から来るもの | どこで | 第6部 |
| --- | --- | --- |
| リクエストのボディ | `routes/tasks.ts` | 確かめていた（そのまま） |
| 一覧のクエリ | `routes/list-query.ts` | 確かめていた（そのまま） |
| 環境変数 | `config.ts` | 確かめていた（そのまま） |
| カーソルの中身（署名を確かめた後の JSON） | `lib/cursor.ts` | 形を `if` で確かめていた → Zod に |
| 冪等キーの表の `response` 列（JSON） | `repositories/pg-idempotency.ts` | 確かめていなかった → Zod に |

データベースの行（`tasks` の表）は、自分のマイグレーションで作った表なので、確かめずに型を付けるだけでかまいません（第37章 4.3節。`db.query<TaskRow>(…)`）。

### 2.4 動きは変えない

- 完成例のテスト（30 個）が、すべて通る。応答の形・ステータス・ヘッダは、第6部と同じ
- 第6部のテストは消す（`.ts` のものに替える。4節）

---

## 3. 作り方のヒント

### 3.1 ファイルの分け方

第6部と同じです。足すのは `types.ts` と `express.d.ts` の2つだけです。

```text
task-api/
├── tsconfig.json             … 追加
├── eslint.config.js          … 追加
├── migrations/               … そのまま
├── src/
│   ├── types.ts              … 追加。Task・TaskRepo・IdempotencyStore など。ほかのファイルを import しない
│   ├── express.d.ts          … 追加。Request に id と log を足す
│   ├── errors.ts  config.ts  app.ts  server.ts
│   ├── db/          pool.ts  migrate.ts
│   ├── lib/         signed.ts  cursor.ts  preconditions.ts  sse-format.ts  event-hub.ts
│   ├── middleware/  problem.ts  request-logger.ts  rate-limit.ts  idempotency.ts
│   ├── repositories/  pg-tasks.ts  pg-idempotency.ts
│   ├── services/    tasks.ts
│   └── routes/      tasks.ts  list-query.ts
└── test/
    └── api.test.ts
```

### 3.2 進める順番: import されるほうから

`.ts` から `.mjs` を import すると、`tsc` はそのファイルの型が分からず、エラーにします。

```text
src/routes/tasks.ts(8,31): error TS7016: Could not find a declaration file for module '../errors.mjs'. … implicitly has an 'any' type.
```

逆に、`.mjs` から `.ts` を import するのは、`node` が型を取り除くので動きます。だから、**ほかのファイルに import されるほう（木の葉）から順に** `.ts` にします。そうすれば、途中のどの時点でも、`.ts` のファイルは `.ts` だけを import していて、`tsc` が通ります。

1. `src/types.ts` を新しく書く（何も import しない）
2. `errors` → `lib/` の5つ（`signed` → `cursor`、`sse-format` → `event-hub`、`preconditions`）
3. `config` → `db/pool` → `db/migrate`
4. `repositories/` の2つ（ここで `TaskRepo`・`IdempotencyStore` の型を付ける）
5. `services/tasks`
6. `middleware/` の4つ（ここで `express.d.ts` を足す）
7. `routes/` の2つ → `app` → `server`
8. `test/api.test.mjs` を、完成例の `api.test.ts` に替える（4節）

1つのファイルでは、次のことをします。

```sh
$ git mv src/errors.mjs src/errors.ts     # 名前を変える（Git にも「名前を変えた」と伝わる）
$ grep -rn "errors.mjs" src               # このファイルを import している所を探す
src/services/tasks.mjs:4:import { ConflictError, … } from '../errors.mjs';
src/routes/tasks.mjs:7:import { ConflictError, … } from '../errors.mjs';
（…）
```

- `git mv 元 先` は、ファイルの名前を変えて、そのことを Git に伝えるコマンドです。`mv` で変えると、Git には「消して、別のファイルを作った」に見えます。
- `grep -rn 文字列 フォルダ` は、フォルダの中のファイル（`-r` で、中のフォルダも全部）から、文字列のある行を、ファイル名と行番号（`-n`）付きで出すコマンドです。

出てきた行の `errors.mjs` を `errors.ts` に直し、名前を変えたファイルに型を付けてから、確かめます。

```sh
$ npx tsc          # .ts のファイルだけを確かめる（.mjs は見ない）
$ node --test "test/*.test.mjs"   # 動きが変わっていないか（第6部のテストのまま）
```

> 1.3節で `scripts` を `.ts` に替えたので、途中は `npm test` で第6部のテストが動きません（`npm start` も、7 で `server.ts` ができるまで動きません）。8 までは `node --test "test/*.test.mjs"` と打って、第6部のテストを動かしてください（テストは `src/server.mjs` を起動します。7 で `server.ts` にした後は、`API_SERVER=../src/server.ts node --test "test/*.test.mjs"`）。

### 3.3 よく出るエラーと直し方

| エラー | 理由 | 直し方 |
| --- | --- | --- |
| `'err' is of type 'unknown'`（`catch (err)` の中で `err.message`） | `catch` で受け取るものは、何が来るか分からない | `err instanceof Error ? err.message : String(err)`（第36章 3節）。pg のエラーの `code` は `'code' in err` で絞り込む |
| `Object is possibly 'undefined'`（`rows[0].id`） | `noUncheckedIndexedAccess` で、`配列[0]` は「無いかもしれない」 | `const row = rows[0]; if (row === undefined) …`（第35章 5節） |
| `Element implicitly has an 'any' type because expression of type 'string' can't be used to index`（`COLUMNS[key]`） | `Object.keys(o)` は `string[]` を返す | 項目の名前の一覧を `as const` で書き、そこから選ぶ（完成例の `pg-tasks.ts` の `FIELD_KEYS`） |
| ESLint `Unsafe assignment of an any value`（`const { title } = req.body`） | `req.body` は `any` | Zod の `parse` を通してから使う（第38章 4節） |
| `Property 'closeAll' does not exist on type '(req, res) => void'` | 関数に後から項目を足すと、型に入らない | `Object.assign(handler, { closeAll, size })`（完成例の `lib/event-hub.ts`） |
| `Property 'id' does not exist on type 'Request<…>'`（`req.id`） | Express の型に `id` は無い | `src/express.d.ts` で、宣言のマージ（第37章 5.2節） |
| ESLint `Promise returned in function argument where a void return was expected`（`server.close(async () => …)`） | `server.close` は、渡した関数の Promise を待たない。失敗しても、だれも気づかない | `async` の関数を別に作り、`cleanup().catch(…)` と呼ぶ（完成例の `server.ts`） |
| ESLint `Unsafe member access`（`JSON.parse(…).v`） | `JSON.parse` は `any` を返す | Zod で確かめる（2.3節） |

### 3.4 データの層の型

`types.ts` に、データの層の形を書きます（第37章 4.1節）。

```ts
export type TaskFields = Omit<Task, 'id'>; // id はデータベースが付ける

export interface TaskRepo {
  listPage(q: ListPageQuery): Promise<Page<Task>>;
  get(id: number): Promise<Task | null>; // 無ければ null
  insert(fields: TaskFields): Promise<Task>;
  update(id: number, fields: Partial<TaskFields>, options?: VersionCheck): Promise<Task | null>;
  // …
}
```

`createPgTaskRepo(db): TaskRepo` と戻り値に型を書くと、返すオブジェクトのメソッドの引数にも、型が付きます（`async insert(fields) { … }` と書くだけで、`fields` は `TaskFields`）。

`pg-tasks.ts` には、項目の名前 → 列の名前、並べ方 → `ORDER BY` の列、の表があります。`satisfies` を付けると、「全部書いたか」を `tsc` が確かめます（第36章 7節）。

```ts
const SORT_SQL = {
  createdAt: ['created_at', false],
  '-createdAt': ['created_at', true],
  // …（6つ）
} as const satisfies Record<Sort, readonly [string, boolean]>;
```

`Sort` に7つ目を足して、ここに書き忘れると、`tsc` がエラーにします。

### 3.5 冪等キーの「処理中」と「済み」

第6部の `claim` は、`{ fingerprint, status: 'running' }` か `{ fingerprint, status: 'done', response }` を返していました。これを判別できるユニオン（第36章 2節）にすると、`status` を確かめた後でだけ `response` が使えるようになります。

```ts
export type IdempotencyRecord =
  | { fingerprint: string; status: 'running'; response?: null | undefined }
  | { fingerprint: string; status: 'done'; response: StoredResponse };
```

```ts
if (prev.status === 'running') return next(new HttpProblem(409, …));
res.status(prev.response.status).json(prev.response.body); // ここでは prev は 'done' のほう
```

データベースの表から読んだ行は、`z.discriminatedUnion('status', [ … ])` で確かめると、この型がそのまま作れます（`pg-idempotency.ts`）。

---

## 4. 確かめ方

第6部のテストを消し、完成例のテストをコピーします。

```sh
$ git rm test/api.test.mjs
$ cp ~/dev/part07/project-task-api/solutions/test/api.test.ts test/
$ npm run check
```

- `git rm ファイル` は、ファイルを消して、そのことを Git に伝えるコマンドです。
- `api.test.ts` は、第6部のテストを TypeScript にしたものです。確かめていることは同じで、使うポートだけ `9491`・`9492` に変えました。

`npm run check` は、`tsc` → ESLint → テストの順に動き、どれかが失敗したら、そこで止まります。完成例では、次のように終わります。

```text
ℹ tests 30
ℹ suites 0
ℹ pass 30
ℹ fail 0
```

終わったら、コミットします。

```sh
$ git add -A
$ git commit -m "TypeScript にする"
```

## 5. もっとやるなら

- `routes/tasks.ts` で、ボディとクエリの確かめを、第38章 練習問題6の `route(schemas, handler)` の形にしてみる。ハンドラの中で `req.body` を使わなくなる
- 応答の形も Zod のスキーマで書き、`z.toJSONSchema` で OpenAPI の説明書を作る（第38章 8節。第8部で画面を作るときの資料になる）
- `TaskId` をブランド型にして、`user_id`（第10部）と取り違えないようにする（第38章 7節）
- メモリのデータの層 `createMemoryTaskRepo(): TaskRepo` を書き直してみる。`TaskRepo` に合わせれば、`server.ts` の1行で取り替えられ、`tsc` が「足りないメソッド」を教えてくれる（第11部 第57章で、テストに使う）
- `tsc --noEmit` を、エディタ（VS Code）でも見る。保存する前に、赤い波線でエラーが見える

## 6. Python で作るなら

| この成果物 | Python（Flask） |
| --- | --- |
| `tsc` で型を確かめる | `mypy`（か `pyright`）。型ヒントを書いて、動かす前に確かめる |
| `interface TaskRepo` | `typing.Protocol`（形が合えば、継承しなくてよい。TypeScript と同じ考え方） |
| 判別できるユニオン | `Literal['running']` を持つ `TypedDict` の `Union`、か dataclass の `match` |
| Zod でボディ・環境変数を確かめる | pydantic の `BaseModel`・`pydantic-settings` |
| `npm run check` | `mypy . && ruff check . && pytest` |
| `node src/server.ts`（型を取り除いて動かす） | Python は、もともと型ヒントを無視して動く |

## 7. 次の部へ

- 第8部: React の画面を TypeScript で作り、この API を使います。`types.ts` の `Task` を、画面でも同じ形で使います
- 第10部: ログインを足し、タスクを「だれのものか」で分けます。トークンの中身は、外から来るものなので Zod で確かめます
- 第11部: 型・ESLint・テストを、GitHub Actions で、プッシュのたびに動かします

---

前の章: [第38章 型と実行時の境界](../ch38-ts-runtime/README.md) ／ 第7部の目次: [../README.md](../README.md)
