# 第57章 API とデータベースのテスト

第56章では、関数を1つずつ確かめました。この章では、Web アプリの真ん中にある **API とデータベース**を確かめます。テストの中でサーバを起動して HTTP で頼む方法、サービスをメモリの偽物で速く確かめる方法、本物の PostgreSQL をテストごとに用意して片付ける方法、偽物と本物が同じように動くことを「約束のテスト」で確かめる方法、外の API を偽物のサーバに替える方法を、小さなタスクの API で手を動かして身につけます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第56章、第5部 第25章（REST の設計・problem+json）、第6部 第32章（`pg`・スキーマ・トランザクション）、第7部 第37章（`interface TaskRepo`） |
| この章のゴール | テストの中でアプリを空いているポートで起動し、HTTP で確かめられる / 状態・ヘッダ・本文を、必要なだけ確かめられる / サービスの決まりを、メモリの偽物と決まった「今」で確かめられる / テストごとに PostgreSQL のスキーマを作って消せる / 偽物と本物に同じ約束のテストを動かせる / 外の API を、テストの中の偽物のサーバに替えられる / テストが不安定になる原因を挙げ、避けられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 練習用の小さなタスクの API と、本文で書くテストの完成形 |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part11/ch57-api-db-testing/` で実行します。
>
>   ```sh
>   $ cd ~/dev/part11/ch57-api-db-testing
>   ```
>
> - 5節から、PostgreSQL を使います。第6部の `compose.yaml` の PostgreSQL（127.0.0.1:5433、データベース `taskapi`）を先に動かしてください。テストは、`test_` で始まるスキーマを作って、終わったら消します。`public` のテーブル（第6〜10部の成果物のもの）には触りません。
>
>   ```sh
>   $ (cd ~/dev/part06 && docker compose up -d --wait)
>   ```
>
> - 2節で、練習用の API をポート **9717** で起動します。テストの中で起動するサーバは、空いているポート（0 番）を使います。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| テストの中でアプリを起動して HTTP で確かめる（2・3節） | 成果物（第10部の 45 個のテストを整理する）、第58章（E2E で API を起動する） |
| サービスの単体テストと偽物のリポジトリ（4・6節） | 成果物（データベースなしで動く単体テストを足す） |
| テストのためのデータベース（5・7節） | 成果物、第59章（CI で PostgreSQL を動かす） |
| 外の API を偽物のサーバに（8節） | 第12部（メール送信サービス・オブジェクトストレージを使うテスト） |
| 不安定なテストを避ける（9節） | この部のすべて、第59章（CI で何度も動かす） |

---

## 1. 確かめる API と、層の分け方

この章で確かめるのは、第7部の成果物を小さくした、タスクの API です。中身は、第5部 第26章と同じ3つの層に分かれています。

| ファイル | 層 | すること |
| --- | --- | --- |
| [types.ts](samples/types.ts) | | `Task`・`interface TaskRepo`・`ConflictError`・`ValidationError` |
| [app.ts](samples/app.ts) | ルート | HTTP をサービスの呼び出しに読み替える。Zod で本文を確かめ、エラーを problem+json に |
| [service.ts](samples/service.ts) | サービス | 決まり（題名は 1〜100 文字、期限は今日から、`doing` は3つまで） |
| [memory-repo.ts](samples/memory-repo.ts)・[pg-repo.ts](samples/pg-repo.ts) | データ | メモリの偽物と PostgreSQL。どちらも `TaskRepo` の形 |

層ごとに、何をどう確かめるかを決めておきます（第56章 7節）。

| 確かめるもの | テストの形 | データの置き場所 | 節 |
| --- | --- | --- | --- |
| ルート（状態・ヘッダ・本文の形・エラーの読み替え） | HTTP で頼む | メモリの偽物 | 2・3 |
| サービス（決まり） | 関数を呼ぶ | メモリの偽物 | 4 |
| データ（SQL・制約） | 関数を呼ぶ | 本物の PostgreSQL | 5・6 |

アプリのファイルを、章のフォルダにコピーしておきます。この章で自分で書くのは、テストとテストの部品だけです。

```sh
$ cp samples/types.ts samples/memory-repo.ts samples/pg-repo.ts samples/service.ts samples/app.ts samples/server.ts .
```

## 2. テストの中でアプリを起動する

### 2.1 手を動かす: まず手で触る

```sh
$ node server.ts
http://127.0.0.1:9717/api/tasks で待っています（メモリ）
```

別のターミナルで（第2部 第6章の `curl`。`-i` は応答のヘッダも出す、`-X` はメソッド、`-H` はヘッダ、`-d` は本文）:

```sh
$ curl -i -X POST -H 'content-type: application/json' -d '{"title":"牛乳を買う"}' http://127.0.0.1:9717/api/tasks
HTTP/1.1 201 Created
X-Powered-By: Express
Location: /api/tasks/1
Content-Type: application/json; charset=utf-8
…
{"id":1,"title":"牛乳を買う","status":"todo","dueDate":null}
$ curl -i -X POST -H 'content-type: application/json' -d '{"title":""}' http://127.0.0.1:9717/api/tasks
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json; charset=utf-8
…
{"title":"入力が正しくありません","status":422,"errors":[{"pointer":"/title","detail":"題名は 1〜100 文字にしてください"}]}
```

今、目で確かめたこと（201・`Location`・本文、422・どの項目か）を、テストに書いていきます。確かめたら `Ctrl+C` で止めます。

### 2.2 手を動かす: 空いているポートで起動する部品

テストの中でサーバを起動するとき、決まった番号（9717）を使うと、手で起動したサーバや、同時に動くほかのテストとぶつかります。**ポート 0** を指定すると、OS が空いている番号を選んでくれます。`start-app.ts` を作ります。

```ts
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';

export interface Started {
  base: string;
  close(): Promise<void>;
}

export function startApp(app: Express): Promise<Started> {
  return new Promise((resolve, reject) => {
    const server: Server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        base: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((done, fail) => {
            server.close((err) => (err ? fail(err) : done()));
          }),
      });
    });
    server.once('error', reject);
  });
}
```

| 書いたもの | 意味 |
| --- | --- |
| `app.listen(0, '127.0.0.1', …)` | 空いている番号で、この Mac の中だけで待つ |
| `server.address()` | 実際に選ばれた番号を読む。`listen` の後なので、いつも `AddressInfo`（`as` は、この1か所だけ。第7部と同じ） |
| `close` を Promise にする | テストの片付け（`afterEach`）で `await` できるように |

**Flask では**: `app.test_client()` は、サーバを起動せずに、アプリの関数（WSGI のアプリ）を直接呼んでリクエストを渡します。Express にも同じ考えの道具（supertest）がありますが、この教材では、本物と同じく HTTP で頼む形にしました。`fetch` と `curl` で見るものが同じになり、ヘッダやエンコーディングの違いも含めて確かめられるからです。起動は数ミリ秒です。

### 2.3 手を動かす: 最初の HTTP のテスト

`http.test.ts` を作ります。

```ts
import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.ts';
import { createMemoryRepo } from './memory-repo.ts';
import { createTaskService } from './service.ts';
import { startApp, type Started } from './start-app.ts';

let server: Started;
beforeEach(async () => {
  const service = createTaskService({
    repo: createMemoryRepo(),
    now: () => new Date('2026-12-10T00:00:00Z'),
  });
  server = await startApp(createApp({ service }));
});
afterEach(() => server.close());

function api(path: string, init: RequestInit = {}) {
  return fetch(`${server.base}${path}`, { signal: AbortSignal.timeout(5000), ...init });
}
function post(path: string, body: unknown) {
  return api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

describe('POST /api/tasks', () => {
  test('201 と Location と、作ったタスク', async () => {
    const res = await post('/api/tasks', { title: '牛乳を買う', dueDate: '2026-12-24' });

    assert.equal(res.status, 201);
    assert.equal(res.headers.get('location'), '/api/tasks/1');
    assert.deepEqual(await res.json(), { id: 1, title: '牛乳を買う', status: 'todo', dueDate: '2026-12-24' });
  });
});
```

```sh
$ node --test http.test.ts
▶ POST /api/tasks
  ✔ 201 と Location と、作ったタスク (…ms)
✔ POST /api/tasks (…ms)
```

| 書いたもの | 意味 |
| --- | --- |
| `beforeEach` で、空のリポジトリからアプリを起動 | テストごとに、まっさらな状態から始まる。id がいつも 1 から、と書ける |
| `afterEach(() => server.close())` | 起動したら必ず止める。止め忘れると、テストのプロセスが終わらない |
| `AbortSignal.timeout(5000)` | サーバが答えないとき、テストが止まったままにならない（第4部の決まり） |
| `now: () => new Date(…)` | 「今」を決めておく（第56章 5節）。期限の決まりが、動かす日で変わらない |

## 3. 応答を、必要なだけ確かめる

| 確かめるもの | 書き方 | 注意 |
| --- | --- | --- |
| 状態 | `assert.equal(res.status, 201)` | まず状態を確かめる。違うと、本文を読んでも意味が無い |
| ヘッダ | `res.headers.get('location')` | 名前は小文字で読める。`content-type` は `; charset=utf-8` が付くので、`assert.match` で前だけ見る |
| 本文の全体 | `assert.deepEqual(await res.json(), {…})` | 中身をすべて決められるとき |
| 本文の一部 | `assert.partialDeepStrictEqual(body, {…})` | `detail` の文のように、テストで決めたくないものがあるとき |
| 本文が空 | `assert.equal(await res.text(), '')` | 204 のとき |

`partialDeepStrictEqual(実際, 期待)` は、期待に書いた項目だけを比べます（Node.js 24 で使えます）。**全部を確かめると、文言を少し直すだけでテストが壊れる**。**確かめなさすぎると、間違いを見逃す**。その間をとるのに使います。

### 3.1 手を動かす: 422 と、エラーの形

`http.test.ts` の `describe('POST /api/tasks', …)` の中に足します。

```ts
  test('題名が空なら 422 で、どの項目かを返す', async () => {
    const res = await post('/api/tasks', { title: '   ' });

    assert.equal(res.status, 422);
    assert.match(res.headers.get('content-type') ?? '', /^application\/problem\+json/);
    assert.partialDeepStrictEqual(await res.json(), { status: 422, errors: [{ pointer: '/title' }] });
  });

  test('同じ題名は 409', async () => {
    await post('/api/tasks', { title: '牛乳を買う' });
    const res = await post('/api/tasks', { title: '牛乳を買う' });
    assert.equal(res.status, 409);
  });
```

`describe('GET /api/tasks/:id', …)` も足します。

```ts
describe('GET /api/tasks/:id', () => {
  test('無ければ 404', async () => {
    assert.equal((await api('/api/tasks/99')).status, 404);
  });

  test('id が数でなければ 404（500 にしない）', async () => {
    assert.equal((await api('/api/tasks/abc')).status, 404);
  });
});
```

`/api/tasks/abc` のような、**おかしな入力で 500 にならないか**も、HTTP のテストで確かめるものの1つです。500 は「サーバの中の間違い」なので、利用者の入力では起きないようにします。

## 4. サービスは、偽物のリポジトリで速く確かめる

サービスの決まり（`doing` は3つまで、など）を HTTP で確かめると、準備に何回も API を呼ぶことになります。決まりはサービスの関数を直接呼んで確かめ、データの置き場所はメモリの偽物（第56章 6節のフェイク）にします。

### 4.1 手を動かす: 準備したい状態を seed で作る

`service.test.ts` を作ります。

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryRepo } from './memory-repo.ts';
import { createTaskService } from './service.ts';
import { ConflictError, ValidationError, type Task } from './types.ts';

const now = () => new Date('2026-12-10T00:00:00Z');

function aTask(overrides: Partial<Task> = {}): Task {
  return { id: 1, title: 'タスク', status: 'todo', dueDate: null, ...overrides };
}

test('期限は今日なら作れ、昨日なら ValidationError', async () => {
  const service = createTaskService({ repo: createMemoryRepo(), now });
  await service.create({ title: 'a', dueDate: '2026-12-10' });
  await assert.rejects(service.create({ title: 'b', dueDate: '2026-12-09' }), ValidationError);
});

test('doing が3つあると、4つ目は ConflictError', async () => {
  const repo = createMemoryRepo([
    aTask({ id: 1, status: 'doing' }),
    aTask({ id: 2, title: 'b', status: 'doing' }),
    aTask({ id: 3, title: 'c', status: 'doing' }),
    aTask({ id: 4, title: 'd' }),
  ]);
  const service = createTaskService({ repo, now });

  await assert.rejects(service.changeStatus(4, 'doing'), ConflictError);
  assert.equal((await repo.get(4))?.status, 'todo');
});
```

```sh
$ node --test service.test.ts
```

| 書いたもの | 意味 |
| --- | --- |
| `createMemoryRepo([…])` | 最初から入っているデータ（**seed**）を渡せる偽物。API を3回呼んで `doing` にする代わりに、その状態を直接作る |
| `assert.rejects(…, ConflictError)` | 例外のクラスで確かめる。HTTP の 409 に読み替えるのはルートの仕事なので、ここでは確かめない |
| 失敗した後、`repo.get(4)` を見る | 「断った」だけでなく「何も変えていない」ことも確かめる |

このテストはデータベースを使わないので、1つ数ミリ秒で終わります。決まりの境目（2つ・3つ）をたくさん確かめるのは、この層です（練習問題5）。

## 5. 本物のデータベースで確かめる

偽物は速いですが、SQL の間違い・制約（`CHECK`・一意）・型の変換（date の列）は、本物でしか分かりません。データの層は、本物の PostgreSQL で確かめます。

テストのデータベースで大事なのは、**ほかのテストとも、自分の開発のデータとも混ざらない**ことです。

| 方法 | 中身 | 向いているとき |
| --- | --- | --- |
| テストのファイルごとに**スキーマ**を作って消す | `CREATE SCHEMA test_…`、終わったら `DROP SCHEMA … CASCADE` | この章のやり方。ファイルを同時に動かしてもぶつからない |
| テストごとに表を空にする | `TRUNCATE tasks RESTART IDENTITY` | 同じファイルの中で、テストごとにまっさらにする |
| テストごとにトランザクションを取り消す | `BEGIN` → テスト → `ROLLBACK` | 速い。ただし、トランザクションを使うコード自体は確かめにくい（7節） |
| テスト専用のデータベースを丸ごと作る | `CREATE DATABASE …` | 遅いが、いちばん離れている |

### 5.1 手を動かす: テストごとのスキーマ

`test-db.ts` を作ります（第6部 第32章 練習問題の `pg-test.mjs` と同じ考えです）。

```ts
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { SCHEMA_SQL } from './pg-repo.ts';

export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi';

export interface TestDb {
  pool: pg.Pool;
  schema: string;
  drop(): Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const schema = `test_${process.pid}_${randomBytes(4).toString('hex')}`;
  const admin = new pg.Client({ connectionString: DATABASE_URL });
  await admin.connect();
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.end();

  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, options: `-c search_path=${schema}` });
  await pool.query(SCHEMA_SQL);

  return {
    pool,
    schema,
    async drop() {
      await pool.end();
      const client = new pg.Client({ connectionString: DATABASE_URL });
      await client.connect();
      await client.query(`DROP SCHEMA ${schema} CASCADE`);
      await client.end();
    },
  };
}
```

| 書いたもの | 意味 |
| --- | --- |
| `test_${process.pid}_${乱数}` | プロセスの番号（`process.pid`）と乱数で、同時に動くテストとぶつからない名前にする |
| `CREATE SCHEMA ${schema}` | SQL に値を直接埋め込んでいるが、名前は自分で作った英数字だけなので安全。利用者の入力は、必ず `$1` で渡す（第6部 第31章） |
| `options: '-c search_path=…'` | プールのどの接続でも、テーブルを探す場所をそのスキーマにする。`tasks` と書けば、そのスキーマの `tasks` になる |
| `drop()` | プールを閉じてから、スキーマを中身ごと消す |

[samples/test-db.ts](samples/test-db.ts) は、つなげないときに「第6部の compose は動いていますか」と出すようにしてあります。

### 5.2 手を動かす: PostgreSQL のリポジトリを確かめる

まず、6節で両方に使う「約束のテスト」を作ります。`repo-contract.ts`:

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictError, type TaskRepo } from './types.ts';

export function repoContract(name: string, makeRepo: () => Promise<TaskRepo>) {
  describe(`TaskRepo の約束: ${name}`, () => {
    test('insert すると id が付き、get と list で読める', async () => {
      const repo = await makeRepo();
      const task = await repo.insert({ title: '牛乳を買う', dueDate: '2026-12-24' });

      assert.deepEqual(task, { id: task.id, title: '牛乳を買う', status: 'todo', dueDate: '2026-12-24' });
      assert.deepEqual(await repo.get(task.id), task);
      assert.deepEqual(await repo.list(), [task]);
    });

    test('終わっていない同じ題名は ConflictError。終わっていれば作れる', async () => {
      const repo = await makeRepo();
      const first = await repo.insert({ title: '牛乳を買う', dueDate: null });
      await assert.rejects(repo.insert({ title: '牛乳を買う', dueDate: null }), ConflictError);

      await repo.setStatus(first.id, 'done');
      await repo.insert({ title: '牛乳を買う', dueDate: null });
      assert.equal((await repo.list()).length, 2);
    });
  });
}
```

`repo.test.ts` で、PostgreSQL に動かします。

```ts
import { after, before } from 'node:test';
import { createPgRepo } from './pg-repo.ts';
import { repoContract } from './repo-contract.ts';
import { createTestDb, type TestDb } from './test-db.ts';

let db: TestDb;
before(async () => {
  db = await createTestDb();
});
after(() => db.drop());

repoContract('PostgreSQL', async () => {
  await db.pool.query('TRUNCATE tasks RESTART IDENTITY');
  return createPgRepo(db.pool);
});
```

```sh
$ node --test repo.test.ts
▶ TaskRepo の約束: PostgreSQL
  ✔ insert すると id が付き、get と list で読める (…ms)
  ✔ 終わっていない同じ題名は ConflictError。終わっていれば作れる (…ms)
✔ TaskRepo の約束: PostgreSQL (…ms)
```

| 書いたもの | 意味 |
| --- | --- |
| `before`・`after` | ファイルの最初と最後に1回ずつ動く。スキーマを作るのは1回だけにして、速くする |
| `TRUNCATE tasks RESTART IDENTITY` | 表を空にし、id の番号も 1 に戻す。`makeRepo()` が呼ばれるたび（＝テストごと）に動く |
| 期限 `'2026-12-24'` が、そのまま返る | date の列を Date にすると、時間帯で1日ずれる（第6部 第32章 4.2節）。この種の間違いは、本物でしか見つからない |

テストが終わった後、第6部 第32章 2節の `psql` で `\dn`（スキーマの一覧）を見ると、`test_…` は残っていないはずです。

## 6. 偽物と本物に、同じ約束を確かめさせる

4節で使ったメモリの偽物は、本物と**同じように動く**から、サービスのテストに使えます。でも、それを確かめていなければ、偽物の上で通ったテストは、本番では通らないかもしれません。

そこで、5.2節の約束のテストを、偽物にも動かします（**契約テスト**、contract test）。`repo.test.ts` に1行足します。

```ts
import { createMemoryRepo } from './memory-repo.ts';

repoContract('メモリ', async () => createMemoryRepo());
```

```sh
$ node --test repo.test.ts
▶ TaskRepo の約束: メモリ
  ✔ insert すると id が付き、get と list で読める (…ms)
  ✔ 終わっていない同じ題名は ConflictError。終わっていれば作れる (…ms)
✔ TaskRepo の約束: メモリ (…ms)
▶ TaskRepo の約束: PostgreSQL
…
```

| 偽物と本物で、同じテストを動かすと | |
| --- | --- |
| 本物で通る | 約束のテストそのものが正しい |
| 偽物で通る | 偽物が、本物と同じ約束を守っている。偽物を使うサービスのテストを信じられる |
| 偽物だけ失敗 | 偽物を直す（本物に合わせる） |

[samples/repo-contract.ts](samples/repo-contract.ts) には、「無い id」「数える」「返したものを書き換えても中は変わらない」の約束も入っています。最後のものは、偽物で忘れやすい約束です。メモリの偽物が中のオブジェクトをそのまま返すと、呼んだ側の書き換えが中に残りますが、データベースはいつも新しいオブジェクトを返すからです。

**約束に入れていないものは、偽物と本物で違ってよい**ことにも気を付けます。たとえば、題名が 101 文字なら、本物はテーブルの `CHECK` で断りますが、偽物は断りません。この決まりはサービスが先に確かめるので、ふつうは困りません。でも、サービスを通らずにリポジトリを使うコードがあると、偽物の上のテストでは見つからない間違いになります（練習問題4）。

## 7. テストの中のトランザクション

5節の表の3つ目、「テストごとにトランザクションを取り消す」は、表を空にするより速く、後片付けを忘れても残らない方法です。

```ts
const client = await pool.connect();
await client.query('BEGIN');
// … client でテストする（書いたものは、この接続からだけ見える）
await client.query('ROLLBACK'); // 全部なかったことにする
client.release();
```

`createPgRepo` が `Pool` の代わりに1つの接続（`PoolClient`）も受け取れる（[pg-repo.ts](samples/pg-repo.ts) の `Db` 型）のは、このためです。練習問題8で、この形を部品（`withRollback`）にします。

| 気を付けること | 理由 |
| --- | --- |
| 同じ接続で、BEGIN〜ROLLBACK を送る | プールの別の接続には、トランザクションは届かない（第6部 第32章 5節） |
| 確かめたいコードが、自分でトランザクションを使うとき | 中の `BEGIN` が「もう始まっている」と警告になり、`COMMIT` が外のトランザクションを終わらせてしまう。そういうコードは、スキーマごとのやり方で確かめる |
| 例外が起きても、必ず ROLLBACK と release | `try` / `finally`。返し忘れると、プールの接続が足りなくなって止まる |

## 8. 外の API を、テストの中の偽物にする

休みの日の一覧を外の API から読む部品 [holidays.ts](samples/holidays.ts) を考えます。テストで本物の API を呼ぶと、ネットワークが無いと失敗し、相手の都合で答えが変わり、回数の制限にもかかります。そこで、**どこに頼むか（`baseUrl`）を引数で受け取り**、テストでは自分で起動した偽物のサーバを渡します。

### 8.1 手を動かす: 偽物の API のサーバ

`cp samples/holidays.ts .` でコピーしてから、`holidays.test.ts` を作ります。

```ts
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { fetchHolidays, UpstreamError } from './holidays.ts';

let reply: (res: http.ServerResponse) => void = (res) => res.end();
const requests: string[] = [];
const fake = http.createServer((req, res) => {
  requests.push(`${req.method} ${req.url}`);
  reply(res);
});
let baseUrl: string;
before(async () => {
  await new Promise<void>((resolve) => fake.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
});
after(() => {
  fake.closeAllConnections();
  fake.close();
});

function json(status: number, body: unknown) {
  return (res: http.ServerResponse) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
}

test('年を URL に入れて頼み、一覧を返す', async () => {
  reply = json(200, [{ date: '2026-01-01', name: '元日' }]);
  assert.deepEqual(await fetchHolidays(2026, { baseUrl }), [{ date: '2026-01-01', name: '元日' }]);
  assert.equal(requests.at(-1), 'GET /holidays/2026');
});

test('500 なら UpstreamError', async () => {
  reply = json(500, { message: 'error' });
  await assert.rejects(fetchHolidays(2026, { baseUrl }), UpstreamError);
});

test('答えが来なければ、timeoutMs で UpstreamError', async () => {
  reply = () => {};
  await assert.rejects(fetchHolidays(2026, { baseUrl, timeoutMs: 100 }), /つなげません/);
});
```

| 書いたもの | 意味 |
| --- | --- |
| `reply` を書き換える | テストごとに、偽物の答え方を変える |
| `requests` | 偽物が受け取ったリクエストの記録。「正しい URL に頼んだか」を確かめる |
| `fake.closeAllConnections()` | 返事をしなかった（最後のテスト）接続も閉じる。閉じないと `close()` が待ち続ける |

**`fetch` を `t.mock.method(globalThis, 'fetch', …)` で偽物にする**こともできます。速くて短いのですが、URL の組み立て・ヘッダ・タイムアウトなど、`fetch` の中で起きることは確かめられません。偽物のサーバなら、本物の HTTP の上で確かめられます。第10部の成果物で、メールの送信を偽の SMTP サーバで確かめたのも、同じ考えです。

## 9. 速く、安定したテストにする

ときどきだけ失敗するテストを、**フレーキーなテスト**（flaky test）と呼びます。CI で「もう一度動かしたら通った」が続くと、本当の失敗も見逃すようになります。原因の多くは、次のどれかです。

| 原因 | 例 | 避け方 |
| --- | --- | --- |
| 時間 | 「今」を読む、`setTimeout` で待って確かめる | 「今」を引数で（第56章 5節）。待つなら「〜になるまで」待つ（第58章） |
| 順番 | 前のテストが作ったデータに頼る | テストごとに作り直す（`beforeEach`・`TRUNCATE`） |
| 共有 | 2つのテストのファイルが、同じ表・同じポートを使う | ファイルごとのスキーマ、ポート 0 |
| 外の世界 | 本物の API・本物のメール | 偽物のサーバ（8節） |
| 片付け忘れ | サーバ・プール・タイマーを閉じない | `after`・`afterEach`。テストのプロセスが終わらないときは、まずここを疑う |

`node --test` は、**テストのファイルごとに別のプロセスで、同時に**動かします。

```sh
$ node --test samples/*.test.ts                        # ファイルを同時に動かす
ℹ tests 22
ℹ duration_ms 414.696441
$ node --test --test-concurrency=1 samples/*.test.ts   # 1つずつ動かす
ℹ duration_ms 1034.020902
```

| オプション | 意味 |
| --- | --- |
| `--test-concurrency=1` | 同時に動かすファイルの数を 1 にする。「同時に動かすと失敗する」テストを見つけるのに使う |

同時に動かして速くなるのは、ファイルどうしが何も共有していないからです。5節で、スキーマの名前にプロセスの番号を入れたのは、このためです。

## 10. Flask（pytest）との対応

| Flask・pytest | この章 |
| --- | --- |
| `app.test_client()`（サーバを起動せずに頼む） | `startApp(app)`（ポート 0 で起動して `fetch`） |
| `response.status_code`・`response.headers`・`response.get_json()` | `res.status`・`res.headers.get()`・`await res.json()` |
| `app.config['TESTING'] = True`、アプリの工場関数（`create_app(config)`） | `createApp({ service })`。部品を引数で渡す |
| pytest のフィクスチャでデータベースを用意し、`yield` の後で片付け | `before` で `createTestDb()`、`after` で `drop()` |
| フィクスチャの中で `session.begin_nested()` + `rollback()` | 7節の BEGIN〜ROLLBACK（練習問題8） |
| `responses`・`requests-mock`（requests を偽物に） | 偽物の HTTP サーバ（8節）、`t.mock.method(globalThis, 'fetch')` |
| pytest-xdist（`-n auto` で同時に） | `node --test`（もともとファイルごとに同時） |

## まとめ

- API のテストは、テストの中でアプリをポート 0 で起動し、`fetch` で頼む。状態から確かめ、本文は必要なだけ（`deepEqual`・`partialDeepStrictEqual`）確かめる。おかしな入力で 500 にならないことも確かめる。
- サービスの決まりは、メモリの偽物と決まった「今」で、関数を直接呼んで確かめる。準備したい状態は seed で作る。
- データの層は、本物の PostgreSQL で確かめる。テストのファイルごとにスキーマを作って消し、テストごとに表を空にする。
- 偽物と本物に、同じ約束のテストを動かす。偽物が約束を守っていれば、偽物を使うテストを信じられる。
- 外の API は、どこに頼むかを引数で受け取り、テストでは偽物のサーバを起動する。
- 時間・順番・共有・外の世界・片付け忘れが、フレーキーなテストの主な原因。ファイルを同時に動かしても通るように作る。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- Node.js Docs「Test runner」（`before`・`after`・`--test-concurrency`）: https://nodejs.org/api/test.html
- Node.js Docs「assert.partialDeepStrictEqual」: https://nodejs.org/api/assert.html#assertpartialdeepstrictequalactual-expected-message
- node-postgres「Pooling」「Transactions」: https://node-postgres.com/features/pooling ・ https://node-postgres.com/features/transactions
- PostgreSQL Docs「Schemas」（`search_path`）: https://www.postgresql.org/docs/current/ddl-schemas.html
- PostgreSQL Docs「Pattern Matching」（`LIKE` と `\`）: https://www.postgresql.org/docs/current/functions-matching.html
- Martin Fowler「ContractTest」: https://martinfowler.com/bliki/ContractTest.html
- Flask Docs「Testing Flask Applications」: https://flask.palletsprojects.com/en/stable/testing/

---

第11部の目次: [../README.md](../README.md) ／ 前の章: [第56章 テストの考え方](../ch56-testing-basics/README.md) ／ 次の章: [第58章 フロントエンドのテスト](../ch58-frontend-testing/README.md)
