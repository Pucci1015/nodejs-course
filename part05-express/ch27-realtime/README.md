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
| [samples/](samples/) | ポーリング、SSE、WebSocket（手書きと ws）と、ブラウザで開くページ |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答（問題2の `formatEvent` と問題3の `createEventHub`・`sseRoute` は、成果物でも使います） |

> この章のサンプルと練習問題は、`~/dev/part05/ch27-realtime` の中で動かします（[第5部の README](../README.md) の「準備」）。

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

[samples/polling-demo.mjs](samples/polling-demo.mjs) で、2つを比べられます。ロングポーリングは、SSE や WebSocket が使えない古い環境のための方法として、今も使われています。

大事なのは**片付け**です。待っている間に、タイマーと listener を作っています。「新しいものが来た」「時間切れ」「客が切った」の、どの終わり方でも、両方を片付けないと、少しずつたまっていきます（練習問題6）。

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

`data` に改行が入っていたら、`data:` の行を分けます。`event` や `id` に改行が入ると、そこから先が「別の行」として読まれ、偽のイベントを作れてしまうので、断ります（練習問題2）。

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
$ node samples/sse-demo.mjs        # ブラウザで http://127.0.0.1:9341/sse.html を2つのタブで
$ curl -N -H 'Last-Event-ID: 2' http://127.0.0.1:9341/events
```

送り直せない（覚えている範囲より古い、サーバを再起動して id が数え直しになった）ときは、`reset` のようなイベントを送り、画面に全部を読み直してもらいます（練習問題3）。

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

[samples/ws-handshake-demo.mjs](samples/ws-handshake-demo.mjs) は、これを `node:http` だけで書いたものです。届いたハンドシェイクと、フレームのバイトを、そのまま見られます。

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

ここまでを自分で書くのが練習問題4です。本物では、分かれたフレーム、閉じるときの手順、圧縮など、ほかにも決まりが多いので、ライブラリを使います。

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
$ node samples/ws-demo.mjs        # ブラウザで http://127.0.0.1:9343/chat.html を2つのタブで
```

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

[exercises/README.md](exercises/README.md) に6問あります。解答は [solutions/README.md](solutions/README.md) です。

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
