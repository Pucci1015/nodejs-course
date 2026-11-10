# 第24章 ミドルウェア

第23章で使った `express.json()` や `express.static()` は、**ミドルウェア**と呼ばれる部品でした。Express のアプリは、ほとんどがミドルウェアの列でできています。ログ、CORS、ボディの読み取り、ログインの確かめ、エラーの形をそろえること——どれも「リクエストがハンドラに届く前後に、はさむ処理」です。
この章では、ミドルウェアがどの順番で、どう動くのかを確かめ、自分で書けるようにします。並べる順番を1つ間違えるだけで、ログインの確かめが効かなくなったり、エラーの中身が外に出たりします。最後に、Express の芯を自分で作って、仕組みを確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第23章、第4部 第18章 10節（ミドルウェアと `compose`）、第22章（セッション）、第2部 第9章（CORS） |
| この章のゴール | ミドルウェアが動く順番を、図に描いて説明できる / `next()`・`next(err)`・`next('route')` の違いを説明できる / 「応答の後」に動く処理を正しく書ける / ログ・回数の制限・ログインの確かめなどのミドルウェアを自分で書ける / cors・morgan・express-session を、意味を分かって設定できる / `express.Router` でルートを分けられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`order.mjs`・`timing.mjs`・`require-key.mjs`・`routers.mjs`）と、動く順番、エラーの流れ、応答の後の処理、自分で書くミドルウェア、cors と morgan、express-session、Router を確かめるプログラム |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答（問題5の `rateLimit` と問題6の `accessLog` は、成果物でも使います） |

> **読み方**
> - この章のコマンドは、すべて `~/dev/part05/ch24-middleware/` で実行します（第23章で `setup-part05.sh` を動かして、`~/dev/part05` を作ってあります）。
>
>   ```sh
>   $ cd ~/dev/part05/ch24-middleware
>   ```
>
> - 「**手を動かす**」の所は、新しいファイルに書いて動かしてください。ファイルの完成形は `samples/` にあります。「中身は読まなくてよい」と書いたサンプルは、動かして結果を見るだけで十分です。
> - 「手を動かす」のサーバは 9317 番を使います。次のサーバを動かす前に `Ctrl+C` で止めてください。`curl` は別のターミナルで打ちます。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| ミドルウェアの順番と `next`（2・3節） | 第5部のすべての章、成果物 |
| 応答の後のログ（4節） | 第26章（JSON のログ）、成果物 |
| 設定を受け取ってミドルウェアを返す関数（5節） | 第25章（入力の確かめ）、第10部（認証） |
| `express.Router`（7節） | 第26章（ルートをファイルに分ける）、成果物 |

---

## 1. Flask では何がミドルウェアだったか

Flask にも、ハンドラ（ビュー関数）の前後に処理をはさむ方法がいくつかありました。

```python
@app.before_request
def load_user():
    g.user = find_user(session.get('user_id'))   # すべてのリクエストの前に動く

@app.after_request
def add_header(response):
    response.headers['X-Frame-Options'] = 'DENY'  # レスポンスを返す前に動く
    return response

@app.errorhandler(404)
def not_found(e):
    return jsonify(error='not_found'), 404
```

- `before_request` は、ビュー関数の前に、登録した順に動きます。ここで値を返すと、ビュー関数は呼ばれずに、それがレスポンスになります（ログインしていなければ、ここでログインの画面に送る、など）
- `after_request` は、ビュー関数が作ったレスポンスを受け取り、手を加えて返します
- `errorhandler` は、例外やステータスごとの「エラーのときの返し方」です
- さらに外側には、WSGI のミドルウェア（アプリを包むアプリ）という仕組みもあります

Flask では「前」「後」「エラー」で別々の書き方でした。Express では、これらを**すべて同じ形の関数** `(req, res, next) => …` で書きます。前の処理も、ハンドラも、後の処理の準備も、エラーの返し方も、1本の列に並べます。

## 2. ミドルウェアと `next`

### 2.1 列を前から順に動かす

ミドルウェアは `(req, res, next)` を受け取る関数です。仕事をしたら `next()` を呼んで次へ進むか、自分で応答して列を終わらせます。

**手を動かす**: 動く順番を記録する `order.mjs` を作ります（完成形は [samples/order.mjs](samples/order.mjs)）。

```js
import express from 'express';

const PORT = 9317;
const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  console.log(`--- ${req.method} ${req.originalUrl}`);
  console.log('A: いちばん前');
  next();
  console.log('A: next() の後');
});

app.use('/admin', (req, res, next) => {
  console.log(`B: /admin の中 req.url=${req.url} req.baseUrl=${req.baseUrl}`);
  next();
});

app.get('/admin/users/:id', (req, res) => {
  console.log('C: ハンドラ');
  res.send(`user ${req.params.id}\n`);
});

app.get('/hello', (req, res) => {
  console.log('C: ハンドラ');
  res.send('hello\n');
});

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
```

```sh
$ node order.mjs
# 別のターミナルで
$ curl -s http://127.0.0.1:9317/admin/users/7
user 7
$ curl -s http://127.0.0.1:9317/hello
hello
```

サーバのターミナルには、次のように出ます。

```text
--- GET /admin/users/7
A: いちばん前
B: /admin の中 req.url=/users/7 req.baseUrl=/admin
C: ハンドラ
A: next() の後
--- GET /hello
A: いちばん前
C: ハンドラ
A: next() の後
```

もっと多くの場面（`next('route')` など）を試せるのが [samples/order-demo.mjs](samples/order-demo.mjs) です（`node samples/order-demo.mjs` で動かします。中身は読まなくてよい）。

- `app.use(fn)` は、すべてのリクエストで動きます。`app.get(…)` などのルートも、列の1つの層です。Express は、**ミドルウェアとルートを、登録した順に1本の列にして**、前から試します
- `app.use('/admin', fn)` は、パスが `/admin` か `/admin/…` のときだけ動きます。中では `req.url` から `/admin` が取り除かれ、取り除いた部分が `req.baseUrl` に入ります。元の URL は `req.originalUrl` です。抜けた後は元に戻ります
- `next()` を呼ばず、応答もしなければ、客は待たされ続けます。必ずどちらかをします
- 応答した後に `next()` を呼ぶと、後ろのミドルウェアが動いてしまいます（練習問題4の2番）。「応答したら `return`」と決めておきます

### 2.2 `next()` の後は「応答の後」ではない

上の A は、`next()` の後にも記録を書いています。ハンドラが同期的に終わるなら、たしかに「後」に動きます。しかし、ハンドラが `await` を含む async 関数なら、`await` で止まったところで `next()` が戻ってきます。

```text
1. GET /shop/items    → 200 "items"   記録: A B(/items) C a c D
```

練習問題4のこの結果では、`a`（A の `next()` の後）が、`c`（C の `await` の後）や `D`（ハンドラ）より先です。Express の `next` は Promise を返さないので、「後ろが全部終わるまで待つ」ことができません。第18章で作った `compose`（Koa 風）は、`await next()` で待てたのと対照的です（第28章の Hono も Koa 風です）。

応答の後に動かしたい処理（ログ、時間を測る）は、4節の方法で書きます。

### 2.3 1つのルートに、複数のハンドラ

ルートには、ハンドラをいくつでも並べられます。前のものが `next()` を呼べば、次のものが動きます。

```js
app.post('/api/tasks', requireLogin, express.json(), validateTask, createTask);
```

「このルートだけに必要なミドルウェア」は、こうしてルートに付けると、どのルートに何が付いているかが一目で分かります。

`next('route')` と書くと、そのルートの残りのハンドラを飛ばして、次の層（次のルート）へ進みます（[samples/order-demo.mjs](samples/order-demo.mjs) の `/skip/1`）。「条件によって、別のルートに任せる」ときに使いますが、流れが追いにくくなるので、多用しません。

## 3. エラーの流れ

### 3.1 `next(err)` は、エラーハンドラまで飛ぶ

`next` に引数（`'route'` 以外）を渡すと、それはエラーとして扱われます。ハンドラの中で `throw` したときや、async 関数が reject したときも同じです（第23章 8節）。エラーになると、Express は**引数が3つ以下の層を飛ばし、引数が4つの層（エラーハンドラ）だけを順に動かします**（[samples/error-flow-demo.mjs](samples/error-flow-demo.mjs)。`node samples/error-flow-demo.mjs` で動かします。中身は読まなくてよい）。

```sh
$ curl -s http://127.0.0.1:9311/fail
サーバのエラー
# サーバのターミナル
--- GET /fail
   ハンドラ: next(err) を呼ぶ
   エラーハンドラ1: 失敗しました（ログに書いて、次へ渡す）
   最後のエラーハンドラ: 失敗しました
```

- 途中にある「ふつうのミドルウェア」と「404 のミドルウェア」は、どちらも引数が3つ以下なので飛ばされました
- エラーハンドラも `next(err)` で次のエラーハンドラに渡せます。「ログに書くもの」「エラーを JSON にするもの」と分けられます
- エラーハンドラが `next()`（引数なし）を呼ぶか、ふつうに応答すれば、エラーは終わりです（`/recover`）

```text
                ┌──── エラーが無い ────┐            ┌──── エラーがある ────┐
層の列:  A(3)  B(3)  ルート  E(4)  404(3)  F(4)      A(3)  B(3)  ルート  E(4)  404(3)  F(4)
動くもの:  ●     ●     ●      ×      ●      ×          ●     ●   ●throw   ●      ×      ●
                                  （引数4つは飛ばす）              （引数3つ以下は飛ばす）
```

### 3.2 404 はエラーではない

「どのルートにもあてはまらなかった」は、Express にとってはエラーではありません。列の最後まで誰も応答しなかった、というだけです。だから、404 を返す層は**引数3つ**で、ルートの後に置きます。そして、エラーハンドラ（引数4つ）を、さらにその後ろ、列のいちばん最後に置きます。

```js
app.use('/api', apiRouter);
app.use((req, res) => res.status(404).json({ error: 'not_found' }));            // 404
app.use((err, req, res, next) => { /* エラーを JSON にする */ });               // エラー
```

エラーハンドラをルートより**前**に置くと、ルートで起きたエラーはそのエラーハンドラに届かず、Express の既定の HTML（開発中はスタックトレース入り）になります（練習問題9）。

## 4. 応答の後に動く処理

### 4.1 `res` のイベントを使う

アクセスログには、ステータスと、かかった時間が要ります。どちらも、ハンドラが応答した後でないと分かりません。2.2節のとおり `next()` の後では早すぎるので、`res` のイベントを使います（第17章 練習問題5と同じ考え方）。

```js
export function accessLog({ write = (line) => console.log(line) } = {}) {
  return (req, res, next) => {
    const start = performance.now();
    res.once('close', () => {
      const ms = (performance.now() - start).toFixed(1);
      const status = res.writableFinished ? res.statusCode : 'aborted';
      write(`${req.method} ${req.originalUrl} ${status} ${ms}ms ${req.id ?? '-'}`);
    });
    next();
  };
}
```

| イベント | 来るとき |
| --- | --- |
| `finish` | 本文を最後まで書き終えたとき。客が先に切ると来ない |
| `close` | 接続（このリクエストの応答）が閉じたとき。**必ず1回来る**。`res.writableFinished` で、最後まで書けたかが分かる |

**手を動かす**: 応答の後にログを書く `timing.mjs` を作ります（完成形は [samples/timing.mjs](samples/timing.mjs)）。

```js
import express from 'express';

const PORT = 9317;
const app = express();
app.disable('x-powered-by');

function timing(req, res, next) {
  const start = performance.now();
  res.once('close', () => {
    const ms = (performance.now() - start).toFixed(1);
    const status = res.writableFinished ? res.statusCode : 'aborted';
    console.log(`${req.method} ${req.originalUrl} ${status} ${ms}ms`);
  });
  next();
}

app.use(timing);

app.get('/fast', (req, res) => res.send('fast\n'));
app.get('/slow', async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  res.send('slow\n');
});

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
```

```sh
$ node timing.mjs
# 別のターミナルで
$ curl -s http://127.0.0.1:9317/fast
fast
$ curl -s --max-time 0.3 http://127.0.0.1:9317/slow   # 1秒かかるところを、0.3秒で切る
```

サーバのターミナルには、次のように出ます。

```text
GET /fast 200 3.7ms
GET /slow aborted 302.4ms
```

- `performance.now()` は、ミリ秒の時刻を小数まで返します。始めと終わりの差が、かかった時間です。`toFixed(1)` で小数第1位までにしています。
- `res.once('close', 関数)` は、`close` が来たときに1回だけ関数を呼びます。`next()` の後ではなく、ここで書くので、ステータスも時間も分かります。
- `curl --max-time 0.3` は、0.3 秒で待つのをやめて切るオプションです。最後まで返せなかったので `aborted` になりました。
- `app.use(timing)` を、ルートより**前**に置いています。後ろに置くと、ルートが応答した後なので、もう動きません。

もう1つ、`X-Request-Id` も付けた [samples/finish-demo.mjs](samples/finish-demo.mjs) で、同じことを確かめます（`node samples/finish-demo.mjs` で動かします。中身は読まなくてよい）。

```sh
$ curl -s --max-time 0.3 http://127.0.0.1:9312/slow    # 1秒かかるところを、0.3秒で切る
# サーバのターミナル
GET /fast 200 4.5ms 32e1ce8d-d2b6-4ff0-8eb3-e1a4094f0c5c
GET /slow 200 1001.6ms 0b1b50c7-7aaa-4cfa-9408-530f08339db2
GET /slow aborted 301.6ms 1abac8a5-682f-47bd-9ecf-b8c5124ada10
```

### 4.2 ヘッダを「送る直前」に足す

処理の時間をヘッダ（`Server-Timing`）で返したいときは、`close` では遅すぎます。ヘッダは本文より先に送られるからです。第22章の `withSession` で「`res.writeHead` を包んで、送る直前に Set-Cookie を足した」のと同じ方法を使います（[samples/my-middleware.mjs](samples/my-middleware.mjs) の `serverTiming`）。

```sh
$ curl -si http://127.0.0.1:9312/fast | grep -iE 'x-request-id|server-timing'
X-Request-Id: 32e1ce8d-d2b6-4ff0-8eb3-e1a4094f0c5c
Server-Timing: app;dur=1.5
```

`Server-Timing` は、Chrome の DevTools の Network → Timing に表示されます。どの処理に時間がかかったかを、ブラウザから見られるようになります（第12部 第66章の「計測してから改善する」で使います）。

## 5. ミドルウェアを自分で書く

### 5.1 設定を受け取って、ミドルウェアを返す関数

`express.json({ limit: '10kb' })` や `cors({ origin })` のように、ミドルウェアは「設定を受け取って、ミドルウェアを返す関数」の形にするのがふつうです。

```js
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
app.delete('/api/users/:id', requireRole('admin'), deleteUser);
```

設定の確かめは、ミドルウェアを**作る時点**でします（練習問題5の `rateLimit` で、`limit: 0` を `TypeError` にしたように）。リクエストが来てから設定の間違いに気づくより、起動の時点で落ちるほうが安全です。

**手を動かす**: 鍵を受け取ってミドルウェアを返す `requireKey` を書いた `require-key.mjs` を作ります（完成形は [samples/require-key.mjs](samples/require-key.mjs)）。

```js
import express from 'express';

const PORT = 9317;
const app = express();
app.disable('x-powered-by');

function requireKey(expected) {
  if (typeof expected !== 'string' || expected === '') {
    throw new TypeError('requireKey: 鍵を文字列で渡してください'); // 作る時点で確かめる
  }
  return (req, res, next) => {
    if (req.get('x-api-key') !== expected) {
      return res.status(401).json({ error: 'unauthorized' }); // 応答したら return
    }
    next();
  };
}

app.get('/api/public', (req, res) => res.json({ message: 'だれでも見られます' }));
app.get('/api/secret', requireKey('dev-only-key'), (req, res) => res.json({ message: '鍵を知っている人だけ' }));

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
```

```sh
$ node require-key.mjs
# 別のターミナルで
$ curl -i http://127.0.0.1:9317/api/secret
HTTP/1.1 401 Unauthorized
...
{"error":"unauthorized"}
$ curl -s -H 'X-Api-Key: dev-only-key' http://127.0.0.1:9317/api/secret
{"message":"鍵を知っている人だけ"}
$ curl -s http://127.0.0.1:9317/api/public
{"message":"だれでも見られます"}
```

- `requireKey('dev-only-key')` が返したミドルウェアを、`/api/secret` のルートにだけはさんでいます（2.3節）。
- `dev-only-key` は練習用の値です。本物の鍵は、コードに書かずに環境変数から読みます（第26章）。
- `requireKey('')` と書くと、サーバを起動した時点で `TypeError` になります。

### 5.2 書くときの決まり

| 決まり | 理由 |
| --- | --- |
| 応答したら `return` して、`next()` を呼ばない | 呼ぶと後ろが動き、2回応答しようとする。**ログインの確かめで 401 を返した後にハンドラが動く**と、データが変わってしまう（練習問題9） |
| `req` に足すものは、名前を決めて1か所で（`req.id`、`req.user`） | どこで入ったか分からない値は、後で困る |
| 画面のテンプレートに渡す値は `res.locals` に | `res.render` が自動で混ぜる（第23章 7節） |
| 時間のかかる処理は `async` で書いてよい | Express 5 は reject を受け止める（第23章 8節） |
| 応答の後の処理は `res.once('close')` で | 2.2節 |
| 秘密の値をログに書かない | アクセスログは多くの人が読める場所に長く残る（練習問題6） |

### 5.3 回数の制限

ログインの画面のように、何度も試されると困る場所には、回数の制限をかけます。客ごとに「一定の時間（窓）に何回来たか」を数え、上限を超えたら **429 Too Many Requests** と、いつ試し直せばよいかを表す `Retry-After` を返します（練習問題5）。

```js
app.post('/login', rateLimit({ windowMs: 15 * 60_000, limit: 10 }), login);
```

メモリに数える方法は、サーバが1台のときだけ正しく数えられます。複数台なら Redis などで数を共有します（第6部 第34章）。

## 6. よく使われるミドルウェア

### 6.1 cors

第2部 第9章で、CORS のヘッダを手で書きました。`cors` パッケージは、それをまとめて書くミドルウェアです（[samples/builtin-demo.mjs](samples/builtin-demo.mjs)。`node samples/builtin-demo.mjs` で動かします。中身は読まなくてよい）。

```js
app.use('/api', cors({
  origin: ['http://localhost:5173'], // 許すオリジンを決めて書く
  credentials: true,                 // Cookie を送らせる
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  maxAge: 600,
}));
```

```sh
$ curl -si -X OPTIONS -H 'Origin: http://localhost:5173' -H 'Access-Control-Request-Method: PATCH' \
       -H 'Access-Control-Request-Headers: content-type' http://127.0.0.1:9313/api/tasks/1 | grep -iE '^(HTTP|access-control|vary)'
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PATCH,DELETE
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 600
$ curl -si -H 'Origin: https://evil.example' http://127.0.0.1:9313/api/tasks | grep -i '^access-control'
Access-Control-Allow-Credentials: true
```

- `origin` を配列にすると、リクエストの `Origin` が配列にあるときだけ、**そのオリジン**を `Access-Control-Allow-Origin` に返し、`Vary: Origin` を付けます（第2部 第9章 5.3節）
- 知らないオリジンには `Access-Control-Allow-Origin` を付けません。`Allow-Credentials` は付いたままですが、`Allow-Origin` が無いので、ブラウザはレスポンスを JavaScript に渡しません
- `origin: '*'` と `credentials: true` を一緒に書くと、`Access-Control-Allow-Origin: *` になり、ブラウザは Cookie つきのリクエストのレスポンスを渡しません（練習問題9）
- `origin: true` は「来たオリジンを何でもそのまま返す」設定です。Cookie つきで使うと、どのサイトからでも、ログインした利用者として API を呼べてしまいます。使わないでください
- CORS は「ブラウザが、別のオリジンのページにレスポンスを見せてよいか」の決まりです。curl やサーバからのリクエストは止めません。CORS はログインの確かめの代わりにはなりません

### 6.2 morgan

`morgan` はアクセスログのミドルウェアです。

```js
app.use(morgan('dev'));       // 開発用の短い形（色つき）
app.use(morgan('combined'));  // Apache と同じ形
```

```text
GET /api/tasks 200 5.133 ms - 36
OPTIONS /api/tasks/1 204 0.314 ms - 0
```

morgan も、4節と同じように「応答の後」に書いています。自分で形を決めたいとき、URL の秘密の値を隠したいときは、練習問題6のように自分で書くか、morgan の `token` を差し替えます。第26章では、JSON の形でログを書く pino を使います。

### 6.3 express-session

第22章で作った `SessionStore` と `withSession` にあたるのが、`express-session` です（[samples/session-demo.mjs](samples/session-demo.mjs)。署名の鍵 `SESSION_SECRET` を渡して動かします。動かし方は [samples/README.md](samples/README.md) にあります。中身は読まなくてよい）。

```js
app.use(session({
  name: 'sid',
  secret,                       // 署名の鍵。環境変数から読み、32 文字以上
  resave: false,
  saveUninitialized: false,     // 空のセッションは作らない
  cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 30 * 60 * 1000 },
}));

app.post('/login', (req, res, next) => {
  // …パスワードを確かめてから
  req.session.regenerate((err) => {          // ID を作り直す（セッション固定化の対策）
    if (err) return next(err);
    req.session.user = { name };
    res.json({ ok: true });
  });
});
```

```sh
$ curl -si -c /tmp/ch24.jar http://127.0.0.1:9314/me | grep -i set-cookie       # 何も出ない
$ curl -si -c /tmp/ch24.jar -b /tmp/ch24.jar -d 'name=alice' http://127.0.0.1:9314/login | grep -i set-cookie
Set-Cookie: sid=s%3AyVSKDeHvtGTNCS0kmPe4kLUIHerAV1JA.invYtImHArErZAGe%2B9AFt5dB9VAY5eca6asI%2BqCzvG4; Path=/; Expires=…; HttpOnly; SameSite=Lax
```

Cookie の値 `s:ID.署名`（`%3A` は `:`）は、第22章 5節の `sign` と同じ考え方です。ID に HMAC の署名を付けて、作り変えられていないことを確かめます。

| 第22章 | express-session | 既定の値と注意 |
| --- | --- | --- |
| `new SessionStore({ ttlMs })` | `store`（書かなければ MemoryStore） | MemoryStore は**本番では使わない**（止めると消える、台の間で共有できない） |
| `newSessionId()`（32 バイト） | `genid` | 既定は 24 バイトの乱数 |
| 鍵（32 文字以上） | `secret`（配列なら鍵を取り替えられる） | 短さを確かめてくれないので、自分で確かめる |
| 空のセッションを作らない | `saveUninitialized: false` | 既定は `true`（作る）。必ず `false` にする |
| 変わったときだけ保存 | `resave: false` | 既定は `true` |
| `req.regenerateSession()` | `req.session.regenerate(cb)` | 中身も消えるので、残すものは先に取っておく |
| `req.destroySession()` | `req.session.destroy(cb)` + `res.clearCookie` | `delete req.session.user` だけでは、セッションが残る |
| Cookie の名前 | `name` | 既定は `connect.sid`（Express だと知らせる） |

既定の値のままだと、第22章で気をつけたことのいくつかが抜けます。練習問題8で、1つずつ確かめてください。CSRF トークンは express-session には入っていません。第22章 8節のように自分で作るか、第10部 第55章で扱う方法を使います。

### 6.4 ほかによく見るもの

| パッケージ | 仕事 | この教材で扱う場所 |
| --- | --- | --- |
| `helmet` | セキュリティに関わるヘッダ（CSP、`X-Content-Type-Options` など）をまとめて付ける | 第10部 第55章 |
| `compression` | gzip・br で圧縮する（第19章 7節） | 第12部（リバースプロキシや CDN の仕事にすることも多い） |
| `express-rate-limit` | 回数の制限（練習問題5） | 第10部 |
| `multer` | `multipart/form-data`（ファイルのアップロード）を読む | 第12部 第63章 |

パッケージを足すときは、第3部 第14章の確かめ（メンテナンスされているか、依存は多すぎないか、install scripts は無いか）をしてから入れます。

## 7. `express.Router` でルートを分ける

アプリが大きくなると、すべてのルートを1つのファイルに書くのはつらくなります。Flask では **Blueprint** でルートをまとめ、`app.register_blueprint(bp, url_prefix='/admin')` で付けました。Express では `express.Router()` が同じ役割です（[samples/router-demo.mjs](samples/router-demo.mjs)。`node samples/router-demo.mjs` で動かします。中身は読まなくてよい）。

```js
const tasks = express.Router({ mergeParams: true });
tasks.get('/', (req, res) => res.json({ projectId: req.params.projectId, tasks: [] }));
tasks.get('/:taskId', (req, res) => res.json({ projectId: req.params.projectId, taskId: req.params.taskId }));

const admin = express.Router();
admin.use(requireAdmin);              // この Router の中だけで動くミドルウェア
admin.get('/stats', (req, res) => res.json({ users: 1, tasks: 0 }));

app.use('/api/projects/:projectId/tasks', tasks);
app.use('/admin', admin);
```

```sh
$ curl -s http://127.0.0.1:9315/api/projects/3/tasks/9
{"projectId":"3","taskId":"9"}
$ curl -si http://127.0.0.1:9315/admin/stats | head -1
HTTP/1.1 401 Unauthorized
```

- Router は、それ自体が小さなアプリです。ミドルウェアもルートも、登録した順に動きます。`admin.use(requireAdmin)` を `admin.get('/stats')` より**後**に書くと、`/stats` は守られません（練習問題9）
- 親のパスのパラメータ（`:projectId`）を子の Router で読むには、`mergeParams: true` が要ります
- Router ごとに守り方を付けておくと、「新しく足した管理用のルートに、確かめを付け忘れた」が起きにくくなります。逆に、`app.use(requireLogin)` を全体に付けて、例外を後から足す方法もあります。どちらが安全かは、守るものと守らないもののどちらが多いかで決めます

**手を動かす**: タスクと管理用の2つの Router を付ける `routers.mjs` を作ります（完成形は [samples/routers.mjs](samples/routers.mjs)）。

```js
import express from 'express';

const PORT = 9317;
const app = express();
app.disable('x-powered-by');

// タスクの Router（/api/tasks の下に付ける）
const tasks = express.Router();
const list = [{ id: 1, title: '牛乳を買う' }, { id: 2, title: '第24章を読む' }];
tasks.get('/', (req, res) => res.json(list));
tasks.get('/:id', (req, res) => {
  const task = list.find((t) => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'not_found' });
  res.json(task);
});

// 管理用の Router（/admin の下に付ける）。最初に守りのミドルウェアを入れる
const admin = express.Router();
admin.use((req, res, next) => {
  if (req.get('x-role') !== 'admin') return res.status(401).json({ error: 'unauthorized' });
  next();
});
admin.get('/stats', (req, res) => res.json({ tasks: list.length }));

app.use('/api/tasks', tasks);
app.use('/admin', admin);

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
```

```sh
$ node routers.mjs
# 別のターミナルで
$ curl -s http://127.0.0.1:9317/api/tasks/2
{"id":2,"title":"第24章を読む"}
$ curl -si http://127.0.0.1:9317/admin/stats | head -1
HTTP/1.1 401 Unauthorized
$ curl -s -H 'X-Role: admin' http://127.0.0.1:9317/admin/stats
{"tasks":2}
```

- Router の中のパスは、`app.use` で付けた場所から後ろだけです（`tasks.get('/:id')` は `/api/tasks/:id`）。
- `X-Role` を見るのは、仕組みを見るための練習です。客が自由に付けられるヘッダなので、本物のアプリでは、ログインのセッションで確かめます（第10部）。

第26章では、Router をファイルに分け、レイヤーに分けた構成にします。

## 8. Express の中身

ここまでの動きは、次の数行の考え方でできています（練習問題7で、自分で作ります）。

```js
function app(req, res) {
  let i = 0;
  function next(err) {
    const layer = layers[i++];
    if (!layer) return done(err);                         // 最後まで来た: 404 か 500
    if (!layer.matches(req)) return next(err);            // パスやメソッドが合わない
    const isErrorHandler = layer.fn.length === 4;
    if (err ? !isErrorHandler : isErrorHandler) return next(err); // エラーかどうかで飛ばす
    try {
      const r = err ? layer.fn(err, req, res, next) : layer.fn(req, res, next);
      r?.then?.(undefined, next);                         // async の reject も next(err) に
    } catch (e) {
      next(e);
    }
  }
  next();
}
```

- **層の列と添字**: `next` は「添字を1つ進めて、合う層を探して動かす」だけです
- **`fn.length`**: エラーハンドラかどうかは、関数の引数の数で決まります。だから、使わなくても `next` を書きます
- **Promise を見る**: Express 5 が async 関数の例外を受け止められるのは、ハンドラの返り値が Promise なら `.then(undefined, next)` を付けているからです

第18章の `compose`（Koa 風）と比べると、違いがはっきりします。

| | Express の `next` | Koa 風の `compose`（第18章、第28章の Hono） |
| --- | --- | --- |
| `next()` の返り値 | なし | Promise（後ろが全部終わると解決する） |
| 応答の後の処理 | `res.once('close')` で | `await next()` の後に書ける |
| エラーの受け止め | 引数4つの関数 | `try { await next() } catch` |
| 応答の書き方 | `res` に書く | `ctx.body` に入れて、最後にまとめて書く |

## 9. 第4部の部品・Flask との対応

| やりたいこと | Flask | 第4部 | Express |
| --- | --- | --- | --- |
| すべてのリクエストの前 | `@app.before_request` | `compose` の前半 | `app.use(fn)` |
| レスポンスに手を加える | `@app.after_request` | `res.writeHead` を包む | `res.writeHead` を包む、`res.set` |
| 応答の後（ログ） | `@app.teardown_request` | `res.once('close')` | `res.once('close')`、morgan |
| 一部のパスだけ | Blueprint の `before_request` | Router の前で分ける | `app.use('/admin', fn)`、Router の `use` |
| 1つのルートだけ | デコレータを重ねる | ハンドラを包む | `app.get(path, mw1, mw2, handler)` |
| ルートをまとめる | Blueprint | Router を複数作る | `express.Router()` |
| エラーの返し方 | `@app.errorhandler` | `createApp` の `catch` | 引数4つのミドルウェア |
| セッション | `session`（署名つき Cookie に中身を入れる） | `withSession` | `express-session`（中身はサーバ、Cookie は署名つきの ID） |
| CORS | Flask-CORS | 手で書いた（第2部 第9章） | `cors` |

Flask の既定の `session` は、中身そのものを署名つきの Cookie に入れます（中身は暗号化されていないので、見ることはできます）。express-session は、中身をサーバに置き、Cookie には ID だけを入れます。第22章 4節で比べた2つのやり方です。

## まとめ

- ミドルウェアとルートは、登録した順に1本の列になり、前から試される。`app.use(パス)` は前置きが合うときだけ動き、中では `req.url` から前置きが取り除かれる。
- 仕事をしたら `next()`、応答したら `return`。応答した後に `next()` を呼ばない。
- `next(err)`・`throw`・reject の後は、引数4つの層だけが動く。404 は引数3つでルートの後、エラーハンドラはいちばん最後。
- Express の `next` は Promise を返さないので、`next()` の後は「応答の後」ではない。応答の後の処理は `res.once('close')`、ヘッダは `res.writeHead` を包んで足す。
- ミドルウェアは「設定を受け取って、ミドルウェアを返す関数」にし、設定の間違いは作る時点で見つける。
- cors は許すオリジンを決めて書く。express-session は `saveUninitialized: false`・`regenerate`・`destroy` を自分で正しく使う。MemoryStore は本番で使わない。
- `express.Router` は小さなアプリ。Router の中も登録した順に動くので、守るミドルウェアは守りたいルートより先に置く。

## 練習問題

[exercises/README.md](exercises/README.md) に9問あります（基本4問・応用2問・発展3問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Express 公式「Using middleware」: https://expressjs.com/en/guide/using-middleware.html
- Express 公式「Writing middleware for use in Express apps」: https://expressjs.com/en/guide/writing-middleware.html
- Express 公式「Error handling」: https://expressjs.com/en/guide/error-handling.html
- Express 公式「express.Router」: https://expressjs.com/en/5x/api.html#router
- cors: https://github.com/expressjs/cors
- morgan: https://github.com/expressjs/morgan
- express-session: https://github.com/expressjs/session
- router（Express 5 の中のルーター）: https://github.com/pillarjs/router
- MDN「Server-Timing」: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Server-Timing
- MDN「429 Too Many Requests」: https://developer.mozilla.org/ja/docs/Web/HTTP/Status/429
- IETF「RateLimit header fields for HTTP」（案）: https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
- OWASP「Session Management Cheat Sheet」: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- Flask「Application Structure and Lifecycle」（before_request など）: https://flask.palletsprojects.com/en/stable/lifecycle/

前の章: [第23章 Express 入門](../ch23-express-intro/README.md) ／ 次の章: [第25章 REST API の設計](../ch25-rest-api-design/README.md)
