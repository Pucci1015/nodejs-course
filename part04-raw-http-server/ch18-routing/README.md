# 第18章 ルーティングを自作する

第17章のサーバは、どの URL を開いても同じハンドラが呼ばれました。実際のアプリでは、`GET /api/tasks` なら一覧、`DELETE /api/tasks/3` なら3番を消す、というように、**メソッドとパスで呼ぶ関数を選びます**。これをルーティングと言います。
この章では、ルーティングを自分で作ります。作りながら、`req.url` をどう分解するか、あてはまらないときに何を返すか（404 か 405 か）、どのルートを優先するか、そして**パスの書き方を変えるだけで、チェックをすり抜けられてしまう**問題を確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第17章（`createApp`・`HttpError`・`send.mjs`）、第2部 第9章（URL の各部分）、第10章5節（REST の慣習、405 と Allow） |
| この章のゴール | `req.url` を `URL` で安全に分解できる / `/users/:id` のようなパターンを自分で照らし合わせられる / 404・405・HEAD・OPTIONS を正しく返せる / どのルートを優先するかを決められる / 生の `req.url` で権限を調べると危ない理由を説明できる / クエリの値を確かめて 400 を返せる / ミドルウェアの考え方を説明できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | if 文のルーティング、URL の分解、簡単な Router、URLPattern、ミドルウェア |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答（問題3の `router.mjs` は、第19章からも使います） |

> この章のサンプルと練習問題は、第17章の模範解答（`createApp`・`HttpError`・`sendJson` など）を `import` して使います。外部のパッケージは使わないので、`npm install` は不要です。

---

## 1. Flask のルーティングは何をしていたか

Flask では、関数の上に `@app.route` を書きました。

```python
@app.route('/api/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    ...
```

`@app.route(...)` は「デコレータ」という Python の書き方で、ここでは「この URL の規則と、この関数を組にして、Flask の表に登録する」という意味です。Flask は、アプリを起動するときにこの表を作っておき、リクエストが来るたびに次のことをしています。

1. リクエストのパス（`/api/tasks/3`）を、表の規則と照らし合わせる
2. `<int:task_id>` の部分を取り出し、整数に変えて、関数の引数 `task_id` に渡す（`abc` のように整数でなければ、その規則にはあてはまらない）
3. パスにあてはまる規則はあるが、メソッドが `methods` に無ければ、**405 Method Not Allowed** を返す。どの規則にもあてはまらなければ **404**
4. HEAD は GET と同じ関数で、OPTIONS は自動で答える

この章で作る Router は、これと同じことをします。作ってみると、1〜4 のそれぞれに、気をつけることがあると分かります。

## 2. if 文を並べる

いちばん素直なのは、if 文を並べる書き方です（[samples/if-router.mjs](samples/if-router.mjs)）。

```js
const { pathname } = new URL(`http://localhost${req.url}`);

if (req.method === 'GET' && pathname === '/api/tasks') {
  return sendJson(res, 200, tasks);
}
const m = /^\/api\/tasks\/(\d+)$/.exec(pathname);
if (req.method === 'GET' && m) {
  ...
}
return sendJson(res, 404, { error: 'ありません' });
```

ルートが3つや4つなら、これで十分です。第2部 第10章のサンプルもこの形でした。ただ、ルートが増えると、次のことが起きます。

- `DELETE /api/tasks/1` のように「パスはあるが、メソッドが違う」ものも、最後の 404 に落ちる。正しくは 405 と `Allow` ヘッダ
- 正規表現の `^` や `$` を1つ忘れると、`/api/tasks/1/comments` が「タスク 1」になる
- どこかで `return` を忘れると、2回返そうとする（第17章4.2節）
- `/api/tasks/me` と `/api/tasks/:id` のように重なるルートは、if 文の順番で決まる。並べ替えると、動きが変わる

そこで、「メソッド・パターン・ハンドラ」の組を表にして、表を引く部品（Router）を1つ作ります。その前に、引く対象の `req.url` をきちんと分解する方法を確かめます。

## 3. `req.url` を分解する

### 3.1 URL で読む

`req.url` は、リクエストの1行目のパスとクエリの部分が、そのまま文字列で入っています（第17章2節）。分解には、組み込みの `URL` を使います。

```sh
$ node samples/url-parts.mjs
--- new URL(req.url, base) と new URL(base + req.url)
"/users/42?tab=posts#top"
  URL(req.url, base): host=localhost pathname=/users/42 search=?tab=posts
"/a/b/../c/./d"
  URL(req.url, base): host=localhost pathname=/a/c/d search=
"/%2e%2e/%2e%2e/etc/passwd"
  URL(req.url, base): host=localhost pathname=/etc/passwd search=
"/files/a%2Fb.txt"
  URL(req.url, base): host=localhost pathname=/files/a%2Fb.txt search=
"//evil.example/admin"
  URL(req.url, base): host=evil.example pathname=/admin search=
  URL(base + req.url): host=localhost pathname=//evil.example/admin search=   ← 違う
...
```

- `pathname` はパスだけ、`search` は `?` から後ろ、`searchParams` はクエリを読む道具です
- `..` と `.`（`%2e%2e` と書いても同じ）は、URL の決まりにしたがって**取り除かれます**。`/a/b/../c` は `/a/c` です
- `%xx` の形のまま残ります。`%2F`（`/` そのもの）も、区切りの `/` とは別のものとして残ります

### 3.2 `//` で始まる `req.url` に気をつける

第17章では `new URL(req.url, 'http://localhost')` と書きましたが、これには落とし穴があります。`req.url` が `//evil.example/admin` のように `//` で始まると、`URL` はこれを「**別のホスト**の `/admin`」と読みます（スキーム相対 URL。第2部 第9章）。結果の `pathname` は `/admin` になり、元の `req.url` とは違うパスに見えます。

ブラウザはこんな URL を送りませんが、`curl --path-as-is` や自分で書いたプログラムなら、どんなバイト列でも送れます。Node.js のサーバは、`//evil.example/admin` も `http://other.example/p` も `*` も、そのまま `req.url` に入れて渡してきます（Node 26 で確かめた動き）。

この教材では、次のように読みます。

```js
if (!req.url.startsWith('/')) throw new HttpError(400, 'リクエストの対象が正しくありません');
const url = new URL(`http://localhost${req.url}`); // 文字列をつないでから読む
// "//evil.example/admin" → pathname は "//evil.example/admin" のまま。どのルートにもあてはまらない
```

### 3.3 チェックと選ぶ処理で、違う文字列を見てはいけない

3.1・3.2 節から、**同じパスにも、いろいろな書き方がある**ことが分かりました。`/admin/stats`・`/./admin/stats`・`/x/../admin/stats` は、どれも `pathname` が `/admin/stats` になります。

ここで、権限のチェックを生の `req.url` で、ルートを選ぶのを `pathname` で、と別々の文字列で行うと、チェックだけをすり抜けられます。

```js
if (req.url.startsWith('/admin') && !isAdmin(req)) return sendJson(res, 403, ...); // 生の文字列でチェック
const { pathname } = new URL(req.url, 'http://localhost');                        // 直した文字列で選ぶ
if (pathname === '/admin/stats') ...                                               // /./admin/stats でもここに来る
```

`/./admin/stats` は `/admin` で始まらないのでチェックを通り抜け、`pathname` は `/admin/stats` なので管理用のページが返ります。練習問題4で、自分の Mac の中で動かしたサーバで確かめます。

守ることは1つです。**チェックも、ルートを選ぶのも、同じ1つの「直した後のパス」で行う。** いちばん確かなのは、チェックを「選ばれたルート」に付けることです（練習問題4の解答の `requireAdmin`）。第19章のパストラバーサル、第10部のアクセス制御でも、同じ考え方が出てきます。

### 3.4 クエリの読み方の注意

```
get('q')       → "a b"（最初の1つ）
getAll('q')    → ["a b","あ"]
get('page')    → ""（= はあるが値が空）
get('nothing') → null（そもそも無い）
Number('')     → 0（空の文字列は 0 になってしまう）
Object.fromEntries → {"q":"あ","page":"","empty":""}（同じキーは最後の1つだけ残る）
```

- クエリの `+` は空白です（`a+b` → `a b`）。**パスの `+` は `+` のまま**です。`decodeURIComponent('a+b')` は `a+b` です
- 同じキーは何回でも来ます。`get` は最初の1つ、`getAll` は全部です
- 値はいつも文字列です。`Number(searchParams.get('page'))` は、`?page=` で `0`、`?page=abc` で `NaN`、`?page=1e3` で `1000` になります。Flask の `request.args.get('page', type=int)` は、整数にできないときに既定の値を返してくれますが、Node.js では自分で確かめます（9節、練習問題5）

### 3.5 `%xx` を戻す

`decodeURIComponent('caf%C3%A9')` は `café` です。ただし、`%E0%A4%A` のように形が壊れていると **URIError** を投げます。ハンドラの中で捕まえなければ、第17章5節のとおりサーバが落ちます（`createApp` で包んでいれば 500）。客の送ったものが悪いので、本当は **400** です。

また、**先に `/` で分けてから、セグメントごとに戻します。** 先に全体を戻すと、`/files/a%2Fb.txt` が `/files/a/b.txt` になり、1つのセグメントだったものが2つに見えてしまいます。

## 4. ルートの表を作る

[samples/router.mjs](samples/router.mjs) の `SimpleRouter` は、パターンを正規表現に変えて、登録した順に試します。

```js
// "/users/:id" → { regex: /^\/users\/([^/]+)$/, keys: ['id'] }
export function compile(pattern) {
  const keys = [];
  const source = pattern
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) {
        keys.push(seg.slice(1));
        return '([^/]+)'; // / 以外の 1 文字以上 = 1つのセグメント
      }
      return escapeRegExp(seg); // "v1.0" の "." を、ただの文字にする
    })
    .join('/');
  return { regex: new RegExp(`^${source}$`), keys };
}
```

正規表現に変えるときのポイントは3つです。

- **`^` と `$` で、全体があてはまることを求める**（2節の `/api/tasks/1/comments` の問題）
- **パラメータは `[^/]+`**。`.+` にすると `/` もまたいでしまい、`/users/1/2` が `id = "1/2"` になる
- **パターンの文字はエスケープする**。`/v1.0/items` の `.` は、正規表現では「何でも1文字」なので、`/v1x0/items` にもあてはまってしまう

```sh
$ node samples/router-demo.mjs
$ curl -i -X PUT http://127.0.0.1:9181/api/tasks/1
HTTP/1.1 405 Method Not Allowed
Content-Type: application/json; charset=utf-8
Allow: GET, DELETE
...
{"error":"このメソッドは使えません","requestId":"ccd9a8bc-..."}
```

ハンドラが投げた `HttpError` は、第17章の `createApp` が JSON にして返します。Router は「選ぶ」ことだけをして、「返す」ことと「失敗を 500 にする」ことは、ほかの部品にまかせています。部品ごとに仕事を分けると、それぞれを小さく保てて、テストも書きやすくなります。

## 5. 404 と 405、HEAD と OPTIONS

| 状況 | 返すもの |
| --- | --- |
| どのルートのパスにもあてはまらない | 404 Not Found |
| パスにあてはまるルートはあるが、メソッドが違う | 405 Method Not Allowed と、使えるメソッドを並べた `Allow` ヘッダ |
| HEAD で、HEAD のルートは無いが GET のルートがある | GET のハンドラで答える。本文は Node.js が捨てる（第17章4.3節） |
| OPTIONS で、OPTIONS のルートは無いが、パスにあてはまるルートがある | 204 と `Allow` |

405 と `Allow` は、第2部 第10章5節で見た REST の慣習です。404 と 405 を区別すると、API を使う人は「URL を間違えた」のか「メソッドを間違えた」のかがすぐ分かります。

> OPTIONS は、ブラウザが CORS のプリフライト（第2部 第9章5節）で送ってくるメソッドでもあります。CORS のプリフライトに答えるには `Access-Control-Allow-*` のヘッダも必要なので、それは別の部品で扱います（第5部）。

## 6. どのルートを選ぶか

`/api/tasks/me`（自分のタスク）と `/api/tasks/:id` の両方を登録すると、`/api/tasks/me` はどちらにもあてはまります。選び方は2つあります。

| 選び方 | 例 | 良いところ | 困るところ |
| --- | --- | --- | --- |
| 登録した順 | `SimpleRouter`、Express（第5部） | 決まりが単純 | 書く順番を間違えると、`me` が `:id` に食われる。ファイルを分けると順番が分かりにくい |
| 具体的な順 | 練習問題3の `Router` | 書く順番を気にしなくてよい | 「具体的」の決まりを覚える必要がある |

練習問題3の決まりは、「前のセグメントから比べて、**静的な文字 → パラメータ → `*`** の順に優先する」です。Flask（中で使っている Werkzeug というライブラリ）も、静的な部分が多い規則を先に試すように並べ替えています。どちらにしても、「重なるルートを作ったら、両方のテストを書く」ことが大事です。

## 7. 最後の `/` とリダイレクト

`/api/tasks` と `/api/tasks/` は、別の URL です。どちらか一方だけにルートを作り、もう一方で来たら **308 Permanent Redirect** で正しい方へ案内すると、使う人が迷いません。308 は、301 と違い、メソッドとボディを変えずにもう一度送らせるリダイレクトです（第2部 第7章）。POST でも POST のまま送り直されます。

Flask も同じような動きをします。`@app.route('/projects/')` のように最後に `/` を付けた規則に `/projects` で来ると、`/projects/` へリダイレクトします。逆に、`/about` の規則に `/about/` で来ると 404 です。

> リダイレクトの `Location` に、客の送ったパスを使うときは注意が要ります。`//evil.example/` から最後の `/` を取った `//evil.example` を `Location` に入れると、ブラウザは **evil.example という別のサイト**へ移ります（オープンリダイレクト。第2部 第9章の `safeRedirectPath()`）。練習問題3の Router は、`//` で始まる案内先を作りません。

## 8. 組み込みの URLPattern

Node.js には、ブラウザと同じ決まりのパターン `URLPattern` が組み込まれていて、`import` せずに使えます（Node 26 で確かめた）。

```sh
$ node samples/urlpattern-demo.mjs
new URLPattern({ pathname: '/users/:id' })
  /users/42      → {"id":"42"}
  /users/42/     → null
  /users         → null
  /users/a%2Fb   → {"id":"a%2Fb"}
new URLPattern({ pathname: '/tasks/:id(\\d+)' })
  /tasks/7       → true
  /tasks/abc     → false
...
/tags/%E6%97%A5%E6%9C%AC → {"name":"%E6%97%A5%E6%9C%AC"} → decodeURIComponent で 日本
```

`:id(\\d+)` のように、パラメータの形を正規表現で絞れるのが便利です。ただし、取り出した値は `%xx` のままなので、自分で `decodeURIComponent` します（壊れていれば URIError）。また、URLPattern が教えてくれるのは「1つのパターンにあてはまるか」だけです。404 と 405 の区別、優先順位、HEAD は、やはり Router の仕事です。この章では仕組みを知るために自分で照らし合わせを書きますが、実際のアプリで URLPattern を使うのも良い選択です。

## 9. クエリの値を確かめる

`GET /api/tasks?page=2&sort=old&tag=js&tag=node` のようなクエリは、使う前に形を確かめます。

```js
const q = parseQuery(req.query, {
  page: { type: 'int', default: 1, min: 1, max: 1000 },
  sort: { type: 'enum', values: ['new', 'old'], default: 'new' },
  tag: { type: 'string', multiple: true, maxLength: 30 },
});
// q = { page: 2, sort: 'old', tag: ['js', 'node'] }
// ?page=abc なら、400 と「page は整数で指定してください」
```

確かめないで使うと、`?page=abc` で `NaN` ページ目を探したり、`?page=99999999` でとても大きな配列を作ったり、`?sort=` に知らない値が来たりします。間違いは 400 で、**何が間違っていたかを全部まとめて**返すと、使う人が1回で直せます。この `parseQuery` を作るのが練習問題5です。第5部では、同じことを zod などのライブラリで、ボディにも使います。

## 10. ミドルウェア

アクセスログ、ヘッダの追加、ログインしているかの確認のように、**多くのルートに共通の処理**があります。それぞれのハンドラに書くかわりに、ハンドラの前後にはさむ関数を作ります。これを**ミドルウェア**と呼びます。

```js
// ミドルウェアは (req, res, next) を受け取る。next() を呼ぶと、次のミドルウェア（最後はハンドラ）が動く
const timing = async (req, res, next) => {
  const start = performance.now();
  await next(); // 後ろが全部終わるまで待つ
  console.log(`${req.method} ${req.url} ${res.statusCode} ${(performance.now() - start).toFixed(1)}ms`);
};

const auth = (req, res, next) => {
  if (req.pathname !== '/private' && !req.pathname.startsWith('/private/')) return next();
  if (req.headers.authorization !== 'Bearer demo') {
    sendJson(res, 401, { error: 'ログインが必要です' }); // next を呼ばない = ここで終わり
    return;
  }
  req.user = 'demo';
  return next();
};
```

```sh
$ node samples/middleware-demo.mjs
$ curl -i http://127.0.0.1:9182/private                          # 401
$ curl -H 'Authorization: Bearer demo' http://127.0.0.1:9182/private
demo さんの秘密のページ
```

`await next()` の前に書いたことはハンドラの前に、後に書いたことはハンドラの後に動きます。玉ねぎの皮のように、外側のミドルウェアが内側を包む形です。`next()` を呼ばなければ、そこで終わりです。

Flask では、`@app.before_request` を付けた関数がハンドラの前に、`@app.after_request` を付けた関数がハンドラの後に呼ばれます。Node.js のミドルウェアは、この2つを1つの関数で書けます。第5部の Express は、このミドルウェアを中心にした作りです。練習問題6で、ミドルウェアをつなぐ `compose` を作ります。

## 11. Flask との対応

| やりたいこと | Flask | この章 |
| --- | --- | --- |
| ルートを登録する | `@app.route('/tasks', methods=['GET'])` | `router.get('/tasks', handler)` |
| パラメータ | `<task_id>`、`<int:task_id>` | `:id`（文字列。数かどうかはハンドラで確かめる）、URLPattern の `:id(\\d+)` |
| 残り全部 | `<path:rest>` | `*` |
| クエリ | `request.args.get('q')`、`request.args.getlist('tag')` | `req.query.get('q')`、`req.query.getAll('tag')` |
| 型を付けて読む | `request.args.get('page', 1, type=int)` | `parseQuery`（練習問題5） |
| 405 と Allow | Flask がしてくれる | Router がする（練習問題3） |
| 最後の `/` | 規則に `/` があれば、無い方からリダイレクト | 308 で案内する（練習問題3） |
| ハンドラの前後の処理 | `@app.before_request`・`@app.after_request` | ミドルウェアと `compose`（練習問題6） |
| ルートを分ける | Blueprint | Router を複数作って、つなぐ（第5部の Express の Router） |

## まとめ

- `req.url` は、`/` で始まることを確かめてから、`new URL('http://localhost' + req.url)` で読む。`//` で始まると、別のホストとして読まれてしまう。
- `.` と `..` は URL が取り除く。`%xx` は、`/` で分けてからセグメントごとに戻す。壊れた `%xx` は 400。
- 権限のチェックとルートの選択は、同じ「直した後のパス」で行う。いちばん確かなのは、選ばれたルートにチェックを付けること。
- パターンを正規表現にするなら、`^`・`$`、`[^/]+`、エスケープ。
- パスが無ければ 404。パスはあるがメソッドが違えば 405 と `Allow`。HEAD は GET で答え、OPTIONS は `Allow` を返す。
- 重なるルートは、登録順か具体的な順で選ぶ。どちらにしても両方のテストを書く。
- クエリの値は文字列。形を確かめ、間違いはまとめて 400 で返す。
- 共通の処理は、ハンドラの前後にはさむミドルウェアにする。

## 練習問題

[exercises/README.md](exercises/README.md) に6問あります。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- MDN「URL」: https://developer.mozilla.org/ja/docs/Web/API/URL
- MDN「URLSearchParams」: https://developer.mozilla.org/ja/docs/Web/API/URLSearchParams
- MDN「URLPattern」: https://developer.mozilla.org/en-US/docs/Web/API/URLPattern
- MDN「405 Method Not Allowed」: https://developer.mozilla.org/ja/docs/Web/HTTP/Status/405
- MDN「308 Permanent Redirect」: https://developer.mozilla.org/ja/docs/Web/HTTP/Status/308
- WHATWG「URL Standard」（`.` と `..` の扱い）: https://url.spec.whatwg.org/
- RFC 3986「URI Generic Syntax」5.2.4 節（Remove Dot Segments）: https://www.rfc-editor.org/rfc/rfc3986#section-5.2.4
- OWASP「Path Traversal」: https://owasp.org/www-community/attacks/Path_Traversal
- Flask「Quickstart: Routing」「Unique URLs / Redirection Behavior」: https://flask.palletsprojects.com/en/stable/quickstart/#routing

前の章: [第17章 node:http で最小のサーバ](../ch17-minimal-server/README.md) ／ 次の章: [第19章 静的ファイル配信](../ch19-static-files/README.md)
