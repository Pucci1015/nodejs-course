# 第37章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part07/ch37-ts-node/exercises` で実行） |
| --- | --- | --- |
| 1 | [wordcount.ts](wordcount.ts) | `MODULE=../solutions/wordcount.ts node --test wordcount.test.ts` |
| 2 | [config.ts](config.ts) | `MODULE=../solutions/config.ts node --test config.test.ts` |
| 3 | [routes.ts](routes.ts) | `MODULE=../solutions/routes.ts node --test routes.test.ts` |
| 4 | このページ | — |
| 5 | [memory-repo.ts](memory-repo.ts) | `MODULE=../solutions/memory-repo.ts node --test memory-repo.test.ts` |
| 6 | [pg-repo.ts](pg-repo.ts) | `MODULE=../solutions/pg-repo.ts node --test pg-repo.test.ts` |
| 7 | [lint-fix.ts](lint-fix.ts) | `MODULE=../solutions/lint-fix.ts node --test lint-fix.test.ts` |
| 8 | [app.ts](app.ts) | `MODULE=../solutions/app.ts node --test app.test.ts` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。`task-repo.ts`・`fake-repo.ts`・`○○.check.ts`・`typecheck.ts`・`type-assert.ts`・`sample.txt` は `exercises/` と同じものです。

解答のコードは長いので、このページには要点だけを書きます。全体は、それぞれのファイルを読んでください。

---

## 問題1 JavaScript のプログラムに型を付ける

変えたのは、関数の引数と戻り値の型と、`Map` の型だけです。

```ts
export function countText(text: string): { lines: number; words: number; chars: number } {
export function topWords(text: string, n: number): { word: string; count: number }[] {
  const counts = new Map<string, number>();
export async function main(argv: string[]): Promise<number> {
```

- `new Map()` のままだと `Map<any, any>` になり、`counts.get(w)` も any です。tsc はエラーを出しません（`any` は「確かめない」なので）。`wordcount.check.ts` の戻り値の確かめで、初めて分かります。中身を渡さずに作る `Map`・`Set`・空の配列は、型を書きます。
- `const [file, nText] = argv;` の `file` は `string | undefined` です（`noUncheckedIndexedAccess`）。すぐ下の `if (file === undefined)` があるので、その後は `string` になります。JavaScript のときから書いてあった確かめが、そのまま型の絞り込みになっています。
- `readFile(file, 'utf8')` は、文字コードを渡したので `Promise<string>` です（本文3節）。

## 問題2 環境変数から設定を読む

```ts
function isLogLevel(text: string): text is LogLevel {
  return text === 'debug' || text === 'info' || text === 'warn' || text === 'error';
}

/** 環境変数を読む。無いか空なら undefined */
function read(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name];
  return value === undefined || value === '' ? undefined : value;
}
```

- 「空の文字列は無いと同じ」を `read` 1か所にまとめると、項目ごとに書かなくて済みます。
- 間違いは `problems` の配列に `push` していき、最後に1つでもあれば `throw new ConfigError(problems)` します。1つ目で投げると、直して起動するたびに次の間違いが出てきて、何回もやり直すことになります。
- `logLevel` は、`let logLevel: LogLevel = 'info'` と決まりの値で始め、型ガードが通ったときだけ入れ替えます。こうすると `as LogLevel` が要りません。
- 第38章では、この関数を Zod で書き直します。手で書くと、これだけの行が要ることを覚えておいてください。

## 問題3 型の付いた Express のルータ

```ts
router.get('/', async (req: Request, res: Response<Task[] | ErrorBody>) => {
  const status = req.query.status;
  if (status === undefined) {
    res.json(await repo.list());
    return;
  }
  if (!isStatus(status)) {
    res.status(400).json({ error: 'status は todo・doing・done のどれかです' });
    return;
  }
  res.json(await repo.list({ status }));
});
```

- `isStatus(value: unknown): value is Status` は、`'todo'`・`'doing'`・`'done'` と `===` で比べるだけです。`req.query.status` が配列（`?status=todo&status=done`）でも、どれとも等しくないので、自然に 400 になります。
- `Response<Task[] | ErrorBody>` と書いたので、`res.json({ eror: … })` のような書き間違いは tsc のエラーになります。
- id は `/^[1-9]\d{0,8}$/` で確かめています（`\d{0,8}` は「数字が 0〜8 個」。とても大きな数を、データベースに送る前にはじくため）。問題のヒントの `/^[1-9]\d*$/` でもテストは通ります。
- `DELETE` は、`id === null || !(await repo.remove(id))` で、「形が違う」と「無い」をまとめて 404 にしています。

## 問題4 型の除去で動かない書き方（調べる問題）

**1.** エラーは、ファイルの上から順に1つずつ出ます。

| コメントにしたもの | `node strip-try.ts` のエラー |
| --- | --- |
| （何もしない） | `TypeScript namespace declaration is not supported in strip-only mode` |
| namespace | `TypeScript enum is not supported in strip-only mode` |
| namespace と enum | `TypeScript parameter property is not supported in strip-only mode` |

3つともコメントにすると、型のエラーは無くなりますが、今度は動かしたときに `ReferenceError: Point is not defined` になります（最後の行が、消したものを使っているため）。

3つとも、「型を消すだけ」では JavaScript にならない書き方です。namespace と enum は、JavaScript のオブジェクトを**作るコード**に変換する必要があり、引数のプロパティは `this.x = x;` を**足す**必要があります。

**2.** `42 1 L 3` と出力されます。tsx は型を消すのではなく、JavaScript に変換するので、3つとも動きます。

- enum のメンバーは、何も書かなければ 0 から順に番号が付きます。`S` が 0、`M` が 1、`L` が 2 なので、`Size.M` は `1` です。
- 数の enum は、「番号から名前」を引く逆向きの表も作ります（**逆引き**、reverse mapping）。`Size[2]` は `'L'` です。この逆引きの表があるため、`Object.keys(Size)` が `['0', '1', '2', 'S', 'M', 'L']` になるなど、思わぬ動きをすることがあります。この教材で enum を使わない理由の1つです。

**3.** 4個です。

```text
strip-try.ts(2,11): error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
strip-try.ts(6,6): error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
strip-try.ts(13,15): error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
strip-try.ts(13,33): error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

（ターミナルでは `strip-try.ts:2:11 - error TS1294: …` の形で、色付きで出ます。）

引数のプロパティが `public x` と `public y` の2つあり、それぞれがエラーになるので、合わせて4個です。エラーを出しているのは `tsconfig.base.json` の `erasableSyntaxOnly: true`（「消すだけで JavaScript になる書き方」だけを許す）です。これがあるので、`node` で動かす前に、tsc（とエディタ）が教えてくれます。

**4.** 例えば、次のように書き直せます。

```ts
const Util = {
  twice: (n: number): number => n * 2,
};

const SIZES = ['S', 'M', 'L'] as const;
type Size = (typeof SIZES)[number]; // 'S' | 'M' | 'L'

class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

const p = new Point(1, 2);
const m: Size = 'M';
console.log(Util.twice(21), SIZES.indexOf(m), SIZES[2], p.x + p.y); // 42 1 L 3
```

- namespace → ふつうのオブジェクト（または、別のファイルのモジュールにして `import`）。
- enum → リテラル型のユニオン（第35章 7.4節）。番号も要るなら、`as const` の配列の位置を使います（第36章 7節）。
- 引数のプロパティ → クラスの本体に項目を書き、コンストラクタで代入します（第36章 8.2節）。

## 問題5 メモリのリポジトリ

```ts
export function createMemoryTaskRepo(now: () => Date = () => new Date()): TaskRepo {
  const tasks = new Map<number, Task>();
  let nextId = 1;
  const copy = (t: Task): Task => ({ ...t });

  return {
    async list(filter = {}) {
      return [...tasks.values()]
        .filter((t) => filter.status === undefined || t.status === filter.status)
        .filter((t) => filter.dueBefore === undefined || (t.dueDate !== null && t.dueDate < filter.dueBefore))
        .toSorted((a, b) => a.id - b.id)
        .map(copy);
    },
    // get・create・update・remove は solutions/memory-repo.ts
  };
}
```

- 戻り値の型に `TaskRepo` と書いたので、`list(filter = {})`・`get(id)`・`update(id, patch, options = {})` の引数に型を書かなくても、`TaskRepo` から推論されます（本文4.2節）。
- `copy` で写しを返すのは、`Map` の中のオブジェクトをそのまま返すと、呼んだ側の `t.title = …` で中のデータまで変わってしまうからです。PostgreSQL の版では、毎回新しいオブジェクトが来るので、この問題は起きません。実装を入れ替えても同じ動きになるように、メモリの版でも写します。
- `t.dueDate !== null && t.dueDate < filter.dueBefore` の `!== null` は、型のためにも要ります。`string | null` のままでは `<` で比べられません。
- `update` は、`patch.title !== undefined` のように1つずつ確かめます。`{ ...current, ...patch }` と書くと短くなりますが、`{ title: undefined }` のように undefined がはっきり入った patch が来ると、題名を undefined にしてしまいます。

## 問題6 PostgreSQL のリポジトリ

```ts
export type TaskRow = {
  id: number;
  title: string;
  status: Status;
  due_date: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
};
```

- `db.query<TaskRow>(…)` の `TaskRow` は、tsc が**信じるだけ**で、本当にこの形の行が来るかは確かめません（本文4.3節）。列の名前を書き間違えても、tsc は気づきません。境界で確かめる方法は第38章で学びます。
- `list` と `update` は、条件や SET を配列に集めてから `join` します。値は `values.push(値)` してから `$${values.length}` で番号を書くので、番号がずれません。
- `update` の列の名前は、`COLUMNS = { title: 'title', status: 'status', dueDate: 'due_date' } as const` の許可リスト（第6部 第31章）から取ります。SQL の文字列に入るのは、このリストの列の名前と `$番号` だけで、利用者が送った値は入りません。
- `const PATCH_KEYS = ['title', 'status', 'dueDate'] as const;` で回すと、`patch[key]` の `key` が `'title' | 'status' | 'dueDate'` の型になり、`COLUMNS[key]` も `patch[key]` も型が付きます（`Object.keys(patch)` だと `string[]` になり、使えません）。
- `remove` は、`(rowCount ?? 0) > 0` です。pg の型では `rowCount` が `number | null` なので、`null` のときの値を決めておきます。
- `pg-repo.check.ts` が通るのは、`pg.Pool` と `pg.PoolClient` の `query` が、`Queryable` の形を満たしているからです。`createPgTaskRepo(pool: pg.Pool)` と書くと、トランザクションの `client` を渡せなくなります。「使うものだけ」を interface にしておくと、テストで偽物も渡せます。

## 問題7 ESLint が見つけたバグを直す

| 関数 | ESLint のエラー | 直し方 |
| --- | --- | --- |
| `sendAll` | `no-misused-promises`（`forEach` に async 関数） | `for (const m of messages) { await send(m); sent += 1; }` |
| `loadAll` | `no-floating-promises`（`then` だけで待っていない） | `return Promise.all(ids.map((id) => load(id)));` |
| `every` | `no-misused-promises`（`setInterval` に Promise を返す関数）、`no-unused-vars`（`onError` を使っていない） | `setInterval(() => { job().catch(onError); }, ms)` |
| `valueOf` | `no-explicit-any`・`no-unsafe-assignment`・`no-unsafe-member-access`・`no-unsafe-return` | `unknown` に入れて、`typeof data === 'object' && data !== null && 'value' in data && typeof data.value === 'string'` で絞り込む |

- `sendAll` の元のコードは、`send` を1つも待たずに `0` を返し、失敗はだれも受け取りません。`Promise.all(messages.map(send))` でも全部待てますが、問題は「1つずつ順番に」なので `for … of` です。
- `loadAll` の元のコードは、待っていないので空の配列を返します。仮に待ったとしても、`push` は**終わった順**なので、ids の順になりません。`Promise.all` の結果は、渡した順に並びます。
- `every` の `() => { job().catch(onError); }` は、`{}` で囲んで何も返さないので、`setInterval` の「void を返す関数」に合います。
- ESLint の8つのエラーのうち、`onError` を使っていないエラーは、`every` のバグ（失敗を渡していない）をそのまま指していました。

## 問題8 型の付いた API（problem+json・If-Match）

```ts
export class HttpProblem extends Error {
  readonly status: number;
  readonly errors: FieldError[] | undefined;
  constructor(status: number, detail: string, errors?: FieldError[]) { … }
}

const problemHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  let problem: HttpProblem;
  if (err instanceof HttpProblem) problem = err;
  else if (err instanceof SyntaxError && 'status' in err && err.status === 400) problem = new HttpProblem(400, 'JSON として読めません');
  else {
    console.error(err);
    problem = new HttpProblem(500, 'サーバでエラーが起きました');
  }
  res.status(problem.status).type('application/problem+json').json({ type: 'about:blank', title: TITLES[problem.status] ?? 'Error', … });
};
```

- ハンドラの中では、エラーを全部 `throw new HttpProblem(…)` にして、応答の形は `problemHandler` の1か所で決めます。Express 5 は async のハンドラが throw したエラーをエラーのミドルウェアに渡すので（本文5.1節）、`try … catch` は要りません。
- `err` は `unknown` なので、`instanceof` と `in` で絞り込んでから使います。最後の `else` に来るのは「思っていなかったエラー」なので、中身は `console.error` にだけ書き、応答には決まった文を返します。
- ボディの確かめ（`parseFields(body, mode)`）は、問題2と同じく間違いを `errors` に集めて、最後にまとめて `throw` します。`mode` を `'create' | 'patch'` にして、POST と PATCH で1つの関数を使っています。
- `parseFields` の戻り値の型は `TaskPatch`（`title?`）です。POST では title があることを確かめていますが、型には表れません。そこで、`if (fields.title === undefined) throw …` をもう一度書いて、`NewTask`（`title` が必須）を組み立て直しています。「確かめたこと」を型に残す方法（Zod の `z.infer`）は、第38章で学びます。
- PATCH は、`repo.update` が `null` を返したら `repo.get(id)` で「無い」（404）か「版が違う」（412）かを分けます。
- `If-Match` は `/^"(\d+)"$/` で読みます。`m[1]` は `string | undefined`（`noUncheckedIndexedAccess`）なので、`undefined` のときも 412 にしています。
