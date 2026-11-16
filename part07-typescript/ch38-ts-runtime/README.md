# 第38章 型と実行時の境界

TypeScript の型は、tsc が確かめた後、**消えます**（第35章 1節）。動いているプログラムの中には、型はありません。そのため、外から来たデータ（リクエストのボディ・クエリ・環境変数・ほかのサービスの応答・ファイル）は、型を付けても守れません。「この形のはず」と書くだけで、だれも確かめていないからです。
この章では、外とつながる所（**境界**）で Zod を使って確かめ、確かめた後の値にだけ型を付ける書き方を学びます。Zod は第5部 第25章で使いました。この章では、Zod の**スキーマから型を作る**ことで、「実行時の確かめ」と「tsc の型」を1か所にまとめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第35〜37章、第5部 第25章（Zod・problem+json）・第26章（設定） |
| この章のゴール | 型が実行時に無いことと、`as` が何も確かめないことを説明できる / Zod のスキーマから `z.infer`・`z.input`・`z.output` で型を作れる / 境界がどこかを挙げ、境界で確かめた値だけを中に入れられる / ジェネリクスで「スキーマを渡すと、確かめた後の型が返る」関数を書ける / 環境変数・ほかのサービスの応答を Zod で確かめられる / ブランド型で、同じ number の取り違えを防げる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形 |
| [exercises/](exercises/) | 練習問題（テストで型も確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part07/ch38-ts-runtime/` で実行します。手を動かして作るファイルは、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part07/ch38-ts-runtime
>   ```
>
> - 4節でポート **9480**、5節でポート **9481** を使います。
> - Zod の書き方（`z.object`・`safeParse`・`strictObject`・`z.config(z.locales.ja())`）は、第5部 第25章 5節のとおりです。忘れていたら、先に読み返してください。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| スキーマから型を作る（2節） | 成果物（一覧のクエリの型 `ListQuery` をスキーマから作る）、第8部（フォームの入力の型）、第9部（Server Actions の入力） |
| 境界で確かめる（3〜5節） | 成果物、第8部（API の応答を確かめる）、第10部（トークンの中身・外の認証サービスの応答） |
| `parse` のジェネリクス（4節） | 成果物の「もっとやるなら」（ルートを `route(schemas, handler)` の形にする）、第9部 |
| 環境変数（6節） | 成果物（`loadConfig`）、第12部（本番の設定） |
| ブランド型（7節） | 成果物の「もっとやるなら」（`TaskId`）、第10部（`UserId` と取り違えない） |
| 1つのスキーマから JSON Schema（8節） | 第8部（サーバとブラウザでスキーマを共有する）、第13部 |

---

## 1. 型は実行時には無い

### 1.1 手を動かす: as は何も確かめない

`lie.ts` を作ります。

```ts
type Task = { id: number; title: string; tags: string[] };

// 外から来た JSON（ファイル・リクエストのボディ・ほかの API の応答）だと思ってください
const text = '{"id": "7", "title": "牛乳を買う"}';

const task = JSON.parse(text) as Task; // tsc は信じる。Node.js は型を消すだけ

console.log(task.id + 1); // number のつもりが、文字列の "7" + 1
console.log(task.title.toUpperCase());
console.log(task.tags.length); // tags は無い。ここで TypeError
```

```sh
$ npx tsc
$ node lie.ts
71
牛乳を買う
file:///Users/alice/dev/part07/ch38-ts-runtime/lie.ts:10
console.log(task.tags.length); // tags は無い。ここで TypeError
                      ^

TypeError: Cannot read properties of undefined (reading 'length')
```

- `npx tsc` は、エラーを出しません。`as Task` と書いたので、tsc は「`task` は `Task` だ」と信じます（第35章 6節）。
- 動かすと、`task.id + 1` は `8` ではなく `71`（文字列の `"7"` と `1` をつないだもの）です。`tags` は無いので、`task.tags.length` で TypeError になります。
- **間違いが見つかる場所が、データが入ってきた場所（`JSON.parse`）ではなく、使った場所（10行目）**です。本当のプログラムでは、使う場所はずっと後の、別のファイルかもしれません。何が悪かったのかを探すのが大変になります。

`JSON.parse` の戻り値は `any` です（第35章 6節）。`as` を書かなくても、`const task: Task = JSON.parse(text);` で同じことが起きます。Express の `req.body` も any でした（第37章 5.1節）。

### 1.2 境界で確かめ、中では型を信じる

外から来たデータを、そのまま型の付いた変数に入れてはいけません。

```text
 外（形が分からない）          境界                    中（型を信じてよい）
 リクエストのボディ  ──→  Zod で確かめる  ──→  Task 型の値だけが入る
 環境変数            ──→  だめなら、ここで止める
 ほかのサービスの応答
```

- 境界で**1回**確かめれば、中の関数は、型を信じて書けます。中の関数ごとに `if (typeof task.id !== 'number')` と確かめ直す必要はありません。
- 確かめた結果は、`boolean`（合っているか）ではなく、**確かめた後の値**として受け取ります。Zod の `parse` が返すのは、型の付いた新しい値です。この考え方は「Parse, don't validate（確かめるだけでなく、型の付いた値に変える）」と呼ばれます。第36章の型ガードも、確かめた結果を型に残す道具でした。

## 2. スキーマから型を作る

### 2.1 手を動かす: z.infer

第5部では、Zod のスキーマを JavaScript で書きました。TypeScript では、スキーマから**型を取り出せます**。`infer.ts` を作ります。

```ts
import { z } from 'zod';

z.config(z.locales.ja()); // 間違いの文を日本語にする（第5部 第25章）

// スキーマ（実行時に確かめるもの）を1回だけ書く
export const Status = z.enum(['todo', 'doing', 'done']);
export const Task = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(100),
  status: Status,
  dueDate: z.iso.date().nullable(), // 'YYYY-MM-DD' か null
  tags: z.array(z.string()),
});

// 型は、スキーマから取り出す（同じ名前でよい。値と型は別の世界なので、ぶつからない）
export type Status = z.infer<typeof Status>; // 'todo' | 'doing' | 'done'
export type Task = z.infer<typeof Task>;

const text = '{"id": 7, "title": "牛乳を買う", "status": "todo", "dueDate": null, "tags": ["家"]}';
const task: Task = Task.parse(JSON.parse(text)); // 形が違えば ZodError を投げる。通れば Task
console.log(task.tags.length);

const bad = Task.safeParse(JSON.parse('{"id": "7", "title": "牛乳を買う"}'));
if (!bad.success) console.log(z.prettifyError(bad.error));

// 入る型と出る型が違うスキーマ: default と transform
export const NewTask = z.object({
  title: z.string().trim().min(1).max(100),
  status: Status.default('todo'),
  tags: z.array(z.string()).default([]),
  dueDate: z.iso.date().nullable().default(null),
});
export type NewTaskInput = z.input<typeof NewTask>; // 送る側: status・tags・dueDate は省略できる
export type NewTask = z.output<typeof NewTask>; // 確かめた後: 全部そろっている（z.infer と同じ）

const input: NewTaskInput = { title: '  本を返す ' };
const created: NewTask = NewTask.parse(input);
console.log(created);
```

```sh
$ npx tsc
$ node infer.ts
1
✖ 無効な入力: 数値が期待されましたが、stringが入力されました
  → at id
✖ 無効な選択: "todo"、"doing"、"done"のいずれかである必要があります
  → at status
✖ 無効な入力: stringが期待されましたが、undefinedが入力されました
  → at dueDate
✖ 無効な入力: 配列が期待されましたが、undefinedが入力されました
  → at tags
{ title: '本を返す', status: 'todo', tags: [], dueDate: null }
```

| 書き方 | 意味 |
| --- | --- |
| `z.infer<typeof Task>` | スキーマ `Task` が「通した後に返す値」の型。`typeof Task` は「値 `Task` の型」（第36章 7節） |
| `export const Task = …` と `export type Task = …` | 値（スキーマ）と型に同じ名前を付けてよい。値の世界と型の世界は別なので、ぶつからない。使う側は `import { Task }` の1つで両方を受け取れる |
| `Task.parse(値)` | 合えば、型の付いた値を返す。合わなければ `ZodError` を投げる |
| `Task.safeParse(値)` | 投げずに `{ success: true, data }` か `{ success: false, error }` を返す。`success` で絞り込むと `data` か `error` が使える（第36章 2節の判別できるユニオン） |
| `z.prettifyError(error)` | `ZodError` を、人が読みやすい文にする |

エディタで `Task` の型（`export type Task` の `Task`）の上にマウスを置くと、次のように見えます。

```ts
type Task = {
  id: number;
  title: string;
  status: "todo" | "doing" | "done";
  dueDate: string | null;
  tags: string[];
}
```

**型を2回書かない**のが、この書き方の一番の利点です。型（`type Task = { … }`）とスキーマ（`z.object({ … })`）を別々に書くと、項目を足すときに片方を忘れ、「tsc は通るのに、実行時に確かめていない」ずれが生まれます。スキーマを元にすれば、ずれようがありません。

### 2.2 入る型と出る型: z.input と z.output

`default` や `trim`・`transform`（第5部 第25章）を使うと、スキーマに**入れてよい値**と、**出てくる値**の形が変わります。

| 型 | `NewTask` の場合 | 使う場面 |
| --- | --- | --- |
| `z.input<typeof NewTask>` | `{ title: string; status?: …; tags?: string[]; dueDate?: string \| null }` | 送る側（API を呼ぶ側、フォーム）が作る値の型 |
| `z.output<typeof NewTask>` | `{ title: string; status: …; tags: string[]; dueDate: string \| null }` | 確かめた後の値の型。`z.infer` と同じ |

`infer.ts` の最後では、`title` だけの `input` を `NewTask.parse` に通すと、決まりの値で全部がそろった値が返っています。型も、その動きのとおりに変わります。

## 3. 境界はどこか

境界は、「自分のプログラムの外から値が入ってくる所」です。

| 境界 | 入ってくる値 | 型 | この教材で確かめる所 |
| --- | --- | --- | --- |
| リクエストのボディ | `req.body` | any | 4節、練習問題6・8 |
| クエリ・パスの引数 | `req.query`・`req.params` | 文字列か、その配列 | 4節、練習問題3 |
| 環境変数 | `process.env` | `string \| undefined` | 6節、練習問題2 |
| ほかのサービスの応答 | `await res.json()` | unknown | 5節、練習問題7 |
| ファイル・JSON の文字列 | `JSON.parse(…)` | any | 1節、練習問題4 |
| データベースの行 | `pool.query<Row>(…)` の `rows` | 書いた `Row` を信じるだけ | 下の表 |
| ブラウザの保存先・URL | `localStorage`・`location.search` | 文字列 | 第8部 |

データベースは、自分で作った表なので、ほかの境界ほど危なくはありません。ただし、`pool.query<TaskRow>` の `TaskRow` は tsc が信じるだけで、だれも確かめていません（第37章 4.3節）。列の名前を変えたのにコードを直し忘れると、ずれます。どこまで確かめるかは、次のように決めます。

| データの出どころ | 確かめ方 |
| --- | --- |
| 利用者・ほかのサービス（信じられない） | いつも Zod で確かめる。だめなら 400・422 などで断る |
| 自分の表（だいたい信じられる） | 型を書くだけにするか、行を Zod で確かめる。確かめて合わなければ、それはこちらのバグなので 500 |
| ORM が型を作る（第6部 第33章の Drizzle） | 表の定義から型が作られるので、ずれにくい |

出ていくデータも、確かめることがあります。データの層が返したオブジェクトをそのまま `res.json` すると、外に出してはいけない項目（内部のメモ・パスワードのハッシュなど）まで出てしまいます。出す形をスキーマにして通すと、知らない項目は取り除かれます（`z.object` は知らない項目を取り除く。第5部 第25章 5.1節）。練習問題8で書きます。

## 4. Express の境界で確かめる

### 4.1 手を動かす: スキーマを渡すと、確かめた後の型が返る

`api.ts` を作ります。

```ts
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import { z } from 'zod';

z.config(z.locales.ja());

// ---- スキーマと型（1か所に書く） ----
const Status = z.enum(['todo', 'doing', 'done']);
const NewTask = z.strictObject({
  title: z.string().trim().min(1).max(100),
  status: Status.default('todo'),
});
const ListQuery = z.strictObject({
  status: Status.optional(),
  // クエリは文字列で届く。数字だけの文字列か確かめてから数にする（第5部 第25章 5.2節）
  limit: z.string().regex(/^[0-9]{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
});
const IdParams = z.object({ id: z.string().regex(/^[1-9][0-9]{0,8}$/).transform(Number) });

type Task = { id: number; title: string; status: z.infer<typeof Status>; createdAt: string };

// ---- problem+json のエラー（第5部 第25章） ----
type FieldError = { pointer: string; detail: string };
const TITLES: Record<number, string> = { 400: 'Bad Request', 404: 'Not Found', 422: 'Unprocessable Content', 500: 'Internal Server Error' };

class HttpProblem extends Error {
  readonly status: number;
  readonly errors: FieldError[] | undefined;
  constructor(status: number, detail: string, errors?: FieldError[]) {
    super(detail);
    this.status = status;
    this.errors = errors;
  }
}

/** schema で value を確かめる。だめなら status の HttpProblem を投げる。通れば、確かめた後の型の値を返す */
function parse<S extends z.ZodType>(schema: S, value: unknown, status: number): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const errors = result.error.issues.map((issue) => ({
    pointer: issue.path.map((p) => `/${String(p)}`).join(''),
    detail: issue.message,
  }));
  throw new HttpProblem(status, '入力が正しくありません', errors);
}

// ---- アプリ ----
export function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  const tasks: Task[] = [];
  let nextId = 1;

  app.get('/api/tasks', (req: Request, res: Response<Task[]>) => {
    const query = parse(ListQuery, req.query, 400); // { status?: 'todo' | 'doing' | 'done'; limit: number }
    const found = tasks.filter((t) => query.status === undefined || t.status === query.status);
    res.json(found.slice(0, query.limit));
  });

  app.get('/api/tasks/:id', (req: Request, res: Response<Task>) => {
    const params = IdParams.safeParse(req.params); // 形が違う id は「無い」と同じ 404 にする
    if (!params.success) throw new HttpProblem(404, 'タスクが見つかりません');
    const task = tasks.find((t) => t.id === params.data.id); // params.data.id: number
    if (task === undefined) throw new HttpProblem(404, 'タスクが見つかりません');
    res.json(task);
  });

  app.post('/api/tasks', (req: Request, res: Response<Task>) => {
    const input = parse(NewTask, req.body, 422); // req.body は any。input は { title: string; status: … }
    const task: Task = { id: nextId++, ...input, createdAt: new Date().toISOString() };
    tasks.push(task);
    res.status(201).location(`/api/tasks/${task.id}`).json(task);
  });

  const onError: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
    let problem: HttpProblem;
    if (err instanceof HttpProblem) problem = err;
    else if (err instanceof SyntaxError && 'status' in err && err.status === 400) problem = new HttpProblem(400, 'JSON として読めません');
    else problem = new HttpProblem(500, 'サーバでエラーが起きました');
    if (problem.status === 500) console.error(err);
    res
      .status(problem.status)
      .type('application/problem+json')
      .json({ type: 'about:blank', title: TITLES[problem.status], status: problem.status, detail: problem.message, errors: problem.errors });
  };
  app.use(onError);
  return app;
}

if (import.meta.main) {
  const port = 9480;
  createApp().listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/api/tasks で待っています`));
}
```

一番大事なのは、`parse` 関数の型です。

```ts
function parse<S extends z.ZodType>(schema: S, value: unknown, status: number): z.output<S>
```

| 部分 | 意味 |
| --- | --- |
| `<S extends z.ZodType>` | `S` は「何かの Zod のスキーマの型」（第36章 4節のジェネリクスと制約） |
| `schema: S` | 渡したスキーマから、`S` が推論される。`parse(NewTask, …)` なら `S` は `typeof NewTask` |
| `value: unknown` | 何でも受け取る。確かめる前なので unknown |
| `: z.output<S>` | 戻り値は「`S` が通した後の型」。`parse(NewTask, req.body, 422)` の戻り値は `{ title: string; status: … }` |

これで、ハンドラの中では、**`req.body`（any）を直接使わず、`parse` が返した値だけを使えば**、全部に型が付きます。`input.titel` と書き間違えれば、tsc のエラーになります。

| ハンドラ | 確かめるもの | だめなとき |
| --- | --- | --- |
| `GET /api/tasks` | `req.query`（`status`・`limit`。知らない名前は断る） | 400 |
| `GET /api/tasks/:id` | `req.params.id`（1 以上の整数の形） | 404（形の違う id は「無い」と同じ） |
| `POST /api/tasks` | `req.body` | 422 |

- エラーの形は、第5部 第25章の problem+json です。`errors[].pointer` は、間違いの場所を `/title` のような形で指します（JSON Pointer。`issue.path` の `['tags', 1]` なら `/tags/1`）。
- `if (import.meta.main)` は、「このファイルを `node api.ts` で直接動かしたときだけ」という意味です（第35章 練習問題8）。テストから `import` したときは、サーバを起動しません。

### 4.2 手を動かす: 動かす

```sh
$ node api.ts
http://127.0.0.1:9480/api/tasks で待っています
```

別のターミナルで試します。

```sh
$ curl -s -X POST -H 'content-type: application/json' -d '{"title":"  牛乳を買う "}' http://127.0.0.1:9480/api/tasks
{"id":1,"title":"牛乳を買う","status":"todo","createdAt":"2026-11-11T13:11:24.410Z"}
$ curl -s -X POST -H 'content-type: application/json' -d '{"title":"","status":"waiting","id":5}' http://127.0.0.1:9480/api/tasks
{"type":"about:blank","title":"Unprocessable Content","status":422,"detail":"入力が正しくありません","errors":[{"pointer":"/title","detail":"小さすぎる値: stringは1文字以上である必要があります"},{"pointer":"/status","detail":"無効な選択: \"todo\"、\"doing\"、\"done\"のいずれかである必要があります"},{"pointer":"","detail":"認識されていないキー: \"id\""}]}
$ curl -s 'http://127.0.0.1:9480/api/tasks?limit=0&sort=id'
{"type":"about:blank","title":"Bad Request","status":400,"detail":"入力が正しくありません","errors":[{"pointer":"/limit","detail":"小さすぎる値: numberは1以上である必要があります"},{"pointer":"","detail":"認識されていないキー: \"sort\""}]}
$ curl -s http://127.0.0.1:9480/api/tasks/abc
{"type":"about:blank","title":"Not Found","status":404,"detail":"タスクが見つかりません"}
```

- `-s` は、進み具合を出さない curl のオプションです（第2部 第6章）。`-X POST` はメソッド、`-H` はヘッダ、`-d` はボディです。
- 知らない項目（`id`・`sort`）の間違いは、`pointer` が `""`（ボディ全体）になっています。どの項目かを `pointer` で指すように直すのは、練習問題5です。

止めるときは Ctrl+C です。

> **ミドルウェアにしないのはなぜか**: 第5部 第25章 5.3節では、`validate(schema)` をミドルウェアにして、確かめた値を `req.body` に入れ直しました。TypeScript では、ミドルウェアが `req.body` を入れ直しても、**次のハンドラの `req.body` の型は any のまま**です（Express の型は、前のミドルウェアが何をしたかを知りません）。そこで、ハンドラの中で `parse` を呼んで、戻り値で型を受け取ります。ハンドラ全体を包んで型を付ける書き方（`route(スキーマ, ハンドラ)`）は、練習問題6で書きます。

### 4.3 手を動かす: 条件で型を選ぶ（条件型と infer）

練習問題6では、「スキーマがあれば、それを通した後の型。無ければ undefined」という型を作ります。そのための書き方を見ておきます。`conditional.ts` を作ります。

```ts
import { z } from 'zod';

// T が配列なら、その要素の型。そうでなければ never
type ElementOf<T> = T extends (infer E)[] ? E : never;
const a: ElementOf<string[]> = 'ねこ'; // string
const b: ElementOf<{ id: number }[]> = { id: 1 }; // { id: number }
// @ts-expect-error ElementOf<number> は never なので、何も入れられない
const c: ElementOf<number> = 1;

// オブジェクトに body という項目があり、それが Zod のスキーマなら、通した後の型。無ければ undefined
type BodyOf<S> = S extends { body: infer B extends z.ZodType } ? z.output<B> : undefined;
const d: BodyOf<{ body: z.ZodString }> = 'こんにちは'; // string
const e: BodyOf<{ query: z.ZodString }> = undefined; // body が無いので undefined

console.log(a, b, c, d, e);
```

```sh
$ npx tsc
$ node conditional.ts
ねこ { id: 1 } 1 こんにちは undefined
```

| 書き方 | 意味 |
| --- | --- |
| `T extends X ? A : B` | **条件型**（conditional type）。`T` が `X` の形に合えば `A`、合わなければ `B`。型の上の if（三項演算子）です |
| `infer E` | `extends` の右側の中でだけ書ける。「ここに来る型を `E` と呼ぶ」と、合わせた型の一部を取り出す |
| `infer B extends z.ZodType` | 取り出した型が `z.ZodType` であることも、合わせて確かめる |
| `never` | 「値が1つも無い型」。何も入れられない |

- `ElementOf<string[]>` は、`string[]` が `(infer E)[]` の形に合い、`E` が `string` になるので、`string` です。
- `BodyOf<{ query: z.ZodString }>` は、`body` の項目が無いので形に合わず、`undefined` になります。
- 実行すると、`@ts-expect-error` を付けた `c` にも `1` が入っています。型は実行時には何もしない、の例がもう1つ増えました。

条件型は、`z.infer`・`z.output` の中でも使われています（Zod の型定義の中を読む必要はありません）。

## 5. ほかのサービスの応答

### 5.1 手を動かす: fetch の応答を確かめる

ほかのサービス（別のチームの API、外の会社の API）の応答も、外から来たデータです。相手が仕様を変えたり、バグがあったりすると、思った形で返ってきません。`upstream.ts` を作ります。練習のために、このファイルの中で「ほかのサービス」の小さなサーバ（ポート 9481）も動かします。

```ts
import http from 'node:http';
import { z } from 'zod';

z.config(z.locales.ja());

// ---- 練習のための「ほかのチームのサービス」（ポート 9481）。2人目の id が、なぜか文字列で返ってくる ----
const upstream = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/users') res.end('[{"id": 1, "name": "alice"}, {"id": "2", "name": "bob"}]');
  else if (req.url === '/users/1') res.end('{"id": 1, "name": "alice"}');
  else {
    res.statusCode = 404;
    res.end('{"error": "not found"}');
  }
});
await new Promise<void>((resolve) => upstream.listen(9481, '127.0.0.1', resolve));

// ---- ここから、呼ぶ側のコード ----
const User = z.object({ id: z.number().int(), name: z.string() });
type User = z.infer<typeof User>;

/** ほかのサービスが、思った応答を返さなかった */
class UpstreamError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'UpstreamError';
  }
}

const BASE = 'http://127.0.0.1:9481';

async function getJson<S extends z.ZodType>(path: string, schema: S): Promise<z.output<S>> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new UpstreamError(`${path} が ${res.status} を返しました`);
  const body: unknown = await res.json(); // res.json() は Promise<unknown>。確かめるまで使えない
  const result = schema.safeParse(body);
  if (!result.success) throw new UpstreamError(`${path} の応答の形が違います`, { cause: result.error });
  return result.data;
}

const alice: User = await getJson('/users/1', User);
console.log('1人:', alice.name);

for (const path of ['/users', '/users/9']) {
  try {
    await getJson(path, z.array(User));
  } catch (err) {
    if (!(err instanceof UpstreamError)) throw err;
    console.log(err.message);
    if (err.cause instanceof z.ZodError) console.log(z.prettifyError(err.cause));
  }
}

upstream.close();
```

```sh
$ node upstream.ts
1人: alice
/users の応答の形が違います
✖ 無効な入力: 数値が期待されましたが、stringが入力されました
  → at [1].id
/users/9 が 404 を返しました
```

- `res.json()` の戻り値は `Promise<unknown>` です（第37章 5.1節。`req.body` と違って、any ではありません）。確かめるまで、中身を使えません。
- `getJson` も、4節の `parse` と同じ「スキーマを渡すと、確かめた後の型が返る」ジェネリクスです。`getJson('/users/1', User)` の戻り値は `User`、`getJson('/users', z.array(User))` は `User[]` です。
- 形が違うときは、自分で決めたエラー（`UpstreamError`）にして投げます。`{ cause: result.error }` は、元のエラー（`ZodError`）を `cause` として付けておく書き方です（第3部 第11章）。ログを見る人が、どこが違ったのかを調べられます。
- 相手が返した `ZodError` の中身（どの項目が違ったか）は、ログには書いてよいですが、自分の API の応答には入れません。相手のサービスの都合は、自分の API の利用者には関係ないからです。自分の API としては 502（Bad Gateway）などを返します。

## 6. 環境変数を確かめる

### 6.1 手を動かす: 設定の型もスキーマから

第37章の練習問題2では、環境変数を読む `loadConfig` を手で書きました。第5部 第26章では、Zod で書きました。ここでは、**`Config` の型もスキーマから作ります**。`env.ts` を作ります。

```ts
import { z } from 'zod';

z.config(z.locales.ja());

// 環境変数は、いつも文字列か、無い。空の文字列（PORT=）も「無い」と同じにする
const blankToUndefined = (v: unknown) => (v === '' ? undefined : v);

const Env = z
  .object({
    PORT: z.preprocess(blankToUndefined, z.string().regex(/^[0-9]{1,5}$/).transform(Number).pipe(z.number().min(1).max(65535)).default(9480)),
    LOG_LEVEL: z.preprocess(blankToUndefined, z.enum(['debug', 'info', 'warn', 'error']).default('info')),
    NODE_ENV: z.preprocess(blankToUndefined, z.enum(['development', 'test', 'production']).default('development')),
    DATABASE_URL: z.preprocess(blankToUndefined, z.string().optional()),
    FEATURE_SSE: z.preprocess(blankToUndefined, z.stringbool().default(false)), // 'true'・'1'・'yes'・'on' など
  })
  // 項目をまたぐ決まりは refine で書く
  .refine((env) => env.NODE_ENV !== 'production' || env.DATABASE_URL !== undefined, {
    path: ['DATABASE_URL'],
    error: 'production では必須です',
  })
  // アプリの中で使う形（camelCase）に変える
  .transform((env) => ({
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    env: env.NODE_ENV,
    databaseUrl: env.DATABASE_URL ?? null,
    featureSse: env.FEATURE_SSE,
  }));

export type Config = z.infer<typeof Env>;

export function loadConfig(source: NodeJS.ProcessEnv): Config {
  const result = Env.safeParse(source);
  if (result.success) return result.data;
  // 値そのものは書かない（パスワードが入っているかもしれない。第5部 第26章）
  const names = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`設定が正しくありません\n${names.join('\n')}`);
}

console.log(loadConfig(process.env));
```

```sh
$ node env.ts
{
  port: 9480,
  logLevel: 'info',
  env: 'development',
  databaseUrl: null,
  featureSse: false
}
$ PORT=8080 FEATURE_SSE=yes node env.ts
{
  port: 8080,
  logLevel: 'info',
  env: 'development',
  databaseUrl: null,
  featureSse: true
}
$ NODE_ENV=production node env.ts
（略）
Error: 設定が正しくありません
DATABASE_URL: production では必須です
（略）
$ PORT=abc NODE_ENV=production node env.ts
（略）
Error: 設定が正しくありません
PORT: 無効な文字列: パターン/^[0-9]{1,5}$/に一致する必要があります
（略）
```

| 書き方 | 意味 |
| --- | --- |
| `z.preprocess(関数, スキーマ)` | スキーマで確かめる**前に**、値を関数で変える。ここでは `''` を `undefined` にして、`default` が効くようにしている |
| `z.stringbool()` | `'true'`・`'1'`・`'yes'`・`'on'` を true、`'false'`・`'0'`・`'no'`・`'off'` を false にする。ほかの文字列は間違い |
| `.refine(関数, { path, error })` | 項目をまたぐ決まり。関数が false を返したら、`path` の項目の間違いにする |
| `.transform(関数)` | 通った後の値を変える。ここでは、環境変数の名前（`PORT`）を、アプリで使う名前（`port`）に変えている |
| `type Config = z.infer<typeof Env>` | transform の**後**の形が型になる。`{ port: number; logLevel: 'debug' \| …; … }` |

- 最後の例では、`NODE_ENV=production` なのに DATABASE_URL の間違いが出ていません。`refine` は、**ほかの項目が全部通った後で**動くからです。PORT を直してもう一度動かすと、DATABASE_URL の間違いが出ます。
- 間違いの文には、値そのもの（`abc`）を書いていません。DATABASE_URL などには、パスワードが入っていることがあるからです（第5部 第26章）。Zod の既定の文も、値を含めません。

> **z.coerce.boolean() を使わない**: `z.coerce.boolean()` は `Boolean(値)` と同じ変え方なので、`'false'` も `'0'` も true になります（空でない文字列は true）。環境変数の真偽は `z.stringbool()` で読みます。練習問題4で確かめます。

## 7. ブランド型: 同じ number を取り違えない

### 7.1 手を動かす: TaskId と UserId

タスクの id も、利用者の id も、型は `number` です。引数の順番を間違えて `assignTask(userId, taskId)` と書いても、tsc は気づきません（形で比べる型なので。第35章 4節）。`brand.ts` を作ります。

```ts
import { z } from 'zod';

const TaskId = z.number().int().positive().brand<'TaskId'>();
const UserId = z.number().int().positive().brand<'UserId'>();
type TaskId = z.infer<typeof TaskId>; // number & z.$brand<'TaskId'>
type UserId = z.infer<typeof UserId>;

function assignTask(taskId: TaskId, userId: UserId): string {
  return `タスク ${taskId} を、利用者 ${userId} に割り当てました`;
}

const taskId = TaskId.parse(3); // 確かめて通った値だけが TaskId になる
const userId = UserId.parse(42);

console.log(assignTask(taskId, userId));
// @ts-expect-error 順番を取り違えると、tsc のエラーになる
console.log(assignTask(userId, taskId));
// @ts-expect-error ただの number も渡せない（確かめていないので）
console.log(assignTask(3, 42));
console.log(taskId + 1); // 計算には、ふつうの number として使える（結果はただの number）
```

```sh
$ npx tsc
$ node brand.ts
タスク 3 を、利用者 42 に割り当てました
タスク 42 を、利用者 3 に割り当てました
タスク 3 を、利用者 42 に割り当てました
4
```

- `.brand<'TaskId'>()` を付けると、通した後の型が `number & z.$brand<'TaskId'>` になります。中身は number のままですが、型の上では「`TaskId` の印（ブランド）が付いた number」です。印の違う `UserId` や、印の無いただの `number` は渡せません。
- `npx tsc` は、エラーを出しません。2か所の `// @ts-expect-error`（第35章 9節）が、「次の行はエラーになるはず」を確かめています。コメントを消すと、2つのエラーが出ます。
- `node brand.ts` は、取り違えた2行目と3行目も、そのまま動いています。ブランドも型なので、**実行時には何もしません**。印が付くのは、`TaskId.parse` を通った値だけ、という約束を tsc が守らせるだけです。
- 境界（パスの `:id` を確かめる所）で `TaskId` にしておけば、中の関数は `TaskId` を受け取るように書けます。データの層の関数に、間違って利用者の id を渡す事故を、tsc が見つけます。

ブランド型は、Zod を使わなくても `type TaskId = number & { readonly __brand: 'TaskId' }` のように書けます。ただし、その型の値を作るには、どこかで `as TaskId` と言い切る必要があります。Zod の `.brand()` なら、確かめた所でだけ印が付くので、`as` が要りません。

## 8. 1つのスキーマから、型・確かめ・説明書

### 8.1 手を動かす: JSON Schema を作る

Zod のスキーマは、JSON Schema（JSON の形を決める、言語に関係のない書き方）にも変えられます。`json-schema.ts` を作ります。

```ts
import { z } from 'zod';

const NewTask = z.strictObject({
  title: z.string().trim().min(1).max(100),
  status: z.enum(['todo', 'doing', 'done']).default('todo'),
  dueDate: z.iso.date().nullable().default(null),
});

// io: 'input' は「送る側が送ってよい形」（default のある項目は省略できる）
console.log(JSON.stringify(z.toJSONSchema(NewTask, { io: 'input' }), null, 2));
```

```sh
$ node json-schema.ts
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    },
    "status": {
      "default": "todo",
      "type": "string",
      "enum": [
        "todo",
        "doing",
        "done"
      ]
    },
    "dueDate": {
      "default": null,
      "anyOf": [
        （略）
      ]
    }
  },
  "required": [
    "title"
  ],
  "additionalProperties": false
}
```

- `{ io: 'input' }` で、送る側から見た形（`z.input`）にしています。`default` のある `status`・`dueDate` は、`required` に入っていません。
- JSON Schema は、API の説明書 OpenAPI（第5部 第25章 9.2節）の部品です。Fastify（第5部 第28章 3節）は、ルートに JSON Schema を書くと、入力の確かめと説明書を作ります。

1つのスキーマから、次のものが全部作れます。

```text
                    ┌─→ z.infer  … tsc の型（サーバのコード）
 Zod のスキーマ ────┼─→ parse    … 実行時の確かめ（境界）
                    ├─→ z.toJSONSchema … API の説明書（OpenAPI）
                    └─→ 同じファイルを import … ブラウザのフォームの確かめ（第8部）
```

第8部では、同じスキーマのファイルを、サーバとブラウザ（React）の両方から `import` して、フォームの確かめにも使います。

## 9. Python と比べる

| | Python（Flask） | Node.js（TypeScript） |
| --- | --- | --- |
| 型は実行時にあるか | 型ヒントは実行時に読めるが、Python は確かめない | 消える。確かめない |
| 境界で確かめる道具 | pydantic | Zod |
| スキーマの書き方 | `class NewTask(BaseModel): title: str` | `const NewTask = z.object({ title: z.string() })` |
| 確かめる | `NewTask.model_validate(data)`（だめなら `ValidationError`） | `NewTask.parse(data)`（だめなら `ZodError`）・`safeParse` |
| 型の取り出し | クラスそのものが型 | `z.infer<typeof NewTask>` |
| 環境変数 | pydantic-settings の `BaseSettings` | 6節の `loadConfig` |
| JSON Schema | `NewTask.model_json_schema()` | `z.toJSONSchema(NewTask)` |
| ブランド型 | `typing.NewType('TaskId', int)` | `.brand<'TaskId'>()` |

pydantic は、クラスを書くと「型」と「確かめ」が同時にできます。Zod は逆に、スキーマ（値）を書いて、型を取り出します。どちらも「型を2回書かない」ための工夫です。FastAPI（Python のフレームワーク）は、pydantic のクラスから入力の確かめと説明書を作ります。8節の Fastify と同じ考え方です。

## まとめ

- 型は実行時に消える。`as` や `JSON.parse` の any は、何も確かめない。間違いは、使った所で（遅れて）見つかる。
- 外から来た値（ボディ・クエリ・環境変数・ほかのサービスの応答・ファイル）は、境界で Zod で確かめ、確かめた後の値だけを中に入れる。中では型を信じる。
- 型はスキーマから作る（`z.infer`・`z.output`・`z.input`）。型とスキーマを2回書かない。
- `function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S>` の形のジェネリクスで、「スキーマを渡すと、確かめた後の型が返る」関数が書ける。
- 環境変数は、`preprocess`・`stringbool`・`refine`・`transform` で読み、`Config` の型もスキーマから作る。
- ブランド型で、同じ number の取り違えを tsc に見つけさせる。ブランドも実行時には何もしない。
- 1つのスキーマから、型・実行時の確かめ・JSON Schema が作れる。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Zod 公式: https://zod.dev/
- Zod 公式「Basic usage」「Defining schemas」（`z.infer`・`z.input`・`z.output`・`.brand()`・`z.stringbool()`）: https://zod.dev/basics ・ https://zod.dev/api
- Zod 公式「JSON Schema」: https://zod.dev/json-schema
- Alexis King「Parse, don't validate」（英語）: https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
- RFC 6901（JSON Pointer）: https://www.rfc-editor.org/rfc/rfc6901
- pydantic 公式: https://docs.pydantic.dev/

---

前: [第37章 Node.js プロジェクトでの TypeScript](../ch37-ts-node/README.md) ／ 次: [第7部の成果物 タスク管理 API を TypeScript に](../project-task-api/README.md) ／ 部の目次: [第7部 TypeScript](../README.md)
