# 第27章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part05/ch27-realtime/exercises` で実行） |
| --- | --- | --- |
| 1 | [sse-text.mjs](sse-text.mjs) | `MODULE=../solutions/sse-text.mjs node --test sse-text.test.mjs` |
| 2 | [waiters.mjs](waiters.mjs) | `MODULE=../solutions/waiters.mjs node --test waiters.test.mjs` |
| 3 | [chat-message.mjs](chat-message.mjs) | `MODULE=../solutions/chat-message.mjs node --test chat-message.test.mjs` |
| 4 | このページ | — |
| 5 | [sse-format.mjs](sse-format.mjs) | `MODULE=../solutions/sse-format.mjs node --test sse-format.test.mjs` |
| 6 | [event-hub.mjs](event-hub.mjs) | `MODULE=../solutions/event-hub.mjs node --test event-hub.test.mjs` |
| 7 | [ws-protocol.mjs](ws-protocol.mjs) | `MODULE=../solutions/ws-protocol.mjs node --test ws-protocol.test.mjs` |
| 8 | [chat.mjs](chat.mjs) | `MODULE=../solutions/chat.mjs node --test chat.test.mjs` |
| 9 | [long-poll.mjs](long-poll.mjs) | `MODULE=../solutions/long-poll.mjs node --test long-poll.test.mjs` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。

---

## 問題1 SSE で送る文字列を作る `toSse`・`ping`

```js
export function toSse({ event, data, id }) {
  let text = '';
  if (event !== undefined) text += `event: ${event}\n`;
  text += `data: ${JSON.stringify(data)}\n`;
  if (id !== undefined) text += `id: ${id}\n`;
  return text + '\n';
}

export function ping() {
  return ': ping\n\n';
}
```

- `if (id)` と書くと、`id: 0` が書かれません。「無い」は `undefined` だけ、と決めて比べます。
- `event` に改行が入っていると、そこから先が別の行として読まれます。この問題では `event` は自分のコードが決めた名前だけを渡す前提ですが、問題5の `formatEvent` では、改行を見つけたら断ります。

## 問題2 待っている人の一覧 `createWaiters`

```js
export function createWaiters() {
  const waiting = new Set();
  return {
    add(fn) {
      waiting.add(fn);
      return () => {
        waiting.delete(fn);
      };
    },
    notifyAll(value) {
      const list = [...waiting];
      waiting.clear();
      for (const fn of list) fn(value);
    },
    size() {
      return waiting.size;
    },
  };
}
```

- `Set` の `delete` は、無いものを消そうとしても何もしません。だから外す関数を2回呼んでも安全です。
- 先に写してから空にするので、呼ばれた人の中で `add` しても、この回のループには入りません。
- 問題9の `createWaiter` は、これにタイマーと `AbortSignal` を足して、どの終わり方でも片付けるものです。

## 問題3 WebSocket で届いたものを確かめる `isAllowedOrigin`・`parseChatMessage`

```js
export function isAllowedOrigin(origin, allowed) {
  return typeof origin === 'string' && allowed.includes(origin);
}

export function parseChatMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return { ok: false, error: 'JSON ではありません' };
  }
  if (msg === null || typeof msg !== 'object' || msg.type !== 'chat') {
    return { ok: false, error: 'type は chat です' };
  }
  if (typeof msg.text !== 'string') return { ok: false, error: 'text は文字列です' };
  const text = msg.text.trim();
  if (text.length < 1 || text.length > 500) return { ok: false, error: 'text は 1〜500 文字です' };
  return { ok: true, value: { type: 'chat', text } };
}
```

- `origin.startsWith('http://localhost')` のような比べ方は、`http://localhost.other.example` も通してしまいます。許すものを並べて、完全に同じかだけを見ます（本文4.4節）。
- `'message'` の中で例外が出ると、サーバのプロセスごと落ちます。ここで受け止めて `ok: false` にするので、呼ぶ側は「送った人にだけエラーを返す」だけで済みます（問題8）。

## 問題4 どの方法を選ぶか

| # | 選ぶもの | 理由 |
| --- | --- | --- |
| 1 | SSE（または 10〜30 秒ごとのポーリング） | サーバから知らせるだけで、客から送るものはふつうの HTTP（`POST /api/tasks`）で足りる。数秒遅れてよいなら、ポーリングがいちばん簡単で、壊れにくい。成果物では SSE にする |
| 2 | WebSocket | 両方向に、細かいもの（入力中の合図）を何度も送る。SSE でも「送るのは POST」にすればできるが、1文字ごとに HTTP のリクエストを作るのは重い |
| 3 | SSE（またはポーリング） | サーバから客への一方向。終われば閉じる。ポーリングなら「`GET /imports/7` で `progress` を見る」でもよい |
| 4 | リアルタイムにしない | 1日に1回なら、ページを開いたときに読めば十分。`Cache-Control` でキャッシュさせる（第2部 第7章） |
| 5 | WebSocket | 両方向に、とても多く、遅れなく送る |
| 6 | ポーリング（またはロングポーリング） | つなぎっぱなしにしないので、プロキシに切られても困らない。SSE も、切られたら自分でつなぎ直し、`Last-Event-ID` で続きから読めるので、心拍を短くすれば使えることが多い |
| 7 | SSE | サーバから客への一方向で、HTTP のままなので、HTTP/2 でまとめられ、CDN やプロキシも通りやすい。値が速く変わるなら「最新の値だけを送る（途中は捨てる）」ようにする |

選び方の順番は、「リアルタイムが要るか → 一方向か → 一方向なら SSE か ポーリング、両方向なら WebSocket」です。WebSocket は何でもできますが、つなぎ直し、心拍、認証、ロードバランサの設定などを全部自分で考えることになるので、要るときだけ使います。

## 問題5 SSE のイベントを書く・読む

[sse-format.mjs](sse-format.mjs) を見てください。

- **改行の注入**: `event` に `"task\ndata: 偽物"` を入れられると、読む側には `event: task` と `data: 偽物` の2行に見えます。ユーザーが入れた文字を `event` や `id` に使うときは、改行を断ります。`data` の改行は、`data:` の行を分ければ、元に戻せます
- **`split('\n\n')` で読まない**: 仕様では `\r\n` と `\r` も行の終わりです。さらに、チャンクの境目が `\r` と `\n` の間に来ることがあります。最後が `\r` のときは、次のチャンクを待ってから決めます
- **空白は1つだけ**: `trim()` すると、`data:  b`（2つ目の空白が中身）や、行の最後の空白（中身）まで消えてしまいます
- **id は引き継ぐ**: `lastEventId` は、`id:` の行が来るまで前の値のままです。ブラウザはこの値を、つなぎ直すときに `Last-Event-ID` で送ります
- 本物の画面ではブラウザの `EventSource` が読むので、自分で読み手を書くことはあまりありません。ただ、`fetch` で SSE を読みたいとき（`POST` で始めたい、ヘッダを付けたい、など）は、この読み手が要ります。生成 AI の API の「少しずつ返す」応答も、この形のことが多いです

## 問題6 イベントを配るハブと、SSE のルート

[event-hub.mjs](event-hub.mjs) を見てください。

- **送り直せる範囲**: 覚えているのが id 8〜10 なら、`Last-Event-ID: 7`（8 から欲しい）までは送り直せます。`6` だと 7 が抜けるので、黙って 8 から送ると、画面は 7 を知らないままになります。抜けがあるときは `reset` を送り、画面に全部を読み直してもらいます
- **今より後の id**: サーバを再起動すると、id は 1 から数え直します。画面は前の `Last-Event-ID: 120` を送ってくるので、これも `reset` にします。本物では、id にサーバの起動ごとの印を入れたり、データベースの通し番号を使ったりします
- **配る途中で外されても**: `listener` の中で `unsubscribe` が呼ばれることがあるので、`Set` の写し（`[...listeners]`）を回しています
- **後片付け**: `req.on('close')` で外さないと、切れた客の `res` に書き続けます。`res.write` は切れた後も例外を投げずに `false` を返すだけなので、気づきにくいバグです
- **`X-Accel-Buffering: no`**: nginx は、既定で応答をためてから送ります。SSE がまとめて遅れて届く原因になるので、このヘッダで止めます。圧縮のミドルウェア（`compression`）も、同じようにためてしまうことがあります
- **サーバが複数台**: このハブはプロセスの中のメモリなので、別のプロセスで `publish` したものは届きません。複数台にするときは、Redis の Pub/Sub などで、プロセスの間で配ります（第6部 第34章、第12部 第66章）

## 問題7 WebSocket のハンドシェイクとフレーム

[ws-protocol.mjs](ws-protocol.mjs) を見てください。

- **Accept の意味**: `Sec-WebSocket-Accept` は、「このサーバは WebSocket を分かっていて、ほかのリクエストへの応答を使い回したのではない」という確かめです。秘密を守るものではありません（鍵も GUID も見えています）
- **Origin を確かめる理由**: ブラウザの `WebSocket` には CORS がありません。ほかのサイトのページの JavaScript も、あなたのサーバに `new WebSocket(…)` でつなげ、ブラウザはそのとき、あなたのサイトの Cookie を付けて送ります。Origin を確かめないと、ログインした人になりすました接続ができてしまいます（Cross-Site WebSocket Hijacking）。`Origin` はブラウザが付けるもので、ページの JavaScript からは変えられません
- **Origin の比べ方**: `startsWith('http://localhost:5173')` で比べると、`http://localhost:5173.evil.example` が通ります。完全に同じかで比べます（第2部 第9章の CORS と同じ）
- **長さを先に確かめる**: 長さの欄には 2^63 まで書けます。「本体が全部届くまで、ためて待つ」と、大きな長さを送られただけでメモリを使い切ります。長さが分かった時点で断ります。ws の `maxPayload` がこれです
- **マスク**: 客から送るフレームは、必ずマスクします。WebSocket を知らない古いプロキシが、フレームの中身を HTTP のリクエストと取り違えて、キャッシュを汚す攻撃を防ぐためです。サーバから送るものは、マスクしません

## 問題8 WebSocket のチャットのバグを直す

[chat.mjs](chat.mjs) を見てください。

| バグ | 起きていたこと | 通る確認 |
| --- | --- | --- |
| Origin を確かめていない | ほかのサイトのページから、Cookie つきでつなげる | 2 |
| `JSON.parse` を `try` で囲んでいない | `'message'` の中で投げた例外は、受け止める人がいないので、プロセスごと落ちる。つながっている全員が切れる | 3 |
| 形を確かめていない | `text` が無い・数・長すぎるものも配る | 4 |
| `maxPayload` を決めていない | 既定は 100 MiB。大きなものを何回か送られると、メモリを使い切る | 5 |
| 自分の `Set` から外していない | 閉じた接続が残り続ける（数がふくらむ。閉じたものに `send` し続ける） | 6, 8 |
| 心拍が無い | 電波が切れた客は `close` が来ないので、いつまでも残る | 7, 8 |

- `ws` の `wss.clients` は、閉じた接続を自分で外してくれます。自分で `Set` を作るなら、`ws.on('close')` で外します
- `noServer: true` にして `'upgrade'` を自分で受けると、Origin のほかに、Cookie のセッションを読んで「ログインしていなければ 401」といった確かめもできます（第10部）
- 心拍は、ブラウザの `WebSocket` が自分で pong を返すので、画面のコードには何も書かなくてよいです。ブラウザの側から「サーバが生きているか」を知りたいときは、アプリのメッセージ（`{"type":"ping"}`）を自分で決めます
- 確認1は、直す前から通ります。正しい客だけを相手にしているうちは、問題が見えません

## 問題9 ロングポーリングの片付け

[long-poll.mjs](long-poll.mjs) を見てください。

- **`once` でも残る**: `bus.once('notify', …)` は、1回呼ばれれば外れますが、時間切れや客が切ったときは呼ばれないので、残り続けます。1万人が 25 秒ごとに聞き直すと、1時間で 1万 × 144 = 144 万個の listener がたまり、`notify` のたびに、もういない客の分まで関数が呼ばれます。Node.js は、1つのイベントに 11 個以上の listener が付くと警告を出しますが、`setMaxListeners` で上限を上げてしまうと、それも出なくなります
- **終わり方を1か所に**: `done(why)` が、タイマー・`signal`・`Set` の3つを必ず片付けます。どの道を通っても `done` を呼ぶ形にすると、片付け忘れが起きにくくなります
- **`AbortSignal`**: 「途中でやめる」を伝える標準の方法です。`fetch` や `setTimeout`（`node:timers/promises`）も、同じ `signal` を受け取れます。ルートでは `res.once('close')` で `abort()` して、客が切ったことを `wait` に伝えています
- **204 で返す**: 時間切れのときに 200 の空の配列を返してもよいのですが、204 にすると「何も無かったので、すぐに聞き直して」が分かりやすくなります。`Cache-Control: no-store` は、途中のキャッシュに古い答えを覚えさせないためです
