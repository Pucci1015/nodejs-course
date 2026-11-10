# 第28章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part05/ch28-framework-map/exercises` で実行） |
| --- | --- | --- |
| 1 | [web-json.mjs](web-json.mjs) | `MODULE=../solutions/web-json.mjs node --test web-json.test.mjs` |
| 2 | [hello-hono.mjs](hello-hono.mjs) | `MODULE=../solutions/hello-hono.mjs node --test hello-hono.test.mjs` |
| 3 | [fastify-basic.mjs](fastify-basic.mjs) | `MODULE=../solutions/fastify-basic.mjs node --test fastify-basic.test.mjs` |
| 4 | このページ | — |
| 5 | [hono-tasks.mjs](hono-tasks.mjs) | `MODULE=../solutions/hono-tasks.mjs node --test hono-tasks.test.mjs` |
| 6 | [fastify-users.mjs](fastify-users.mjs) | `MODULE=../solutions/fastify-users.mjs node --test fastify-users.test.mjs` |
| 7 | [web-adapter.mjs](web-adapter.mjs) | `MODULE=../solutions/web-adapter.mjs node --test web-adapter.test.mjs` |
| 8 | [web-router.mjs](web-router.mjs) | `MODULE=../solutions/web-router.mjs node --test web-router.test.mjs` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。

---

## 問題1 Web 標準の Request・Response で JSON を読む `readJson`・`problemResponse`

```js
import http from 'node:http';

export async function readJson(request) {
  const type = request.headers.get('content-type') ?? '';
  if (type.split(';')[0].trim().toLowerCase() !== 'application/json') return { ok: false, status: 415 };
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false, status: 400 };
  }
}

export function problemResponse(status, instance) {
  const body = { type: 'about:blank', title: http.STATUS_CODES[status] ?? 'Error', status, instance };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}
```

- Express では `express.json()` が先にボディを読んでいましたが、Web 標準では、ハンドラが `await request.json()` で読みます。読むかどうか、いつ読むかを、ハンドラが決められます。
- この2つは、Express・Hono・Next.js のどれでも、`Request` と `Response` さえあれば使えます。

## 問題2 Hono で小さなアプリを作る `createHelloApp`

```js
import { Hono } from 'hono';

const INT = /^-?[0-9]{1,9}$/;

export function createHelloApp() {
  const app = new Hono();

  app.get('/hello/:name', (c) => c.json({ message: `こんにちは、${c.req.param('name')} さん` }));

  app.get('/add', (c) => {
    const a = c.req.query('a') ?? '';
    const b = c.req.query('b') ?? '';
    if (!INT.test(a) || !INT.test(b)) return c.json({ error: 'a と b は整数です' }, 400);
    return c.json({ sum: Number(a) + Number(b) });
  });

  app.delete('/items/:id', (c) => c.body(null, 204));

  return app;
}
```

- `Number('')` は `0`、`Number('2e1')` は `20` になります。先に正規表現で形を確かめるので、どちらも 400 になります（第25章 5.2節と同じ）。
- `app.request` で試せるのは、Hono のアプリが `Request → Response` の関数だからです。

## 問題3 Fastify の JSON Schema を書く `buildApp`

```js
import Fastify from 'fastify';

export function buildApp() {
  const app = Fastify({
    ajv: { customOptions: { removeAdditional: false } }, // 知らない項目は断る
  });

  app.get('/ping', async () => ({ pong: true }));

  app.post(
    '/notes',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 140 },
            pinned: { type: 'boolean', default: false },
          },
          required: ['text'],
          additionalProperties: false,
        },
        response: {
          201: {
            type: 'object',
            properties: { id: { type: 'integer' }, text: { type: 'string' }, pinned: { type: 'boolean' } },
            required: ['id', 'text', 'pinned'],
          },
        },
      },
    },
    async (req, reply) => {
      const note = { id: 1, text: req.body.text, pinned: req.body.pinned, owner: 'alice' };
      return reply.code(201).send(note);
    },
  );

  return app;
}
```

- ハンドラは `owner` も返していますが、応答には出ません。データベースの行をそのまま返しても、出してよいものだけが出る、という守りになります（本文3.1節）。
- 400 になるのは、Fastify の既定です。中身の間違いを 422 にする方法は、問題6で扱います。

## 問題4 フレームワークを選ぶ

| # | 選ぶもの | 理由 | 迷ったもの |
| --- | --- | --- | --- |
| 1 | Express | この教材で仕組みを学んだもので、情報とミドルウェアがいちばん多い。第6・7部でデータベースと TypeScript を足しても、書き方が変わらない | Fastify（スキーマで入力と出力を決められる。zod と第25章の problem+json で、Express でも同じことをしている） |
| 2 | Fastify | JSON Schema から、確かめる関数と JSON にする関数を前もって作るので速い。出力のスキーマが、出してはいけない項目を守る | Hono（Node.js の上では、Fastify と同じくらい速いことが多い） |
| 3 | Hono | Web 標準の `Request`・`Response` だけで動くので、Cloudflare Workers・Deno・Bun・Node.js のどこでも同じコードで動く。Express と Fastify は Node.js の `http` に頼っているので、そのままでは動かない | 何も使わずに `fetch(request)` を書く（小さければ十分） |
| 4 | NestJS | モジュール・コントローラ・サービスの置き場所と書き方が決まっていて、依存性の注入（第26章 4節）の仕組みもあるので、人が入れ替わっても形が崩れにくい。TypeScript が前提 | Fastify か Express に、チームで決めたフォルダの形（第26章 9節）を足す |
| 5 | Next.js の Route Handlers（または Server Actions） | 画面と同じ所に、`app/api/…/route.ts` を置くだけで済む。別のサーバを立てなくてよい | 別に Express の API を立てる（画面以外からも呼ばれる、大きな API なら） |
| 6 | Express のまま | 動いているものを、少し足すために書き直すのは危ない。新しい部分だけ Router に分け、層を分けて書いておけば、いつか移すときにサービスの層をそのまま持っていける | — |

選ぶときは、「速さ」よりも「チームが読めるか」「動かす場所で動くか」「何年使われていそうか（情報とパッケージ）」を先に見ます。この章のサンプルのように、サービスの層を HTTP から切り離しておけば、フレームワークは後から替えられます。

## 問題5 Hono のタスク API に PATCH と DELETE を足す

[hono-tasks.mjs](hono-tasks.mjs) を見てください。

- **`readJson` を関数に出す**: 415・400 の確かめを、POST と PATCH の両方に書くと、片方だけ直す、が起きます。読めなかったときは `Response` を返し、呼んだ側は `body instanceof Response` で見分けています。Hono のミドルウェア（`app.use('/tasks/*', …)`）にしたり、`@hono/zod-validator` のようなパッケージで確かめたりもできます
- **決まりはサービスに**: 「空のオブジェクトは 422」「done は真偽」は `tasks-core.mjs` の `update` が確かめます。ルートは「数の id にする」「JSON を読む」「204 を返す」だけです。第26章で分けた層が、フレームワークを替えてもそのまま使えています
- **`c.body(null, 204)`**: Hono では、本文の無い応答をこう書きます。`c.json(null, 204)` と書くと、`null` という本文を送ろうとしてしまいます

## 問題6 Fastify の JSON Schema で、入力と出力を決める

[fastify-users.mjs](fastify-users.mjs) を見てください。

- **出力のスキーマは「出してよいものの一覧」**: Fastify は、レスポンスのスキーマから JSON にする関数を作り、スキーマに無い項目は書きません。データベースから読んだ行をそのまま返しても、`passwordHash` は出ません。速くするための仕組みですが、守りにもなります。Express では、自分で `{ id: u.id, name: u.name }` のように選んで返します
- **ひな形の `...req.body` が後ろにある**: `{ id, role: 'member', ...req.body }` は、客が送った `role: 'admin'` で上書きされます（マスアサインメント）。ボディのスキーマで知らない項目を断れば、ここに届く前に止まります。それでも、項目を1つずつ選んで代入するほうが安全です
- **`coerceTypes` と `removeAdditional`**: Fastify は、既定で ajv に「型を変えてよい」「知らない項目を取り除いてよい」を設定しています。クエリの `limit=' 20'` は 20 に、`?page=2` は黙って消えます。第25章の `z.coerce.number()` と同じ落とし穴です。この解答では、`removeAdditional: false` にし、`limit` は `type: 'string'` と `pattern` で形を決めました
- **`validationContext`**: Fastify 5 は、スキーマに合わなかった場所（`body`・`querystring`・`params`・`headers`）を `err.validationContext` に入れます。第25章の「URL は 400、ボディは 422」に合わせられます

## 問題7 Node.js の req・res と Web 標準をつなぐ

[web-adapter.mjs](web-adapter.mjs) を見てください。

- **`rawHeaders`**: `req.headers` は、同じ名前のヘッダを `, ` でつないだり（多くのヘッダ）、最初の1つだけを残したり（`Content-Type` など一部のヘッダ）します。`rawHeaders` は届いたままの並びなので、`append` で1つずつ入れると、`Headers` が Web 標準の決まりでつないでくれます
- **`Set-Cookie`**: `Expires=Thu, 01 Jan 2099 …` の中に `,` があるので、`Set-Cookie` だけは `, ` でつなげません。`Headers` は `Set-Cookie` を別扱いにしていて、`getSetCookie()` で配列として取り出せます。Node.js の `res.writeHead` に配列を渡すと、1つずつの行で送ります
- **ためない**: `await response.arrayBuffer()` は、本文を全部読むまで1バイトも送りません。SSE（第27章）は終わらないので、永遠に送られません。大きなファイルなら、その大きさのメモリを使います
- **切れたら知らせる**: 客が切ったのに、ハンドラが外の API やデータベースを待ち続けるのは無駄です。`request.signal` を `fetch(url, { signal: request.signal })` のように渡せば、まとめてやめられます
- `@hono/node-server` の中身も、大きくはこの形です。さらに、よく使う形の応答（文字列・JSON）では、`ReadableStream` を作らずに速く送るような工夫がしてあります

## 問題8 Web 標準で動く小さなルーター

[web-router.mjs](web-router.mjs) を見てください。

- **405 と Allow**: パスがどのルートにあてはまったかを覚えておき、メソッドだけが違うときは 405 にします。Express は、これをしないので 404 になります（第23章）
- **HEAD**: GET のハンドラの `Response` から、ステータスとヘッダだけを使い、本文を `null` にした `Response` を作り直します
- **玉ねぎのミドルウェア**: `dispatch(n)` が `n` 番目のミドルウェアに `() => dispatch(n + 1)` を `next` として渡します。`next()` が後ろ全部の `Response` の Promise を返すので、`await next()` の後に、応答に手を加えられます。第4部 第18章の `compose` と同じです。かかった時間は、次のように書けます

```js
router.use(async (request, next) => {
  const start = performance.now();
  const res = await next();
  const out = new Response(res.body, res); // headers を変えられるように作り直す
  out.headers.set('Server-Timing', `app;dur=${(performance.now() - start).toFixed(1)}`);
  return out;
});
```

- **`Response` の headers は変えられないことがある**: `Response.json()` などで作った `Response` の headers は変えられますが、`fetch` で受け取ったものは変えられません。`new Response(res.body, res)` で作り直すと、いつでも変えられます
- Hono の本物は、ルートの探し方（RegExp をまとめた木など）を工夫して速くしてあり、`c.json()` などの書きやすい道具（Context）を持っています。仕組みの芯は、このルーターと同じです
