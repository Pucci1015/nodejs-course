# 第38章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part07/ch38-ts-runtime/exercises` で実行） |
| --- | --- | --- |
| 1 | [schemas.ts](schemas.ts) | `MODULE=../solutions/schemas.ts node --test schemas.test.ts` |
| 2 | [config.ts](config.ts) | `MODULE=../solutions/config.ts node --test config.test.ts` |
| 3 | [query.ts](query.ts) | `MODULE=../solutions/query.ts node --test query.test.ts` |
| 4 | このページ | — |
| 5 | [problem.ts](problem.ts) | `MODULE=../solutions/problem.ts node --test problem.test.ts` |
| 6 | [route.ts](route.ts) | `MODULE=../solutions/route.ts node --test route.test.ts` |
| 7 | [client.ts](client.ts) | `MODULE=../solutions/client.ts node --test client.test.ts` |
| 8 | [app.ts](app.ts) | `MODULE=../solutions/app.ts node --test app.test.ts` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。`task-repo.ts`・`fake-repo.ts`・`○○.check.ts`・`typecheck.ts`・`type-assert.ts` は `exercises/` と同じものです。

解答のコードが長い問題は、このページには要点だけを書きます。全体は、それぞれのファイルを読んでください。

---

## 問題1 タスクのスキーマと型

```ts
export const NewTask = z.strictObject({
  title: z.string().trim().min(1).max(100),
  status: Status.default('todo'),
  dueDate: z.iso.date().nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(20)).max(5).default([]),
});

export const TaskPatch = z
  .strictObject({
    title: z.string().trim().min(1).max(100).optional(),
    status: Status.optional(),
    dueDate: z.iso.date().nullable().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, { error: '変える項目が1つもありません' });

export type NewTaskInput = z.input<typeof NewTask>;
export type NewTask = z.output<typeof NewTask>;
export type TaskPatch = z.infer<typeof TaskPatch>;
```

- `z.array(…).max(5)` は配列の長さ、`z.string().max(20)` は1つ1つの文字列の長さです。書く場所で意味が変わります。
- `TaskPatch` の `dueDate` は `.nullable().optional()` です。「無い」（変えない）と「`null`」（締め切りを消す）は、別の意味です。`nullish()` でも同じ型になりますが、2つの意味を分けて書いた方が読みやすくなります。
- `TaskPatch` に `default` を書いてはいけません。`status: Status.default('todo')` と書くと、PATCH で status を送らなかったときに、`todo` に戻してしまいます。
- `refine` は、ほかの項目が全部通った後で動きます（本文6節）。`{}` は項目が全部通るので、`refine` まで来て間違いになります。

## 問題2 環境変数を Zod で読む

```ts
const blank = (v: unknown) => (v === '' ? undefined : v);

const Env = z
  .object({
    PORT: z.preprocess(blank, z.string().regex(/^[0-9]{1,5}$/).transform(Number).pipe(z.number().min(1).max(65535)).default(9480)),
    HOST: z.preprocess(blank, z.string().default('127.0.0.1')),
    // LOG_LEVEL・NODE_ENV・DATABASE_URL は solutions/config.ts
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.DATABASE_URL !== undefined, { path: ['DATABASE_URL'], error: 'production では必須です' })
  .transform((env) => ({ port: env.PORT, host: env.HOST, /* … */ databaseUrl: env.DATABASE_URL ?? null }));

export type Config = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const result = Env.safeParse(env);
  if (result.success) return result.data;
  const names = result.error.issues.map((issue) => issue.path.join('.'));
  throw new ConfigError([...new Set(names)]);
}
```

- 第37章の練習問題2では、型ガードを2つ、`if` を5つほど書きました。Zod では、環境変数1つにつき1行です。しかも `Config` の型を手で書いていないので、項目を足すときに直す所は1か所です。
- `[...new Set(names)]` は、同じ名前を1回にまとめる書き方です（`Set` は同じ値を1つしか持たない）。1つの環境変数について、いくつかの決まりが間違いを出しても、名前は1回だけにするためです。
- `'1.5'`・`'-1'`・`'80 '` は、`regex(/^[0-9]{1,5}$/)` の時点で間違いになります。数字だけの文字列であることを先に確かめているので、`Number` が思わぬ値を作りません。

## 問題3 一覧のクエリを確かめる

```ts
const digits = (min: number, max: number) => z.string().regex(/^[0-9]{1,5}$/).transform(Number).pipe(z.number().min(min).max(max));

const ListQuerySchema = z.strictObject({
  status: z.enum(['todo', 'doing', 'done']).optional(),
  dueBefore: z.iso.date().optional(),
  limit: digits(1, 100).default(20),
  offset: digits(0, 10000).default(0),
});
```

- 同じ形のスキーマ（数字だけの文字列 → 範囲の決まった数）を、関数 `digits` で作っています。スキーマは値なので、関数で作れます。
- `?status=todo&status=done` の `status` は配列です。`z.enum` は文字列しか通さないので、何も書かなくても間違いになります。
- 知らない名前は、1つの issue（`code: 'unrecognized_keys'`）にまとまっています。`if (issue.code === 'unrecognized_keys')` で絞り込むと、`issue.keys` が `string[]` として使えます。issue の型は、`code` で見分けられる判別できるユニオンになっているからです（第36章 2節）。

## 問題4 Zod の動きを予想する（調べる問題）

```text
① {"name":"alice"}
② 間違い（unrecognized_keys）
③ [12,0,0,1000,16]
④ 間違い（invalid_type）
⑤ [true,true,true,false]
⑥ [true,false,false,true]
⑦ [20,5]
⑧ 間違い（invalid_type）
```

**1.** ①の `z.object` は、知らない項目（`admin`）を**黙って取り除きます**。②の `z.strictObject` は、知らない項目を間違いにします。API のボディには `strictObject` がよいでしょう。送る側の書き間違い（`titel`）や、送ってはいけない項目（`id`・`admin`）に気づけます（第5部 第25章 5.1節）。ただし、ほかのサービスの応答を読むとき（練習問題7）は `z.object` にします。相手が項目を足しただけで、こちらが壊れないようにするためです。

**2.** `z.coerce.number()` は `Number(値)` と同じです。`'12'` → 12 はよいとして、`''`（空）と `' '`（空白）は **0**、`'1e3'` は 1000、`'0x10'` は 16（16進数）になります。間違いになったのは、`Number('abc')` が `NaN` になる④だけです。クエリの `?limit=` を「送らなかった」つもりの空の値が、0 として通ってしまいます。数字だけの文字列を確かめてから数にする書き方（問題3）が安全です。

**3.** `'false'` と `'0'` です。`z.coerce.boolean()` は `Boolean(値)` と同じで、空でない文字列は全部 true です（⑤では `''` だけが false）。`z.stringbool()` は、`'false'`・`'0'`・`'no'`・`'off'` を false にし、決まった文字列以外は間違いにします。

**4.** ⑦の `undefined` だけです。`default` は「値が無い（`undefined`）とき」に使われます。`null` は「値が無い」ではなく「`null` という値がある」なので、`z.number()` の確かめに進み、数でないので間違いになります（⑧）。JSON で `"limit": null` と送られたときも、決まりの値にはなりません。

**5.** ⑨の `Opt` の型は、次のとおりです。

```ts
type Opt = {
  a?: string | undefined;         // optional(): 無くてよい（undefined）
  b: string | null;               // nullable(): null でよい。ただし項目は必須
  c?: string | null | undefined;  // nullish(): 無くても null でもよい
};
```

**6.** `LenIn` は `string`（入れてよい値）、`LenOut` は `number`（`transform` の後の値）です。`z.infer` は `z.output` と同じなので、`number` になります。

## 問題5 ZodError を problem+json にする

```ts
export function toPointer(path: readonly PropertyKey[]): string {
  return path.map((key) => `/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`).join('');
}

export function parseOrProblem<S extends z.ZodType>(schema: S, value: unknown, status: 400 | 422 = 422): Result<z.output<S>, Problem> {
  const result = schema.safeParse(value);
  return result.success ? { ok: true, value: result.data } : { ok: false, error: toProblem(result.error, status) };
}
```

- `~` を先に変えるのは、`/` を `~1` に変えた後で `~` を変えると、作ったばかりの `~1` の `~` まで `~0` にしてしまうからです（`'/'` → `'~1'` → `'~01'` になってしまう）。
- `issue.path` の型は `PropertyKey[]`（`string | number | symbol` の配列）です。`String(key)` で文字列にします。
- 知らない項目の pointer は `toPointer([...issue.path, key])` です。`issue.path` は「知らない項目を持っていたオブジェクト」の場所なので、その後ろに項目の名前を足します。
- `status: 400 | 422 = 422` と、リテラル型のユニオンに決まりの値を付けています。`500` を渡すと tsc のエラーになります。

## 問題6 型の付いたハンドラを作る route

```ts
type Out<S, K extends keyof Schemas> = S extends { [P in K]: infer T extends z.ZodType } ? z.output<T> : undefined;

export type Input<S extends Schemas> = { params: Out<S, 'params'>; query: Out<S, 'query'>; body: Out<S, 'body'> };
```

- `{ [P in K]: … }` は、マップ型（第36章 5.2節）で「キー `K` の項目を持つオブジェクト」を書いています。`K` が `'params'` なら `{ params: … }` です。3つの項目に同じ条件型を書かずに済むように、キーを引数にしました。ヒントの書き方を3回書いても正解です。
- 本体は、`[['params', 404, req.params], ['query', 400, req.query], ['body', 422, req.body]] as const` を回して、スキーマのあるものだけ `safeParse` します。だめなら problem+json を返して `return`、通れば `values[key] = result.data` で集めます。
- 最後に、集めた値を `as Input<S>` でハンドラに渡します。ここは、tsc に「`values.params` は `S` の params のスキーマを通した値だ」と追いかけさせるのが難しい所です。`as` は、ジェネリクスの部品の中の1か所だけに閉じ込めます。使う側（`route({ body: NewItem }, async ({ body }) => …)`）には `as` が無く、`body` に正しい型が付きます。第37章のテストの `as AddressInfo` と同じく、「自分の方が tsc より詳しいと言い切れる」使い方です。
- `route` が返すのは async の関数です。Express 5 は、ハンドラが返した Promise が reject されると、エラーのミドルウェアに渡します。ハンドラが投げたエラーを、自分で `try … catch` しなくても済みます。

## 問題7 応答を確かめるクライアント

```ts
async function read<S extends z.ZodType>(res: Response, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await res.json();
  } catch (err) {
    throw new UpstreamError('shape', res.status, '応答が JSON ではありません', { cause: err });
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new UpstreamError('shape', res.status, '応答の形が違います', { cause: result.error });
  return result.data;
}

function fail(res: Response): never {
  throw new UpstreamError('status', res.status, `${res.status} が返りました`);
}
```

- `send`（`fetchFn` を呼び、投げたら `'network'`）・`read`（確かめる）・`fail`（`'status'`）の3つの部品を作り、3つのメソッドはそれを組み合わせるだけにしました。
- `read` も、本文4節の `parse` と同じ形のジェネリクスです。`read(res, Task)` は `Task`、`read(res, z.array(Task))` は `Task[]` を返します。
- `fail` の戻り値は `never`（必ず投げる）です。`if (!res.ok) fail(res);` の後ろは「`res.ok` が true のときだけ来る」と tsc に分かります。
- `createTaskClient` の戻り値の型は書いていません。返すオブジェクトから推論されます。メソッドの戻り値の型（`Promise<Task | null>` など）は書いておくと、`client.check.ts` の要件がそのまま読めます。

## 問題8 Zod で書く API

第37章の模範解答と比べて、変わった所だけを書きます。

```ts
/** 外に出すタスクの形。知らない項目は取り除く */
const TaskOut = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(100),
  status: Status,
  dueDate: DueDate,
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});
const out = (value: unknown): TaskOut => TaskOut.parse(value);

app.get('/api/tasks', async (req: Request, res: Response<TaskOut[]>) => {
  const { limit, offset, ...filter } = parseQuery(ListQuery, req.query);
  const tasks = await repo.list(filter);
  res.json(tasks.slice(offset, offset + limit).map(out));
});
```

- 第37章の `parseFields`（型ガードと `if` で約30行）が、`NewTask`・`TaskPatch` のスキーマの数行になりました。POST で「title がある」ことも `NewTask` の型（`z.output`）に残るので、第37章でしていた「`fields.title === undefined` をもう一度確かめて組み立て直す」も要りません。
- `const { limit, offset, ...filter } = …` は、`limit` と `offset` を取り出し、残りを `filter` に集める書き方です（第3部 第11章の分割代入と残り）。`filter` の型は `{ status?: …; dueBefore?: string }` になり、そのまま `repo.list` に渡せます。
- 出ていくデータは、全部 `out` を通します。`TaskOut.parse` は `z.object` なので、知らない項目（`internalNote`）を取り除きます。題名が空のような「作れないはずの値」は `ZodError` を投げ、エラーのミドルウェアの「思っていなかったエラー」として 500 になります。`ZodError` の中身はログにだけ書きます。
- `parseBody`（422・`pointer`）と `parseQuery`（400・`parameter`）は、問題5の `toProblem` と同じ考え方です。2つの違いは、`errors` の項目の名前（`pointer` と `parameter`）と、状態コードだけです。
