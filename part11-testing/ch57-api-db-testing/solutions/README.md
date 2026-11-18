# 第57章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| 問題 | 解答のファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [app.test.ts](app.test.ts) | `node ../../tools/check-tests.ts ../solutions/app.test.ts` |
| 2 | [api-client.ts](api-client.ts) | `MODULE=../solutions/api-client.ts node --test api-client.test.ts` |
| 3 | [memory-users.ts](memory-users.ts) | `MODULE=../solutions/memory-users.ts node --test memory-users.test.ts` |
| 4 | このファイルの問題4 | |
| 5 | [service.test.ts](service.test.ts) | `node ../../tools/check-tests.ts ../solutions/service.test.ts` |
| 6 | [pg-search.ts](pg-search.ts) | `MODULE=../solutions/pg-search.ts node --test pg-search.test.ts` |
| 7 | [holiday-client.ts](holiday-client.ts) | `MODULE=../solutions/holiday-client.ts node --test holiday-client.test.ts` |
| 8 | [with-rollback.ts](with-rollback.ts) | `MODULE=../solutions/with-rollback.ts node --test with-rollback.test.ts` |

解答は、使う部品を `../exercises/` から import しています（同じファイルを2つ持たないため）。

---

## 問題1 タスクの API の HTTP のテスト

道ごとに `describe` でまとめ、成功の道と失敗の道を1つずつ確かめました（[app.test.ts](app.test.ts)）。

```ts
test('知らない状態は 422 で、どの項目かを返す。タスクは変わらない', async () => {
  const task = await createTask('牛乳を買う');
  const res = await send('PUT', `/api/tasks/${task.id}/status`, { status: 'paused' });
  assert.equal(res.status, 422);
  assert.partialDeepStrictEqual(await res.json(), { errors: [{ pointer: '/status' }] });
  assert.deepEqual(await (await api(`/api/tasks/${task.id}`)).json(), task);
});

test('204 で本文は空。その後 GET すると 404', async () => {
  const task = await createTask('牛乳を買う');
  const res = await api(`/api/tasks/${task.id}`, { method: 'DELETE' });
  assert.equal(res.status, 204);
  assert.equal(await res.text(), '');
  assert.equal((await api(`/api/tasks/${task.id}`)).status, 404);
});
```

| テスト | 見つけるミュータント |
| --- | --- |
| 一覧は `{ items: [a, b] }` | 5（配列だけ） |
| PUT の 404 | 6（無くても 200） |
| PUT の 422 と、変わらないこと | 3（確かめない） |
| PUT の 409（4つ目の doing） | 4（400 にする） |
| DELETE の 204・空の本文・その後 404 | 1（200 と JSON） |
| DELETE の 404 | 2（無くても 204） |

- 「消した後に GET すると 404」まで確かめると、「204 を返したが、実は消していない」間違いも見つけられます。
- 409 の準備は、API を使って3つを `doing` にしています。HTTP のテストでは、準備も HTTP で行うのが基本です（データの置き場所の中身に頼らないため）。決まりの境目をたくさん確かめたいときは、サービスの単体テスト（問題5）にします。

**つまずきやすい所**: `res.json()` を呼んだ後に、同じ `res` で `res.text()` は呼べません（本文は1回しか読めない）。

## 問題2 テストで API を呼ぶ部品

```ts
async function request(method: string, path: string, body?: unknown): Promise<ApiResponse> {
  const init: RequestInit = { method, signal: AbortSignal.timeout(timeoutMs) };
  if (body !== undefined) {
    init.headers = { 'content-type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  const type = res.headers.get('content-type') ?? '';
  let parsed: unknown;
  if (text === '') parsed = undefined;
  else if (type.includes('json')) parsed = JSON.parse(text);
  else parsed = text;
  return { status: res.status, headers: res.headers, body: parsed };
}
```

- 本文を `res.text()` で一度だけ読み、「空か」「JSON か」を決めてから `JSON.parse` します。204 の応答で `res.json()` を呼ぶと、空の文字列は JSON として読めずに例外になります。
- `content-type` は `application/json; charset=utf-8` や `application/problem+json` のように付くので、`=== 'application/json'` ではなく `includes('json')` で見ます。
- `body` の型が `unknown` なのは、テストで使うときに、Zod で確かめるか、`assert.deepEqual` で比べるかを、使う側が決めるためです。

**つまずきやすい所**: `get` で `init.body` に `undefined` 以外を入れると、`fetch` は「GET には本文を付けられない」と例外を投げます。

## 問題3 偽物を、本物と同じ約束に合わせる

```ts
export function createMemoryUsers(): UserRepo {
  const users = new Map<number, User>();
  let nextId = 1;
  const copy = (user: User): User => ({ ...user });
  const find = (email: string) => [...users.values()].find((user) => user.email === email.toLowerCase());

  return {
    async create({ email, name }) {
      if (find(email) !== undefined) throw new ConflictError(`登録済みのアドレスです: ${email}`);
      const user: User = { id: nextId++, email: email.toLowerCase(), name };
      users.set(user.id, user);
      return copy(user);
    },
    // findByEmail・rename・list も、返すときは copy
  };
}
```

- 本物の決まり（`UNIQUE`・`CHECK (email = lower(email))`・`lower($1)` で探す）を、偽物では「小文字にしてから比べる・覚える」で同じにしています。
- `Map` は入れた順に並び、id は増えるだけなので、`list()` は並べ替えなくても id の順です。
- テストは、同じ約束を本物にも動かしています。本物で通るので、「約束のテストそのもの」は正しいと分かり、偽物で失敗したら偽物の間違いだと決められます。

**つまずきやすい所**: 返すときにコピーしないと、「返したユーザーを書き換えても、中のデータは変わらない」の約束で失敗します。本物のデータベースは、いつも新しいオブジェクトを返すので、この約束を自然に守っています。

## 問題4 考えて答える

### 問1

A は成功、B は成功、C は失敗です。

- A: 期待に書いた `status` だけを比べます。
- B: 配列の中身は、**期待の要素が、実際の配列のどこかにあれば**成功です（順番や、ほかの要素は見ません。実際に確かめました）。`/dueDate` の要素があっても成功します。
- C: 期待の要素 `{ pointer: '/title', detail: '題名は必須です' }` と、`detail` まで合う要素が実際には無いので失敗します。

「`/title` だけ」を確かめたいときは、`pointer` の配列を作って `deepEqual` で比べます。

```ts
assert.deepEqual(body.errors.map((e) => e.pointer), ['/title']);
```

### 問2

1. 2つのファイルは別のプロセスで**同時に**動くので、`a.test.ts` のテストの途中で、`b.test.ts` の `beforeEach` が表を空にすることがあります。すると、「さっき作ったタスクが無い」「id が 1 ではない」などで失敗します。どちらのテストがいつ動くかは毎回違うので、**いつも失敗するわけではなく、ときどき失敗します**（フレーキーなテスト）。
2. 1つずつ動くので、ふつうは通ります。ただ、これは「同時に動かすと壊れる」ことを隠しているだけで、遅くもなります。
3. スキーマの名前にプロセスの番号と乱数を入れて、ファイル（プロセス）ごとに別のスキーマにしています。同じテーブルを共有しないので、同時に動かしても影響しません。

### 問3

1. 偽物は、そのまま作ってしまいます。本物は、テーブルの `CHECK (char_length(title) BETWEEN 1 AND 100)` で、PostgreSQL のエラー（23514）になります（`pg-repo.ts` は 23505 だけを `ConflictError` にするので、pg のエラーがそのまま出ます）。
2. 見つけません。約束のテストに、長さの確かめが入っていないからです。
3. サービスを通らずにリポジトリを使うコード（データの移し替えの道具など）を、偽物の上でテストしているときに困ります。偽物では通ったのに、本番では失敗します。

   約束に足すかどうかは、「呼ぶ側がその決まりに頼っているか」で決めます。長さはサービスが先に確かめるので、リポジトリの約束には入れず、本物のテスト（スキーマの `CHECK`）に任せる、という考え方もあります。足すなら、偽物にも同じ長さの確かめを入れ、「どんな例外を投げるか」も約束として決める必要があります。どちらにしても、**偽物と本物が違う所を知っている**ことが大事です。

### 問4

テストは5つとも ✔ になります。でも、`node --test` は**終わりません**（実際に動かすと、30 秒たっても終わらず、`timeout` で止めました）。

起動したサーバが待ち続けているので、テストのファイルのプロセスが終わらないからです。CI では、時間切れになるまで止まったままになります。テストのプロセスが終わらないときは、閉じていないサーバ・プール・タイマーを探します（本文9節）。

## 問題5 サービスの単体テスト

決まりの境目ごとにテストを書きました（[service.test.ts](service.test.ts)）。

```ts
test('日本時間の 0 時 30 分には、UTC の日付の「昨日」は過去', async () => {
  const service = createTaskService({ repo: createMemoryRepo(), now: () => new Date('2026-12-09T15:30:00Z') });
  await assert.rejects(service.create({ title: 'a', dueDate: '2026-12-09' }), ValidationError);
});

function withDoing(count: number) {
  const seed = [aTask({ id: 1, title: 'x' })];
  for (let i = 0; i < count; i++) seed.push(aTask({ id: i + 2, title: `doing${i}`, status: 'doing' }));
  const repo = createMemoryRepo(seed);
  return { repo, service: createTaskService({ repo, now }) };
}

test('すでに doing のタスクを doing にしても、数に入れない', async () => {
  const { service } = withDoing(3);
  assert.equal((await service.changeStatus(2, 'doing'))?.status, 'doing');
});
```

| テスト | 見つけるミュータント |
| --- | --- |
| 題名の前後の空白 | 4 |
| 題名は 100 文字まで（100 と 101） | 5 |
| 期限は今日なら作れ、昨日なら失敗 | 6（今日も失敗） |
| 日本時間の 0 時 30 分 | 3（UTC で決める） |
| doing が2つなら3つ目にできる・3つなら4つ目は失敗 | 1（より多い） |
| すでに doing のものを doing に | 2 |
| 無いタスクは `undefined` | 7（例外） |

- `withDoing(count)` は、「doing が count 個ある状態」を作る部品です。境目の両側（2つと3つ）を同じ部品で作れます。
- 日本時間の確かめは、本文の `now`（UTC の 0 時 = 日本時間 9 時）では、UTC と日本時間の日付が同じなので、ミュータント3を見つけられません。日付がずれる時刻を選ぶのがポイントです。

**つまずきやすい所**: seed のタスクの題名を全部同じにすると、偽物の `insert` は通りますが（seed は `insert` を通らない）、本物と違う状態になります。題名は別々にしておきます。

## 問題6 題名で探す SQL を、本物のデータベースで確かめる

```ts
function escapeLike(text: string): string {
  return text.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

export async function searchTasks(db: Db, text: string): Promise<Task[]> {
  const words = text.trim();
  if (words === '') return [];
  const { rows } = await db.query<Row>(
    `SELECT id, title, status, to_char(due_date, 'YYYY-MM-DD') AS due_date
       FROM tasks
      WHERE title ILIKE '%' || $1 || '%'
      ORDER BY id`,
    [escapeLike(words)],
  );
  return rows.map((row) => ({ id: row.id, title: row.title, status: row.status, dueDate: row.due_date }));
}
```

- `'` を含む `Let's` は、`$1` で渡しているので、SQL を壊しません（第6部 第31章）。テストの `Let's ストレッチ` は、それを確かめています。
- `%` と `_` は、プレースホルダで渡しても、**`LIKE` の中では特別な意味**を持ちます。SQL インジェクションではありませんが、`%` で探すと全部が出てくる、という間違いになります。`\` を前に付けて、ふつうの文字にします。
- `\` を最初に置き換えるのは、後で付けた `\` を、もう一度 `\\` にしないためです。
- `\` を置き換えずに `\` で探すと、パターンは `%\%` になり、「`%` で終わる題名」という意味に変わってしまいます（`\%` が「ふつうの `%`」になるため）。`C:\temp を片付ける` が見つからなくなるので、テストの「`\` も、ふつうの文字として探す」が失敗します。

**つまずきやすい所**: `` `… ILIKE '%${text}%'` `` のように、値を SQL に直接埋め込むと、`Let's` で SQL が壊れます。値はいつも `$1` で渡し、`%` を付けるのは SQL の中（`||`）か、渡す前の文字列で行います。

## 問題7 外の API を覚えておいて使う

```ts
async function get(year: number): Promise<Holiday[]> {
  const entry = cache.get(year);
  if (entry !== undefined && now() - entry.fetchedAt < ttlMs) return entry.holidays;
  let pending = inFlight.get(year);
  if (pending === undefined) {
    pending = refresh(year);
    inFlight.set(year, pending);
  }
  return pending;
}
```

`refresh` は、`fetchHolidays` が成功したら覚え、`UpstreamError` で失敗したら古い一覧（あれば）を返し、`finally` で `inFlight` から消します（[holiday-client.ts](holiday-client.ts)）。

- `inFlight` に Promise を入れておくと、同時に来た2つ目の `get` は、新しく頼まずに同じ Promise を待ちます。テストは、偽物の API を 50ms 遅らせて、この場合を作っています。
- 古い一覧を返すのは `UpstreamError` のときだけです。それ以外の例外（プログラムの間違い）まで隠すと、間違いに気付けません。
- 「今」は `now()` で読むので、テストでは偽物の時計で ttl の境目（999 と 1000）を確かめられます（第56章 練習問題8と同じ形）。

**つまずきやすい所**: 失敗したときに `inFlight` から消し忘れると、失敗した Promise がずっと残り、次の `get` も同じ失敗を返し続けます。テストの「次に頼まれたら、もう一度頼む」は、それを見つけます。

## 問題8 テストで書いたものを、必ず取り消す部品

```ts
export async function withRollback<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    return await fn(client);
  } finally {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }
}
```

- `return await fn(client)` の `await` が大事です。`await` が無いと、Promise を返した時点で `finally` が動き、`fn` がまだ書いている途中で ROLLBACK してしまいます。
- `finally` の中をもう一段 `try` / `finally` にしているのは、ROLLBACK が失敗しても（接続が切れたなど）、`release()` を必ず呼ぶためです。返し忘れると、プールの接続がなくなって、次の `pool.query` が止まります。テストの「接続を必ず返す」は、プールの上限（4）より多く呼んで、止まらないことを確かめています。
- `fn` の例外は、`finally` の後でそのまま外に出ます。`catch` で受けて別の例外にしないので、テストは `err === boom`（同じもの）で確かめられます。

**つまずきやすい所**: `pool.query('BEGIN')` のように、プールに直接送ると、BEGIN と、その後の SQL が別の接続に行くことがあり、取り消しが効きません（本文7節）。
