# 第20章 フォームと JSON を受け取る

ここまでのサーバは、客から受け取るのは URL とヘッダだけでした。この章では、POST などで送られてくる**ボディ**を受け取ります。HTML のフォーム、JSON、ファイルのアップロードの3つです。
Node.js の `node:http` は、ボディを「バイトの流れ」として渡してくるだけで、読み終わるのを待つのも、文字に戻すのも、フォームや JSON として読むのも、自分で書きます。書いてみると、「どこまで受け取るか（上限）」と「受け取ったものをどこまで信じるか」の2つが、いちばん大事だと分かります。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第17章（`createApp`、`HttpError`）、第18章（Router）、第2部 第6章9節・11.2節（ボディ、chunked）、第10章（PRG、REST の慣習）、第3部 第15章（Buffer と文字コード、Stream） |
| この章のゴール | ボディを上限付きで読み、413 を正しく返せる / Content-Type で読み方を決め、415 を返せる / フォーム（urlencoded）と JSON の読み方の落とし穴を説明できる / 受け取った値を選んで使い、プロトタイプ汚染を防げる / 400・413・415・422 を使い分けられる / アップロードされたファイルを、中身で確かめて安全に保存できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`read-body.mjs`・`form-server.mjs`・`json-server.mjs`・`pick-keys.mjs`）と、チャンクの境目、フォーム、JSON、上限、アップロード、プロトタイプ汚染を確かめるプログラム |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答（`body.mjs` の `readJson`・`readForm` は、成果物の掲示板でも使います） |

> **読み方**
> - この章のコマンドは、`~/dev/part04/ch20-request-body/` で実行します（第17章で第4部のフォルダを `~/dev/part04` にコピーしてあります）。
>
>   ```sh
>   $ cd ~/dev/part04/ch20-request-body
>   ```
>
> - 「**手を動かす**」の所は、新しいファイルに書いて動かしてください。ファイルの完成形は `samples/` にあります。「中身は読まなくてよい」と書いたサンプルは、動かして結果を見るだけで十分です。
> - 「手を動かす」のサーバは 9206 番を使います。次のサーバを動かす前に `Ctrl+C` で止めてください。
> - `curl -d 'データ'` は、データをボディにして POST で送るオプションです。何も指定しなければ、`Content-Type: application/x-www-form-urlencoded`（フォームの形）が付きます。`-H 'Content-Type: application/json'` を足すと、JSON として送れます。
> - サンプルと練習問題の一部は、第17・18章の模範解答を `import` して使います。外部のパッケージは使わないので、`npm install` は不要です。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| ボディを Buffer のまま集めて、上限を決めて読む（2・4節） | 第5部の `express.json({ limit })`。中で同じことをしている |
| フォームを `URLSearchParams` で読む、303 で案内する（5節） | 第4部の成果物（掲示板の投稿）、第5部 |
| 400・413・415・422 の使い分け（6節） | 第5部の REST API の設計 |
| 決めたキーだけを取り出す、プロトタイプ汚染（7節） | 第5部の zod、第10部（安全） |
| アップロードされたファイルを信じない（8節） | 第5部の multer |

---

## 1. Flask がしてくれていたこと

Flask では、POST で届いたものを、次のように読みました。

```python
name = request.form['name']        # HTML のフォーム
data = request.get_json()          # JSON
f = request.files['image']         # アップロードされたファイル
f.save(os.path.join(UPLOAD_DIR, secure_filename(f.filename)))
```

`request` は、Flask が用意してくれる「今のリクエスト」の情報です。`request.form` を読んだとき、Flask（中の Werkzeug）は、次のことをしてくれていました。

1. ボディのバイトを、最後まで受け取る
2. `Content-Type` ヘッダを見て、フォームなら `name=...&...` の形を、ファイル付きのフォームなら multipart の形を読み解き、`%xx` や `+` を文字に戻す
3. 設定（`MAX_CONTENT_LENGTH`）があれば、それより大きいボディを **413** で断る
4. JSON として読めなければ **400** にする

`secure_filename` は、客が付けたファイル名から `../` などの危ない部分を取り除く関数でした。これも Flask が用意してくれていたものです。

Node.js では、1〜4 をすべて自分で書きます。

## 2. ボディは、チャンクに分かれて届く

第17章3節で見たとおり、ハンドラが呼ばれた時点では、ボディはまだ届いていません。`req` は Readable ストリームで、ボディは**チャンク**（Buffer）に分かれて、少しずつ届きます。

```js
// samples/simple-body.mjs
export async function readBodySimple(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8'); // 全部つないでから、文字に戻す
}
```

**文字に戻すのは、全部つないでから**です。チャンクの境目は、文字の境目とは関係なく、日本語の1文字（3バイト）の途中で切れることがあります（第3部 第15章6節）。

次のサンプルで、わざと境目を作って確かめます（中身は読まなくてよい）。

```sh
$ node samples/body-chunks.mjs
http://127.0.0.1:9200/ で待っています
「あいう」（9 バイト）を、4 バイトと 5 バイトに分けて送ります
  チャンク 1: 4 バイト
  チャンク 2: 5 バイト
  チャンクごとに戻す: "あ���う"
  つないでから戻す  : "あいう"
```

`body += chunk` と書くと、`chunk` がそのたびに文字に戻されるので、この「チャンクごとに戻す」になります。小さなボディは1つのチャンクで届くことが多いので、試しているうちは気付きません。大きなボディや、遅い回線で初めて文字化けします。

`readBodySimple` には、もう1つ大きな問題があります。**上限がありません。**

## 3. Content-Type で読み方を決める

ボディが何の形かは、`Content-Type` ヘッダで分かります。

| Content-Type | 中身 | 送ってくるもの | 読み方 |
| --- | --- | --- | --- |
| `application/x-www-form-urlencoded` | `name=%E3%82%8A&tags=js&tags=node` | HTML のフォーム（ふつう） | `URLSearchParams` |
| `multipart/form-data; boundary=...` | 区切りの文字で、項目とファイルを並べたもの | ファイル付きの HTML のフォーム | `Request.formData()`（8節） |
| `application/json` | `{"name":"alice"}` | `fetch`、API を使うプログラム | `JSON.parse` |
| `text/plain` | ただの文字 | | `TextDecoder` |

決めた形でないものが届いたら、**415 Unsupported Media Type** を返します。`Content-Type: application/json` だと思って `JSON.parse` していたら、実は `text/plain` だった、ということを防げます。後の第10部で扱う CSRF の対策の一部にもなります（ほかのサイトのフォームからは、`application/json` を送れないため）。

`Content-Type` には、`application/json; charset=utf-8` のようにパラメータが付きます。`;` の前だけを、小文字にして比べます。文字コード（`charset`）は、この教材では UTF-8 だけを受け付けます。

## 4. どこまで受け取るか: 上限と 413

### 4.1 なぜ上限が要るのか

上限が無いと、誰かが 10GB のボディを送ってきたとき、サーバはそれを全部メモリに入れようとして、落ちます。1つのリクエストで、ほかのすべての人のリクエストが止まります。Flask の `MAX_CONTENT_LENGTH` も、このための設定です。

上限を超えたら、**413 Content Too Large**（古い名前は Payload Too Large）を返します。

### 4.2 2回確かめる

1. **`Content-Length` を見て、読む前に断る。** 客が「これだけ送ります」と言ってきた大きさが上限を超えていれば、1バイトも読まずに断れる
2. **読みながら数えて、超えたらやめる。** `Content-Length` が無い（chunked で送ってくる）こともあるし、嘘かもしれない

**手を動かす**: ボディを全部読んで返すサーバ `read-body.mjs` を作ります。2節の「Buffer のまま集める」と、上の 1 を入れます（完成形は [samples/read-body.mjs](samples/read-body.mjs)）。

```js
import http from 'node:http';

const PORT = 9206;
const LIMIT = 1000; // 受け取るボディは 1000 バイトまで

function sendText(res, status, text, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(text), ...headers });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  // 1. 読む前に、客が言ってきた大きさ（Content-Length）で断る
  if (Number(req.headers['content-length']) > LIMIT) {
    return sendText(res, 413, `ボディは ${LIMIT} バイトまでです\n`, { Connection: 'close' });
  }
  // 2. チャンクを Buffer のまま集めて、最後に1回だけ文字に戻す
  const chunks = [];
  for await (const chunk of req) {
    console.log(`チャンク: ${chunk.length} バイト`);
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);
  sendText(res, 200, `${body.length} バイト受け取りました: ${body.toString('utf8')}\n`);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
```

```sh
$ node read-body.mjs
# 別のターミナルで
$ curl -d 'こんにちは' http://127.0.0.1:9206/
15 バイト受け取りました: こんにちは
$ curl -i -d "$(seq 1 500)" http://127.0.0.1:9206/
HTTP/1.1 413 Payload Too Large
...
ボディは 1000 バイトまでです
```

- `seq 1 500` は、1 から 500 までの数を1行ずつ出すコマンドです。`"$( )"` で、その出力を `-d` に渡しています（1000 バイトより大きくなります）。
- 「こんにちは」は5文字ですが、15 バイトです。サーバのターミナルには `チャンク: 15 バイト` と出ます。
- 2（読みながら数える）は、このサーバにはまだありません。練習問題5の `readBody` で作ります。

> curl などは、大きなボディを送る前に `Expect: 100-continue` を付けて「送ってもいい？」と聞いてきます。Node.js は、何もしなければ自動で `100 Continue` を返してから、ハンドラを呼びます（Node 26 で確かめた）。`checkContinue` イベントを使うと、ヘッダを見て、送らせる前に断ることもできます。

### 4.3 断った後の接続を閉じる

上限を超えたとき、残りのボディを受け取らずに 413 を返すと、客はまだ送り続けています。Node.js は、keep-alive の接続で次のリクエストを読めるように、**残りのボディを読んで捨てよう**とします。

次のサンプルで確かめます（中身は読まなくてよい）。`head -c 5000000 /dev/zero` は、0 のバイトを 5,000,000 個出します。`curl --data-binary @ファイル` は、ファイルの中身をそのままボディにして送ります。

```sh
$ node samples/limit-demo.mjs
$ head -c 5000000 /dev/zero > /tmp/big.bin
$ curl -s -o /dev/null -w '%{http_code}\n' -H 'Expect:' --data-binary @/tmp/big.bin http://127.0.0.1:9203/keep
$ curl -s -o /dev/null -w '%{http_code}\n' -H 'Expect:' --data-binary @/tmp/big.bin http://127.0.0.1:9203/close
```

サーバのターミナル（数は環境によって変わります）:

```
POST /keep Content-Length=5000000
  接続を閉じるまでに受け取ったバイト数: 655516
POST /close Content-Length=5000000
  接続を閉じるまでに受け取ったバイト数: 98461
```

`/close` は 413 に `Connection: close` を付けたもので、受け取った量がずっと少なく済みました。**413 には `Connection: close` を付けて、残りを受け取らずに接続を閉じます。**

### 4.4 `for await` の途中で `throw` しない

数えながら読むとき、2節の `for await` の中で上限を超えたら `throw` する、と書きたくなります。ところが、`for await` を途中で抜けると、ストリーム（`req`）が壊され、**接続ごと閉じられてしまい、413 を返せません**（Node 26 で確かめた。`req.socket` が `null` になる）。客には「返事なしで切られた」としか見えません。

練習問題5の解答では、`'data'` イベントで読み、上限を超えたら `req.pause()` で読むのをやめるだけにして、413 を返してから接続を閉じています。

> ゆっくり少しずつ送ってくる客には、第17章8節の `requestTimeout`（リクエスト全体を受け取るまでの上限）が効きます。

## 5. HTML のフォーム

### 5.1 ブラウザが送るもの

```html
<form method="post" action="/submit">
  <input name="name">
  <textarea name="message"></textarea>
  <input type="checkbox" name="tags" value="js" checked>
  <input type="checkbox" name="tags" value="node" checked>
  <input type="checkbox" name="agree">
  <button>送る</button>
</form>
```

```sh
$ node samples/form-demo.mjs   # ブラウザで http://127.0.0.1:9201/（中身は読まなくてよい）
```

名前に「ねこ」と書いて送ると、ブラウザは次のボディを送りました（`application/x-www-form-urlencoded`。Chromium を Playwright で動かして確かめた）。

```
name=%E3%81%AD%E3%81%93&message=1%E8%A1%8C%E7%9B%AE%0D%0A2%E8%A1%8C%E7%9B%AE+a%2Bb%26c%3Dd&tags=js&tags=node
```

- 空白は `+`、`+` そのものは `%2B`、`&` は `%26`、`=` は `%3D`、改行は `%0D%0A`（CR LF）になる。日本語は UTF-8 のバイトを `%xx` にしたもの
- **同じ名前が何回も来る**（`tags`）。`get` は最初の1つだけ、`getAll` で全部
- **チェックしなかったチェックボックスは、名前ごと送られない**（`agree` が無い）。チェックすると `agree=on`
- 空の入力欄は `name=` のように、名前と空の値で送られる

`URLSearchParams` は、この決まりのとおりに戻してくれます。自分で `split('&')` と `decodeURIComponent` で読むと、`+` が空白に戻らない、値の中の `=` で切れる、同じ名前が消える、といった間違いが起きます（練習問題8）。

**手を動かす**: フォームを受け取るサーバ `form-server.mjs` を作ります（完成形は [samples/form-server.mjs](samples/form-server.mjs)）。

```js
import http from 'node:http';

const PORT = 9206;

const FORM = `<!doctype html>
<meta charset="utf-8">
<title>フォームの練習</title>
<form method="post" action="/submit">
  <p>名前 <input name="name"></p>
  <p><label><input type="checkbox" name="tags" value="js"> js</label>
     <label><input type="checkbox" name="tags" value="node"> node</label></p>
  <p><button>送る</button></p>
</form>
`;

function send(res, status, type, text) {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    return send(res, 200, 'text/html', FORM);
  }
  if (req.method === 'POST' && req.url === '/submit') {
    const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    if (type !== 'application/x-www-form-urlencoded') {
      return send(res, 415, 'text/plain', 'フォームの形で送ってください\n');
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf8');
    console.log('届いたボディ:', text);

    const form = new URLSearchParams(text); // + を空白に、%xx を文字に戻してくれる
    const name = form.get('name') ?? '';
    const tags = form.getAll('tags');
    return send(res, 200, 'text/plain', `名前: ${name}\nタグ: ${tags.join(', ') || '（なし）'}\n`);
  }
  send(res, 404, 'text/plain', '見つかりません\n');
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
```

```sh
$ node form-server.mjs
# 別のターミナルで
$ curl -d 'name=ねこ&tags=js&tags=node' http://127.0.0.1:9206/submit
名前: ねこ
タグ: js, node
$ curl -d 'name=a+b%2Bc' http://127.0.0.1:9206/submit
名前: a b+c
タグ: （なし）
$ curl -i -H 'Content-Type: text/plain' -d 'x' http://127.0.0.1:9206/submit
HTTP/1.1 415 Unsupported Media Type
...
```

- ブラウザで http://127.0.0.1:9206/ を開いて、フォームから送っても試せます。サーバのターミナルに、届いたボディ（`name=...&tags=...`）が出ます。
- `URLSearchParams` が `+` を空白に、`%2B` を `+` に戻しました。
- `Content-Type` の `;` より前だけを、小文字にして比べています（3節）。

### 5.2 受け取った後は 303

フォームを受け取って保存したら、結果のページを直接返さずに、**303 See Other** で別のページへ案内します（PRG: Post/Redirect/Get。第2部 第10章）。結果のページで再読み込みしても、フォームがもう一度送られません。

入力に間違いがあったときは、リダイレクトせずに、**入力した値を残したまま**フォームをもう一度表示し、何が間違っていたかを書きます。このときのステータスは **422 Unprocessable Content** にします（6.3節）。値を HTML に入れるときは、必ずエスケープします（第21章）。

## 6. JSON

### 6.1 読めないものは 400

次のサンプルで確かめます（中身は読まなくてよい）。

```sh
$ node samples/json-demo.mjs
# 別のターミナルで
$ curl -s -H 'Content-Type: application/json' -d '{"name":' http://127.0.0.1:9202/api/echo
{"error":"JSON として読めません","requestId":"..."}
```

`JSON.parse` は、読めないと `SyntaxError` を投げます。捕まえなければ、`createApp` が 500 にします。客の送ったものが悪いので、正しくは **400 Bad Request** です。どこで失敗したかの細かいメッセージ（`Unexpected end of JSON input` など）は、サーバのログに書き、客には短く返します。

### 6.2 JSON.parse の決まり

```sh
$ curl -s -H 'Content-Type: application/json' -d '{"id":9007199254740993,"a":1,"a":2}' http://127.0.0.1:9202/api/echo
{"received":"{\"id\":9007199254740993,\"a\":1,\"a\":2}","top":"object","fields":{"id":{"value":9007199254740992,"type":"number"},"a":{"value":2,"type":"number"}}}
```

- **大きな整数は、正確に読めない。** JavaScript の number は、`2**53`（9007199254740992）を超える整数を正確に表せません。`9007199254740993` は `9007199254740992` になりました。大きな ID は、文字列で送ってもらいます
- **同じキーが2回あると、後ろが残る**（`"a":2`）
- いちばん外側は、オブジェクトとは限らない。`"文字"`・`123`・`null`・`[]` も正しい JSON です。オブジェクトを期待するなら、確かめます

### 6.3 400 と 422

| ステータス | いつ | 例 |
| --- | --- | --- |
| 400 Bad Request | 形として読めない | 壊れた JSON、壊れた `%xx` |
| 413 Content Too Large | 大きすぎる | 上限を超えたボディ |
| 415 Unsupported Media Type | 決めた種類でない | JSON の API に `text/plain` |
| 422 Unprocessable Content | 読めたが、中身が決まりに合わない | 名前が空、メールの形が違う、数が範囲の外 |

400 と 422 の区別は、第2部 第10章5節で見た REST の慣習です。どちらにするか迷ったら、「`JSON.parse` などで読めたかどうか」で分けると決めておくと、ぶれません。422 のときは、どの項目がどう間違っていたかを、まとめて返します。

**手を動かす**: JSON を受け取り、415・400・422・201 を返し分けるサーバ `json-server.mjs` を作ります（完成形は [samples/json-server.mjs](samples/json-server.mjs)）。

```js
import http from 'node:http';

const PORT = 9206;

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/api/users') {
    return sendJson(res, 404, { error: '見つかりません' });
  }
  const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') {
    return sendJson(res, 415, { error: 'JSON で送ってください' }); // 決めた種類でない
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  let data;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return sendJson(res, 400, { error: 'JSON として読めません' }); // 形として読めない
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return sendJson(res, 422, { error: 'オブジェクトで送ってください' });
  }
  if (typeof data.name !== 'string' || data.name.trim() === '') {
    return sendJson(res, 422, { error: 'name を書いてください' }); // 読めたが、中身が決まりに合わない
  }
  sendJson(res, 201, { name: data.name.trim() }); // 使うキーだけを取り出して返す
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/api/users で待っています（Ctrl+C で止める）`));
```

```sh
$ node json-server.mjs
# 別のターミナルで
$ curl -i -H 'Content-Type: application/json' -d '{"name":" alice ","isAdmin":true}' http://127.0.0.1:9206/api/users
HTTP/1.1 201 Created
...
{"name":"alice"}
$ curl -H 'Content-Type: application/json' -d '{"name":' http://127.0.0.1:9206/api/users
{"error":"JSON として読めません"}
$ curl -H 'Content-Type: application/json' -d '[1]' http://127.0.0.1:9206/api/users
{"error":"オブジェクトで送ってください"}
$ curl -d 'name=x' http://127.0.0.1:9206/api/users
{"error":"JSON で送ってください"}
```

- `curl -i` を付けて、それぞれのステータス（400・422・415）も確かめてください。
- `typeof data !== 'object' || data === null || Array.isArray(data)` は、「ふつうのオブジェクトでない」の確かめ方です。`typeof null` も `typeof []` も `'object'` になるので、3つとも必要です。
- 返事には `isAdmin` が入っていません。使うキー（`name`）だけを取り出したからです（次の7節）。

## 7. 受け取った値を、そのまま使わない

### 7.1 決めたキーだけを取り出す

```js
const msg = { id: nextId++, ...data }; // 受け取った JSON を、そのまま広げる
```

これだと、客が `{"name":"x","id":999,"isAdmin":true}` と送ってくると、`id` も `isAdmin` も、客の決めた値になります（マスアサインメント）。**使うキーを決めて、それだけを取り出します**（練習問題6の `pick`）。

**手を動かす**: `pick-keys.mjs` を作り、2つのやり方を比べます。サーバは起動しません（完成形は [samples/pick-keys.mjs](samples/pick-keys.mjs)）。

```js
const received = JSON.parse('{"name":"alice","text":"こんにちは","id":999,"isAdmin":true}');

// そのまま広げると、客が決めた id や isAdmin まで入ってしまう
const bad = { id: 1, isAdmin: false, ...received };
console.log('そのまま広げる :', bad);

// 使うキーを決めて、それだけを取り出す
const good = { id: 1, isAdmin: false, name: received.name, text: received.text };
console.log('決めたキーだけ :', good);
```

```sh
$ node pick-keys.mjs
そのまま広げる : { id: 999, isAdmin: true, name: 'alice', text: 'こんにちは' }
決めたキーだけ : { id: 1, isAdmin: false, name: 'alice', text: 'こんにちは' }
```

`...received` は後ろに書いたので、客の送った `id` と `isAdmin` で上書きされました。

### 7.2 `__proto__` とプロトタイプ汚染

次のサンプルで確かめます（中身は読まなくてよい）。

```sh
$ node samples/proto-demo.mjs
--- JSON.parse そのもの
Object.keys(data)      → [ 'theme', '__proto__' ]
data.isAdmin           → undefined

--- Object.assign で、自分の設定に混ぜる
settings.theme         → dark
settings.isAdmin       → true （settings のプロトタイプが差し替わった）

--- よくある「深い」マージの関数
関係ない user.isAdmin  → true （すべてのオブジェクトの元 Object.prototype が書き換わった）
({}).isAdmin           → true
```

`JSON.parse` は、`"__proto__"` を、ふつうのキーとして入れます。ここまでは安全です。ところが、そのオブジェクトを `Object.assign` や、よくある「深いマージ」の関数で別のオブジェクトに混ぜると、`target["__proto__"] = ...` という代入が、**プロトタイプを差し替える**特別な意味を持ってしまいます（第3部 第11章のプロトタイプ）。深いマージでは、すべてのオブジェクトの元である `Object.prototype` まで書き換わり、**プロセスの中のすべてのオブジェクト**が `isAdmin: true` を持っているように見えます。

これを**プロトタイプ汚染**と言い、実際に多くの npm のパッケージで見つかってきた問題です。守り方は次のとおりです。

- 受け取ったデータに `__proto__`・`constructor`・`prototype` というキーがあれば、断るか無視する
- 自分のキーだけを見る（`Object.keys`、`Object.hasOwn`）
- 混ぜた結果は新しいオブジェクトに作り、必要なら `Object.create(null)` や `Map` を使う

練習問題6で、安全な `safeMerge` と `pick` を作ります。第5部では、zod などで「決めた形のオブジェクトだけを作り直す」ことで、同じことをします。

## 8. ファイルのアップロード

### 8.1 multipart/form-data

ファイルを送るフォームは、`method="post"` に加えて `enctype="multipart/form-data"` を付けます。ボディは、区切りの文字（boundary）で項目を並べた形になります。

```
Content-Type: multipart/form-data; boundary=----formdata-undici-040283401465

------formdata-undici-040283401465
Content-Disposition: form-data; name="title"

テスト
------formdata-undici-040283401465
Content-Disposition: form-data; name="file"; filename="a.txt"
Content-Type: text/plain

hello

------formdata-undici-040283401465--
```

（改行は CR LF です。）この形を正しく読むのは意外と難しいのですが、Node.js には、ブラウザと同じ `Request` と `FormData` が組み込まれていて、`Request` の `formData()` で読めます（[samples/form-data.mjs](samples/form-data.mjs)）。

```js
const request = new Request('http://localhost/', {
  method: 'POST',
  headers: { 'content-type': req.headers['content-type'] },
  body: Buffer.concat(chunks, size), // 上限付きで読んだボディ
});
const fd = await request.formData();
fd.get('title'); // 'テスト'
fd.get('file');  // File { name: 'a.txt', type: 'text/plain', size: 6 }
```

```sh
$ node samples/multipart-demo.mjs   # ブラウザで http://127.0.0.1:9204/ から、小さな画像を送る（中身は読まなくてよい）
```

`formData()` は、ファイルも含めて全部メモリに入れます。上限を小さくして使うか、大きなファイルを扱うなら、少しずつ読んでディスクに書くパッケージ（busboy など。第5部で multer として使います）を使います。

### 8.2 ファイルの名前と種類を信じない

`File` の `name`（ファイル名）と `type`（種類）は、**客が言っていること**で、何でも書けます。

| 信じると | 何が起きるか | どうするか |
| --- | --- | --- |
| `name` をそのまま保存のパスに使う | `../../app.mjs` のような名前で、アプリのファイルを上書きされる（第19章のパストラバーサルの逆） | 保存する名前は、こちらで作る（`crypto.randomUUID()`）。元の名前は、表示のためだけに残す |
| `type` が `image/png` なら画像だと思う | 中身が HTML や JavaScript でも保存され、配信したときにページとして動く | 中身の先頭のバイト（マジックナンバー）で種類を調べる |
| 拡張子で種類を決める | `cat.png.html` や、中身と合わない拡張子 | 中身で決めた種類から、拡張子もこちらで付ける |

画像として受け付けるのは PNG・JPEG・GIF・WebP のように、中に JavaScript を書けないものにします。**SVG は画像ですが、中に `<script>` を書けます。** 利用者のアップロードした SVG を、自分のサイトの URL でそのまま配信すると、そのサイトの上で JavaScript が動いてしまいます。受け付けないか、別のドメインから配信します（第10部）。

練習問題7で、この守り方で画像を保存する `saveImage` を作ります。

## 9. Flask との対応

| やりたいこと | Flask | この章 |
| --- | --- | --- |
| ボディをバイトで | `request.get_data()` | `readBody(req, { limit })`（練習問題5） |
| フォーム | `request.form['name']`、`request.form.getlist('tags')` | `(await readForm(req)).get('name')`、`getAll('tags')` |
| JSON | `request.get_json()` | `await readJson(req)` |
| ファイル | `request.files['image']` | `(await readFormData(req)).get('image')`（`File`） |
| 安全なファイル名 | `secure_filename(f.filename)` | 名前を使わず、`randomUUID()` で作る |
| 大きさの上限 | `MAX_CONTENT_LENGTH` | `limit` のオプション。413 と `Connection: close` |
| 入力の確かめ | 自分で書く、または WTForms など | 自分で書く（練習問題8）。第5部で zod |

## まとめ

- ボディはチャンクに分かれて届く。全部つないでから文字に戻す。
- 上限は必ず決める。`Content-Length` で先に断り、読みながらも数える。413 には `Connection: close` を付ける。`for await` の途中で `throw` すると 413 を返せない。
- `Content-Type` で読み方を決める。違えば 415。
- フォームは `URLSearchParams` で読む。`+` は空白、同じ名前は `getAll`、チェックしないチェックボックスは送られない。受け取ったら 303。
- 読めなければ 400、読めたが中身が違えば 422。大きな整数と、同じキーに気をつける。
- 受け取った値は、決めたキーだけを取り出す。`__proto__` などのキーで、プロトタイプ汚染が起きる。
- アップロードされたファイルの名前と種類は信じない。名前はこちらで作り、種類は中身で調べる。SVG は受け付けない。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用2問・発展2問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- MDN「POST」（フォームの送り方）: https://developer.mozilla.org/ja/docs/Web/HTTP/Methods/POST
- MDN「URLSearchParams」: https://developer.mozilla.org/ja/docs/Web/API/URLSearchParams
- MDN「Request: formData()」: https://developer.mozilla.org/ja/docs/Web/API/Request/formData
- MDN「413 Content Too Large」: https://developer.mozilla.org/ja/docs/Web/HTTP/Status/413
- MDN「422 Unprocessable Content」: https://developer.mozilla.org/ja/docs/Web/HTTP/Status/422
- WHATWG「HTML: Form submission」（urlencoded の決まり）: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-2
- RFC 7578「multipart/form-data」: https://www.rfc-editor.org/rfc/rfc7578
- RFC 7396「JSON Merge Patch」: https://www.rfc-editor.org/rfc/rfc7396
- OWASP「File Upload Cheat Sheet」: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- OWASP「Mass Assignment Cheat Sheet」: https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html
- Node.js「HTTP: Event 'checkContinue'」: https://nodejs.org/api/http.html#event-checkcontinue
- Flask「The Request Object」「Uploading Files」: https://flask.palletsprojects.com/en/stable/patterns/fileuploads/

前の章: [第19章 静的ファイル配信](../ch19-static-files/README.md) ／ 次の章: [第21章 HTML を生成する](../ch21-html-templates/README.md)
