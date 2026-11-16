# 第38章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part07/ch38-ts-runtime/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | タスクのスキーマと型 | [schemas.ts](schemas.ts)、[schemas.test.ts](schemas.test.ts) | 2 |
| 2 | 基本 | 環境変数を Zod で読む | [config.ts](config.ts)、[config.test.ts](config.test.ts) | 6 |
| 3 | 基本 | 一覧のクエリを確かめる | [query.ts](query.ts)、[query.test.ts](query.test.ts) | 3・4 |
| 4 | 基本 | Zod の動きを予想する（調べる問題） | [predict.ts](predict.ts) | 2・6 |
| 5 | 応用 | ZodError を problem+json にする | [problem.ts](problem.ts)、[problem.test.ts](problem.test.ts) | 4 |
| 6 | 応用 | 型の付いたハンドラを作る `route` | [route.ts](route.ts)、[route.test.ts](route.test.ts) | 4.1・4.3 |
| 7 | 応用 | 応答を確かめるクライアント | [client.ts](client.ts)、[client.test.ts](client.test.ts) | 5 |
| 8 | 発展 | Zod で書く API | [app.ts](app.ts)、[app.test.ts](app.test.ts) | 3・4、第37章 練習問題8 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第35〜37章と同じです。問題4以外は、`○○.ts` を書き、`node --test ○○.test.ts` ですべてのテストが通れば完成です。「型: tsc のエラーが無い」のテストは、`○○.ts`（と、あれば `○○.check.ts`）を tsc で確かめます。

この章の問題は、どれも `any` を使わずに書きます。`as` は、問題6で1回だけ使ってよく、ほかの問題では使いません（テストが確かめます）。**型はスキーマから作り**、同じ形を `type` で2回書かないようにします。

Zod の間違いの文を日本語にするには、ファイルの最初で `z.config(z.locales.ja());` を呼びます（本文2節）。テストは、間違いの文の中身は確かめないので、呼ばなくてもかまいません。

---

## 基本

### 問題1 タスクのスキーマと型

[schemas.ts](schemas.ts) に、3つのスキーマと、そこから作る型を書いてください（本文2節）。`Status` は書いてあります。

| スキーマ | 項目 | 決まり |
| --- | --- | --- |
| `Task`（`z.object`） | `id` | 1 以上の整数 |
| | `title` | 1〜100文字の文字列 |
| | `status` | `Status` |
| | `dueDate` | `YYYY-MM-DD` の日付（`z.iso.date()`）か null |
| | `tags` | 文字列の配列 |
| | `createdAt` | ISO 8601 の日時（`z.iso.datetime()`。`'2026-11-11T09:00:00.000Z'`） |
| `NewTask`（`z.strictObject`） | `title` | 前後の空白を除いて、1〜100文字。必須 |
| | `status` | 省略なら `'todo'` |
| | `dueDate` | 日付か null。省略なら null |
| | `tags` | 前後の空白を除いて 1〜20文字の文字列を、5個まで。省略なら `[]` |
| `TaskPatch`（`z.strictObject`） | `title`・`status`・`dueDate` | `NewTask` と同じ決まり。どれも省略できる（決まりの値は無い）。`title: null` は間違い |
| | （全体） | 項目が1つも無ければ、`'変える項目が1つもありません'` の間違い |

型:

| 型 | 作り方 |
| --- | --- |
| `Task` | `Task` の通した後の型 |
| `NewTaskInput` | `NewTask` に入れてよい型（`z.input`） |
| `NewTask` | `NewTask` の通した後の型（`z.output`） |
| `TaskPatch` | `TaskPatch` の通した後の型 |

```sh
$ node --test schemas.test.ts
ℹ pass 6
ℹ fail 0
```

ヒント:
- 「前後の空白を除いて 1文字以上」は、`z.string().trim().min(1)` です。`trim()` が先なので、空白だけの `'   '` は空と同じになります。
- 全体の決まりは、`.refine((patch) => 条件, { error: '文' })` です（本文6節）。項目が1つも無いかは、`Object.keys(patch).length` で数えられます。

### 問題2 環境変数を Zod で読む

[config.ts](config.ts) の `loadConfig(env)` を、Zod で書いてください（本文6節）。読む環境変数は、第37章の練習問題2と同じです（ポートの決まりの値だけ `9480` に変えました）。

| 環境変数 | 設定の項目 | 無いとき | 正しい値 |
| --- | --- | --- | --- |
| `PORT` | `port` | `9480` | 1〜65535 の整数（数字だけ） |
| `HOST` | `host` | `'127.0.0.1'` | 何でもよい |
| `LOG_LEVEL` | `logLevel` | `'info'` | `debug`・`info`・`warn`・`error` |
| `NODE_ENV` | `env` | `'development'` | `development`・`test`・`production` |
| `DATABASE_URL` | `databaseUrl` | `null` | 何でもよい。ただし `env` が `production` なら必須 |

- 空の文字列（`PORT=`）は、「無い」と同じに扱います。
- 正しくない値があれば、`ConfigError` を投げます。`problems` には、**間違っている環境変数の名前**を、スキーマに書いた順に入れます（例: `['PORT', 'LOG_LEVEL', 'NODE_ENV']`）。値そのものは、エラーの文に入れません。
- `Config` の型は、スキーマから作ります（`config.check.ts` が形を確かめます）。

```sh
$ node --test config.test.ts
ℹ pass 7
ℹ fail 0
```

ヒント: 本文6節の `env.ts` に、`HOST` を足し、`FEATURE_SSE` を除いた形です。`problems` は、`result.error.issues` の `path` から作ります。

### 問題3 一覧のクエリを確かめる

[query.ts](query.ts) の `parseListQuery(query)` を書いてください（本文3・4節）。`query` には、Express の `req.query` のようなオブジェクトが渡されます（値は文字列か、`?a=1&a=2` なら配列）。

| 名前 | 決まり | 無いとき |
| --- | --- | --- |
| `status` | `todo`・`doing`・`done` | 無いまま |
| `dueBefore` | `YYYY-MM-DD` の日付 | 無いまま |
| `limit` | 1〜100 の整数（数字だけの文字列） | `20` |
| `offset` | 0〜10000 の整数（数字だけの文字列） | `0` |

- 合っていれば `{ ok: true, value: { status?, dueBefore?, limit, offset } }` を返します（`limit`・`offset` は数）。
- 間違いがあれば `{ ok: false, errors: [{ parameter: '名前', detail: '文' }, …] }` を返します。間違いは全部集めます。
- 知らない名前（`?sort=id`）も、2回の指定（`?status=todo&status=done`）も間違いです。知らない名前の `parameter` は、その名前にします。
- `z.coerce` は使いません（`''` や `' 5'` も数にしてしまうため。第5部 第25章 5.2節、問題4）。
- `ListQuery` の型は、スキーマから作ります。

```sh
$ node --test query.test.ts
ℹ pass 6
ℹ fail 0
```

ヒント:
- 数字だけの文字列を数にするのは、本文4節の `api.ts` の `limit` と同じ書き方です（`regex` → `transform(Number)` → `pipe`）。
- `z.strictObject` の知らない名前の間違いは、1つの issue にまとまっています。`issue.code === 'unrecognized_keys'` のとき、`issue.path` は `[]` で、名前は `issue.keys`（文字列の配列）に入っています。`issue.code` で絞り込むと、`issue.keys` が使えるようになります（第36章 2節の判別できるユニオン）。

### 問題4 Zod の動きを予想する（調べる問題）

[predict.ts](predict.ts) を読んで、`node predict.ts` が①〜⑧で何と出力するかを、**動かす前に**紙に書いてください。それから動かして、答え合わせをします。⑨〜⑪は、動かさずに、エディタで型を見ます。答えと説明は [../solutions/README.md](../solutions/README.md) にあります。

```sh
$ node predict.ts
```

1. ①と②の違いは何ですか。API のボディを確かめるときは、どちらを使うのがよいでしょうか。
2. ③④で、`z.coerce.number()` が数にした文字列と、間違いにした文字列を分けてください。クエリの `limit` に使うと、何が困りますか。
3. ⑤⑥で、`z.coerce.boolean()` と `z.stringbool()` の結果が違うのは、どの文字列ですか。
4. ⑦⑧で、`default` が使われたのはどの値ですか。`null` のときに使われないのはなぜですか。
5. ⑨の `Opt` の型で、`optional()`・`nullable()`・`nullish()` は、それぞれ何を許しますか。
6. ⑩⑪の `LenIn` と `LenOut` は、それぞれ何の型ですか。

---

## 応用

### 問題5 ZodError を problem+json にする

[problem.ts](problem.ts) に、3つの関数を書いてください（本文4節）。型は書いてあります（`parseOrProblem` だけは、引数と戻り値の型も自分で書きます）。

| 関数 | 仕様 |
| --- | --- |
| `toPointer(path)` | `issue.path` を JSON Pointer にする。`[]` → `''`、`['tags', 1]` → `'/tags/1'`。名前の中の `~` は `~0`、`/` は `~1` にする（`['a/b']` → `'/a~1b'`）。`~` を先に変える |
| `toProblem(error, status)` | `ZodError` を `Problem` にする。`type` は `'about:blank'`、`title` は 400 なら `'Bad Request'`・422 なら `'Unprocessable Content'`、`detail` は `'入力が正しくありません'`。`errors` は issue ごとに `{ pointer, detail: issue.message }`。ただし知らない項目（`unrecognized_keys`）は、**項目ごとに** `{ pointer: その項目の場所, detail: '知らない項目です' }` にする |
| `parseOrProblem(schema, value, status)` | `schema` で `value` を確かめ、通れば `{ ok: true, value: 確かめた後の値 }`、だめなら `{ ok: false, error: Problem }`。`status` は 400 か 422 で、省略なら 422 |

`parseOrProblem` の型の要件（`problem.check.ts` が確かめます）:

```ts
parseOrProblem(z.object({ title: z.string() }), {})  // → Result<{ title: string }, Problem>
parseOrProblem(z.string().transform((s) => s.length), 'abc', 400)  // → Result<number, Problem>
parseOrProblem(NewTask, {}, 500)  // tsc のエラー
```

```sh
$ node --test problem.test.ts
ℹ pass 6
ℹ fail 0
```

ヒント:
- 知らない項目の場所は、`issue.path`（その項目を持つオブジェクトの場所）の後ろに、項目の名前を足したものです。`{ meta: { a: 'ok', b: 1 } }` の `b` なら `/meta/b` です。
- `parseOrProblem` は、本文4節の `parse` と同じ形のジェネリクスです。戻り値は `Result<z.output<S>, Problem>` です。
- `String(key)` で、数も文字列にできます。文字列の中の文字を全部置き換えるのは `replaceAll` です。

### 問題6 型の付いたハンドラを作る route

本文4節の `parse` は、ハンドラの中で1つずつ呼ぶ必要がありました。[route.ts](route.ts) に、スキーマとハンドラを受け取って、**確かめてからハンドラを呼ぶ** Express のハンドラを作る関数 `route` を書いてください。

```ts
app.post('/items', route({ body: NewItem }, async ({ body }) => {
  // body は NewItem を通した後の型
  return { status: 201, body: { …body }, headers: { location: '/items/7' } };
}));
```

| 決まり | 内容 |
| --- | --- |
| スキーマ | `{ params?, query?, body? }`。どれも省略できる |
| ハンドラが受け取るもの | `{ params, query, body }`。スキーマがあるものは確かめた後の値、無いものは `undefined`。2つ目の引数に `req` |
| 確かめる順 | params → query → body。だめなら、そこで problem+json を返し、ハンドラは呼ばない |
| だめなとき | params は 404（`title: 'Not Found'`、`errors` は付けない）、query は 400（`'Bad Request'`）、body は 422（`'Unprocessable Content'`）。400・422 は `errors: [{ pointer, detail }]` を付ける（`pointer` は `/name`・`/tags/0` の形） |
| ハンドラが返すもの | `{ status, body?, headers? }`。`headers` があれば付け、`body` が `undefined` ならボディ無し（`res.end()`）、あれば `res.json(body)` |
| ハンドラが投げたエラー | Express のエラーのミドルウェアに渡す（async の関数を返せば、Express 5 が渡す） |

**型が一番大事です**。`Input<S>` の型を、「`S` に `params` のスキーマがあれば、それを通した後の型、無ければ `undefined`」になるように書き直してください（`route.check.ts` が確かめます）。

```sh
$ node --test route.test.ts
ℹ pass 7
ℹ fail 0
```

ヒント:
- 「`S` が `{ params: スキーマ }` の形なら、そのスキーマを取り出す」は、`S extends { params: infer P extends z.ZodType } ? z.output<P> : undefined` と書けます（本文4.3節の条件型と `infer`）。
- params・query・body の3つは、同じ手順の繰り返しです。`[['params', 404, req.params], …] as const` のような配列を作って回すと、短く書けます。
- 確かめた値を集めたオブジェクトを `Input<S>` としてハンドラに渡す所では、tsc に「キーごとに違う型」を追いかけさせるのが難しいので、**1回だけ `as Input<S>` を使ってかまいません**。ジェネリクスの部品の中に閉じ込めた `as` は、使う側には見えません。

### 問題7 応答を確かめるクライアント

[client.ts](client.ts) に、タスクの API を呼ぶクライアントを書いてください（本文5節）。

1. `Task` のスキーマを書き、型をスキーマから作ります。

| 項目 | 決まり |
| --- | --- |
| `id` | 1 以上の整数 |
| `title` | 文字列 |
| `status` | `Status` |
| `dueDate` | `YYYY-MM-DD` の日付か null |
| `createdAt` | ISO 8601 の日時 |

2. `createTaskClient(baseUrl, fetchFn)` が、3つのメソッドを持つオブジェクトを返すようにします。`fetchFn` は、ふだんは `fetch` です（テストでは偽物を渡します）。

| メソッド | 送るもの | 返すもの |
| --- | --- | --- |
| `getTask(id: number)` | `GET 〈baseUrl〉/api/tasks/〈id〉` | 200 なら確かめた `Task`。404 なら `null` |
| `listTasks(status?: Status)` | `GET 〈baseUrl〉/api/tasks`（`status` があれば `?status=〈status〉`） | 200 なら確かめた `Task[]` |
| `createTask(input: NewTaskInput)` | `POST 〈baseUrl〉/api/tasks`。ボディは `JSON.stringify(input)`、`content-type: application/json` | 201 なら確かめた `Task` |

3. うまくいかないときは、書いてある `UpstreamError` を投げます。

| 場合 | `kind` | `status` | `cause` |
| --- | --- | --- | --- |
| `fetchFn` が投げた（つながらない） | `'network'` | `null` | `fetchFn` が投げたエラー |
| 思った状態コードでない（上の表以外） | `'status'` | 応答の状態コード | — |
| JSON として読めない・形が違う | `'shape'` | 応答の状態コード | 形が違うなら `ZodError` |

- 応答に知らない項目があっても、取り除いて返します（`z.object` の動き）。

```sh
$ node --test client.test.ts
ℹ pass 7
ℹ fail 0
```

ヒント:
- 本文5節の `getJson` のように、「`fetchFn` を呼ぶ」「ボディを読んで確かめる」を小さな関数に分けると、3つのメソッドで使い回せます。
- `await res.json()` は、JSON として読めないとき、エラーを投げます。`try … catch` で受けて `'shape'` にします。
- 戻り値の型が `never` の関数（必ず投げる関数）を作ると、`if (!res.ok) fail(res);` の後で、tsc は「ここから先は `res.ok` が true」と分かります（第36章 2節の `assertNever` と同じ考え方）。

---

## 発展

### 問題8 Zod で書く API

[app.ts](app.ts) の `createApp(repo)` に、第37章の練習問題8の API を、Zod を使って書いてください。ルート・状態コード・problem+json・ETag・If-Match の決まりは、[第37章の練習問題8](../../ch37-ts-node/exercises/README.md) と同じです。[task-repo.ts](task-repo.ts)・[fake-repo.ts](fake-repo.ts) も第37章と同じものです。

第37章から変わる所:

| 所 | 第37章 | この問題 |
| --- | --- | --- |
| 入力の確かめ | 手で書いた `if` と型ガード | Zod のスキーマ（`from 'zod'` を使うことを、テストが確かめる） |
| `GET /api/tasks` のクエリ | `status`・`dueBefore` | `limit`（1〜100、無ければ 20）と `offset`（0〜10000、無ければ 0）を足す。問題3と同じ決まり。`repo.list` には `status`・`dueBefore` だけを渡し、結果を `offset` から `limit` 件に切り出す |
| クエリの間違い（400） | `errors` 無し | `errors: [{ parameter, detail }]`。知らない名前（`?sort=id`）も間違い |
| ボディの間違い（422） | `errors: [{ field, message }]` | `errors: [{ pointer, detail }]`（問題5と同じ。知らない項目は `/memo` のように、その場所を指す） |
| 出ていくデータ | そのまま返す | 外に出す形のスキーマを通してから返す。データの層が知らない項目を付けて返しても、外には出さない。形が違えば（題名が空など）、こちらのバグなので 500 |

500 のとき、`ZodError` の中身（どの項目が違ったか）も、応答には入れません。

```sh
$ node --test app.test.ts
ℹ pass 12
ℹ fail 0
```

ヒント:
- `parseBody`（422・`pointer`）と `parseQuery`（400・`parameter`）の2つの関数を、本文4節の `parse` の形で作ると、ハンドラが短くなります。
- 出ていくデータのスキーマは、`z.object` で書きます（`strictObject` だと、知らない項目で間違いになってしまいます）。`TaskOut.parse(task)` が投げた `ZodError` は、エラーのミドルウェアで 500 になります。
- `If-Match` も、`z.string().regex(/^"[0-9]{1,9}"$/)` のようなスキーマで確かめられます。
