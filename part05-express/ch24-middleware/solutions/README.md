# 第24章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part05/ch24-middleware/exercises` で実行） |
| --- | --- | --- |
| 1 | [request-id.mjs](request-id.mjs) | `MODULE=../solutions/request-id.mjs node --test request-id.test.mjs` |
| 2 | [require-json.mjs](require-json.mjs) | `MODULE=../solutions/require-json.mjs node --test require-json.test.mjs` |
| 3 | [tasks-router.mjs](tasks-router.mjs) | `MODULE=../solutions/tasks-router.mjs node --test tasks-router.test.mjs` |
| 4 | このページ | `node predict-order.mjs` |
| 5 | [rate-limit.mjs](rate-limit.mjs) | `MODULE=../solutions/rate-limit.mjs node --test rate-limit.test.mjs` |
| 6 | [access-log.mjs](access-log.mjs) | `MODULE=../solutions/access-log.mjs node --test access-log.test.mjs` |
| 7 | [mini-express.mjs](mini-express.mjs) | `MODULE=../solutions/mini-express.mjs node --test mini-express.test.mjs` |
| 8 | [session-app.mjs](session-app.mjs) | `bash check-session.sh ../solutions/session-app.mjs` |
| 9 | [api.mjs](api.mjs) | `bash check-api.sh ../solutions/api.mjs` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。

---

## 問題1 リクエストに ID を付けるミドルウェア `requestId`

```js
import crypto from 'node:crypto';

const VALID = /^[A-Za-z0-9-]{1,64}$/;

export function requestId() {
  return (req, res, next) => {
    const sent = req.get('x-request-id');
    req.id = typeof sent === 'string' && VALID.test(sent) ? sent : crypto.randomUUID();
    res.set('X-Request-Id', req.id);
    next();
  };
}
```

- `requestId()` は、呼ぶたびに新しいミドルウェアを返します。今は設定がありませんが、「ヘッダの名前を変えたい」などの設定を後から足せる形です。
- 問題6の `accessLog` は、`req.id` があればログに書きます。`requestId()` を先に `app.use` しておくと、つながります。

## 問題2 JSON を求めるミドルウェア `requireJson`

```js
const WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

export function requireJson(req, res, next) {
  if (WITH_BODY.has(req.method) && !req.is('application/json')) {
    return res.status(415).json({ error: 'unsupported_media_type', message: 'JSON で送ってください' });
  }
  next();
}
```

- `return` を忘れると、415 を返した後に `next()` も呼ばれ、ハンドラが動いて2回目の応答で `ERR_HTTP_HEADERS_SENT` になります。テストの「後ろのハンドラは動かない」がそれを確かめています。
- `express.json()` の**前**に置くと、JSON でないボディを読む前に断れます。

## 問題3 タスクのルートを Router にまとめる

```js
import express from 'express';

export function createTasksRouter(tasks) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const done = req.query.done;
    if (done === undefined) return res.json(tasks);
    if (done !== 'true' && done !== 'false') {
      return res.status(400).json({ error: 'bad_request', message: 'done は true か false です' });
    }
    res.json(tasks.filter((t) => t.done === (done === 'true')));
  });

  router.get('/:id', (req, res) => {
    const task = tasks.find((t) => String(t.id) === req.params.id);
    if (!task) return res.status(404).json({ error: 'not_found', message: 'タスクがありません' });
    res.json(task);
  });

  return router;
}
```

- `tasks` を引数で受け取るので、テストでは決まったデータを渡せます。第26章の「使うものを外から渡す」の小さな形です。
- `done === 'true'` は真偽値になります。`t.done === (done === 'true')` で、`true` か `false` のどちらかに合うものを選んでいます。

## 問題4 ミドルウェアが動く順番を予想する

```text
1. GET /shop/items    → 200 "items"   記録: A B(/items) C a c D
2. GET /early         → 200 "early"   記録: A E F H a
3. GET /boom          → 500 "500"     記録: A E G I(boom) a
4. GET /nothing       → 404 "404"     記録: A E H a
5. GET /SHOP/items/   → 200 "items"   記録: A B(/items/) C a c D
6. GET /shop          → 404 "404"     記録: A B(/) E H a
```

- **1番**: A の `next()` は、後ろのミドルウェアを**同期的に**呼びます。C は async 関数なので、`await` のところで Promise を返して止まり、そこで `next()` が A に戻ってきます。だから `a` は `c` と `D` より先です。「`next()` の後に書けば、応答の後に動く」とはならないので、応答の後にしたいことは `res.on('close')` で書きます（本文 4節）。第18章の `compose`（Koa 風）では `await next()` と書けたので、後ろが全部終わるのを待てました。Express の `next` は何も返さないので、待てません
- **2番**: `res.send` の後でも、`next()` を呼べば次の層（H）が動きます。H に `headersSent` の確かめが無ければ、`res.status(404).send('404')` で `ERR_HTTP_HEADERS_SENT` です。応答したら `next()` を呼ばない、が原則です
- **3番**: E はふつうのミドルウェアなので、G より前（ルートを探している途中）に動きます。G で `throw` した後は、引数が3つの H は飛ばされ、引数が4つの I だけが動きます
- **5番**: Express は大文字・小文字を区別せず、最後の `/` も無視するので、B も C・D も動きます。B の中の `req.url` は、`/SHOP` を取り除いた残りの `/items/` です
- **6番**: `app.use('/shop', …)` は `/shop` そのものにもあてはまり、`req.url` は `/` になります。`app.get('/shop/items')` は `/shop` にはあてはまらないので C・D は動かず、E と H（404）まで進みます

## 問題5 回数を制限するミドルウェア

[rate-limit.mjs](rate-limit.mjs) を見てください。

- 客ごとに `{ count, resetAt }` を `Map` に覚えます。`resetAt` を過ぎていたら、新しい窓を始めます
- 終わった窓の記録は、`windowMs` に1回だけ、まとめて消します（`prune`）。毎回すべてを調べると、客が多いときに遅くなります
- ヘッダの名前は、IETF で話し合われている RateLimit ヘッダの案の、古い形です。執筆時点では標準になっていないので、使う側（第8部の画面など）と決めごとにします。`Retry-After` は標準（RFC 9110 10.2.3、429 は RFC 6585）です
- **固定の窓の弱点**: 窓の境目をまたぐと、短い間に `2 × limit` 回通ります。減らす方法には「直前の窓の数を、重なっている割合で足す（スライディングウィンドウ）」や「一定の速さで回復する入れ物（トークンバケット）」があります
- **`req.ip` の注意**: リバースプロキシの後ろでは、すべてのリクエストの `req.ip` がプロキシの IP になり、全員で1つの上限を分け合うことになります。`trust proxy` を設定すれば `X-Forwarded-For` から読みますが、信じてよいプロキシを正しく指定しないと、客がヘッダを偽って制限をすり抜けられます（第12部 第62章）
- サーバが複数台なら、台ごとに数えることになります。共有するなら Redis に数えます（第6部 第34章）。本番では、`express-rate-limit` などのパッケージと、Redis のストアを使うのがふつうです

## 問題6 アクセスログのミドルウェア

[access-log.mjs](access-log.mjs) を見てください。

- **`close` で書く**: `finish` は「最後まで書いた」ときだけ来るので、客が先に切ると来ません。`close` は必ず1回来るので、`res.writableFinished` で「最後まで返せたか」を見分けます（第17章 練習問題5と同じ）
- **バイト数は `write` と `end` を包んで数える**: `Content-Length` ヘッダを見る方法では、chunked で返したもの（`res.write` を何回か呼んだもの）を数えられません。文字列は `Buffer.byteLength` で、バイト数にしてから数えます（`'こんにちは'.length` は 5、バイト数は 15）
- **秘密の値を隠す**: パスワードの再設定のリンクや OAuth（第10部）では、URL のクエリに `token` や `code` が入ります。アクセスログは、多くの人が読める場所に長く残るので、そこに秘密を書かないようにします。`URLSearchParams` で読み直して置き換えるので、`token=a&token=b` のように2回あっても両方を隠せます
- **長さの上限**: とても長い URL を送り続けられると、ログのファイルがふくらみます

morgan を使うなら、`morgan.token('url', (req) => redact(req.originalUrl))` のように、URL の出し方を差し替えられます。第26章では、JSON の形でログを書くライブラリ pino を使い、同じことを `redact` の設定でします。

## 問題7 Express の芯を作る

[mini-express.mjs](mini-express.mjs) を見てください。要点です。

- **層の列と添字**: `layers` に `{ kind: 'use', prefix, fn }` と `{ kind: 'route', method, re, names, handlers }` を登録順に入れ、リクエストごとに `index` を 0 から進めます。`next` は「次の層を探して動かす」関数で、あてはまらない層は `return next(err)` で飛ばします
- **エラーかどうかで、動かす層を変える**: `fn.length`（関数の引数の数）が 4 ならエラーハンドラです。Express もこの方法で見分けているので、使わない引数でも `next` を書かないといけません。デフォルト値（`(err, req, res, next = x) => …`）や残余引数を使うと `length` が変わるのも、この方法の弱点です
- **前置きの書き換えと戻し**: `use('/admin')` の層を動かす直前に `req.url` と `req.baseUrl` を書き換え、`next` の最初で元に戻します。戻さないと、後ろのルートが `/admin` の無いパスで探してしまいます
- **例外をすべて `next(err)` にする**: `call` で、同期の `throw` は `try`、Promise の reject は `.then(undefined, …)` で受け止めます。Express 5 の「async 関数の例外を受け止める」は、この数行です
- **`once`**: 同じ `next` を2回呼ばれても、次は1回しか動かないようにしました。これが無いと、2回目の `next()` で、後ろのハンドラが2回動きます（2回応答しようとする）
- **最後の砦 `done`**: 404 と 500 を返す。500 では `err.message` を見せない。途中まで送っていたら `res.destroy()`（第17章 練習問題5と同じ）

本物の Express（`router` パッケージ）は、これに加えて、パラメータの前処理（`router.param`）、`next('router')`、パスの書き方（path-to-regexp）、`req.params` のつなぎ方（`mergeParams`）などを持っています。コードは数百行なので、この解答を読んだ後なら、`node_modules/router/index.js` も読めるはずです。

## 問題8 express-session の設定と使い方のバグを直す

[session-app.mjs](session-app.mjs) を見てください。

| 設定・使い方 | 第22章で自分で作ったもの | 直し方 |
| --- | --- | --- |
| 鍵 | 32 文字以上でなければ `TypeError` | `SESSION_SECRET` を環境変数から読み、短ければ起動しない |
| 空のセッション | 作らない（見るだけの客に Cookie を送らない） | `saveUninitialized: false` |
| Cookie の属性 | `HttpOnly`・`SameSite=Lax` | `cookie: { httpOnly: true, sameSite: 'lax' }` |
| Cookie の名前 | 自分で決めた | `name: 'sid'`（既定の `connect.sid` は Express だと知らせる） |
| ログイン | `req.regenerateSession()` | `req.session.regenerate(cb)`。中身は消えるので、残すもの（かご）は先に取っておく |
| ログアウト | `req.destroySession()` | `req.session.destroy(cb)` と `res.clearCookie` |

- **`saveUninitialized: true` の害**: 見るだけの客にもセッションを作り、保存場所（ここではメモリ）にためていきます。ボットが Cookie を返さずにアクセスし続けると、その数だけ増えます。また、EU などでは「必要のない Cookie」を同意なしに置くことが問題になります
- **regenerate を忘れると**: 確認10は「攻撃者が自分で手に入れたセッションの ID を、何かの方法で相手のブラウザに覚えさせ、相手がログインした後にその ID を使う」というセッション固定化を、自分のサーバの中で確かめています。ログインのときに ID を作り直せば、ログイン前の ID は無効になります
- **destroy しないと**: `delete req.session.user` だけでは、セッション（かごなど）が保存場所に残り、古い Cookie で読めてしまいます。共有のパソコンで「ログアウトしたのに、前の人のかごが見える」状態です
- `res.clearCookie` には、セッションの Cookie を作ったときと同じ `path`・`sameSite` などを渡します。属性が違うと、ブラウザは別の Cookie だと思って消しません
- この解答でも、保存場所は既定の MemoryStore のままです。express-session 自身が「本番では使わないこと」と書いています（プロセスを止めると消える、サーバ間で共有できない、古いものを消さない）。第6部 第34章で Redis に置きます

## 問題9 ミドルウェアの並べ方と書き方のバグを直す

[api.mjs](api.mjs) を見てください。直したところには `// 修正:`・`// 追加:` を付けました。

| バグ | 起きていたこと | 通る確認 |
| --- | --- | --- |
| `logger` がリクエストの時点でステータスを書いていた | いつも 200 と書かれる | 16 |
| `requireAuth` の 401 の後に `return` が無い | 401 を返した後も `next()` でハンドラが動き、**タスクが消えていた**。その後 `ERR_HTTP_HEADERS_SENT` | 8, 9 |
| `admin` の Router で、`/stats` が `requireAuth` より前 | Router の中も登録した順。`/stats` は守られていなかった | 11 |
| `cors({ origin: '*', credentials: true })` | `Access-Control-Allow-Origin: *` になる。ブラウザは `*` と Cookie を一緒に使うことを断るので、5173 からも呼べない。しかも、どのオリジンにも同じヘッダを返す | 13, 15 |
| エラーハンドラがルートより前 | ルートで起きたエラーが届かず、Express の既定の HTML になっていた | 2, 3 |
| `express.json()` がルートより後 | ルートが動くときには、ボディがまだ読まれていない（`req.body` は `undefined`） | 5 |
| 404 のミドルウェアが無い | Express の既定の HTML の 404 | 4 |

- 並べる順番の基本は「ログ → CORS → ボディ → ルート → 404 → エラーハンドラ」です。ログをいちばん前に置くのは、後ろで何が起きても（CORS で断っても、404 でも）記録するためです
- 確認8が大事です。`requireAuth` のバグでは、**客には正しい 401 が見えている**のに、サーバの中ではハンドラが動いて、データが変わっていました。「応答は正しいか」だけでなく「状態は変わっていないか」まで確かめるテストが必要な理由です
- 確認6（422）は直す前から通ります。`req.body` が `undefined` で `req.body?.title` も `undefined` になり、たまたま 422 になっていたからです。確認5（正しいボディで 201）があって、初めてバグが分かります
