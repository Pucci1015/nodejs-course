# 第17章 `node:http` で最小のサーバ

第2部では、`node:http` で小さなサーバを何度か動かしました。ただ、そのときは HTTP のバイト列を見るのが目的で、サーバのコードは「おまけ」でした。
第4部では、フレームワーク（Express など）を使わずに、`node:http` だけで Web アプリを作ります。フレームワークが中でしていることを自分で一度書いておくと、第5部で Express を使うときに「この1行は何をしてくれているのか」が分かり、困ったときに自分で調べられるようになります。

この章はその土台です。サーバを起動して止めるまでの間に何が起きるかを、イベントの順番、レスポンスの返し方、例外、止め方、時間の制限の順に、実際に動かして確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第2部 第6章（HTTP のバイト列、Content-Length、chunked、keep-alive）、第3部 第12章（async/await）、第15章（EventEmitter、Stream）、第16章8節（シグナル） |
| この章のゴール | `createServer` と `listen` でサーバを起動し、ポートと待ち受けるアドレスを説明できる / 1つのリクエストで起きるイベントの順番（`request`・`data`・`end`・`finish`・`close`）を説明できる / `setHeader`・`writeHead`・`write`・`end` の決まりを守ってレスポンスを返せる / ハンドラの例外でサーバが止まる理由と、止めない書き方を説明できる / SIGTERM で安全に止まるサーバを書ける / 遅い客に対する時間の制限を説明できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 最小のサーバ、イベントの順番、レスポンスの返し方、例外、安全に止める、時間の制限 |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> 外部のパッケージは使わないので、`npm install` は不要です。Node.js は第1部 第2章で mise を使って入れたもの（この教材は Node 26 で確かめています）を使います。まだ入れていなければ、`brew install mise` の後に `mise use -g node@26` を実行し、`node -v` で `v26` から始まる番号が出ることを確かめてください。

---

## 1. フレームワークは何をしてくれているのか

### 1.1 Flask がしてくれていたこと

Flask を使ったことがあれば、こういうコードを書いたはずです。

```python
from flask import Flask
app = Flask(__name__)

@app.route('/hello')
def hello():
    return 'こんにちは'

app.run(port=5010)
```

Flask は、Python で Web アプリを作るための「フレームワーク」（土台になるライブラリ）です。この数行の裏で、Flask は少なくとも次のことをしています。

1. `app.run()` が、**開発用の小さな Web サーバ**を起動する。このサーバが TCP の接続を受け付け、届いたバイト列を HTTP のリクエストとして読み解く（Flask が中で使っている Werkzeug というライブラリの仕事）
2. URL の `/hello` を見て、`@app.route('/hello')` を付けた関数を選んで呼ぶ（**ルーティング**。第18章）
3. 関数が返した文字列を、ステータス 200・`Content-Type: text/html; charset=utf-8`・`Content-Length` 付きのレスポンスにして、バイト列で送り返す
4. 関数の中で例外が起きたら、サーバは止めずに 500 のページを返す
5. フォームや JSON のボディを読んで `request.form`・`request.json` に入れる（第20章）、テンプレートで HTML を作る（第21章）、Cookie とセッションを扱う（第22章）

Flask の書き方しか知らないと、2〜5 は「最初からそうなっているもの」に見えます。Node.js の `node:http` が用意してくれるのは、ほぼ 1 だけです。**2〜5 は自分で書きます。** 第4部の6つの章は、この 2〜5 を1つずつ自分で作る章です。

> Flask のアプリと Web サーバの間には、WSGI という Python の決まりがあります。Flask のアプリは「リクエストの情報を受け取って、レスポンスを返す関数」として WSGI の決まりに合わせて作られていて、その関数を呼ぶのは `app.run()` のサーバでも、本番用の gunicorn などでもかまいません。WSGI を詳しく知らなくても、この教材は読めます。「アプリとサーバは別の部品で、間に決まりがある」とだけ覚えておいてください（第3部 第13章でも触れました）。

### 1.2 Node.js の場合

Node.js では、サーバとアプリが同じプロセスの、同じ JavaScript の中にあります。

- `http.createServer(関数)` で作ったサーバが、TCP の接続を受け付け、HTTP を読み解く（Flask の 1 にあたる部分）
- リクエストが来るたびに、**あなたが渡した関数**（この教材では「ハンドラ」と呼びます）が `(req, res)` を引数にして呼ばれる
- ハンドラは、`res` に対してステータス・ヘッダ・本文を書いて、レスポンスを返す

Flask の開発用サーバと違い、`node:http` のサーバは本番でもそのまま使えるものです（本番では、前にリバースプロキシを置くことが多いです。第12部で学びます）。そのかわり、上の 2〜5 は何もしてくれません。

## 2. いちばん小さなサーバ

```js
// samples/hello-server.mjs
import http from 'node:http';

const PORT = 9170;

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`こんにちは。あなたが開いたのは ${req.url} です\n`);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`);
});
```

```sh
$ cd samples
$ node hello-server.mjs
http://127.0.0.1:9170/ で待っています（Ctrl+C で止める）
```

別のターミナルで開きます。

```sh
$ curl -i 'http://127.0.0.1:9170/hello?x=1'
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Date: Wed, 04 Nov 2026 18:21:14 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 64

こんにちは。あなたが開いたのは /hello?x=1 です
```

確かめておくこと:

- **`req.url` はパスとクエリだけ**です（`/hello?x=1`）。`http://127.0.0.1:9170` の部分は入っていません。パスとクエリに分けるには `URL` を使います。`//` で始まる `req.url` に気をつける読み方を、第18章3節で扱います
- `Date`・`Connection`・`Keep-Alive`・`Content-Length` は、Node.js が自動で付けました。`Content-Length: 64` は**文字の数ではなくバイトの数**です（日本語は UTF-8 で1文字3バイト。第2部 第6章）
- サーバのターミナルには `GET /hello?x=1` が出ます。ブラウザで開くと、`GET /favicon.ico` も出ることがあります。ブラウザが勝手にアイコンを取りに来るためです
- Ctrl+C で止まります（SIGINT。第16章8節）。止め方は7節でもう一度扱います

### 2.1 listen: ポートと、待ち受けるアドレス

`server.listen(ポート, アドレス, コールバック)` の2つ目は、**どのネットワークの入口で待つか**です。

| アドレス | 繋がる相手 |
| --- | --- |
| `'127.0.0.1'` | 同じ Mac の中からだけ（この教材の既定） |
| `'0.0.0.0'` | Mac が持っているすべての IPv4 アドレス。同じ Wi-Fi のほかの機械からも繋がる |
| 省略 | Node.js は IPv6 の `::` で待つ。多くの環境では IPv4 も含め、すべてから繋がる |

開発中のサーバを省略や `0.0.0.0` で起動すると、カフェの Wi-Fi などで、同じネットワークの誰からでも開けてしまいます。この教材では、すべて `127.0.0.1` で待ち受けます。macOS は、外から繋がる待ち受けを初めて始めたときに「受け入れますか」というダイアログを出すことがあります。`127.0.0.1` ならこのダイアログは出ません。

ポートの番号は、0〜1023 は特別なもの（80 や 443 などはふつうの利用者では使えない）なので、1024 以上を使います。この教材では章ごとに番号を分けていて、第17章は 9170〜9179 です。

`listen(0)` とすると、OS が空いている番号を選びます。選ばれた番号は `server.address().port` で分かります。練習問題のテストはこの方法で、ほかのサーバとぶつからないようにしています。

### 2.2 同じポートで2つ起動すると

```sh
$ node hello-server.mjs   # 1つ目が動いているときに、もう1つ
node:events:505
    throw er; // Unhandled 'error' event
    ^

Error: listen EADDRINUSE: address already in use 127.0.0.1:9170
```

`EADDRINUSE` は「そのアドレスとポートは使用中」です。サーバも EventEmitter（第15章5節）なので、失敗は `'error'` イベントで届き、リスナーが無いので例外になりました。どのプロセスが使っているかは `lsof -i :9170` で調べられます（第1部 第1章）。止め忘れたサーバが別のターミナルに残っていることがよくあります。

### 2.3 ファイルを直したら起動し直す: `--watch`

Flask の `flask run --debug` は、ファイルを保存すると自動でサーバを起動し直してくれます（リローダ）。Node.js では `node --watch` が同じことをします。

```sh
$ node --watch hello-server.mjs
```

`--watch` は、起動したファイルと、そこから `import` しているファイルを見張ります。保存するとプロセスを止めて起動し直すので、メモリに持っているデータ（配列に入れた伝言など）は消えます。

## 3. 1つのリクエストの一生

ハンドラが呼ばれるまでと、呼ばれた後に何が起きるかを、イベントで見ます。

| イベント | どこで | いつ |
| --- | --- | --- |
| `'connection'` | `server` | TCP の接続ができた。引数は `net.Socket` |
| `'request'` | `server` | リクエストの**ヘッダを読み終えた**。`createServer` に渡した関数は、このイベントのリスナー |
| `'data'`・`'end'` | `req` | ボディのチャンクが届いた・ボディが終わった。`req` は Readable ストリーム（第15章7節） |
| `'finish'` | `res` | レスポンスを最後まで OS に渡した（客に届いたかどうかは分からない） |
| `'close'` | `res` | レスポンスが閉じた。最後まで返せたときも、客が先に切ったときも、1回だけ来る |

```sh
$ node lifecycle-demo.mjs
# 別のターミナルで
$ curl -s http://127.0.0.1:9171/a http://127.0.0.1:9171/b
$ curl -s -d 'name=ryota' http://127.0.0.1:9171/form
$ curl -s --max-time 0.5 http://127.0.0.1:9171/slow
```

サーバのターミナル（抜粋。時刻は環境で変わります）:

```
   76ms [接続2] TCP の接続ができた（127.0.0.1:37242）
   77ms [接続2] リクエスト2: GET /a（ヘッダを読み終えたところ）
   77ms [接続2] リクエスト2: レスポンスを OS に渡し終えた（finish）
   77ms [接続2] リクエスト2: ボディの終わり（合計 0 バイト）
   77ms [接続2] リクエスト2: レスポンスが閉じた（close）。終わりまで書けたか: true
   77ms [接続2] リクエスト3: GET /b（ヘッダを読み終えたところ）
   ...
   77ms [接続2] TCP の接続が閉じた
   83ms [接続3] リクエスト4: POST /form（ヘッダを読み終えたところ）
   83ms [接続3] リクエスト4: ボディのチャンク 10 バイト
   ...
   88ms [接続4] リクエスト5: GET /slow（ヘッダを読み終えたところ）
  589ms [接続4] TCP の接続が閉じた
  589ms [接続4] リクエスト5: レスポンスが閉じた（close）。終わりまで書けたか: false
 2090ms [接続4] リクエスト5: 客はもういないので、返さない
```

ここから分かること:

1. **1つの TCP の接続で、2つのリクエスト**（`/a` と `/b`）が順に処理されました。HTTP/1.1 の keep-alive です（第2部 第6章）。「接続」と「リクエスト」は1対1ではありません
2. **ハンドラが呼ばれた時点では、ボディはまだ読まれていません。** `/form` のボディ（`name=ryota` の10バイト）は、ハンドラが呼ばれた後に `'data'` で届きました。大きなボディなら、何回にも分かれて届きます。Flask の `request.form` は「読み終わったもの」を見せてくれますが、Node.js では自分で読みます（第20章）
3. **客が先に切ると**（`--max-time 0.5`）、`res` の `'close'` が来て、`res.writableFinished` は `false` です。ハンドラはそれを知らずに処理を続けているので、`res.destroyed` などで確かめないと、誰もいない相手に返そうとします。時間のかかる処理（データベースへの問い合わせなど）は、ここで止められると無駄がありません（第3部 第12章の `AbortSignal` を使います）
4. `'finish'` と `'end'` の順番は、場合によって入れ替わります。ボディを読まずに返すこともできるからです。順番に頼るコードは書かないでください

> `res.on('close')` は「必ず1回だけ来る」ので、アクセスログ（ステータス、かかった時間）を書くのにちょうどよい場所です（練習問題3）。

## 4. レスポンスの返し方

### 4.1 4つの道具と、その順番

| 道具 | すること |
| --- | --- |
| `res.statusCode = 404` | ステータスを決める（既定は 200） |
| `res.setHeader(名前, 値)` | ヘッダを1つ決める。同じ名前があれば**置き換える**。`appendHeader` は**足す** |
| `res.writeHead(ステータス, { ヘッダ })` | ステータスとヘッダをまとめて決め、**すぐに送る** |
| `res.write(本文)` | 本文の一部を送る。最初の `write` の時点で、ステータスとヘッダも送られる |
| `res.end(本文?)` | 最後の本文を送って、レスポンスを終える。**必ず1回だけ呼ぶ** |

決まりは1つです。**ヘッダは、本文より先にしか送れません。** HTTP のレスポンスは「ステータス行 → ヘッダ → 空行 → 本文」というバイト列なので（第2部 第6章）、本文を書き始めた後でヘッダを足すことはできません。`res.headersSent` が `true` なら、もうヘッダは送られています。

```sh
$ node response-demo.mjs
$ curl -i http://127.0.0.1:9172/auto       # setHeader + end(本文)
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 55
...
$ curl -i http://127.0.0.1:9172/chunked    # write を2回
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Transfer-Encoding: chunked
...
$ curl -i http://127.0.0.1:9172/late       # write の後に setHeader
...
先に本文を書いた
ヘッダを足せなかった: ERR_HTTP_HEADERS_SENT
```

- **`end(本文)` だけで返すと、Node.js は本文の長さを知っているので `Content-Length` を付けます。** `write` を使うと、最初の `write` の時点ではまだ全体の長さが分からないので、`Transfer-Encoding: chunked` になります（Node 26 で確かめた動き）
- `write` の後の `setHeader` は `ERR_HTTP_HEADERS_SENT` という例外になります。サンプルは `try/catch` で捕まえていますが、捕まえなければ5節のとおりサーバが止まります

### 4.2 よくある間違い

| 間違い | 何が起きるか |
| --- | --- |
| `end` を呼ばない | 客はずっと待つ（`/no-end`。curl は `--max-time` が来るまで待つ） |
| `end` の後に `write`・`end` | `ERR_STREAM_WRITE_AFTER_END` が `res` の `'error'` イベントで届く。リスナーが無いとプロセスが落ちる（`/twice`） |
| `Content-Length` に `body.length`（文字数） | 日本語が入ると本文より小さい値になり、客は途中までしか読まない。残りのバイトは次のレスポンスの先頭と間違えられる（`/bytes`、練習問題1・2） |
| `end(123)`（数値） | `ERR_INVALID_ARG_TYPE`。本文に渡せるのは文字列・Buffer・Uint8Array だけ |
| 1つのリクエストで2回返す | 2回目は上の `ERR_STREAM_WRITE_AFTER_END` か `ERR_HTTP_HEADERS_SENT`。`if` の中で返した後に `return` を忘れると起きる |

`Content-Length` を自分で書くときは、必ず `Buffer.byteLength(本文)` を使ってください。`/bytes` は `あいう\n` で、文字の数は 4、バイトの数は 10 です。

> Node.js は、`Content-Length` が本文と合っていなくても、確かめずにそのまま送ってしまいます（Node 26 で確かめた動き）。練習問題1の6番で確かめます。

### 4.3 本文を返さないレスポンス

- **HEAD**: `curl -I` は HEAD を送ります。HEAD への返事は、GET と同じヘッダで、本文はありません。Node.js は、ハンドラが `end(本文)` に渡した本文を捨ててくれます。ただし、自動の `Content-Length` は付かないので、GET と同じ値にしたければ自分で付けます（練習問題4）
- **204 No Content・304 Not Modified**: 本文を持てないステータスです。`end('本文')` に何か渡しても、Node.js は送りません
- `setHeader('Set-Cookie', ...)` を2回書くと、1つ目が消えます。複数の Cookie は、配列で渡すか `appendHeader` を使います（第22章で使います）

## 5. 例外とサーバの止まり方

### 5.1 1つのリクエストの失敗で、サーバごと止まる

```sh
$ node crash-demo.mjs
$ curl http://127.0.0.1:9173/throw
curl: (52) Empty reply from server
$ curl http://127.0.0.1:9173/ok
curl: (7) Failed to connect to 127.0.0.1 port 9173 ...
```

サーバのターミナル:

```
SyntaxError: Expected property name or '}' in JSON at position 2 (line 1 column 3)
    at JSON.parse (<anonymous>)
    at Server.handler (file:///.../crash-demo.mjs:18:12)
    ...
Node.js v26.13.0
```

`/throw` の中の例外を誰も捕まえなかったので、**プロセスごと終わりました。** 同じプロセスで受け付けていた、ほかの人のリクエストもすべて止まります。

1節で見たとおり、Flask はこの例外を捕まえて 500 のページを返し、サーバは動き続けます。Flask の中に「ハンドラを `try` で囲む」コードがあるからです。Node.js の `node:http` にはそれが無いので、自分で書きます。

`/reject`（`await` の先の失敗）も同じです。ハンドラが async 関数なので、例外は「rejected の Promise」になり、誰も受け取らないので unhandled rejection としてプロセスが終わります（第3部 第12章）。

### 5.2 ハンドラを包む

```sh
$ node crash-demo.mjs safe
```

```js
// crash-demo.mjs（safe のとき）
async (req, res) => {
  try {
    await handler(req, res); // 同期の例外も、await の先の失敗も、ここで捕まる
  } catch (err) {
    console.error(`${req.method} ${req.url} でエラー:`, err.message);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('サーバの中でエラーが起きました\n'); // 詳しい中身（スタックなど）は客に見せない
    } else {
      res.destroy(); // もう途中まで返してしまった。接続を切って「失敗した」ことを伝える
    }
  }
}
```

大事なのは3つです。

- `await handler(...)` にすると、同期の例外も、async の失敗も、1つの `catch` で捕まえられる
- **客には中身を見せない。** エラーのメッセージやスタックには、ファイルのパスや SQL など、外に出したくない情報が入っていることがあります。中身はサーバのログに書き、客には「失敗した」とだけ返します。Flask もデバッグモードでないときは、中身を見せない 500 のページを返します
- **ヘッダを送った後なら、もうステータスは変えられない。** 200 を返し始めた後で失敗したら、`res.destroy()` で接続を切ります。客は「本文の途中で切れた」と分かるので、壊れたページを正しいものと思い込まずに済みます

### 5.3 包んでも捕まえられないもの

```sh
$ curl http://127.0.0.1:9173/callback     # safe でも、10ms 後にプロセスが終わる
```

`setTimeout` やイベントのコールバックの中の例外は、`try` の外で、別の時に起きます（第3部 第13章）。ハンドラを包んでも捕まえられません。`await` で書ける API（`fs/promises`、`timers/promises` など）を使い、コールバックの API はなるべく Promise にしてから使うのが一番の対策です。

`process.on('uncaughtException', ...)` で全部捕まえれば止まらない、と考えるかもしれません。しかし、例外が起きた時点で、途中まで書き換えたデータなど、プログラムの状態がおかしくなっているかもしれません。Node.js のドキュメントも、`uncaughtException` は「ログを書いてから終わる」ために使い、そのまま動き続けるのはやめるように書いています。**落ちたら、起動し直す**のが Node.js のふつうの考え方です。起動し直す仕組み（launchd、systemd、コンテナなど）は第12部で扱います。

この「包む」処理を、リクエスト ID とアクセスログも含めて部品にするのが練習問題3です。第5部の Express では、これがエラーハンドリングのミドルウェアになります。

## 6. 返し方を部品にする

ここまでで、レスポンスを返すたびに次のことを気にする必要があると分かりました。

- `Content-Type` に `charset=utf-8` を付ける
- `Content-Length` はバイト数
- ヘッダを全部決めてから、`end` を1回だけ呼ぶ
- HEAD・204・304 では本文を送らない

毎回書くと必ずどこかで間違えるので、`sendText(res, 200, '本文')`・`sendJson(res, 201, データ)`・`redirect(res, '/login', 303)` のような小さな関数にまとめます（練習問題4）。Flask で `return 'こんにちは'` や `return jsonify(データ)`、`return redirect('/login')` と書けたのは、Flask が同じことをしてくれていたからです。第18章以降は、この部品を使ってサーバを書きます。

## 7. 安全に止める

### 7.1 なぜ「安全に」止めるのか

サーバを止めるのは、Ctrl+C を押したときだけではありません。新しい版に入れ替えるとき、本番の仕組み（コンテナやプロセスの管理役）は、まず **SIGTERM** を送り、しばらく待ってから SIGKILL で強制的に止めます（第3部 第16章8節）。SIGTERM を受け取ったときにすぐ終わると、ちょうど処理していたリクエストの客は、返事をもらえずに接続を切られます。書き込みの途中なら、データが半分だけ保存されるかもしれません。

安全に止める（graceful shutdown）の手順は、第16章8.2節の CLI と同じ考え方です。

1. 新しい接続を受け付けるのをやめる（`server.close()`）
2. 処理中のリクエストは最後まで返す
3. 待ちすぎないように、上限の時間が過ぎたら残りの接続を切る
4. 2回目のシグナルが来たら、待たずに終わる
5. 自分で動かしているタイマー（定期的な処理など）を止め、自然にプロセスを終わらせる

### 7.2 shutdown-demo.mjs

```js
let stopping = false;
const server = http.createServer(async (req, res) => {
  if (req.url === '/slow') await new Promise((r) => setTimeout(r, 3000));
  // 止めている途中なら、この返事のあと接続を閉じてもらう（keep-alive のまま残らないように）
  if (stopping) res.setHeader('Connection', 'close');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`${req.url} を返しました\n`);
});

function shutdown(signal) {
  if (stopping) process.exit(1);           // 2回目: すぐに終わる
  stopping = true;
  server.close((err) => { process.exitCode = err ? 1 : 0; }); // 1. 受け付けをやめる
  server.closeIdleConnections();           // 何もしていない keep-alive の接続を閉じる
  setTimeout(() => {                       // 3. 待ちすぎない
    server.closeAllConnections();
    process.exitCode = 1;
  }, FORCE_AFTER_MS).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

```sh
$ node shutdown-demo.mjs
# 別のターミナルで
$ curl -s http://127.0.0.1:9174/slow
# すぐに、サーバのターミナルで Ctrl+C
SIGINT を受け取りました。新しい接続を受け付けるのをやめて、処理中のリクエストを待ちます
すべての接続が閉じました。終わります
```

curl には `/slow を返しました` が届き、その後にプロセスが終わります。待っている間にもう一度 Ctrl+C を押すと、すぐに終わります。

### 7.3 keep-alive の接続に気をつける

`server.close()` は、**すべての接続が閉じるまで** コールバックを呼びません。ブラウザは、リクエストが終わった後も、次に使うために接続を開いたままにします（keep-alive）。そのため、次のことに気をつけます。

- **何もしていない接続**: Node 19 からは、`server.close()` がそのときに何もしていない接続を閉じてくれます（Node 26 で確かめた動き）。サンプルでは、はっきりさせるために `closeIdleConnections()` も呼んでいます
- **止め始めた後に返事を終えた接続**: これは `close()` を呼んだ時点では「処理中」だったので、閉じられません。返事を終えると、keep-alive の待ち時間（`keepAliveTimeout`。既定 5 秒）が過ぎるまで開いたままになり、その間プロセスは終われません。止めている途中の返事に `Connection: close` を付けると、Node.js は返事の後に接続を閉じます

この2つ目は見落としやすいので、練習問題5の確認スクリプトで試します。

> `unref()` を付けたタイマーは、「このタイマーだけが残っているなら、待たずに終わってよい」という印です（第3部 第13章）。上限のタイマーを `unref` しないと、接続がすぐに全部閉じても、タイマーが鳴るまでプロセスが残ります。逆に、`setInterval` で動かしている定期的な処理は `unref` していないので、止め忘れるとプロセスが終わりません。

## 8. 遅い客からサーバを守る時間の制限

客が「ヘッダを1文字ずつ、ゆっくり送る」と、サーバはその接続を開けたまま待ち続けます。そういう客がたくさん来ると、ほかの客の接続を受け付けられなくなります（Slowloris と呼ばれる、サービスを止める攻撃の一種です）。Node.js のサーバには、これを防ぐための時間の制限があります。

| 設定 | 既定の値（Node 26） | 何の上限か |
| --- | --- | --- |
| `server.headersTimeout` | 60000ms | 接続してから、ヘッダを全部受け取るまで |
| `server.requestTimeout` | 300000ms | リクエスト全体（ボディを含む）を受け取るまで |
| `server.keepAliveTimeout` | 5000ms | 返事の後、次のリクエストが来るのを待つ時間 |
| `connectionsCheckingInterval`（`createServer` のオプション） | 30000ms | 上の2つの時間切れを確かめる間隔 |

[timeout-demo.mjs](samples/timeout-demo.mjs) は、**自分で立てたサーバ（127.0.0.1:9175）に**、同じプロセスの中から遅い客をつなぎます。ほかの人のサーバに対して、こういう客を動かしてはいけません。

```sh
$ node timeout-demo.mjs
既定の値: headersTimeout=60000 requestTimeout=300000 keepAliveTimeout=5000
1. ヘッダを 1 文字ずつ、300ms おきに送る客
 2408ms 客: 受け取った "HTTP/1.1 408 Request Timeout"
 2410ms 客: 接続が閉じられた（送れたのは 8 文字）
2. ふつうの客が1回リクエストして、そのまま接続を開けておく
 4416ms 客: 2006ms 後に、サーバが keep-alive の接続を閉じた
```

- `headersTimeout` を 2000ms にしたので、約 2.4 秒で **408 Request Timeout** が返り、接続が閉じられました。ちょうど 2 秒でないのは、時間切れを確かめるのが `connectionsCheckingInterval`（デモでは 200ms）ごとだからです。既定の 30 秒のままだと、もっと遅れます
- `keepAliveTimeout` を 1000ms にしたのに、閉じられたのは約 2 秒後でした。Node 26 では、客に知らせる `Keep-Alive: timeout=1` より少し長く待つ余裕（`keepAliveTimeoutBuffer`、既定 1000ms）があるためです（Node 26 で確かめた動き）。客が「まだ使える」と思って送ったリクエストと、サーバが閉じるのがぶつからないようにするためです

既定の値は、ほとんどのアプリでそのままでかまいません。本番では、前に置くリバースプロキシ（第12部）も同じような制限を持っています。ここでは「制限があること」「時間切れのときは 408 が返ること」を覚えておいてください。

## 9. Flask・Python との対応

| やりたいこと | Flask（Python） | `node:http` |
| --- | --- | --- |
| サーバを起動する | `app.run(port=5010)`（開発用のサーバ） | `http.createServer(ハンドラ).listen(9170, '127.0.0.1')` |
| 保存したら起動し直す | `flask run --debug` | `node --watch server.mjs` |
| メソッド・パス | `request.method`・`request.path` | `req.method`・`` new URL(`http://localhost${req.url}`).pathname ``（第18章3節） |
| ヘッダを読む | `request.headers['User-Agent']` | `req.headers['user-agent']`（名前はすべて小文字） |
| 文字列を返す | `return 'こんにちは'` | `res.setHeader(...)` + `res.end('こんにちは')`（練習問題4の `sendText`） |
| ステータスとヘッダ | `return '本文', 201, {'X-A': '1'}` | `res.writeHead(201, { 'X-A': '1' })` + `res.end('本文')` |
| JSON を返す | `return jsonify(データ)` | `sendJson(res, 200, データ)`（練習問題4で作る） |
| 例外 → 500 | Flask がしてくれる | 自分でハンドラを包む（5.2節、練習問題3） |
| `abort(404)` | Flask がしてくれる | `throw new HttpError(404, ...)` を包む側で受け取る（練習問題3） |
| 止める | Ctrl+C | SIGINT・SIGTERM を受け取り、自分で安全に止める（7節） |

## まとめ

- `node:http` がしてくれるのは、接続を受け付け、HTTP を読み解いて、ハンドラを `(req, res)` で呼ぶところまで。ルーティング、ボディの読み取り、HTML の生成、例外の処理は自分で書く。
- 開発中のサーバは `127.0.0.1` で待ち受ける。`EADDRINUSE` は、そのポートを誰かが使っている印。
- ハンドラが呼ばれた時点で、ボディはまだ届いていない。`res` の `'close'` は必ず1回来る。客が先に切ったかは `res.writableFinished` で分かる。
- ヘッダは本文より先にしか送れない。`end(本文)` なら `Content-Length` は自動。自分で書くならバイト数。`end` は必ず1回。
- ハンドラの例外は、サーバごと止める。包んで 500 を返し、中身は客に見せない。ヘッダを送った後なら接続を切る。コールバックの中の例外は包んでも捕まえられない。
- SIGTERM で、受け付けをやめ、処理中を返し、待ちすぎずに終わる。keep-alive の接続とタイマーに気をつける。
- 遅い客への時間の制限（`headersTimeout` など）がある。時間切れは 408。

## 練習問題

[exercises/README.md](exercises/README.md) に5問あります。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Node.js「HTTP」: https://nodejs.org/api/http.html
- Node.js「Anatomy of an HTTP Transaction」: https://nodejs.org/en/learn/modules/anatomy-of-an-http-transaction
- Node.js「Process: Event 'uncaughtException'」（使い方の注意）: https://nodejs.org/api/process.html#warning-using-uncaughtexception-correctly
- Node.js「Command-line API: --watch」: https://nodejs.org/api/cli.html#--watch
- MDN「HTTP レスポンスステータスコード」: https://developer.mozilla.org/ja/docs/Web/HTTP/Status
- RFC 9110「HTTP Semantics」（HEAD・204・304）: https://www.rfc-editor.org/rfc/rfc9110
- Flask「Quickstart」: https://flask.palletsprojects.com/en/stable/quickstart/

前の章: [第16章 CLI ツールを作る](../../part03-js-node-basics/ch16-cli/README.md) ／ 次の章: [第18章 ルーティングを自作する](../ch18-routing/README.md)
