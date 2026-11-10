# 第27章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part05/ch27-realtime/exercises/` で行います。最初に `cd exercises` で移動してください（`cd ~/dev/part05/ch27-realtime/exercises` と打っても構いません）。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- | --- |
| 1 | 基本 | SSE で送る文字列を作る `toSse`・`ping` | [sse-text.mjs](sse-text.mjs)、[sse-text.test.mjs](sse-text.test.mjs) | 3.1 | — |
| 2 | 基本 | 待っている人の一覧 `createWaiters` | [waiters.mjs](waiters.mjs)、[waiters.test.mjs](waiters.test.mjs) | 2.2 | — |
| 3 | 基本 | WebSocket で届いたものを確かめる `isAllowedOrigin`・`parseChatMessage` | [chat-message.mjs](chat-message.mjs)、[chat-message.test.mjs](chat-message.test.mjs) | 4.4, 4.5 | — |
| 4 | 基本 | どの方法を選ぶか（調べる問題） | このページ | 1〜5 | — |
| 5 | 応用 | SSE のイベントを書く・読む | [sse-format.mjs](sse-format.mjs)、[sse-format.test.mjs](sse-format.test.mjs) | 3 | — |
| 6 | 応用 | イベントを配るハブと、SSE のルート | [event-hub.mjs](event-hub.mjs)、[event-hub.test.mjs](event-hub.test.mjs) | 3 | 空いている番号 |
| 7 | 発展 | WebSocket のハンドシェイクとフレーム | [ws-protocol.mjs](ws-protocol.mjs)、[ws-protocol.test.mjs](ws-protocol.test.mjs) | 4.1, 4.2 | — |
| 8 | 発展 | WebSocket のチャットのバグを直す | [buggy-chat.mjs](buggy-chat.mjs)、[chat.test.mjs](chat.test.mjs) | 4.3〜4.5 | 9349 |
| 9 | 発展 | ロングポーリングの片付け | [long-poll.mjs](long-poll.mjs)、[long-poll.test.mjs](long-poll.test.mjs) | 2 | 空いている番号 |

**発展**（7〜9）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

- 問題4以外は、`○○.mjs` の「ここを書く」を埋める（問題8はバグを直す）と、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。最初は、問題5が 12 個中 11 個、問題6が 10 個中 8 個、問題7が 11 個中 9 個、問題8が 8 個中 7 個、問題9が 9 個中 6 個失敗します。
- 問題6の `event-hub.mjs` は、同じフォルダの `sse-format.mjs`（問題5）を使います。問題6で送るのは1行の `data` だけなので、問題5が終わっていなくても試せます。
- 問題8のテストは、サーバを別のプロセスで起動します。サーバが落ちると、次のテストの前に起動し直します。

---

## 基本

### 問題1 SSE で送る文字列を作る `toSse`・`ping`

SSE で1つのイベントを送るときの文字列を作る関数を、[sse-text.mjs](sse-text.mjs) に作ってください（本文3.1節）。

```js
toSse({ data: 'hello' });                          // → 'data: "hello"\n\n'
toSse({ event: 'task', data: { id: 7 }, id: 42 });  // → 'event: task\ndata: {"id":7}\nid: 42\n\n'
ping();                                            // → ': ping\n\n'
```

- **`toSse({ event, data, id })`**: `event:`・`data:`・`id:` の順に1行ずつ書き、最後に空の行（`\n`）を足す
  - `data` は、いつも `JSON.stringify` してから書く（文字列も `"hello"` になる）
  - `event`・`id` は、`undefined` のときだけ行ごと書かない（`id: 0` は書く）
- **`ping()`**: 心拍のコメントの行 `: ping` と、空の行

```sh
$ node --test sse-text.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- 本文の `sse-clock.mjs` で、`res.write` に渡した文字列と同じ形です。
- 空の文字列 `let text = ''` に、`text += …` で行を足していきます。
- `data` の中の改行は、`JSON.stringify` で `\n` の2文字になるので、行が分かれません。JSON にしない文字列を送るときの決まりは、問題5で扱います。

### 問題2 待っている人の一覧 `createWaiters`

ロングポーリングで「新しいものが来たら、待っている全員を起こす」ための一覧を、[waiters.mjs](waiters.mjs) の `createWaiters()` に作ってください（本文2.2節）。

| 関数 | すること |
| --- | --- |
| `add(fn)` | `fn` を一覧に入れる。**一覧から外す関数**を返す |
| `notifyAll(value)` | 一覧の全員を `fn(value)` で呼び、一覧を空にする |
| `size()` | 一覧に入っている数 |

- 外す関数を2回呼んでも、ほかの人は消えない
- `notifyAll` の途中で `add` された人は、その回には呼ばない（次の `notifyAll` で呼ぶ）

```sh
$ node --test waiters.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- 一覧は `new Set()` にすると、`add`・`delete`・`size` がそのまま使えます。
- `notifyAll` では、先に `[...一覧]` で配列に写してから `clear()` し、写した配列の全員を呼びます。
- 外す関数を返すのは、本文の `long-wait.mjs` で `bus.off` を呼んだのと同じ「片付け」を、使う人がいつでもできるようにするためです。

### 問題3 WebSocket で届いたものを確かめる `isAllowedOrigin`・`parseChatMessage`

[chat-message.mjs](chat-message.mjs) に、2つの関数を作ってください（本文4.4・4.5節）。

- **`isAllowedOrigin(origin, allowed)`**: `origin` が、配列 `allowed` のどれかと**完全に同じ**なら `true`。`undefined` や、似ているだけのもの（大文字にしたもの、後ろに何か付いたもの）は `false`
- **`parseChatMessage(raw)`**: 届いたもの（文字列か `Buffer`）を確かめ、`{ ok: true, value: { type: 'chat', text } }` か `{ ok: false, error: 説明 }` を返す
  - JSON でなければ `ok: false`（**例外を投げない**）
  - `type` が `'chat'` で、`text` が文字列。`text` は前後の空白を取って 1〜500 文字
  - `value` には、空白を取った `text` を入れる

```sh
$ node --test chat-message.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- `allowed.includes(origin)` は、完全に同じものがあるかを調べます。
- `String(raw)` で、`Buffer` も文字列にできます。
- `JSON.parse` は `try { … } catch { … }` で囲みます。`'null'` や `'123'` も JSON としては正しいので、結果がオブジェクトかどうかも確かめます（`msg === null || typeof msg !== 'object'`）。
- 本文の `ws-echo.mjs` の `message` の中身を、関数に取り出したものです。

### 問題4 どの方法を選ぶか（調べる問題）

次のそれぞれで、ポーリング・ロングポーリング・SSE・WebSocket・「リアルタイムにしない（ページを読み直したときに新しくなればよい）」のどれを選びますか。理由も書いてください。答えは1つとは限りません。

1. タスク管理アプリで、ほかの人がタスクを足したら、一覧に出るようにしたい（数秒遅れてもよい）
2. 1対1のチャット。相手が入力中かどうか（「入力中…」）も見せたい
3. 時間のかかる CSV の取り込みの、進み具合（何 % 終わったか）を見せたい
4. 1日に1回だけ変わる「今日のお知らせ」
5. 何人もが同時に書き込めるホワイトボード。線を引いたら、ほかの人の画面にすぐ出る
6. 会社の中の古いプロキシを通るので、長くつなぎっぱなしの接続が切られやすい環境で、通知を出したい
7. 株価のように、1秒に何回も値が変わるものを、たくさんの人に見せたい（見る人からは何も送らない）

---

## 応用

### 問題5 SSE のイベントを書く・読む

[sse-format.mjs](sse-format.mjs) の3つの関数を、SSE の仕様（HTML Living Standard の「Server-sent events」）どおりにしてください。

**`formatEvent({ data, event, id, retry, comment })`**

- 書く順番は `: comment`・`event:`・`data:`・`id:`・`retry:` で、最後に空の行
- `data` の中の改行（`\r\n`・`\n`・`\r`）は、`data:` の行を分ける。`data` が文字列でなければ `TypeError`
- `comment` も、改行ごとに `: ` の行を分ける
- `event`・`id` に改行が入っていたら `TypeError`（そこから先が別の行として読まれ、偽のイベントを作れてしまう）。`id` に NULL（`\0`）が入っていても `TypeError`
- `retry` は 0 以上の整数だけ

**`createEventStreamParser(onEvent, { onRetry })`** は、届いた文字列を少しずつ `push(chunk)` で受け取り、最後に `end()` を呼ばれる読み手です。

- 行の終わりは `\r\n`・`\n`・`\r` のどれでもよい。チャンクの最後が `\r` なら、次のチャンクの最初が `\n` かもしれないので、待つ
- 最初の BOM（`﻿`）は捨てる
- `:` で始まる行はコメントなので無視
- `名前: 値` の、`:` の後の空白は**1つだけ**取る。`:` が無い行は、行全体が名前で、値は空
- `data` は値に `\n` を足してためる。`event` は種類、`id` は最後の id（NULL を含むものは無視）、`retry` は数字だけのときに `onRetry(ms)`。ほかの名前は無視
- 空の行が来たら、ためた `data` の最後の `\n` を取って `onEvent({ type, data, lastEventId })`。`type` が無ければ `message`。`data` が空（`data` の行が1つも無い）なら送らない。`type` と `data` は空に戻すが、**`lastEventId` は戻さない**（次のイベントにも引き継がれる）
- `end()` のときに、空の行で終わっていないイベントは捨てる

```sh
$ node --test sse-format.test.mjs
```

### 問題6 イベントを配るハブと、SSE のルート

[event-hub.mjs](event-hub.mjs) の `createEventHub({ bufferSize })` と `sseRoute(hub, { heartbeatMs, retryMs })` を完成させてください。成果物では、タスクが作られたり変わったりしたときに、これで画面に知らせます。

**`createEventHub`**

- `publish(type, data)`: id（`'1'`・`'2'`・… の文字列）を付けて、受け取っている全員に `{ id, type, data }` を配る。`data` が文字列でなければ JSON にする。最後の `bufferSize` 個（既定 100）を覚えておく
- `subscribe(lastEventId, listener)`: 受け取り始め、やめる関数を返す。`lastEventId` があれば、覚えている中の、それより後のものを先に `listener` に渡す。送り直せない（覚えている一番古いものより前、今より後、数でない）ときは、`{ id: 今の id, type: 'reset', data: '' }` を1つ渡す（画面は全部を読み直す）
- `size()` は受け取っている数、`buffered()` は覚えている数

**`sseRoute`**

- `text/event-stream`、`Cache-Control: no-cache` で返し、最初に `retry: retryMs` を送る
- `Last-Event-ID` ヘッダ（無ければ `?lastEventId=`）を `subscribe` に渡す。ブラウザの `EventSource` は、最初の接続ではヘッダを付けられないため、クエリでも受け付けます
- `heartbeatMs` ごとにコメント（`: ping`）を送る
- 客が切ったら、ハブから外れ、タイマーを止める

```sh
$ node --test event-hub.test.mjs
```

---

## 発展

### 問題7 WebSocket のハンドシェイクとフレーム

[ws-protocol.mjs](ws-protocol.mjs) を、RFC 6455 どおりにしてください。ふだんは ws ライブラリがすることですが、一度自分で書くと、ライブラリの設定（`maxPayload` など）の意味が分かります。

**`checkHandshake(req, { allowedOrigins, allowNoOrigin, protocols })`** は、`{ ok: true, headers }` か `{ ok: false, status, headers?, reason }` を返します。

- GET でなければ 400
- `Upgrade` に `websocket`、`Connection` に `upgrade` という言葉が無ければ 400。どちらもカンマで区切った並びで、大文字・小文字を区別しない（`Connection: keep-alive, Upgrade` も通す）
- `Sec-WebSocket-Version` が `13` でなければ 426 と `Sec-WebSocket-Version: 13`
- `Sec-WebSocket-Key` は、16 バイトを base64 にしたもの（24 文字で `==` で終わる）。違えば 400
- `Origin` が `allowedOrigins` に無ければ 403。`Origin` が無いときは、`allowNoOrigin` のときだけ通す
- 通すときの `headers` は `Upgrade`・`Connection`・`Sec-WebSocket-Accept`。客が `Sec-WebSocket-Protocol` で出した並びのうち、`protocols` にある最初のものを `Sec-WebSocket-Protocol` に入れる（無ければ付けない）

**`encodeFrame(opcode, payload, { mask })`** と **`decodeFrame(buf, { maxPayload })`**

- 長さが 125 までは2バイト目に、126〜65535 は 126 と2バイト、それより長ければ 127 と8バイト
- `mask`（4 バイト）を渡されたら、2バイト目の最上位のビットを立て、鍵を入れて、`payload` を XOR する
- `decodeFrame` は、まだ全部届いていなければ `null`。読めたら `{ fin, opcode, payload, size }`（`size` は読んだバイト数）。長さが `maxPayload` を超えると分かった時点で `RangeError`（本体が届くのを待たない）

```sh
$ node --test ws-protocol.test.mjs
```

### 問題8 WebSocket のチャットのバグを直す

[buggy-chat.mjs](buggy-chat.mjs) は、ブラウザで2つのタブを開いて試すぶんには、ちゃんと動きます（`node buggy-chat.mjs` で http://127.0.0.1:9349/chat.html）。でも、次の仕様に合わない所が 6 か所あります。

- `ws://127.0.0.1:9349/ws` で、`Origin` が `http://127.0.0.1:9349` か `http://localhost:9349` のときだけつなげる。ほかは 403
- 客は `{"type":"chat","text":"…"}` を送る。`text` は前後の空白を取って 1〜500 文字。正しければ、全員に `{"type":"chat","text":"…","at":"…"}` を配る。正しくなければ、送った人だけに `{"type":"error",…}` を返す
- 何が届いても、サーバは落ちない
- 1つのメッセージは 16 KiB まで。超えたら閉じる（1009）
- `HEARTBEAT_MS` ごとに ping を送り、前の ping に返事（pong）が無かった接続は切る
- `GET /stats` は、今つながっている数 `{ "clients": n }`

```sh
$ node --test chat.test.mjs
```

確認3では、サーバのプロセスが落ちます。ブラウザから試しているだけでは、「いつも正しい JSON を送る画面」しか使わないので、気づけません。WebSocket の向こうにいるのが、自分の作った画面だけとは限らないことを考えてください。

### 問題9 ロングポーリングの片付け

[long-poll.mjs](long-poll.mjs) は、サンプルの [polling-demo.mjs](../samples/polling-demo.mjs) と同じ考え方の「待つ」部分（`createWaiter`）と、そのルート（`longPollRoute`）です。ふつうに動きますが、待つのをやめるときの片付けがありません。

- `wait({ timeoutMs, signal })` は `'notified'`（`notifyAll` で起こされた）・`'timeout'`・`'aborted'`（`signal` で止められた。始める前に止まっていたら、すぐ）のどれかで終わる。どの終わり方でも、タイマー・`signal` の listener・待っている人の記録を全部片付ける
- 1000 人が待っても、警告（`MaxListenersExceededWarning`）を出さない
- `longPollRoute({ list, waiter, timeoutMs })` は `GET /events?since=N`。`since` は 0 以上の整数（それ以外は 400）。新しいものがあればすぐに 200、無ければ待つ。時間内に来なければ 204。客が先に切ったら、待つのをやめる

```sh
$ node --test long-poll.test.mjs
```

考えてみてください: 片付けを忘れたまま、1万人がロングポーリングで待ち、それぞれが 25 秒ごとに聞き直すと、1時間で何個の「片付け忘れ」がたまるでしょう。
