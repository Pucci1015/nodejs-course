# 第6章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 問題 | ポート |
| --- | --- | --- |
| [my-http-server-v2.mjs](my-http-server-v2.mjs) | 2・3 | 8085 |
| [hello-http-v2.mjs](hello-http-v2.mjs) | 4 | 8086 |
| [calc-server.mjs](calc-server.mjs) | 6 | 8088 |
| [logged-server.mjs](logged-server.mjs) | 7 | 8082 |
| [http-get.mjs](http-get.mjs) | 9 | （8081 に接続） |
| [fixed-server.mjs](fixed-server.mjs) | 10（発展） | 8090 |
| [http-get-v2.mjs](http-get-v2.mjs) | 11（発展） | （8081 に接続） |

模範解答を動かして試すときも、`cp -R` で `~/dev/ch06/` にコピーしてから、`~/dev/ch06` で `node solutions/ファイル名` のように動かします（`logged-server.mjs` は `../exercises/app-handler.mjs` を読み込むので、`solutions` と `exercises` が並んでいる必要があります）。

---

## 問題1 curl で送ったリクエストを確かめる

**1.** `-d` を付けると、curl はメソッドを自動で `POST` にし、`Content-Type: application/x-www-form-urlencoded`（HTML のフォームと同じ形式）を付けます。

```json
  "method": "POST",
  "headers": {
    ...
    "content-length": "3",
    "content-type": "application/x-www-form-urlencoded"
  },
  "body": "x=1",
```

**2.** `-d` は中身が JSON でも `content-type` を `application/x-www-form-urlencoded` にします。サーバは**中身を見て推測せず、`Content-Type` を信じて**解釈するので、JSON だと分かりません。正しくは次のようにします。

```sh
$ curl -s -H 'Content-Type: application/json' -d '{"a":1}' http://127.0.0.1:8081/j
```

Flask の `request.get_json()` が、`Content-Type: application/json` が無いと `None` を返した（またはエラーになった）のも同じ理由です。

**3.** 1つ目は `Connected` の後に `Re-using existing connection` が出て、2つの URL を1本の接続で送っています（keep-alive）。2つ目は `Connection: close` を付けたので、サーバが1つ目の後に接続を閉じ、`Connected` が2回出ます。

## 問題2 自作のサーバにパスを足す

[my-http-server-v2.mjs](my-http-server-v2.mjs) の振り分けの部分:

```js
    } else if (target === '/hello-ja') {
      respond(socket, 200, 'OK', 'こんにちは\n');
    } else if (target === '/time') {
      respond(socket, 200, 'OK', `今は ${new Date().toLocaleString('ja-JP')} です\n`);
    } else {
```

```sh
$ curl -i http://127.0.0.1:8085/hello-ja
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 16
Connection: close

こんにちは
```

`こんにちは\n` は、日本語5文字 × 3バイト + 改行1バイト = **16バイト**です。`respond` の中で `Buffer.byteLength(body)` を使っているので、パスを足すだけで正しい長さになります。長さの計算を `respond` 1か所にまとめておいた効果です。

## 問題3 GET 以外には 405 を返す

```js
function respond(socket, status, reason, body, extraHeaders = '') {
  socket.write(
    `HTTP/1.1 ${status} ${reason}\r\n` +
      'Content-Type: text/plain; charset=utf-8\r\n' +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      extraHeaders +
      'Connection: close\r\n' +
      '\r\n' +
      body,
  );
  socket.end();
}
```

```js
    if (method !== 'GET') {
      respond(socket, 405, 'Method Not Allowed', 'GET だけ使えます\n', 'Allow: GET\r\n');
    } else if (target === '/') {
```

**つまずきやすい所**: `extraHeaders` に `\r\n` を付け忘れると、`Allow: GETConnection: close` と1行につながってしまいます。メソッドの確認を、パスの振り分けより**先に**書くのもポイントです。後に書くと、`POST /abc` に 404 と 405 のどちらを返すかがあいまいになります（この解答では、使えないメソッドなら 405 を優先しています）。

## 問題4 node:http のサーバにパスを足す

[hello-http-v2.mjs](hello-http-v2.mjs) の足した部分:

```js
  } else if (req.method === 'GET' && req.url === '/hello-ja') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('こんにちは\n');
  } else if (req.method === 'GET' && req.url === '/headers') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(`${JSON.stringify(req.headers, null, 2)}\n`);
  } else {
```

`-H 'X-Hello: abc'` で送ると、`"x-hello": "abc"` と**小文字**で表示されます。`node:http` がヘッダ名を小文字にそろえているからです（本文5.4節で自分で `toLowerCase()` したのと同じ）。`Content-Length` も書いていませんが、`res.end` に全部渡したので自動で付いています。`res.statusCode` を書かないときは 200 になります。

## 問題5 ステータスコードを選ぶ

| 場面 | コード | 理由 |
| --- | --- | --- |
| 1. 作った | **201 Created** | 新しく作ったことを伝える（200 でも間違いではないが、201 の方が意味がはっきりする） |
| 2. 削除した、ボディ無し | **204 No Content** | 成功したが、返すものが無い |
| 3. 無かった | **404 Not Found** | 指定した URL のものが無い |
| 4. ログインしていない | **401 Unauthorized** | 誰か分からない。ログインすれば成功するかもしれない |
| 5. 他人のタスク | **403 Forbidden**（または 404） | 誰かは分かっているが、権限が無い。ログインし直しても成功しない |
| 6. JSON が壊れている | **400 Bad Request** | リクエストの形そのものが読めない。送った側の誤り |
| 7. 送りすぎ | **429 Too Many Requests** | 回数の制限を超えた |
| 8. データベースが止まっている | **503 Service Unavailable**（または 500） | リクエストは正しいが、サーバ側が一時的に処理できない |

5 で、あえて **404** を返す設計もあります。403 を返すと「`/tasks/5` は**存在する**」と教えてしまうからです。GitHub で、権限の無い非公開のリポジトリを開くと 404 になるのはこのためです（第10部で詳しく扱います）。

## 問題6 送られた数の合計を返すサーバ

[calc-server.mjs](calc-server.mjs) のボディを読む部分:

```js
  req.on('end', () => {
    const words = body.trim().split(' ');
    let sum = 0;
    for (const word of words) {
      const n = Number(word);
      if (word === '' || Number.isNaN(n)) {
        send(res, 400, `数ではありません: "${word}"\n`);
        return;
      }
      sum += n;
    }
    send(res, 200, `合計: ${sum}\n`);
  });
```

```sh
$ curl -d '1 2 3' http://127.0.0.1:8088/sum
合計: 6
$ curl -d '1 x' http://127.0.0.1:8088/sum
数ではありません: "x"
$ curl -i http://127.0.0.1:8088/sum
HTTP/1.1 405 Method Not Allowed
Allow: POST
...
```

**つまずきやすい所**:

- `for` の中の `return` は、`'end'` の関数を終えます。`return` を忘れると、400 を返した後に `send(res, 200, ...)` も呼ばれ、「1つのリクエストに2回返事をした」というエラー（`ERR_STREAM_WRITE_AFTER_END` など）になります。
- 空のボディは `''.split(' ')` で `['']` になり、`Number('')` は `0` なので、調べないと「合計: 0」と返してしまいます。
- `1  2`（スペース2つ）を送ると、間に `''` ができて 400 になります。気になる人は `split(' ')` の結果から `''` を除く（第4章8.1節の `filter`）と、スペースがいくつでも受け付けられます。
- 数ではないボディは「送った側の誤り」なので 4xx（400）、`GET` は「このパスでは使えないメソッド」なので 405 です。

## 問題7 アクセスログを付ける

[logged-server.mjs](logged-server.mjs):

```js
import http from 'node:http';
import { handler } from './exercises/app-handler.mjs';   // 模範解答のファイルでは ../exercises/

const server = http.createServer((req, res) => {
  const start = Date.now();
  res.on('finish', () => {
    const time = new Date().toISOString();
    const ip = req.socket.remoteAddress;
    console.log(`${time} ${ip} "${req.method} ${req.url} HTTP/${req.httpVersion}" ${res.statusCode} ${Date.now() - start}ms`);
  });
  handler(req, res);
});
```

```
http://127.0.0.1:8082/ で待ち受けています
2026-11-09T10:24:04.460Z 127.0.0.1 "GET /hello-ja HTTP/1.1" 200 4ms
2026-11-09T10:24:04.768Z 127.0.0.1 "GET /chunked HTTP/1.1" 200 304ms
2026-11-09T10:24:04.775Z 127.0.0.1 "HEAD /hello-ja HTTP/1.1" 200 0ms
2026-11-09T10:24:04.781Z 127.0.0.1 "GET /status/404 HTTP/1.1" 404 0ms
2026-11-09T10:24:04.787Z 127.0.0.1 "GET /nothing HTTP/1.1" 404 0ms
```

**ポイント**:

- `res.on('finish', ...)` は `handler(req, res)` を呼ぶ**前に**登録します。`handler` がすぐに `res.end` してしまうと、後から登録したのでは間に合わないことがあります。
- `/chunked` は、書き終わるまで 300ms ほどかかっています。`'finish'` は「送り終えたとき」なので、かかった時間が正しく測れます。
- `/slow` の途中で curl を `Ctrl + C` で止めると、`'finish'` は起きず、ログは出ません。送り終える前に接続が切れたからです。止められた場合もログに残したいときは、`res.on('close', ...)` を使い、`res.writableFinished`（送り終えたか）で区別します。
- `handler` の中身を1行も変えずに、前後に処理を足せました。第5部の Express の**ミドルウェア**は、この形を整理したものです。

## 問題8 長さを間違えたリクエストを nc で送る

| | レスポンス | nc | サーバの解釈 |
| --- | --- | --- | --- |
| A | **2つ** | すぐ終わる | 1件目のボディは `hel`。2件目のメソッドは **`loGET`** |
| B | 0 | 待ち続ける | ボディの残り5バイトを待っている |
| C | 1つ | すぐ終わる | ボディは `name=` と「山」の途中の2バイト（`name=�`） |

**A**: サーバのターミナルには、次のように表示されます。

```
[接続 #1] 1 件目: POST /a HTTP/1.1
[接続 #1] 2 件目: loGET /b HTTP/1.1
```

サーバは `Content-Length: 3` を信じて `hel` までを1件目のボディとし、**残りの `lo` を2件目のリクエストの始まり**として読みました。

**B**: サーバは「あと5バイト来るはず」と待ち、`nc` もサーバの返事を待つので、どちらも動きません。このサーバは30秒で接続を切ります（`nc` の版によっては、すぐに終わることもあります。どちらの場合もレスポンスは返りません）。

**C**: `name=ねこ` は11バイトですが、7バイトで切ったので、「山」（3バイト）の途中までがボディになり、`�` になりました。**`Content-Length` を文字数で数えると、日本語を含むときだけ壊れる**ので、英語だけで試していると気付きません。

A のように「どこまでが1つ目のリクエストか」の解釈が、手前の中継サーバと奥のアプリのサーバで食い違うと、中継サーバのチェックをすり抜けたリクエストがアプリに届いてしまいます。これは **HTTP リクエストスマグリング**と呼ばれる攻撃の原因で、HTTP の解析を自作しない方がよい理由の1つです。

## 問題9 node:net で HTTP のクライアントを書く

[http-get.mjs](http-get.mjs) の中心部分:

```js
socket.on('connect', () => {
  socket.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`);
});

let response = '';
socket.on('data', (chunk) => {
  response += chunk;
});

socket.on('end', () => {
  const headerEnd = response.indexOf('\r\n\r\n');
  const head = response.slice(0, headerEnd);
  const body = response.slice(headerEnd + 4); // \r\n\r\n の4文字の後ろがボディ
  const [statusLine, ...headerLines] = head.split('\r\n');
  const status = statusLine.split(' ')[1];

  console.log(`ステータス: ${status}`);
  console.log('ヘッダ:');
  for (const line of headerLines) {
    console.log(`  ${line}`);
  }
  console.log('ボディ:');
  console.log(body);
});
```

`/chunked` では、ボディに次のような行が混ざります。

```
ボディ:
8
1つ目

8
2つ目
...
0
```

`Transfer-Encoding: chunked` で送られてきたので、ボディは「長さ（16進数）・中身」のかたまりになっています（本文9.3節）。このクライアントは「接続が閉じるまでが全部ボディ」として表示しているので、長さの行もそのまま出ています。`/status/404` も、`http-echo-server.mjs` が chunked で返すので同じです。かたまりを読み解くのが問題11です。

## 問題10 HTTP サーバのバグを直す（発展）

| バグ | 場所 | 何が起きるか | 失敗するテスト |
| --- | --- | --- | --- |
| ① `Content-Length` を文字数で数えている | `respond` の `${body.length}` | `こんにちは\n` は6文字・16バイトなので `Content-Length: 6` と送り、curl は先頭6バイト（`こん`）だけを読む | 1〜4 |
| ② ヘッダ名の大文字・小文字を区別している | `headers[line.slice(0, colon)]` と `headers['Content-Length']` | `content-length:` と小文字で送られると見つからず、ボディの長さが 0 になる | 3 |
| ③ 1回の `'data'` を1つのリクエストだと思っている | `socket.on('data', ...)` の中で、届いた分だけを解析している | リクエストが分かれて届くと、最初の `'data'` に `\r\n\r\n` が無いので、すぐに 400 を返す | 4 |

①を直すと、テスト1・2が成功し、3・4の「実際」が変わります。①が残っている間は、すべてのレスポンスが途中で切れるので、②③の症状が見えませんでした。**1つのバグが他のバグを隠す**ことはよくあるので、1つずつ直して、結果がどう変わるかを見ることが大切です。

模範解答は [fixed-server.mjs](fixed-server.mjs) です。修正した箇所に `// 修正:` のコメントを付けてあります。③は、第5章の行サーバと同じく「接続ごとにバイトをためて、揃った分だけ処理する」形にしました。

```js
    let pending = Buffer.alloc(0);           // 接続ごとに、届いたバイトをためる

    socket.on('data', (chunk) => {
      pending = Buffer.concat([pending, chunk]);
      while (true) {
        const headerEnd = pending.indexOf(HEADER_END);
        if (headerEnd === -1) return;        // ヘッダの終わりがまだなら、続きを待つ
        // ...ヘッダを読み、Content-Length を調べる...
        if (pending.length < bodyStart + length) return;   // ボディが揃うまで待つ
        const body = pending.subarray(bodyStart, bodyStart + length).toString('utf8');
        pending = pending.subarray(bodyStart + length);    // 残りは次のリクエスト
        // ...返事をする...
      }
    });
```

`Buffer.alloc(0)` は、0バイトの（空の）バイト列を作ります。`while (true)` は、`return` するまで繰り返す書き方で、1回の `'data'` に2つのリクエストが入っていても、両方を処理できます。

**curl やブラウザでは起きないのに直すべき理由**: クライアントは curl とブラウザだけではありません。他の言語の HTTP ライブラリや中継サーバは、ヘッダ名を小文字で送ることがよくあります（HTTP/2 ではヘッダ名は必ず小文字です）。また、127.0.0.1 では1回で届くリクエストも、インターネットを通ると分かれて届きます。

## 問題11 長さを見てレスポンスの終わりを判断する（発展）

[http-get-v2.mjs](http-get-v2.mjs) の chunked を読む部分:

```js
function readChunked(data) {
  const parts = [];
  let pos = 0;
  while (true) {
    const lineEnd = data.indexOf('\r\n', pos);
    if (lineEnd === -1) return undefined;
    const size = parseInt(data.subarray(pos, lineEnd).toString(), 16); // 長さは16進数
    if (size === 0) return Buffer.concat(parts); // 長さ 0 のかたまりで終わり
    const start = lineEnd + 2;
    if (data.length < start + size + 2) return undefined; // かたまりがまだ届いていない
    parts.push(data.subarray(start, start + size));
    pos = start + size + 2; // かたまりの後ろの \r\n を飛ばす
  }
}
```

`data.indexOf('\r\n', pos)` は、`pos` バイト目から後ろを探します。揃っていなければ `undefined` を返し、`'data'` の側は `return` して次の `'data'` を待ちます。

```sh
$ node http-get-v2.mjs 8081 /chunked
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

1つ目
2つ目
3つ目
```

レスポンスのヘッダが `Connection: keep-alive` になっていることに注目してください。サーバは接続を開けたままにしていますが、クライアントはボディの長さから「揃った」と分かったので、自分から閉じて終われました。ブラウザや `fetch` は、この判断をしているので、1本の接続で次のリクエストを続けて送れます（本文10節）。
