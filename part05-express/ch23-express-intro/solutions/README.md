# 第23章 模範解答

| 問題 | 解答のファイル | 確かめ方（`exercises/` で実行） |
| --- | --- | --- |
| 1 | このページ | `node predict-express.mjs` |
| 2 | [tasks-app.mjs](tasks-app.mjs) | `MODULE=../solutions/tasks-app.mjs node --test tasks-app.test.mjs` |
| 3 | [resource.mjs](resource.mjs) | `MODULE=../solutions/resource.mjs node --test resource.test.mjs` |
| 4 | [notes.mjs](notes.mjs) | `bash check-notes.sh ../solutions/notes.mjs` |
| 5 | [engine.mjs](engine.mjs) | `MODULE=../solutions/engine.mjs node --test engine.test.mjs` |
| 6 | このページ | `node compare-routers.mjs`、`STRICT=1 node compare-routers.mjs` |

---

## 問題1 Express が返すものを予想する

執筆時点（Express 5.3）での結果です。

```text
 1. GET /items?a=1&a=2&b=x → 200 "{\"query\":{\"a\":[\"1\",\"2\"],\"b\":\"x\"}}"
 2. GET /items/new → 200 "{\"params\":{\"id\":\"new\"}}"
 3. GET /Items/ → 200 "{\"query\":{}}"
 4. PUT /items → 404 "(HTML) Cannot PUT /items"
 5. OPTIONS /items/3 → 200 "GET, HEAD"  Allow: GET, HEAD
 6. HEAD /items/3 → 200 ""
 7. POST /items → 201 "{\"got\":{\"name\":\"りんご\"}}"
 8. POST /items → 201 "{\"got\":null}"
 9. POST /items → 400 "(HTML) SyntaxError: Unexpected end of JSON input"
10. GET /n → 200 "201"
11. GET /twice → 200 "2つ目"
12. GET /async → 409 "(HTML) Error: もうあります"
13. GET /items/%E3%82%8A%E3%82%93%E3%81%94 → 200 "{\"params\":{\"id\":\"りんご\"}}"
14. GET /items/a%2Fb → 200 "{\"params\":{\"id\":\"a/b\"}}"
```

- **1番**: 同じ名前が2回あると配列になります（本文 3.2節）。`req.query.a.toLowerCase()` のように「文字列のつもり」で書くと、ここで 500 になります
- **2番**: Express は、登録した順に試して、最初にあてはまったものを使います。`/items/:id` が先にあるので、`new` は `id` として読まれ、後の `/items/new` には届きません。`/items/new` を先に登録すれば直ります。第18章の Router は「具体的なものを先に」並べ直したので、順番に関係なく `/items/new` を選びました
- **3番と4番**: Express は、既定では大文字と小文字を区別せず、最後の `/` も無視します。また、パスがあってメソッドが違うときも 404 です。第18章の Router は、`/Items/` を 404、`/items/` を 308、`PUT /items` を 405 にしました。どちらが良いかは目的で決まります（問題6）。API では、間違った URL を「たまたま動く」ようにするより、はっきり断るほうが、使う側が間違いに早く気づけます
- **5番・6番**: OPTIONS と HEAD は、Express が自動で答えます。OPTIONS は `200` と本文 `GET, HEAD` です（第18章の Router は 204 でした。どちらも HTTP として間違いではありません）
- **8番**: `express.json()` は、Content-Type が `application/json` でないボディは**読まずに次へ進みます**。`req.body` は `undefined` のままで、エラーにもなりません。使う側は「送ったのに無視された」と分からないので、API では 415 を自分で返すのが親切です（問題2）
- **9番**: 壊れた JSON は `express.json()` が 400 のエラーにします。エラーハンドラを書いていないので、Express の既定の HTML が返ります
- **10番**: Express 5 の `res.send(数)` は、数を JSON として返します（ステータスは 200 のまま）。書きたかったのは `res.sendStatus(201)` か `res.status(201).json(…)` です。Express 4 では `res.send(201)` が「ステータス 201」の意味だったので、古い記事のコードを写すとこうなります
- **11番**: 1つ目のハンドラが `next()` を呼んだので、同じパスの次のハンドラが動きました（第24章で詳しく扱います）
- **12番**: Express 5 は、ハンドラが返した Promise が reject されると、それを受け止めてエラーハンドラに送ります。`err.status` が 409 なので 409 です。Express 4 は Promise を見なかったので、unhandled rejection になり、応答が返らずに客が待たされ続けるか、Node.js 15 以降の既定ではプロセスが落ちました（第3部 第12章）
- **14番**: `%2F` は、パラメータの中では `/` に戻されます。ルートを選ぶときは `/` ではなかったので `/items/:id` にあてはまり、その後で `id` が `a/b` になりました。第18章 3.3節と同じで、この値をファイルのパスなどにそのまま使ってはいけません

## 問題2 タスクの REST API を Express で書く

[tasks-app.mjs](tasks-app.mjs) を見てください。考え方の要点です。

- **エラーは throw して、1か所で JSON にする**: `ApiError(status, error, message)` を throw し、最後のエラーハンドラで `{ error, message }` にします。ルートの中で `return res.status(400).json(…)` を何か所にも書くと、`return` の書き忘れ（問題4）や、形のばらつきが起きやすくなります
- **415 は自分で返す**: `express.json()` は Content-Type が違うと何もしないので、`req.is('application/json')` で確かめるミドルウェア `requireJson` を、POST と PATCH の前にはさみました。`req.is` は `application/json; charset=utf-8` も正しく扱います
- **`id` の形は正規表現で**: `Number('1e3')` は `1000`、`Number('01')` は `1`、`Number(' 1 ')` も `1` です。`Number.isInteger(Number(x))` だけでは、同じタスクを指す URL が何通りもできてしまいます
- **`?done` は3通り**: 無い（全部）、`'true'`、`'false'`。それ以外（`''`、配列、`yes`）は 400 にします。`req.query.done === 'true'` だけで判断すると、`?done=yes` が「未完了だけ」として通ってしまいます
- **PATCH の知らない項目は 422**: 黙って捨てると、`{"dnoe": true}` のようなつづりの間違いに、使う側が気づけません。第20章の `pick` は「許したものだけを取る」でしたが、ここでは「許していないものがあれば断る」にしました。どちらにするかは API の方針です（第25章 5節）
- **express.json() のエラーも JSON に**: ボディを読むミドルウェアのエラーには `status`（400・413）と `expose: true` が付いています。`err.status` が 400 番台なら、そのステータスで JSON にしました。Express 自身の 400（壊れた `%xx`）も同じ形で届きます
- **500 は中身を見せない**: `console.error(err)` でログにだけ書き、本文は決まった文にします。既定のエラーハンドラは、`NODE_ENV` が `production` でないとスタックトレースを返すので、自分のエラーハンドラを必ず置きます

つまずきやすいところ:

- エラーハンドラを `app.use((err, req, res) => …)` と3つの引数で書くと、エラーハンドラになりません（問題4）。使わなくても `next` を書きます
- 404 のミドルウェアをルートより前に置くと、すべてが 404 になります。`app.use` は登録した順に動きます

## 問題3 Express に「405 と Allow」を足す

[resource.mjs](resource.mjs) を見てください。

- `app.route(path)` に、登録したメソッドのハンドラを付けた後、最後に `.all(…)` を付けます。`all` は「メソッドを問わない」ハンドラなので、前のハンドラが答えなかったもの（登録していないメソッド）がここに届きます
- HEAD は、Express の Route が「HEAD のハンドラが無ければ GET のハンドラを使う」ので、`get` があれば `all` まで来ません。`get` が無いときだけ `all` に来て 405 になります
- `Allow` の文字列は、登録の時点で1回だけ作ります。リクエストのたびに作り直す必要はありません
- つづりの間違い（`gett`）を、登録の時点で `TypeError` にしました。リクエストが来るまで気づけない間違いは、起動の時点で見つけるほうが安全です（第26章の「設定の確かめ」と同じ考え方）

別解: すべてのルートを登録した後に、`app.router.stack` をたどって「パスにあてはまるルートのメソッド」を集める方法もあります。ただし `router.stack` の形は Express の内部のもので、版が変わると動かなくなるかもしれません。公開されている `route.all` を使うほうが長持ちします。

## 問題4 メモのアプリのバグを直す

[notes.mjs](notes.mjs) を見てください。直したところには `// 修正:` を付けました。

| バグ | 直し方 | 通る確認 |
| --- | --- | --- |
| `express.static(import.meta.dirname)` で、サーバのフォルダを丸ごと公開していた | `public` だけを公開する | 21〜23 |
| `?tag=a&tag=b` は配列になり、`toLowerCase` で TypeError | 文字列でなければ 400 | 3, 4 |
| `/notes/:id` が `/notes/search` より先 | `/notes/search` を先に登録する | 5, 6 |
| 404 を返した後に `return` が無く、`note.views` で TypeError | `return res.status(404)…` | 9 |
| `Number('abc')` は NaN で、無いメモとして扱っていた | 形を確かめて 400 | 10 |
| `express.json()` が無く、`req.body` が `undefined` | `express.json()` を付け、Content-Type が違えば 415 | 11〜16, 20 |
| `res.send(201)` は「201 という JSON」を 200 で返す | `res.status(201).location(…).json(note)` | 11〜13 |
| フォームの後の `res.redirect('/notes')` は 302 | `res.redirect(303, '/notes')` | 17 |
| エラーハンドラの引数が3つで、エラーハンドラになっていなかった | `(err, req, res, next)` の4つにする。400 番台はそのステータスで返す | 4, 16, 19 |
| `X-Powered-By: Express` | `app.disable('x-powered-by')` | 24 |

- 確認 18（Location が `/notes`）は、直す前から通ります。302 でも 303 でも Location は同じだからです。ステータスだけが違うので、確認 17 が必要です
- 確認 9 は、ログを見る確認です。404 を返した後に TypeError が起きても、客に届くのは正しい 404 です。**客から見て正しくても、ログにエラーが出ているなら、どこかが壊れています**。第26章で、ログを読める形にする方法を学びます
- `express.static` に渡すフォルダは、「誰に見られてもよいファイルだけを入れたフォルダ」にします。`import.meta.dirname` や `process.cwd()` を渡すと、`.env` やソースコードまで読まれます

## 問題5 第21章のテンプレートエンジンをビューエンジンにする

[engine.mjs](engine.mjs) を見てください。

- **キャッシュは Promise を覚える**: `Map` に「compile の結果」ではなく「compile の結果になる Promise」を入れると、同時に3つ来ても、2つ目と3つ目は1つ目の Promise を待つだけになります（第3部 第12章の `memoize` と同じ考え方）。失敗した Promise は `catch` で消し、直したファイルを次に読めるようにしました
- **`options.cache`**: Express は `app.set('view cache', …)` の値を `options.cache` として渡します。`NODE_ENV=production` のとき、`view cache` は既定で有効になります
- **見せない値**: `settings` には `app.set` の値すべてが入っています。`views` のフォルダの絶対パスや、自分で `app.set('db password', …)` のように入れた値があれば、それもです。テンプレートを書く人が `{{ settings.○○ }}` と書けば HTML に出てしまうので、渡す前に取り除きました。同じ理由で、テンプレートに渡す値は「画面に出してよいものだけ」にします
- **レイアウトの場所の確かめ**: `layout` の値をそのまま `path.resolve` すると、`../` で好きなファイルを読ませられます。第19章 2節の `path.relative` の確かめをそのまま使いました
- **`{{ body | raw }}`**: ページはもうエスケープ済みの HTML なので、レイアウトでは `raw` で入れます。`raw` を使うのは「自分で作った、エスケープ済みの HTML」だけにします（第21章 4節）

## 問題6 第18章の Router と Express を比べる

```text
Express の設定: 既定
リクエスト                      | 第18章の Router                             | Express
  GET /tasks               | 200 list                                 | 200 list
* GET /tasks/              | 308  Location: /tasks                    | 200 list
* GET /Tasks               | 404 ありません                                | 200 list
~ GET /tasks/me            | 200 me                                   | 200 show id=me
  GET /tasks/7             | 200 show id=7                            | 200 show id=7
  GET /tasks/caf%C3%A9     | 200 show id=café                         | 200 show id=café
  GET /tasks/a%2Fb         | 200 show id=a/b                          | 200 show id=a/b
  GET /tasks/%zz           | 400 URL の %xx の形が正しくありません                | 400 (HTML) URIError: Failed to dec
* DELETE /tasks            | 405 このメソッドは使えません Allow: GET, HEAD, POST, OPTIONS | 404 (HTML) Cannot DELETE /tasks
* OPTIONS /tasks           | 204  Allow: GET, HEAD, POST, OPTIONS     | 200 GET, HEAD, POST Allow: GET, HEAD, POST
  HEAD /tasks/7            | 200                                      | 200
* GET /tasks/7/            | 308  Location: /tasks/7                  | 200 show id=7
```

1. 違いの理由
   - `/tasks/`・`/tasks/7/`: Express は既定で最後の `/` を無視します（`strict routing` が無効）。第18章の Router は、別の URL として扱い、正しい方へ 308 で案内しました（第18章 7節）
   - `/Tasks`: Express は既定で大文字・小文字を区別しません（`case sensitive routing` が無効）。URL のパスは、本来は大文字と小文字を区別するものです（RFC 3986）
   - `/tasks/me`: Express は登録した順、第18章の Router は具体的な順（第18章 6節）
   - `DELETE /tasks`: Express は 405 を返しません（本文 3.3節、問題3）
   - `OPTIONS`: Express は 200 と本文、第18章の Router は 204。Express の `Allow` には `OPTIONS` 自身が入っていません
   - `%zz`: どちらも 400 ですが、Express は既定のエラーハンドラの HTML（開発中はスタックトレース入り）です
2. `GET /tasks/me` は、「自分のタスク」のつもりで `me` のルートを書いたのなら、`me` が選ばれるのが正しい動きです。Express では、`app.get('/tasks/me', …)` を `app.get('/tasks/:id', …)` より**先に**登録します。第18章の Router は登録の後に並べ直すので、順番を変えても結果は変わりません。Express の「登録した順」は、分かりやすい代わりに、ファイルを分けたとき（第24章の Router、第26章）に順番が見えにくくなります。重なるルートには、両方のテストを書いておきます
3. `STRICT=1` では、`/tasks/`・`/Tasks`・`/tasks/7/` が 404 になります（308 にはなりません）。405・OPTIONS・`me` は変わりません。API なら `strict` と `case sensitive` を有効にして、URL を1通りにするのがおすすめです。同じものを指す URL が何通りもあると、キャッシュ（第2部 第7章）や、URL ごとの権限のチェック（第18章 3.3節）が食い違う原因になります。人が手で打つ HTML のページなら、既定のまま（または 308 で正しい URL へ案内する）のほうが親切です
4. 既定の HTML の 404・400 で困ること
   - API を使う側（`fetch` で JSON を読むコード）が、`res.json()` で失敗する。エラーの種類を機械的に見分けられない
   - 開発中（`NODE_ENV` が `production` でない）は、スタックトレース（ファイルのパスなど）が外に出る
   - だから API では、最後に 404 のミドルウェアとエラーハンドラを必ず置きます（問題2）
