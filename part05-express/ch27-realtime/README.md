# 第27章 リアルタイム通信

HTTP は「客が聞いて、サーバが答える」の形です。サーバから先に話しかけることはできません。でも、チャット、通知、進み具合の表示、共同での編集のように、「サーバの側で何かが起きたら、すぐに画面に出したい」ことはよくあります。この章では、そのための4つの方法——ポーリング、ロングポーリング、Server-Sent Events（SSE）、WebSocket——を、仕組みから比べます。

Node.js は、たくさんの接続を少ないメモリで同時に持てるので（第3部 第13章のイベントループ）、つなぎっぱなしの接続を使うリアルタイム通信が得意です。一方で、つなぎっぱなしにすると「切れたとき」「切れたことに気づかないとき」「片付け忘れ」の問題が出てきます。この章の練習問題は、ほとんどがその問題です。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第23〜26章、第2部 第6章（HTTP）と第9章（同一オリジンポリシーと CORS）、第3部 第13章（イベントループ）と第15章（Stream） |
| この章のゴール | 4つの方法の違いと、選び方を説明できる / ロングポーリングを、片付けを忘れずに書ける / SSE を書いて読め、`Last-Event-ID` で送り直せる / WebSocket のハンドシェイクとフレームの仕組みを説明できる / ws で、Origin・大きさ・心拍に気をつけたサーバを書ける |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`long-wait.mjs`・`sse-clock.mjs`・`ws-echo.mjs`・`ws-client.mjs`）と、ポーリング、SSE、WebSocket（手書きと ws）を確かめるプログラム、ブラウザで開くページ |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答（問題5の `formatEvent` と問題6の `createEventHub`・`sseRoute` は、成果物でも使います） |

> **読み方**
> - この章のコマンドは、すべて `~/dev/part05/ch27-realtime/` で実行します（第23章で `setup-part05.sh` を動かして、`~/dev/part05` を作ってあります）。
>
>   ```sh
>   $ cd ~/dev/part05/ch27-realtime
>   ```
>
> - 「**手を動かす**」の所は、新しいファイルに書いて動かしてください。ファイルの完成形は `samples/` にあります。「中身は読まなくてよい」と書いたサンプルは、動かして結果を見るだけで十分です。
> - 「手を動かす」のサーバは 9347 番を使います。次のサーバを動かす前に `Ctrl+C` で止めてください。`curl` は別のターミナルで打ちます。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| 4つの方法の選び方（1節） | 成果物（SSE を選ぶ）、第8部（画面での受け取り方） |
| ロングポーリングの片付け（2節） | タイマーと listener を使うすべての所 |
| SSE と `Last-Event-ID`（3節） | 成果物のタスク API、第8部（React で一覧を新しくする） |
| WebSocket と Origin の確かめ（4節） | 第10部（Cookie のログインと、なりすましを防ぐ） |

---

## 1. 4つの方法

| 方法 | 仕組み | 向き | つなぎっぱなし | ブラウザの API |
| --- | --- | --- | --- | --- |
| ポーリング | 数秒ごとに、ふつうの GET で聞き直す | 客 → サーバ（聞くだけ） | しない | `fetch` と `setInterval` |
| ロングポーリング | GET を送り、サーバは新しいものが来るまで答えを返さずに待つ | 同上 | 1回の答えまで | `fetch` |
| SSE | 1つの GET の応答を終わらせず、イベントを少しずつ書き足す | サーバ → 客 | する | `EventSource` |
| WebSocket | HTTP で始めて、同じ TCP の接続を別の決まりに切り替える | 両方向 | する | `WebSocket` |

どれを選ぶかは、問題の形で決めます。

- **リアルタイムが要るか**: ページを開いたときに新しければよいなら、何もしないのがいちばんです
- **一方向か**: 通知・進み具合・新しいタスクのように、サーバから知らせるだけなら、SSE かポーリングで足ります。客から送るものは、ふつうの `POST` で送ります
- **両方向に、細かく、何度も**: チャットの「入力中…」、共同の編集、ゲームなら WebSocket です

Flask では、ふつうの書き方（WSGI）だと1つのリクエストが1つのワーカーのスレッドを使い続けるので、つなぎっぱなしの接続を何千も持つのが苦手です。Flask で WebSocket を使うには、Flask-SocketIO と、eventlet や gevent のような「1つのスレッドで、たくさんの接続を切り替える」仕組みを組み合わせるのが一般的でした。Node.js は、はじめからその形（イベントループ）なので、特別なものを足さずに書けます。

## 2. ポーリングとロングポーリング

### 2.1 ポーリング

いちばん簡単な方法です。画面が、決まった間隔で聞き直します。

```js
setInterval(async () => {
  const res = await fetch(`/api/events?since=${last}`);
  const { items } = await res.json();
  …
}, 5000);
```

- **よいところ**: ふつうの HTTP なので、キャッシュ、ロードバランサ、プロキシ、認証が、そのまま使えます。サーバが落ちても、次の聞き直しで元に戻ります
- **困るところ**: 何も変わっていなくても聞き直すので、無駄が多いです。間隔を短くすると重く、長くすると遅れます

### 2.2 ロングポーリング

聞き直す間隔を無くす工夫です。サーバは、新しいものが無ければ、**答えを返さずに待ちます**。新しいものが来たら、すぐに返します。決めた時間（25 秒など）待っても来なければ、204 を返し、画面はすぐに聞き直します。

```js
app.get('/api/events/wait', (req, res) => {
  if (after(since).length > 0) return res.json(…);       // あればすぐ
  const onEvent = () => finish(200);
  const timer = setTimeout(() => finish(204), 25_000);    // 来なければ 204
  function finish(status) {
    clearTimeout(timer);
    bus.off('event', onEvent);                            // 片付け
    …
  }
  bus.on('event', onEvent);
  req.on('close', () => finish(0));                       // 客が先に切ったら、待つのをやめる
});
```

[samples/polling-demo.mjs](samples/polling-demo.mjs) で、2つを比べられます（`node samples/polling-demo.mjs` で動かします。中身は読まなくてよい）。ロングポーリングは、SSE や WebSocket が使えない古い環境のための方法として、今も使われています。

大事なのは**片付け**です。待っている間に、タイマーと listener を作っています。「新しいものが来た」「時間切れ」「客が切った」の、どの終わり方でも、両方を片付けないと、少しずつたまっていきます（練習問題9）。

**手を動かす**: メッセージが来るまで待つ `long-wait.mjs` を作ります（完成形は [samples/long-wait.mjs](samples/long-wait.mjs)）。

```js
import { EventEmitter } from 'node:events';
import express from 'express';

const PORT = 9347;
const bus = new EventEmitter(); // 「新しいメッセージが来た」を知らせる
const messages = [];

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.post('/api/messages', (req, res) => {
  const message = { id: messages.length + 1, text: String(req.body?.text ?? '') };
  messages.push(message);
  bus.emit('message', message);
  res.status(201).json(message);
});

app.get('/api/messages/wait', (req, res) => {
  const since = Number(req.query.since ?? 0);
  const newer = messages.filter((m) => m.id > since);
  if (newer.length > 0) return res.json(newer); // もうあれば、すぐに返す

  let done = false;
  const onMessage = (message) => finish(() => res.json([message]));
  const timer = setTimeout(() => finish(() => res.sendStatus(204)), 10_000); // 10 秒来なければ 204

  function finish(send) {
    if (done) return;
    done = true;
    clearTimeout(timer); // 片付け 1: タイマー
    bus.off('message', onMessage); // 片付け 2: listener
    send();
    console.log(`待っている人: ${bus.listenerCount('message')}`);
  }

  bus.on('message', onMessage);
  req.on('close', () => finish(() => {})); // 客が先に切ったら、何も送らずに片付ける
  console.log(`待っている人: ${bus.listenerCount('message')}`);
});

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
```

ターミナルを3つ使います。

```sh
# 1つ目
$ node long-wait.mjs
# 2つ目: 答えが返らずに待つ
$ curl -s 'http://127.0.0.1:9347/api/messages/wait?since=0'
# 3つ目: メッセージを送ると、2つ目にすぐ返る
$ curl -s -H 'Content-Type: application/json' -d '{"text":"やあ"}' http://127.0.0.1:9347/api/messages
{"id":1,"text":"やあ"}
```

2つ目のターミナルには `[{"id":1,"text":"やあ"}]` が出ます。サーバのターミナルには、待っている人の数が出ます。

```text
待っている人: 1
待っている人: 0
```

- `EventEmitter` は、`on`（受け取る関数を足す）・`off`（外す）・`emit`（知らせる）ができる部品です（第3部 第13章）。`listenerCount` で、足してある関数の数が分かります。
- URL を `'…'` で囲んでいるのは、`?` をシェルに別の意味で読ませないためです。
- 2つ目で `since=1` にして待ち、10 秒何も送らないと、何も表示されずに終わります（204）。`curl -i` を付けると `HTTP/1.1 204 No Content` が見えます。
- 待っている間に2つ目を Ctrl+C で止めても、`req.on('close')` で片付けるので、数が 0 に戻ります。`finish` で `clearTimeout` や `bus.off` を消して試すと、数が減らなくなります。
- `done` は、「もう返した」の印です。メッセージと時間切れが同時に来ても、2回返さないようにします。

## 3. Server-Sent Events

### 3.1 応答を終わらせない

SSE は、1つの GET の応答を `res.end()` せずに、イベントを少しずつ書き足していく方法です。`Content-Type` は `text/event-stream` で、形はとても簡単なテキストです。

```text
retry: 3000

event: task
data: {"id":7,"title":"牛乳"}
id: 42

: ping

```

| 行 | 意味 |
| --- | --- |
| `event: 名前` | イベントの種類（無ければ `message`） |
| `data: 中身` | 中身。複数の行に分けてよい（読む側は `\n` でつなぐ） |
| `id: 42` | このイベントの id。ブラウザが覚えておく |
| `retry: 3000` | 切れたら、何ミリ秒後につなぎ直すか |
| `: 何か` | コメント。読む側は無視する（心拍に使う） |
| 空の行 | 1つのイベントの終わり |

```js
app.get('/events', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.write('retry: 3000\n\n');
  clients.add(res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});
// 配るとき
for (const c of clients) c.write(`event: task\ndata: ${JSON.stringify(task)}\nid: ${id}\n\n`);
```

`data` に改行が入っていたら、`data:` の行を分けます。`event` や `id` に改行が入ると、そこから先が「別の行」として読まれ、偽のイベントを作れてしまうので、断ります（練習問題5）。

**手を動かす**: 1秒ごとに時刻を送る `sse-clock.mjs` を作ります（完成形は [samples/sse-clock.mjs](samples/sse-clock.mjs)）。

```js
import express from 'express';

const PORT = 9347;
const app = express();
app.disable('x-powered-by');

let clients = 0;

app.get('/clock', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.write('retry: 3000\n\n'); // 切れたら 3 秒後につなぎ直してほしい

  let id = 0;
  const timer = setInterval(() => {
    id += 1;
    const data = JSON.stringify({ now: new Date().toISOString() });
    res.write(`event: tick\ndata: ${data}\nid: ${id}\n\n`);
  }, 1000);

  clients += 1;
  console.log(`つながりました（今 ${clients} 人）`);
  req.on('close', () => {
    clearInterval(timer); // 片付けないと、だれもいないのに書き続ける
    clients -= 1;
    console.log(`切れました（今 ${clients} 人）`);
  });
});

app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/clock で待っています`));
```

```sh
$ node sse-clock.mjs
# 別のターミナルで（Ctrl+C で止める）
$ curl -N http://127.0.0.1:9347/clock
retry: 3000

event: tick
data: {"now":"2026-11-09T09:00:01.911Z"}
id: 1

event: tick
data: {"now":"2026-11-09T09:00:02.916Z"}
id: 2
...
```

- `curl -N` の `-N` は「ためずに、届いたらすぐ出す」オプションです。付けないと、まとめて出るまで何も見えないことがあります。
- `res.writeHead` で、ステータスとヘッダだけを先に送ります。`res.end()` を呼ばないので、応答は終わりません。
- curl を Ctrl+C で止めると、サーバのターミナルに `切れました（今 0 人）` が出ます。`clearInterval` を消すと、だれもいない接続に書き続けます。

### 3.2 ブラウザの EventSource

```js
const es = new EventSource('/events');
es.addEventListener('task', (e) => {
  const task = JSON.parse(e.data);
  …
});
```

`EventSource` は、切れると自分でつなぎ直します。そのとき、最後に受け取った `id` を **`Last-Event-ID`** ヘッダに入れて送ってくれます。サーバが最近のイベントを覚えておけば、切れていた間のものを送り直せます。

```sh
$ node samples/sse-demo.mjs        # 中身は読まなくてよい。ブラウザで http://127.0.0.1:9341/sse.html を2つのタブで
$ curl -N -H 'Last-Event-ID: 2' http://127.0.0.1:9341/events
```

送り直せない（覚えている範囲より古い、サーバを再起動して id が数え直しになった）ときは、`reset` のようなイベントを送り、画面に全部を読み直してもらいます（練習問題6）。

### 3.3 気をつけること

- **心拍**: 何も送らない時間が続くと、途中のプロキシやロードバランサに「止まった接続」と思われて切られます。15〜30 秒ごとにコメントを送ります
- **ためられないように**: 圧縮のミドルウェアや nginx は、応答をためてからまとめて送ることがあります。`Cache-Control: no-cache` と、nginx なら `X-Accel-Buffering: no` を付けます
- **同時の接続の数**: HTTP/1.1 では、ブラウザは1つのオリジンに6本までしか同時につなげません。タブを7つ開くと、7つ目が待たされます。HTTP/2 なら1本の中にまとめられるので、この問題はありません（第2部 第7章）
- **認証**: `EventSource` は、ヘッダを付けられません（Cookie は送られます）。この教材では、Cookie のセッションで認証します（第10部）
- **一方向**: 画面からサーバへは、ふつうの `fetch` で送ります

## 4. WebSocket

### 4.1 HTTP で始めて、切り替える

WebSocket は、HTTP のリクエストで「この接続を WebSocket に切り替えたい」と頼むところから始まります（RFC 6455）。

```http
GET /ws HTTP/1.1
Host: 127.0.0.1:9343
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Origin: http://127.0.0.1:9343
```

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

- `Sec-WebSocket-Accept` は、`Sec-WebSocket-Key` に決まった文字列（GUID）をつなげて SHA-1 を取り、base64 にしたものです。「WebSocket が分かるサーバだ」という確かめで、秘密を守るものではありません
- 101 を返した後、同じ TCP の接続は HTTP ではなくなり、両方から**フレーム**を送り合います
- Node.js の HTTP サーバでは、このリクエストは `'request'` ではなく `'upgrade'` のイベントで来ます

[samples/ws-handshake-demo.mjs](samples/ws-handshake-demo.mjs) は、これを `node:http` だけで書いたものです。届いたハンドシェイクと、フレームのバイトを、そのまま見られます（`node samples/ws-handshake-demo.mjs` で動かします。中身は読まなくてよい）。

### 4.2 フレーム

```text
 1 バイト目: FIN（これで終わり）と opcode（1: 文字、2: バイナリ、8: 閉じる、9: ping、10: pong）
 2 バイト目: MASK の印と、長さ（125 まで。126 なら次の 2 バイト、127 なら次の 8 バイトが長さ）
 （客から送るときは）4 バイトのマスクの鍵
 中身（客から送るときは、鍵で XOR してある）
```

- 1つのメッセージを、複数のフレームに分けて送ることもできます（FIN が 0 のフレームが続く）
- 客から送るフレームは、必ずマスクします。WebSocket を知らない古いプロキシが、中身を HTTP と取り違えるのを防ぐためです
- ping と pong は、接続が生きているかを確かめるためのフレームです

ここまでを自分で書くのが練習問題7です。本物では、分かれたフレーム、閉じるときの手順、圧縮など、ほかにも決まりが多いので、ライブラリを使います。

### 4.3 ws ライブラリ

Node.js のサーバでは、**ws** がよく使われます。Express の HTTP サーバの `'upgrade'` を受けて、ws に渡します。

```js
import { WebSocketServer } from 'ws';

const server = app.listen(9343);
const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

server.on('upgrade', (req, socket, head) => {
  if (!ALLOWED_ORIGINS.has(req.headers.origin)) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws) => {
  ws.on('message', (raw) => { … });
});
```

Node.js 22 からは、ブラウザと同じ `WebSocket` のクライアントが組み込まれています（サーバは組み込まれていないので、ws などを使います）。

### 4.4 WebSocket には CORS が無い

ここがいちばん大事な点です。`fetch` は、ほかのオリジンへのリクエストを CORS で守っていました（第2部 第9章）。**WebSocket には CORS がありません。** ほかのサイトのページの JavaScript も、`new WebSocket('wss://あなたのサイト/ws')` でつなげます。しかも、ブラウザはそのとき、あなたのサイトの Cookie を付けて送ります。サーバが Cookie だけでログインを確かめていると、ほかのサイトのページが、ログインしている人になりすましてメッセージを読んだり送ったりできてしまいます（Cross-Site WebSocket Hijacking）。

防ぐ方法は、ハンドシェイクの **`Origin` ヘッダを、許したものと完全に同じか確かめる**ことです。`Origin` はブラウザが付けるもので、ページの JavaScript からは変えられません。ブラウザでない客（`node -e` や curl）は好きな `Origin` を付けられますが、その人たちは、ほかの人の Cookie を持っていないので、なりすましにはなりません。

### 4.5 届いたものを信じない、片付ける

WebSocket の向こうにいるのが、自分の作った画面だけとは限りません。

- **形を確かめる**: `JSON.parse` は失敗することがあります。`'message'` の中で投げた例外は、受け止める人がいないので、**プロセスごと落ちて**、つながっている全員が切れます。`try` で受け止め、形も確かめます（第25章の zod も使えます）
- **大きさを決める**: ws の `maxPayload` の既定は 100 MiB です。チャットなら 16 KiB などに決めます
- **心拍**: 電波が切れた客は、TCP の接続が切れたことをサーバに知らせられないので、`close` が来ないまま残ることがあります。決まった間隔で ping を送り、返事（pong）が無かったものを `terminate()` します。ブラウザは pong を自分で返すので、画面のコードには何も要りません
- **つなぎ直し**: `EventSource` と違って、`WebSocket` は切れても自分ではつなぎ直しません。画面の側で、待つ時間をだんだん長くしながら（1秒、2秒、4秒…）つなぎ直します。サーバが止まっていたときに、全員が同時にたくさんつなぎ直してこないようにするためです
- **サーバが複数台**: 1台のサーバのメモリの中で配ると、ほかの台につながっている人には届きません。Redis の Pub/Sub などで、台の間で配ります（第6部 第34章、第12部 第66章）

```sh
$ node samples/ws-demo.mjs        # 中身は読まなくてよい。ブラウザで http://127.0.0.1:9343/chat.html を2つのタブで
```

**手を動かす**: 受け取ったものを全員に配る WebSocket のサーバ `ws-echo.mjs` と、それを試すクライアント `ws-client.mjs` を作ります（完成形は [samples/ws-echo.mjs](samples/ws-echo.mjs)・[samples/ws-client.mjs](samples/ws-client.mjs)）。

```js
// ws-echo.mjs
import express from 'express';
import { WebSocketServer } from 'ws';

const PORT = 9347;
const ALLOWED_ORIGINS = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]);

const app = express();
app.disable('x-powered-by');
const server = app.listen(PORT, '127.0.0.1', () => console.log(`ws://127.0.0.1:${PORT}/ws で待っています`));

const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 }); // 1つのメッセージは 16 KiB まで

server.on('upgrade', (req, socket, head) => {
  if (req.url !== '/ws' || !ALLOWED_ORIGINS.has(req.headers.origin)) {
    console.log(`断りました: ${req.url} Origin=${req.headers.origin}`);
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws) => {
  console.log(`つながりました（今 ${wss.clients.size} 人）`);
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', text: 'JSON ではありません' })); // 落ちずに、送った人にだけ返す
      return;
    }
    if (typeof msg?.text !== 'string') {
      ws.send(JSON.stringify({ type: 'error', text: 'text がありません' }));
      return;
    }
    for (const client of wss.clients) {
      client.send(JSON.stringify({ type: 'chat', text: msg.text }));
    }
  });
  ws.on('close', () => console.log(`切れました（今 ${wss.clients.size} 人）`));
});
```

```js
// ws-client.mjs
const origin = process.env.ORIGIN ?? 'http://127.0.0.1:9347';
const text = process.argv[2] ?? 'こんにちは';

// ブラウザはページのオリジンを Origin に入れる。ここでは、それを手で付ける
const ws = new WebSocket('ws://127.0.0.1:9347/ws', { headers: { Origin: origin } });

ws.addEventListener('open', () => {
  console.log('つながりました');
  ws.send(JSON.stringify({ text }));
  ws.send('{こわれた JSON'); // わざと間違ったものも送る
});
ws.addEventListener('message', (e) => console.log('届いた:', e.data));
ws.addEventListener('error', () => console.log('つなげませんでした'));
ws.addEventListener('close', () => console.log('閉じました'));

setTimeout(() => ws.close(), 500); // 少し待ってから閉じる
```

```sh
$ node ws-echo.mjs
# 別のターミナルで
$ node ws-client.mjs こんにちは
つながりました
届いた: {"type":"chat","text":"こんにちは"}
届いた: {"type":"error","text":"JSON ではありません"}
閉じました
$ ORIGIN=http://other.localhost node ws-client.mjs こんにちは
つなげませんでした
閉じました
```

- `process.argv[2]` は、`node ws-client.mjs こんにちは` の `こんにちは` です（第3部 第15章）。
- 2回目は `Origin` を許していないものにしたので、サーバのターミナルに `断りました: /ws Origin=http://other.localhost` が出ます。
- `{こわれた JSON` を送っても、サーバは落ちずに、送った人にだけエラーを返しています。`try` を外して試すと、サーバのプロセスが落ちます。
- ブラウザでない客は、`Origin` を好きに付けられます（4.4節）。`Origin` の確かめは、ブラウザの中のほかのサイトのページから守るためのものです。

## 5. 成果物では

成果物のタスク API では、SSE を使います。

- `GET /api/events` で `text/event-stream` を返す。タスクが作られた・変わった・消されたら、`task.created`・`task.updated`・`task.deleted` のイベントを配る（中身はタスクの JSON）
- `Last-Event-ID` で、切れていた間のものを送り直す。送り直せなければ `reset`
- 心拍は 15 秒ごと
- SIGTERM できれいに止めるとき、SSE の接続は終わらないので、`server.close()` の前に、全員に「これで終わり」を伝えて閉じる（第26章 8節の時間切れに頼らない）

第8部では、この SSE を React の画面から受け取り、一覧を新しくします。

## 6. 第4部・Flask との対応

| やりたいこと | Flask | 第4部 | この章 |
| --- | --- | --- | --- |
| 応答を少しずつ送る | ジェネレータを返す（`stream_with_context`） | `res.write`（第17章） | `res.write` で SSE |
| SSE | ジェネレータで `data: …\n\n` を yield | — | `text/event-stream`、`EventSource` |
| WebSocket | Flask-SocketIO（eventlet・gevent）、flask-sock | `'upgrade'` のイベント | ws、`WebSocketServer` |
| 「客が切った」を知る | `GeneratorExit` | `req.on('close')` | `req.on('close')`、`ws.on('close')`、`AbortSignal` |

Socket.IO は、WebSocket の上に、自分の決まり（つなぎ直し、部屋、送ったことの確かめ、WebSocket が使えないときのロングポーリング）を足したライブラリです。サーバとブラウザの両方に Socket.IO が要り、ふつうの `WebSocket` のクライアントとは話せません。便利ですが、この章では仕組みを見るために、ws とブラウザの `WebSocket` を使いました。

## まとめ

- サーバから知らせる方法は、ポーリング、ロングポーリング、SSE、WebSocket。一方向なら SSE かポーリング、両方向に細かく何度もなら WebSocket。要らないなら、リアルタイムにしない。
- つなぎっぱなしの接続は、「客が切った」（`close`）で、タイマー・listener・覚えている接続を必ず片付ける。
- SSE は `text/event-stream` のテキスト。`data` の改行は行を分け、`event`・`id` の改行は断る。`id` と `Last-Event-ID` で送り直し、心拍で切られないようにする。
- WebSocket は HTTP の `Upgrade` で始まり、101 の後はフレームを送り合う。CORS が無いので、`Origin` を完全一致で確かめる。
- 届いたものは信じない。`JSON.parse` を受け止め、形と大きさ（`maxPayload`）を決める。心拍で、返事の無い接続を切る。画面の側は、だんだん長く待ちながらつなぎ直す。

## 練習問題

[exercises/README.md](exercises/README.md) に9問あります（基本4問・応用2問・発展3問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- HTML Living Standard「Server-sent events」: https://html.spec.whatwg.org/multipage/server-sent-events.html
- MDN「サーバー送信イベントの使用」: https://developer.mozilla.org/ja/docs/Web/API/Server-sent_events/Using_server-sent_events
- MDN「WebSocket API」: https://developer.mozilla.org/ja/docs/Web/API/WebSockets_API
- RFC 6455「The WebSocket Protocol」: https://www.rfc-editor.org/rfc/rfc6455
- ws: https://github.com/websockets/ws
- Node.js 公式「Event: 'upgrade'」: https://nodejs.org/api/http.html#event-upgrade_1
- Node.js 公式「WebSocket」（クライアント）: https://nodejs.org/api/globals.html#websocket
- OWASP「WebSocket Security Cheat Sheet」: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
- Flask「Streaming Contents」: https://flask.palletsprojects.com/en/stable/patterns/streaming/

前の章: [第26章 アプリケーションの構成](../ch26-app-structure/README.md) ／ 次の章: [第28章 他のフレームワークの地図](../ch28-framework-map/README.md)
