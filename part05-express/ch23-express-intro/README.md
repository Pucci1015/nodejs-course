# 第23章 Express 入門

第4部では、ルーティング・静的ファイル・ボディの読み取り・HTML の生成・エラーの扱いを、`node:http` だけで自分で作りました。この章からは、それらをまとめて引き受けてくれるフレームワーク **Express** を使います。
Express は Node.js でいちばん長く使われている Web フレームワークで、Flask と同じように「小さな核に、必要な部品を足していく」作りです。この章では、第4部の部品と1つずつ比べながら、Express が**何をしてくれて、何をしてくれないのか**を確かめます。してくれないことを知らないと、Flask でも Express でも、気づかないうちに穴のあるアプリになるからです。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第4部（特に第17章の `createApp`・第18章の Router・第20章のボディ・第21章のテンプレート）、第3部 第14章（npm とロックファイル） |
| この章のゴール | Express のアプリが「`(req, res)` を受け取る関数」だと説明できる / ルートとパスパラメータ・クエリを正しく読める / 405 を返さない・最後の `/` を無視する、などの既定の動きを知っていて、必要なら変えられる / `express.json()` と `express.static()` の動きと限界を説明できる / ビューエンジンを登録できる / 自分のエラーハンドラで、エラーを JSON にして中身を隠せる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 最小のアプリ、ルーティング、req と res、ボディ、静的ファイル、ビューエンジン、エラー |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答（問題2の `tasks-app.mjs` は、第24・25章の出発点にもなります） |

> この章のサンプルと練習問題は、`npm` で入れた Express を使います。先に、[第5部の README](../README.md) の「準備」で `~/dev/part05` を作り、その中で動かしてください。

---

## 1. Flask は何をしていて、Express は何をするのか

### 1.1 Flask がしていたこと

Flask のいちばん小さなアプリは、こうでした。

```python
from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/hello/<name>')
def hello(name):
    return jsonify(message=f'こんにちは、{name}さん')
```

ここで Flask（と、その中で使われている **Werkzeug** というライブラリ）は、次のことをしています。

1. `app` は、Python の Web サーバとアプリをつなぐ決まり（**WSGI**）にしたがった「呼び出せるもの」です。開発用のサーバ（`flask run`）や本番のサーバ（gunicorn など）が、リクエストのたびに `app` を呼びます
2. `@app.route` で、URL の規則と関数を組にして表に登録します。リクエストが来ると表を引き、`<name>` を取り出して引数に渡します（第18章 1節）
3. 関数が返したもの（文字列、`jsonify` の結果、タプル）を、ステータス・ヘッダ・本文のそろったレスポンスに変えます
4. 例外が起きたら 500 のページを返します。開発モードでは、ブラウザでスタックトレースを見られるデバッガも出します

つまり Flask は「HTTP を読む・表を引く・返す形に変える・例外を受け止める」の4つを、`@app.route` の裏でまとめてしていました。第4部では、この4つを自分で書きました。

### 1.2 Express がすること

同じものを Express で書くと、こうなります（[samples/hello-express.mjs](samples/hello-express.mjs)）。

```js
import http from 'node:http';
import express from 'express';

const app = express();

app.get('/hello/:name', (req, res) => {
  res.json({ message: `こんにちは、${req.params.name}さん` });
});

http.createServer(app).listen(9300, '127.0.0.1');
```

Flask との大きな違いは、**ハンドラが値を返すのではなく、`res` に書く**ことです。これは第4部の `node:http` と同じ形です。実は `app` は、第17章の `createApp` が返したものと同じ「`(req, res)` を受け取る関数」で、`http.createServer(app)` にそのまま渡せます。

```sh
$ node hello-express.mjs
typeof app = function
http://127.0.0.1:9300/ で待っています（Ctrl+C で止める）
```

`req` と `res` も、`node:http` の `IncomingMessage` と `ServerResponse` そのものです。Express は、それに `req.params`・`req.query`・`res.json()` などの便利なものを**足して**います。だから、第4部で学んだこと（`res.writeHead`、`res.on('close')`、ストリームとしての `req`）は、Express の中でもそのまま使えます。

| 仕事 | Flask | 第4部 | Express |
| --- | --- | --- | --- |
| サーバとアプリの決まり | WSGI | `(req, res)` の関数 | `(req, res)` の関数（`app` そのもの） |
| ルートの表 | `@app.route` | 第18章の `Router` | `app.get`・`app.post` など |
| 返し方 | 値を `return` | `sendJson(res, …)` | `res.json(…)` など |
| 例外を受け止める | Flask がする | 第17章の `createApp` | Express がする（8節） |
| 処理の前後にはさむ | `before_request` など | 第18章の `compose` | ミドルウェア（第24章） |

## 2. 準備と最初のアプリ

### 2.1 第5部の作業用フォルダを作る

第5部からは npm のパッケージを使います。第3部 第14章で学んだように、`node_modules` を OneDrive の中に作らないため、第5部のフォルダを `~/dev/part05` にコピーして、そこで動かします。

```sh
$ cd ~/Library/CloudStorage/OneDrive-個人用/program/nodejs/part05-express   # 教材のフォルダ（自分の場所に合わせる）
$ bash setup-part05.sh            # ~/dev/part05 を作り、npm ci で Express などを入れる
$ cd ~/dev/part05/ch23-express-intro/samples
$ node hello-express.mjs
```

`setup-part05.sh` は、第5部のフォルダの `package.json` と `package-lock.json` を使って `npm ci` をします。ロックファイルのおかげで、誰が入れても同じ版のパッケージになります（第3部 第14章 9節）。執筆時点では Express 5.3.0 を使っています。

> Express には、長く使われた 4 系と、2024年に出た 5 系があります。インターネットの記事やサンプルの多くは 4 系で書かれていて、5 系では動きが違うところがあります（この章では、違うところに印を付けます）。版と変更点は、必ず公式で確かめてください: https://expressjs.com/en/guide/migrating-5.html

### 2.2 `app.listen` と `X-Powered-By`

`app.listen(port, host, callback)` は、`http.createServer(app).listen(…)` を短く書いたものです。返り値は `node:http` のサーバなので、第17章のグレースフルシャットダウン（`server.close()`）もそのまま使えます。Express 5 では、ポートが使われているときなど、`listen` が失敗するとコールバックの第1引数にエラーが渡されます。

```sh
$ curl -si http://127.0.0.1:9300/ | head -3
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
```

Express は、既定で `X-Powered-By: Express` というヘッダを付けます。何で動いているかを外に知らせる理由は無く、古い版の弱点を探す手がかりを与えるだけなので、`app.disable('x-powered-by')` で消します（[samples/req-res-demo.mjs](samples/req-res-demo.mjs)）。

## 3. ルーティング

### 3.1 ルートとパスパラメータ

ルートは `app.メソッド(パス, ハンドラ)` で登録します（[samples/routes-demo.mjs](samples/routes-demo.mjs)）。

```js
app.get('/tasks/stats', (req, res) => res.json({ route: 'GET /tasks/stats' }));
app.get('/tasks/:id', (req, res) => res.json({ params: req.params }));
app.get('/files/*path', (req, res) => res.json({ params: req.params }));
app.get('/archive{/:year}', (req, res) => res.json({ params: req.params }));
```

```sh
$ curl -s http://127.0.0.1:9301/tasks/42
{"route":"GET /tasks/:id","params":{"id":"42"}}
$ curl -s http://127.0.0.1:9301/files/docs/guide.txt
{"route":"GET /files/*path","params":{"path":["docs","guide.txt"]}}
$ curl -s http://127.0.0.1:9301/archive
{"route":"GET /archive{/:year}","params":{}}
$ curl -s http://127.0.0.1:9301/archive/2026
{"route":"GET /archive{/:year}","params":{"year":"2026"}}
```

| 書き方 | 意味 | 第18章 |
| --- | --- | --- |
| `:id` | 1つのセグメント。値は `%xx` を戻した文字列 | `:id` |
| `*path` | 残り全部（1つ以上のセグメント）。値は `/` で分けた**配列** | `*`（文字列） |
| `{/:year}` | `{}` の中は、あってもなくてもよい | なし |

- `req.params` の値は、いつも文字列（`*` は文字列の配列）です。数にするのも、形を確かめるのも、ハンドラの仕事です（練習問題2）
- Express 5 では、パスに正規表現の記号（`?`・`+`・`(`）を書けなくなりました。4 系の記事にある `'/tasks/:id(\\d+)'` や `'/files/*'` は、5 系ではエラーになります
- 壊れた `%xx`（`/tasks/%zz`）は、Express が 400 にします

### 3.2 クエリは「文字列か、文字列の配列」

```sh
$ curl -s 'http://127.0.0.1:9301/tasks?tag=a&tag=b&page=2'
{"route":"GET /tasks","query":{"tag":["a","b"],"page":"2"}}
```

`req.query` は、URL の `?` の後をオブジェクトにしたものです。**同じ名前が2回あると配列になる**ので、`req.query.tag` が文字列だと決めつけると、`?tag=a&tag=b` だけで `toLowerCase is not a function` の 500 になります（練習問題4）。第18章の `URLSearchParams` の `get` は「最初の1つ」を返したので、この心配はありませんでした。

Express 5 の既定（`query parser` が `simple`）では、`a[b]=1` のような書き方を入れ子にせず、`'a[b]'` という名前のまま扱います。4 系の既定は入れ子にする書き方（`extended`）で、`?user[admin]=true` のように、思わない形のオブジェクトを作られる原因になっていました（第20章 6節のプロトタイプ汚染と同じ種類の危険）。

### 3.3 Express が既定でしないこと

第18章の Router と同じリクエストを送って比べると、違いが見えます（[exercises/compare-routers.mjs](exercises/compare-routers.mjs)、練習問題6）。

```sh
$ curl -si -X DELETE http://127.0.0.1:9301/tasks | head -1
HTTP/1.1 404 Not Found
$ curl -s http://127.0.0.1:9301/TASKS/
{"route":"GET /tasks","query":{}}
$ curl -si -X OPTIONS http://127.0.0.1:9301/tasks | tr -d '\r' | grep -E '^(HTTP|Allow)'
HTTP/1.1 200 OK
Allow: GET, HEAD, POST
```

| リクエスト | 第18章の Router | Express（既定） |
| --- | --- | --- |
| パスはあるが、メソッドが違う（`DELETE /tasks`） | 405 と `Allow` | **404**（HTML の「Cannot DELETE /tasks」） |
| 最後に `/` がある（`/tasks/`） | 308 で `/tasks` へ | 同じルートとして 200 |
| 大文字（`/TASKS`） | 404 | 同じルートとして 200 |
| HEAD | GET のハンドラで答える | 同じ |
| OPTIONS | 204 と `Allow` | 200 と `Allow`、本文にも同じ文字 |

最後の `/` と大文字・小文字は、設定で変えられます。

```js
app.set('strict routing', true);        // /tasks と /tasks/ を区別する
app.set('case sensitive routing', true); // /tasks と /TASKS を区別する
```

405 を返す設定はありません。返したいときは、自分で足します（練習問題3）。

### 3.4 ルートの順番と `app.route`

Express は、**登録した順に**ルートを試し、最初にあてはまったものを使います。第18章の Router は「具体的なものが先」に並べ直しましたが、Express は並べ直しません。

```js
app.get('/tasks/:id', …);   // こちらが先だと…
app.get('/tasks/stats', …); // GET /tasks/stats は :id = 'stats' として上で答えてしまう
```

だから、`/tasks/stats` のような具体的なルートを先に書きます。同じパスにメソッドごとのハンドラをまとめるときは、`app.route` が使えます。

```js
app
  .route('/settings')
  .get((req, res) => res.json({ route: 'GET /settings' }))
  .put((req, res) => res.json({ route: 'PUT /settings' }));
```

## 4. `req` と `res` に足されたもの

### 4.1 返し方

| やりたいこと | 第17章の `send.mjs` | Express |
| --- | --- | --- |
| ステータスを決める | `writeHead(status)` | `res.status(201)`（続けて `.json(…)` などを書く） |
| JSON | `sendJson(res, 200, value)` | `res.json(value)` |
| 文字・HTML・Buffer | `sendText`・`sendHtml` | `res.send(value)`（型で Content-Type を決める） |
| 本文なし | `noContent(res)` | `res.sendStatus(204)` |
| リダイレクト | `redirect(res, url, 303)` | `res.redirect(303, url)`（**既定は 302**） |
| ヘッダ | `setHeader` | `res.set(名前, 値)`、`res.location(url)`、`res.type('text/plain')` |
| ファイル | 第19章の `serveStatic` | `res.sendFile(絶対パス)`、`express.static`（6節） |

`res.send` は、渡した値の種類で Content-Type を決めます（[samples/req-res-demo.mjs](samples/req-res-demo.mjs)）。

```sh
$ curl -si http://127.0.0.1:9302/send/text | tr -d '\r' | grep -E '^(HTTP|Content-Type|ETag)'
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
ETag: W/"27-A/ziWt8YM9pWqE3CWXvSw/xvxFs"
$ curl -si http://127.0.0.1:9302/send/number
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
…
404
```

- 文字列は `text/html`、オブジェクトと配列は JSON、Buffer は `application/octet-stream` です。利用者の入力を文字列のまま `res.send` すると、HTML として表示されます（第21章の XSS の注意がそのままあてはまります）
- **`res.send(数)` は、数の JSON を 200 で返します**。Express 4 では「ステータスコード」の意味だったので、古い記事を写すとこの間違いになります（練習問題1・4）。ステータスは `res.status()` か `res.sendStatus()` で決めます
- `res.send` と `res.json` は、本文から **ETag**（弱い ETag）を自動で付け、`If-None-Match` が同じなら 304 を返します（第2部 第7章、第19章 5節）。本文を作る手間は省けませんが、送る量は減ります
- `res.status(204).json(…)` のように本文を付けても、204 なので本文は送られません

### 4.2 2回返さない

第17章 4.2節で、2回 `res.end` しようとすると `ERR_HTTP_HEADERS_SENT` になることを見ました。Express でも同じです。

```js
app.get('/twice', (req, res) => {
  res.json({ first: true });
  res.json({ second: true }); // ここで例外
});
```

客には1回目の本文が届き、2回目は例外になってサーバのログに出ます。よくあるのは、「エラーを返した後の `return` を忘れる」形です（練習問題4）。

```js
if (!note) {
  res.status(404).json({ error: 'not_found' }); // return が無いと…
}
note.views += 1; // note は undefined なので TypeError
```

### 4.3 `req` に足されたもの

| もの | 中身 |
| --- | --- |
| `req.params`・`req.query`・`req.body` | パスパラメータ・クエリ・読んだボディ（5節） |
| `req.path`・`req.originalUrl` | クエリを除いたパス・元の URL |
| `req.get('accept')` | ヘッダ（大文字・小文字を区別しない） |
| `req.is('application/json')` | Content-Type が合うか（`; charset=…` があっても正しく見る） |
| `req.accepts(['json', 'html'])` | Accept を見て、どちらを返すべきか（第2部 第7章 7節） |
| `req.ip`・`req.hostname`・`req.protocol` | 客の IP・ホスト名・`http` か `https` |

`req.ip` と `req.protocol` は、既定では TCP の接続の情報です。リバースプロキシの後ろでは、`X-Forwarded-For` などのヘッダを信じる設定（`trust proxy`）が必要になります。ただし、そのヘッダは客が自由に付けられるので、「信じてよいプロキシ」を正しく指定しないといけません（第12部 第62章で扱います）。

## 5. ボディを読む

### 5.1 `express.json()` と `express.urlencoded()`

Express は、ボディを自動では読みません。読むミドルウェアを、ルートの前にはさみます（ミドルウェアは第24章で詳しく扱います）。

```js
app.use(express.json());                            // すべてのルートで JSON を読む
app.post('/form', express.urlencoded({ extended: false }), handler); // このルートだけフォームを読む
```

[samples/body-demo.mjs](samples/body-demo.mjs) で、第20章の `readJson`・`readForm` と比べます。

```sh
$ curl -s -H 'Content-Type: application/json' -d '{"title":"牛乳"}' http://127.0.0.1:9303/json
{"type":"object","body":{"title":"牛乳"}}
$ curl -s -H 'Content-Type: text/plain' -d '{"title":"牛乳"}' http://127.0.0.1:9303/json
{"type":"undefined","body":null}
$ curl -si -H 'Content-Type: application/json' -d '{"title":' http://127.0.0.1:9303/json | head -1
HTTP/1.1 400 Bad Request
$ curl -s -d 'title=牛乳&tag=a&tag=b' http://127.0.0.1:9303/form
{"body":{"title":"牛乳","tag":["a","b"]}}
```

| 場面 | 第20章の `readJson` | `express.json()` |
| --- | --- | --- |
| 正しい JSON | オブジェクトを返す | `req.body` に入れる |
| Content-Type が違う | **415** | **何もしない**（`req.body` は `undefined`） |
| 壊れた JSON | 400 | 400 のエラー（`err.type` は `entity.parse.failed`） |
| `"文字列"` だけ | 受け付けた | 既定（`strict: true`）では 400。オブジェクトと配列だけ |
| 大きすぎる | 413（上限は自分で決めた） | 413（既定の上限は **100kb**、`limit` で変える） |
| `Content-Length` が上限を超える | 読む前に断った | 読む前に断る |

注意するのは2点です。

- **Content-Type が違うと、エラーにならずに `req.body` が `undefined` になる**。そのまま `req.body.title` と書くと TypeError の 500 です。API なら、`req.is('application/json')` を確かめて 415 を返すのが親切です（練習問題2）
- Express 5 では、ボディを読むミドルウェアを通っていないと `req.body` は `undefined` です（4 系では `{}` でした）。`req.body?.title` のように書くか、先に確かめます

### 5.2 中身の確かめは、まだ自分の仕事

`express.json()` がするのは「JSON として読む」ところまでです。`title` があるか、文字列か、長すぎないか、知らない項目が無いか、は確かめません。第20章 5節の「400 と 422」の考え方は、そのまま必要です。第25章では、この確かめをライブラリ（zod）で書く方法を学びます。

`multipart/form-data`（ファイルのアップロード）を読むミドルウェアは、Express には入っていません。第20章 8節のように自分で読むか、multer などのパッケージを使います（第12部 第63章で、ファイルの保存と合わせて扱います）。

## 6. 静的ファイル

`express.static(フォルダ)` は、第19章の `serveStatic` と同じ仕事をするミドルウェアです（[samples/static-demo.mjs](samples/static-demo.mjs)）。

```js
app.use(express.static(publicDir));                                    // / の下に public を見せる
app.use('/assets', express.static(publicDir, { index: false, maxAge: '1h' })); // /assets の下
```

```sh
$ curl -si http://127.0.0.1:9304/assets/style.css | tr -d '\r' | head -7
HTTP/1.1 200 OK
Accept-Ranges: bytes
Cache-Control: public, max-age=3600
Last-Modified: Thu, 05 Nov 2026 19:02:07 GMT
ETag: W/"e3-1a1ad16fb98"
Content-Type: text/css; charset=utf-8
Content-Length: 227
$ curl -s http://127.0.0.1:9304/.env.example
見つかりません: /.env.example
$ curl -s --path-as-is http://127.0.0.1:9304/assets/../static-demo.mjs
見つかりません: /assets/../static-demo.mjs
```

| 第19章で作ったこと | `express.static` |
| --- | --- |
| パストラバーサルを防ぐ | する |
| ドットファイルを返さない | する（既定の `dotfiles: 'ignore'` は 404） |
| Content-Type、ETag と 304、Range と 206、HEAD | する |
| `index.html` | する（`index: false` で止める） |
| Cache-Control | `maxAge`（既定は `max-age=0`）、`immutable` |
| 圧縮（gzip・br） | **しない**（`compression` というミドルウェアか、前に置くリバースプロキシの仕事） |

`express.static` が守ってくれるのは「指定したフォルダの外」だけです。**指定したフォルダの中は、すべて公開されます**。`express.static(import.meta.dirname)` のようにソースのフォルダを渡すと、サーバのソースや `.env` 以外の設定ファイルまで読まれます（練習問題4）。公開するフォルダには、公開してよいファイルだけを入れます。

見つからなかったときは、既定（`fallthrough: true`）で次のミドルウェアへ進みます。だから、`express.static` の後に API のルートや 404 を置けます。

## 7. HTML を返す: ビューエンジン

Flask は `render_template('index.html', title=…)` で、Jinja2 のテンプレートから HTML を作りました。Express の `res.render` も同じ仕事ですが、**テンプレートエンジンは Express に入っていません**。使うエンジンを登録します。

ビューエンジンは「`(ファイルのパス, 値, コールバック)` を受け取って、文字列をコールバックに渡す関数」です。第21章で作った小さなテンプレートエンジンを、そのまま登録できます（[samples/view-engine-demo.mjs](samples/view-engine-demo.mjs)）。

```js
import { compile } from '../../lib/template.mjs'; // 第21章 練習問題4の解答のコピー

app.engine('html', async (filePath, options, callback) => {
  try {
    const source = await fs.readFile(filePath, 'utf8');
    callback(null, compile(source)(options));
  } catch (err) {
    callback(err);
  }
});
app.set('views', path.join(import.meta.dirname, 'views'));
app.set('view engine', 'html');

app.get('/', (req, res) => {
  res.render('index', { title: 'タスク', tasks, q: req.query.q ?? '' });
});
```

```sh
$ curl -s 'http://127.0.0.1:9306/?q=<b>' | grep 検索
    <p>検索: 「&lt;b&gt;」</p>
```

- `res.render` に渡した値に、`app.locals`（すべての画面で使う値）と `res.locals`（このリクエストだけの値。第24章でミドルウェアから入れる）が混ざってテンプレートに渡ります
- Express は、ほかにも `settings`（`app.set` の値すべて）を混ぜてきます。テンプレートから見えないようにするのが安全です（練習問題5）
- よく使われるエンジンは、EJS・Pug・Nunjucks（Jinja2 とほぼ同じ書き方）などです。どれを使うときも、**値を自動でエスケープするか、エスケープしない書き方はどれか**を最初に確かめます。たとえば EJS では `<%= 値 %>` がエスケープし、`<%- 値 %>` はしません（第21章 6節）

第5部の後半では、画面ではなく JSON の API を作ります。画面は第8部で React で作るので、ビューエンジンはこの章で仕組みを知っておけば十分です。

## 8. エラーの扱い

### 8.1 例外は Express が受け止める

[samples/error-demo.mjs](samples/error-demo.mjs) で、ハンドラの中の例外がどうなるかを確かめます。

```js
app.get('/sync', (req, res) => { throw new Error('DB に接続できません: …'); });
app.get('/async', async (req, res) => { await …; throw new Error('async の中で失敗'); });
app.get('/teapot', (req, res) => { const err = new Error('…'); err.status = 418; throw err; });
app.get('/callback', (req, res, next) => {
  setTimeout(() => {
    try { throw new Error('setTimeout の中で失敗'); } catch (err) { next(err); }
  }, 10);
});
```

| 例外の場所 | Express 5 | Express 4 |
| --- | --- | --- |
| ハンドラの中で同期的に `throw` | エラーハンドラへ | エラーハンドラへ |
| `async` 関数の中（Promise の reject） | **エラーハンドラへ** | 受け止めない（応答が返らない。unhandled rejection） |
| コールバックの中（`setTimeout` など） | 受け止めない（プロセスが落ちる） | 同じ |

Express 5 は、ハンドラが返した Promise を見ていて、reject されたらエラーハンドラに送ります。第17章の `createApp` が `await handler(req, res)` を `try` で囲んでいたのと同じです。ただし、コールバックの中の例外は、誰の `try` の中でもないので届きません。`next(err)` で渡すか、コールバックを Promise にして `await` します（第3部 第12章の `promisify`）。

`err.status`（か `err.statusCode`）があれば、そのステータスになります。`express.json()` のエラーにも `status` が付いています。

### 8.2 既定のエラーハンドラは、開発中は中身を見せる

```sh
$ node error-demo.mjs
$ curl -s http://127.0.0.1:9305/sync | grep pre
<pre>Error: DB に接続できません: postgres://app:dev-only-password@127.0.0.1/app<br> &nbsp; &nbsp;at file:///…/error-demo.mjs:15:9<br> …

$ NODE_ENV=production node error-demo.mjs
$ curl -s http://127.0.0.1:9305/sync | grep pre
<pre>Internal Server Error</pre>
```

Express の既定のエラーハンドラは、`NODE_ENV` が `production` でなければ、**例外の文とスタックトレースを HTML で客に返します**。例外の文には、接続文字列やファイルのパスのような、外に出してはいけないものが入りがちです。`NODE_ENV` を付け忘れて公開すれば、そのまま漏れます。

だから、自分のエラーハンドラを必ず書きます。**引数が4つの関数**が、エラーハンドラです。

```js
// どのルートにもあてはまらなかったとき（404）。ルートをすべて書いた後に置く
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: `${req.method} ${req.path} はありません` });
});

// エラーハンドラ。いちばん最後に置く。引数は必ず4つ（使わなくても next を書く）
app.use((err, req, res, next) => {
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) console.error(err);     // 詳しいことはログにだけ
  if (res.headersSent) return next(err);     // 途中まで送ってしまった後なら、Express に任せる（接続を切る）
  res.status(status).json({
    error: status >= 500 ? 'internal' : 'error',
    message: status >= 500 ? 'サーバのエラーです' : err.message,
  });
});
```

```sh
$ CUSTOM=1 node error-demo.mjs
$ curl -s http://127.0.0.1:9305/sync
{"error":"internal","message":"サーバのエラーです"}
$ curl -s http://127.0.0.1:9305/teapot
{"error":"error","message":"ティーポットなのでコーヒーは入れられません"}
```

- 引数が3つだと（`(err, req, res) => …`）、Express はふつうのミドルウェアだと思い、エラーのときには呼びません。気づきにくい間違いです（練習問題4）
- 400 番台の `err.message` を客に見せてよいのは、自分で書いた文だけです。第17章の `HttpError` のように「見せてよいエラー」の型を作ると、区別しやすくなります（練習問題2の `ApiError`）。第25章では、エラーの形を標準の形（RFC 9457）にそろえます

## 9. 第4部の部品・Flask との対応

| やりたいこと | Flask | 第4部 | Express |
| --- | --- | --- | --- |
| アプリを作る | `app = Flask(__name__)` | `createApp(handler)` | `const app = express()` |
| ルート | `@app.route('/t/<id>', methods=['GET'])` | `router.get('/t/:id', h)` | `app.get('/t/:id', h)` |
| パスパラメータ | 関数の引数 | `req.params.id` | `req.params.id`（文字列） |
| クエリ | `request.args.get('q')` | `req.query.get('q')`（URLSearchParams） | `req.query.q`（文字列か配列） |
| 405 | Flask がする | Router がする | **しない**（練習問題3） |
| JSON を読む | `request.get_json()` | `readJson(req)` | `express.json()` → `req.body` |
| フォームを読む | `request.form` | `readForm(req)` | `express.urlencoded()` → `req.body` |
| JSON を返す | `return jsonify(…)` | `sendJson(res, 200, …)` | `res.json(…)` |
| リダイレクト | `redirect(url)`（302） | `redirect(res, url, 303)` | `res.redirect(303, url)`（既定は 302） |
| 静的ファイル | `static/` フォルダ | `serveStatic(root)` | `express.static(root)` |
| テンプレート | `render_template`（Jinja2） | `html` タグ、`compile` | `res.render`（エンジンは自分で選ぶ） |
| エラーのページ | `@app.errorhandler(404)` | `createApp` の `catch` | 引数4つのミドルウェア |
| 開発中のエラー表示 | デバッガ（`debug=True`） | なし | `NODE_ENV` が production でないとスタックを返す |

## まとめ

- Express の `app` は `(req, res)` を受け取る関数で、`req`・`res` は `node:http` のものに便利なものを足したもの。第4部の知識はそのまま使える。
- ルートは登録した順に試される。具体的なルートを先に書く。パスパラメータとクエリは文字列（クエリは配列にもなる）なので、形を確かめるのはハンドラの仕事。
- Express は、既定では 405 を返さず、最後の `/` と大文字・小文字を区別しない。API では `strict routing`・`case sensitive routing` を有効にし、405 は自分で足す。
- `res.send(数)` はステータスにならない。リダイレクトの既定は 302。エラーの後の `return` を忘れない。
- `express.json()` は Content-Type が違うと何もしない（415 は自分で）。中身の確かめも自分の仕事。上限は既定で 100kb。
- `express.static` は、指定したフォルダの中をすべて公開する。公開するフォルダには、公開してよいものだけを置く。
- Express 5 は async 関数の例外も受け止める。既定のエラーハンドラは開発中にスタックを返すので、404 のミドルウェアと、引数4つのエラーハンドラを必ず書く。

## 練習問題

[exercises/README.md](exercises/README.md) に6問あります。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Express 公式「Hello world」「Basic routing」: https://expressjs.com/en/starter/hello-world.html
- Express 公式「Routing」（パスの書き方）: https://expressjs.com/en/guide/routing.html
- Express 公式「Migrating to Express 5」: https://expressjs.com/en/guide/migrating-5.html
- Express 公式「Error handling」: https://expressjs.com/en/guide/error-handling.html
- Express 公式「API reference 5.x」（`express.json`・`express.static`・`res.send` など）: https://expressjs.com/en/5x/api.html
- Express 公式「Using template engines」: https://expressjs.com/en/guide/using-template-engines.html
- Express 公式「Production best practices: security」（`X-Powered-By` など）: https://expressjs.com/en/advanced/best-practice-security.html
- path-to-regexp（Express 5 のパスの書き方の元）: https://github.com/pillarjs/path-to-regexp
- Flask「Quickstart」: https://flask.palletsprojects.com/en/stable/quickstart/

前の章: [第22章 Cookie とセッションを自作する](../../part04-raw-http-server/ch22-cookie-session/README.md) ／ 次の章: [第24章 ミドルウェア](../ch24-middleware/README.md)
