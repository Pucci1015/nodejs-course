# 第28章 他のフレームワークの地図

第5部では、Express で API を作ってきました。でも、Node.js の Web フレームワークは Express だけではありません。速さと型を大事にする Fastify、Web 標準の `Request`・`Response` だけで動く Hono、形を決めて大きなチームで使う NestJS、画面と同じ所に API を置く Next.js の Route Handlers などがあります。

この章では、同じ小さなタスク API を、Express・Fastify・Hono・フレームワークなしの「Web 標準のハンドラ」の4つで書き、**同じテストで**確かめます。目的は、全部を使えるようになることではありません。「何がどこまで同じで、何が違うのか」を知り、新しいフレームワークに出会ったときに、読み方の見当がつくようになることです。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第23〜27章、第4部 第18章（自分で作るフレームワークと `compose`） |
| この章のゴール | 主なフレームワークの考え方の違いを説明し、場面に合わせて選べる / Fastify の JSON Schema で入力と出力を決められ、既定の設定の落とし穴を説明できる / Hono と Web 標準の `Request`・`Response` で API を書ける / Node.js の `req`・`res` と Web 標準をつなぐ仕組みを説明できる / サービスの層を分けておけば、フレームワークを替えられることを、契約のテストで確かめられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`fastify-try.mjs`・`hono-try.mjs`・`web-serve.mjs`）と、同じタスク API を4つの書き方で書いたもの。決まりとデータ（`tasks-core.mjs`）と契約のテストは共通 |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、すべて `~/dev/part05/ch28-framework-map/` で実行します（第23章で `setup-part05.sh` を動かして、`~/dev/part05` を作ってあります）。
>
>   ```sh
>   $ cd ~/dev/part05/ch28-framework-map
>   ```
>
> - 「**手を動かす**」の所は、新しいファイルに書いて動かしてください。ファイルの完成形は `samples/` にあります。「中身は読まなくてよい」と書いたサンプルは、動かして結果を見るだけで十分です。
> - 「手を動かす」のサーバは 9357 番を使います。次のサーバを動かす前に `Ctrl+C` で止めてください。`curl` は別のターミナルで打ちます。
> - fastify・hono・@hono/node-server は、第23章の `setup-part05.sh` で入れてあります。
> - 4つの書き方のタスク API（`express-tasks.mjs` など）は、本文に出てくる部分だけ読めば十分です。全部を読む必要はありません。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| Fastify の JSON Schema（3節） | 第7部（スキーマと型をそろえる）、仕事で Fastify に出会ったとき |
| Web 標準の `Request`・`Response`（4・5節） | 第9部（Next.js の Route Handlers）、第12部（Cloudflare Workers などで動かす） |
| 契約のテスト（6節） | 成果物のテスト、第6部（データの層を替えても同じかを確かめる） |
| フレームワークの選び方（10節） | 第9部・第12部で、どこに何を置くかを決めるとき |

---

## 1. 地図

| フレームワーク | ひとことで | ハンドラの形 | 動く場所 | 向いているもの |
| --- | --- | --- | --- | --- |
| Express | いちばん古く、いちばん使われている。小さな芯にミドルウェアを足す | `(req, res, next)` | Node.js | ほとんど何でも。情報とミドルウェアが多い |
| Fastify | 速さとスキーマ。JSON Schema で入力と出力を決める | `async (request, reply) => 値` | Node.js | 入力と出力の形が決まった、たくさん呼ばれる API |
| Hono | Web 標準の `Request`・`Response` だけで書く。小さくて速い | `(c) => Response` | Node.js・Deno・Bun・Cloudflare Workers など | どこで動かすか決まっていない API、エッジ |
| Koa | Express を作った人たちの次の作品。`async`/`await` の玉ねぎのミドルウェア | `async (ctx, next)` | Node.js | 小さな芯から自分で組みたいとき |
| NestJS | Angular に似た、形の決まった大きなフレームワーク。TypeScript とデコレータ | クラスのメソッド | Node.js（中で Express か Fastify を使う） | 大きなチーム、長く続く業務システム |
| Next.js の Route Handlers | React の画面のフレームワークの中に API を置く | `export async function GET(request) => Response` | Node.js・エッジ | 画面と同じ所の、小さめの API（第9部） |

大きく分けると、2つの流れがあります。

- **Node.js の `http` の上の流れ**（Express・Koa・Fastify・NestJS）: 第4部で見た `req`・`res`（`IncomingMessage`・`ServerResponse`）を、それぞれのやり方で包んでいます。
- **Web 標準の流れ**（Hono・Next.js・Deno・Bun・Cloudflare Workers）: ブラウザの `fetch` と同じ `Request`・`Response` を使います。ハンドラは「`Request` を受け取って `Response` を返す関数」です。

最近の新しいものは、ほとんどが Web 標準の流れです。Node.js にも、`fetch`・`Request`・`Response`・`Headers`・`URLPattern` がそろったからです（第3部）。

## 2. 比べるための元: Express と、共通の決まり

サンプルのタスク API は、`GET /tasks`・`GET /tasks/:id`・`POST /tasks` の3つだけです。エラーは第25章の problem+json で返します。

大事なのは、**決まりとデータを [tasks-core.mjs](samples/tasks-core.mjs) に1つだけ置いた**ことです。第26章で分けた「サービスの層」と同じで、HTTP のことを何も知りません。

```js
// tasks-core.mjs（一部）
create(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('JSON のオブジェクトを送ってください');
  // …title を確かめる…
  const task = { id: nextId++, title, done: false };
  tasks.set(task.id, task);
  return task;
},
```

4つのサーバは、どれも次の3つのことしかしません。

1. HTTP から値を取り出す（パスの `id`、ボディの JSON、`Content-Type`）
2. サービスを呼ぶ
3. 結果やエラー（`NotFoundError` は 404、`ValidationError` は 422）を、HTTP の応答にする

[express-tasks.mjs](samples/express-tasks.mjs) は、ここまでの章と同じ書き方です。

```js
app.post('/tasks', (req, res) => {
  if (!isJson(req.get('content-type'))) return sendProblem(res, 415, req);
  const task = service.create(req.body);
  res.status(201).location(`/tasks/${task.id}`).json(task);
});
```

以下の節では、この3つが、ほかのフレームワークでどう書かれるかを見ていきます。

## 3. Fastify

### 3.1 スキーマで、入力と出力を決める

Fastify の特徴は、ルートに **JSON Schema** を書くことです。JSON Schema は「この JSON は、こういう形」を JSON で書く、言語に関係ない決まりです。第25章の zod と同じ役目ですが、JavaScript のコードではなく、ただのデータです。

```js
// fastify-tasks.mjs（一部）
const Task = {
  type: 'object',
  properties: { id: { type: 'integer' }, title: { type: 'string' }, done: { type: 'boolean' } },
  required: ['id', 'title', 'done'],
};

app.post('/tasks', {
  schema: {
    body: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'], additionalProperties: false },
    response: { 201: Task },
  },
}, async (req, reply) => {
  const task = service.create(req.body);
  return reply.code(201).header('Location', `/tasks/${task.id}`).send(task);
});

app.get('/tasks/:id', { schema: { response: { 200: Task } } }, async (req) => {
  // …
  return service.get(id); // 返した値が JSON になる
});
```

Express との違いは、次のとおりです。

| | Express | Fastify |
| --- | --- | --- |
| 返し方 | `res.json(値)` を呼ぶ | ハンドラが値を `return` する（`async` のまま書ける） |
| ボディを読む | `app.use(express.json())` を自分で入れる | JSON は最初から読む |
| 入力の確かめ | 自分で（zod など） | `schema.body`・`querystring`・`params`・`headers`。合わなければハンドラは呼ばれない |
| 出力 | `JSON.stringify` | `schema.response` から、前もって作った速い関数で JSON にする。**スキーマに無い項目は書かない** |
| エラー | `(err, req, res, next)` のミドルウェア | `app.setErrorHandler`。投げた例外も、`async` の reject も、ここに来る |
| ログ | 自分で入れる（第26章 6節） | `Fastify({ logger: true })` で pino が入る |
| 試し方 | supertest や、実際に起動して `fetch` | `app.inject({ method: 'GET', url: '/tasks' })` で、ポートを開かずに試せる |

Fastify が速いと言われるのは、スキーマを先に知っているので、確かめる関数と JSON にする関数を、起動のときに作っておけるからです（中で ajv と fast-json-stringify を使っています）。

出力のスキーマには、**守り**の意味もあります。データベースから読んだ行に `passwordHash` が入っていても、スキーマに書いていなければ、応答には出ません。練習問題6は、これを使います。

**手を動かす**: JSON Schema で入力と出力を決めた Fastify のアプリを、ポートを開かずに試す `fastify-try.mjs` を作ります（完成形は [samples/fastify-try.mjs](samples/fastify-try.mjs)）。

```js
import Fastify from 'fastify';

const app = Fastify({
  ajv: { customOptions: { removeAdditional: false } }, // 知らない項目は、黙って消さずに断る
});

const User = {
  type: 'object',
  properties: { id: { type: 'integer' }, name: { type: 'string' } },
  required: ['id', 'name'],
};

app.post(
  '/users',
  {
    schema: {
      body: {
        type: 'object',
        properties: { name: { type: 'string', minLength: 1, maxLength: 20 } },
        required: ['name'],
        additionalProperties: false,
      },
      response: { 201: User }, // ここに書いていない項目は、応答に出ない
    },
  },
  async (req, reply) => {
    const user = { id: 1, name: req.body.name, passwordHash: 'dev-only-hash' }; // データベースから読んだ行のつもり
    return reply.code(201).send(user);
  },
);

// app.inject: ポートを開かずに、リクエストを送ったことにして試す
for (const body of [{ name: 'alice' }, { name: '' }, { name: 'bob', role: 'admin' }]) {
  const res = await app.inject({ method: 'POST', url: '/users', payload: body });
  console.log(JSON.stringify(body), '→', res.statusCode, res.body);
}
```

```sh
$ node fastify-try.mjs
{"name":"alice"} → 201 {"id":1,"name":"alice"}
{"name":""} → 400 {"statusCode":400,"code":"FST_ERR_VALIDATION","error":"Bad Request","message":"body/name must NOT have fewer than 1 characters"}
{"name":"bob","role":"admin"} → 400 {"statusCode":400,"code":"FST_ERR_VALIDATION","error":"Bad Request","message":"body must NOT have additional properties"}
```

- 1つ目では、ハンドラが `passwordHash` も返しましたが、応答には `id` と `name` だけが出ています。`schema.response` の働きです。
- 2つ目・3つ目では、ハンドラは呼ばれていません。スキーマに合わないので、Fastify が先に 400 を返しました。
- `app.inject` は、ポートを開かずに、リクエストを送ったことにして試す仕組みです。`res.statusCode` と `res.body` で結果を見ます。
- `await` を、関数の外（ファイルのいちばん上）で使っています。`.mjs` のファイルでは、これができます（第3部 第14章）。
- `removeAdditional: false` を消して動かすと、3つ目が 201 になります。理由は次の 3.2節です。

### 3.2 既定の設定の落とし穴

Fastify の ajv は、既定で次のように設定されています。どちらも「親切」ですが、API の約束を決める側から見ると、困ることがあります。

| 設定 | 既定 | 起きること |
| --- | --- | --- |
| `coerceTypes` | 有効 | `type: 'integer'` のクエリ `limit=' 20'` や `limit=2e1` が、黙って 20 になる。`type: 'boolean'` の `'0'` は `false` |
| `removeAdditional` | 有効 | `additionalProperties: false` なのに、知らない項目（`role: 'admin'` など）を**断らずに、黙って取り除く** |
| `useDefaults` | 有効 | スキーマの `default` を入れる（これは、たいてい望んだとおり） |

`coerceTypes` は、第25章の `z.coerce.number()` と同じ落とし穴です。クエリは必ず文字列で届くので、型を変えてもらえると楽ですが、`' 20'` のような変な値まで通ってしまいます。

`removeAdditional` は、さらに気づきにくいです。テストで `{ "title": "a", "role": "admin" }` を送ると、201 が返ります。「`role` が断られた」のではなく、「`role` が消えた」のです。サーバの中は安全ですが、客は「`role` を送れた」と思ってしまいます。

サンプルと練習問題6では、次のようにしています。

```js
const app = Fastify({
  ajv: { customOptions: { removeAdditional: false } }, // 知らない項目は断る（400）
});
app.removeContentTypeParser('text/plain'); // 既定では text/plain も読むので、JSON だけにする（ほかは 415）
```

`coerceTypes` は、パスやクエリの数で便利なこともあるので、残しています。その代わり、厳しく決めたい値は `{ type: 'string', pattern: '^[1-9][0-9]*$' }` のように、文字列の形で決めてから、ハンドラで数にします。

もう1つ、スキーマに合わなかったときのエラーは、既定では **400** です。第25章では「ボディの中身の間違いは 422」と決めました。Fastify 5 では、合わなかった場所が `err.validationContext`（`'body'`・`'querystring'`・`'params'`・`'headers'`）に入るので、`setErrorHandler` で 422 や 404 に分けられます。

```js
app.setErrorHandler((err, req, reply) => {
  if (err.validation) {
    const status = err.validationContext === 'body' ? 422 : err.validationContext === 'params' ? 404 : 400;
    return send(reply, req, status);
  }
  // …
});
```

### 3.3 プラグイン

Fastify では、ルートやデコレータ（`app.decorate('db', …)`）をまとめたものを**プラグイン**と呼び、`app.register(plugin, { prefix: '/tasks' })` で足します。Express の Router に近いですが、プラグインの中で足したものは、その中だけで見える（**カプセル化**）のが違いです。認証のフックを、あるプラグインの中のルートにだけかける、といったことが、形として書けます。

## 4. Hono

### 4.1 Web 標準の Request と Response

[hono-tasks.mjs](samples/hono-tasks.mjs) のハンドラは、`c`（Context）を受け取って、`Response` を返します。

```js
app.post('/tasks', async (c) => {
  if (!isJson(c.req.header('content-type'))) return send(c, 415);
  let body;
  try {
    body = await c.req.json(); // ボディは、読むときに初めて読む
  } catch {
    return send(c, 400);
  }
  const task = service.create(body);
  return c.json(task, 201, { Location: `/tasks/${task.id}` });
});
```

`c.json(…)` は、Web 標準の `Response` を作って返しているだけです。`c.req.raw` は、Web 標準の `Request` そのものです。つまり、Hono のアプリは、まるごと **`app.fetch(request) => Response` という1つの関数**です。

| | Express | Hono |
| --- | --- | --- |
| 受け取るもの | Node.js の `req`（`IncomingMessage` を広げたもの） | `c.req`（中身は Web 標準の `Request`） |
| 返し方 | `res` に書く。返り値は使わない | `Response` を `return` する |
| ボディ | ミドルウェアで先に読む | `await c.req.json()` で、要るときに読む |
| ミドルウェア | `next()` は Promise を返さない | `await next()` で後ろを待てる（玉ねぎ。7節） |
| 本文の無い応答 | `res.status(204).end()` | `c.body(null, 204)` |
| 試し方 | 起動して `fetch` | `await app.request('/tasks')`。サーバを起動せずに `Response` が返る |

### 4.2 どこでも動く

`app.fetch` の形は、Web 標準のサーバの「入口」と同じです。だから、同じアプリを、つなぐ部分だけ替えて、いろいろな場所で動かせます。

```js
// Node.js（このサンプル）。@hono/node-server が req・res と Request・Response をつなぐ
import { serve } from '@hono/node-server';
serve({ fetch: app.fetch, port: 9352 });

// Deno
Deno.serve(app.fetch);

// Bun と Cloudflare Workers（export default に fetch を持つオブジェクトを置く）
export default app;
```

Cloudflare Workers は、Node.js ではありません。ブラウザに近い、Web 標準の API だけがある場所です（最近は Node.js の API も少し使えるようになっています）。Express は `http` に頼っているので、そのままでは動きません。

**手を動かす**: Hono のアプリを、起動せずに試してから、Node.js で動かす `hono-try.mjs` を作ります（完成形は [samples/hono-try.mjs](samples/hono-try.mjs)）。

```js
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/hello/:name', (c) => c.json({ message: `こんにちは、${c.req.param('name')} さん` }));
app.post('/echo', async (c) => {
  const body = await c.req.json(); // ボディは、読むときに初めて読む
  return c.json({ you_sent: body }, 201);
});

// app.request: サーバを起動せずに、Web 標準の Response を受け取る
const res = await app.request('/hello/alice');
console.log(res.status, res.headers.get('content-type'), await res.json());

const res2 = await app.request('/echo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ n: 1 }),
});
console.log(res2.status, await res2.json());

console.log(res instanceof Response); // Hono が返したのは、Web 標準の Response そのもの

// 同じアプリを Node.js の HTTP サーバで動かす（@hono/node-server が req・res とつなぐ）
serve({ fetch: app.fetch, port: 9357, hostname: '127.0.0.1' }, () => console.log('http://127.0.0.1:9357/ で待っています'));
```

```sh
$ node hono-try.mjs
200 application/json { message: 'こんにちは、alice さん' }
201 { you_sent: { n: 1 } }
true
http://127.0.0.1:9357/ で待っています
# 別のターミナルで
$ curl -s http://127.0.0.1:9357/hello/bob
{"message":"こんにちは、bob さん"}
$ curl -s http://127.0.0.1:9357/nothing
404 Not Found
```

- `app.request(URL, 設定)` は、`fetch` と同じ形で、サーバを起動せずに `Response` を返します。
- `res instanceof Response` が `true` なので、Hono が返したのは Web 標準の `Response` そのものです。
- `serve({ fetch: app.fetch, … })` の `app.fetch` が、4.2節の「1つの関数」です。
- 作っていない URL には、Hono が `404 Not Found` の文字を返します（`app.notFound` で変えられます）。

## 5. Web 標準のハンドラと、つなぐもの

### 5.1 フレームワークなしで書く

Hono の中身を取り除くと、残るのは「`Request` を受け取って `Response` を返す関数」です。[web-handler-tasks.mjs](samples/web-handler-tasks.mjs) は、それをフレームワークなしで書いたものです。

```js
const one = new URLPattern({ pathname: '/tasks/:id' }); // Web 標準のパスの決まり（Node.js 24 からグローバル）

return async function handle(request) {
  const { pathname } = new URL(request.url);
  if (pathname === '/tasks' && request.method === 'GET') return Response.json({ items: service.list() });
  // …
  const m = one.exec(request.url);
  if (m && request.method === 'GET') { /* m.pathname.groups.id */ }
  return problemResponse(404, request.url);
};
```

小さければ、これで十分です。ルートが増えてくると、if を並べるのがつらくなり、405 や HEAD の扱い、ミドルウェアが欲しくなります。それを作るのが練習問題8の小さなルーターで、それをきちんと作ったものが Hono です。

**手を動かす**: フレームワークなしの `handle(request)` を書き、`@hono/node-server` で動かす `web-serve.mjs` を作ります（完成形は [samples/web-serve.mjs](samples/web-serve.mjs)）。

```js
import { serve } from '@hono/node-server';

// Request を受け取って Response を返す、ただの関数
async function handle(request) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/add') {
    const a = url.searchParams.get('a') ?? ''; // 無ければ null なので、空の文字列にする
    const b = url.searchParams.get('b') ?? '';
    if (!/^-?[0-9]{1,9}$/.test(a) || !/^-?[0-9]{1,9}$/.test(b)) {
      return Response.json({ error: 'a と b は整数です' }, { status: 400 });
    }
    return Response.json({ sum: Number(a) + Number(b) });
  }
  return new Response('Not Found\n', { status: 404 });
}

// 起動する前に、関数として呼んで試せる
const res = await handle(new Request('http://localhost/add?a=1&b=2'));
console.log(res.status, await res.json());

// Hono のアプリでなくても、fetch の形の関数なら、そのまま動かせる
serve({ fetch: handle, port: 9357, hostname: '127.0.0.1' }, () => console.log('http://127.0.0.1:9357/ で待っています'));
```

```sh
$ node web-serve.mjs
200 { sum: 3 }
http://127.0.0.1:9357/ で待っています
# 別のターミナルで
$ curl -s 'http://127.0.0.1:9357/add?a=2&b=3'
{"sum":5}
$ curl -s 'http://127.0.0.1:9357/add?a=x&b=3'
{"error":"a と b は整数です"}
```

- `new URL(request.url).searchParams.get('a')` で、クエリの値を読みます。無ければ `null` です。
- `Response.json(値, { status })` は、JSON の `Response` を作る、Web 標準の書き方です。
- `serve` に渡したのは Hono のアプリではなく、自分で書いた関数です。`Request → Response` の形なら、何でも動かせます。

### 5.2 Next.js の Route Handlers

第9部で使う Next.js では、`app/api/tasks/route.ts` というファイルを置き、HTTP のメソッドの名前の関数を export します。中身は、このサンプルの `handle` と同じ、Web 標準の形です。

```ts
// app/api/tasks/route.ts（第9部で動かします）
export async function GET(request: Request) {
  return Response.json({ items: service.list() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const task = service.create(body);
  return Response.json(task, { status: 201, headers: { Location: `/api/tasks/${task.id}` } });
}

// app/api/tasks/[id]/route.ts。Next.js 15 からは、params は Promise
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // …
}
```

フォルダの名前がそのまま URL になります（`[id]` はパスの値）。ここまでの章で書いてきた「サービスの層」は、ここでもそのまま使えます。

### 5.3 Node.js の req・res とつなぐ

Node.js の `http` サーバが渡すのは `req`・`res` なので、Web 標準のハンドラを動かすには、間をつなぐもの（**アダプタ**）が要ります。サンプルの `toNodeHandler` は、いちばん簡単なものです。

```js
export function toNodeHandler(handle) {
  return async (req, res) => {
    const url = `http://${req.headers.host ?? '127.0.0.1'}${req.url}`;
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const request = new Request(url, { method: req.method, headers: req.headers, body: hasBody ? Readable.toWeb(req) : undefined, duplex: 'half' });
    const response = await handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  };
}
```

動きますが、足りない所がいくつもあります。

| 足りない所 | 起きること |
| --- | --- |
| `Object.fromEntries(response.headers)` | 同じ名前のヘッダは最後の1つだけ残る。`Set-Cookie` が2つあると、1つ消える |
| `await response.arrayBuffer()` | 本文を全部ためてから送る。SSE（第27章）のような終わらない応答は、いつまでも送られない |
| 客が切ったことを伝えていない | ハンドラが、もういない客のために、外の API やデータベースを待ち続ける |
| `http://` 決め打ち | TLS の接続でも、ハンドラからは `http://` に見える |
| HEAD の扱い | HEAD でも本文を書いてしまう |

`@hono/node-server` や Next.js の中にも、同じ仕事をするアダプタがあります。練習問題7で、これを直します。`request.duplex: 'half'` は、「ボディを流れのまま渡す。応答はボディを読み終わってから」という、Node.js の `fetch`（undici）で、流れのボディを渡すときに要る指定です。

## 6. 契約のテストで、同じだと確かめる

4つのサーバが本当に同じ API なのかは、[contract.mjs](samples/contract.mjs) の同じテストで確かめます。

```js
// contract.test.mjs
import { contract } from './contract.mjs';
import * as express from './express-tasks.mjs';
import * as fastify from './fastify-tasks.mjs';
// …
contract('Express', express.listen);
contract('Fastify', fastify.listen);
contract('Hono', hono.listen);
contract('Web 標準のハンドラ', web.listen);
```

`contract(name, start)` は、`start()` でサーバを起動し、`fetch` で外から叩く7個のテスト（空の一覧、作ると 201 と `Location`、1件を見る、404、422、壊れた JSON の 400 と JSON でないものの 415、間違いの後も作ったのは1つだけ）を作ります。テストは、フレームワークのことを何も知りません。見ているのは、HTTP の約束（ステータス、ヘッダ、JSON）だけです。

```sh
$ node --test samples/contract.test.mjs
ℹ pass 28
ℹ fail 0
```

このテストを書いている途中で、Fastify だけが次の2つで違う答えを返しました。3.2節の既定の設定です。

- `{ "title": "a", "role": "admin" }` に 201 を返した（`role` が黙って取り除かれた）
- `Content-Type: text/plain` に、415 ではなく、中を読んで答えた

同じテストを通すことで、フレームワークごとの「既定の違い」が見つかります。フレームワークを移すときは、先にこの形のテストを書いておくと、安心して移せます。第5部の成果物のテストも、同じように「外から HTTP で叩く」形で書きます。

## 7. Koa と、玉ねぎのミドルウェア

Koa は、Express を作った人たちが、`async`/`await` を前提に作り直したものです。芯はとても小さく、ルーターもボディを読む機能も、別のパッケージ（`@koa/router`、`koa-bodyparser` など）です。

```js
// Koa の形（この章では動かしません）
import Koa from 'koa';
const app = new Koa();

app.use(async (ctx, next) => {
  const start = performance.now();
  await next(); // 後ろのミドルウェアとハンドラが、全部終わるまで待つ
  ctx.set('Server-Timing', `app;dur=${(performance.now() - start).toFixed(1)}`);
});

app.use(async (ctx) => {
  ctx.body = { items: [] }; // ctx.body に入れると、Koa が JSON にして送る
});
```

`await next()` の前が「行き」、後が「帰り」です。外のミドルウェアが、内のものを包む形なので、**玉ねぎ**と呼ばれます。第4部 第18章で作った `compose` は、この形でした。

Express の `next()` は Promise を返さないので、`await next()` で後ろを待てません（第24章 2.2節）。かかった時間を測るには、`res.on('finish')` を使いました。Hono のミドルウェアも、Koa と同じ玉ねぎの形です。

```js
// Hono
app.use(async (c, next) => {
  const start = performance.now();
  await next();
  c.header('Server-Timing', `app;dur=${(performance.now() - start).toFixed(1)}`);
});
```

## 8. NestJS

NestJS は、ここまでのものと考え方がまったく違います。「どこに何を書くか」が決まっていて、TypeScript のクラスと**デコレータ**（`@Controller` のような、クラスやメソッドに付ける印）で書きます。

```ts
// tasks.service.ts（この章では動かしません）
@Injectable()
export class TasksService {
  private tasks = new Map<number, Task>();
  findOne(id: number): Task { /* … */ }
}

// tasks.controller.ts
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {} // ← NestJS が作って渡す（依存性の注入）

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasks.findOne(id); // 返した値が JSON になる
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateTaskDto) { /* … */ }
}

// tasks.module.ts
@Module({ controllers: [TasksController], providers: [TasksService] })
export class TasksModule {}
```

| NestJS の言葉 | ここまでの章では |
| --- | --- |
| Controller | ルート（第26章の `routes/`） |
| Service（Provider） | サービスの層（第26章の `services/`） |
| Module | 機能ごとのまとまり（第26章 9節のフォルダ） |
| 依存性の注入（DI） | `createApp({ service })` のように、外から渡すこと（第26章 4節）。NestJS は、これを自動でする |
| Pipe（`ParseIntPipe`、`ValidationPipe`） | 入力の確かめ（第25章の zod） |
| Guard | 認証・権限のミドルウェア（第10部） |
| Exception Filter | エラーのミドルウェア（第25章の problem+json） |
| Interceptor | 玉ねぎのミドルウェア（7節） |

NestJS の中では、HTTP の部分に Express（既定）か Fastify を使っています。だから、Express のミドルウェアを使うこともできます。

形が決まっているので、人が入れ替わっても、どのプロジェクトも似た形になります。その代わり、覚えることが多く、小さな API には重すぎます。第26章で、自分で層を分けた経験があれば、NestJS の「なぜこう書くのか」は分かりやすいはずです。

## 9. Flask との対応

Flask は、Python の小さな Web フレームワークです。`@app.route('/tasks')` のようなデコレータで、URL と関数を結びつけ、関数の返り値（文字列や辞書）が応答になります。必要なもの（データベース、入力の確かめ、ログイン）は、拡張（Flask-SQLAlchemy など）で足していく、という考え方です。Python の世界には、ほかにも次のようなものがあります。

- **Django**: 管理画面・ORM・ログインまで全部入った、大きなフレームワーク。決まった形で書く
- **FastAPI**: Python の型ヒントから、入力の確かめとドキュメント（OpenAPI）を作る、API のためのフレームワーク。`async` で書く

これを、この章のものと並べると、次のようになります。

| 考え方 | Python | Node.js |
| --- | --- | --- |
| 小さな芯に、拡張を足す | Flask | Express、Koa |
| 型やスキーマで入力と出力を決め、速さも大事にする | FastAPI（型ヒント → 確かめ） | Fastify（JSON Schema → 確かめ） |
| 形の決まった、全部入り | Django | NestJS（形）。全部入りの度合いは Django より小さい |
| 動かす場所に関係ない「入口」の決まり | WSGI・ASGI（Flask は WSGI、FastAPI は ASGI） | Web 標準の `fetch(request) => Response` |

最後の行が、5節の話です。Python では、WSGI という決まりがあるので、Flask のアプリを Gunicorn でも uWSGI でも動かせます。Node.js の世界で、それにあたるのが「`Request` を受け取って `Response` を返す関数」で、Hono や Next.js のアプリを、Node.js でも Deno でも Workers でも動かせるのは、このためです。

## 10. どう選ぶか

選ぶときに、速さの数字から入ると、たいてい間違えます。実際のアプリでは、データベースや外の API を待つ時間のほうが、フレームワークの違いよりずっと長いからです。先に、次のことを見ます。

1. **どこで動かすか**: Node.js だけなら何でもよい。Workers やエッジなら、Web 標準のもの（Hono など）
2. **チームが読めるか、続くか**: 情報とパッケージの多さ、何年使われていそうか、チームが知っているか
3. **どのくらい形を決めたいか**: 小さく自分で組む（Express・Hono・Koa）か、形の決まったもの（NestJS）か
4. **入力と出力をどう決めるか**: zod を自分で使う（Express・Hono）か、JSON Schema を中心にする（Fastify）か
5. **画面と一緒か**: Next.js なら、まず Route Handlers で足りるか

そして、どれを選んでも、**サービスの層を HTTP から切り離して**書いておきます。この章の `tasks-core.mjs` が4つのサーバでそのまま使えたように、そうしておけば、フレームワークは後から替えられます。

この教材の成果物は、Express のまま進めます。第6部でデータベースを、第7部で TypeScript を足しても、書き方は変わりません。

## まとめ

- Node.js のフレームワークには、Node.js の `req`・`res` の上のもの（Express・Koa・Fastify・NestJS）と、Web 標準の `Request`・`Response` のもの（Hono・Next.js）がある。
- Fastify は JSON Schema で入力と出力を決める。出力のスキーマに無い項目は出ない。`coerceTypes` と `removeAdditional` の既定に気をつける。
- Hono のアプリは `app.fetch(request) => Response` という1つの関数なので、Node.js・Deno・Bun・Workers のどこでも動く。Node.js では、`req`・`res` とつなぐアダプタが要る。
- Koa・Hono のミドルウェアは `await next()` で後ろを待てる玉ねぎの形。Express の `next()` は待てない。
- NestJS は、コントローラ・サービス・モジュールと依存性の注入で、形を決めて書く。
- 外から HTTP で叩く契約のテストを書けば、フレームワークを替えても、約束が同じかを確かめられる。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用2問・発展2問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Fastify 公式: https://fastify.dev/docs/latest/
- Fastify「Validation and Serialization」: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/
- Hono 公式: https://hono.dev/docs/
- Koa 公式: https://koajs.com/
- NestJS 公式: https://docs.nestjs.com/
- Next.js「Route Handlers」: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- MDN「Request」: https://developer.mozilla.org/ja/docs/Web/API/Request
- MDN「Response」: https://developer.mozilla.org/ja/docs/Web/API/Response
- MDN「URLPattern」: https://developer.mozilla.org/ja/docs/Web/API/URLPattern
- JSON Schema: https://json-schema.org/understanding-json-schema/
- Flask「Quickstart」: https://flask.palletsprojects.com/en/stable/quickstart/

前の章: [第27章 リアルタイム通信](../ch27-realtime/README.md) ／ 次: [第5部の成果物 タスク API](../project-task-api/README.md)
