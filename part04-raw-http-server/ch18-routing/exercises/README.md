# 第18章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part04/ch18-routing/exercises/` で行います。最初に `cd exercises` で移動してください（`cd ~/dev/part04/ch18-routing/exercises` と打っても構いません）。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- | --- |
| 1 | 基本 | パスをセグメントに分けて `%xx` を戻す | [split-path.mjs](split-path.mjs)、[split-path.test.mjs](split-path.test.mjs) | 3.5 | — |
| 2 | 基本 | ルートの表を引く `findRoute`（404・405・HEAD） | [find-route.mjs](find-route.mjs)、[find-route.test.mjs](find-route.test.mjs) | 4, 5 | — |
| 3 | 基本 | クエリの `page` と `sort` を確かめて読む | [read-query.mjs](read-query.mjs)、[read-query.test.mjs](read-query.test.mjs) | 3.4, 9 | — |
| 4 | 基本 | URL と URLSearchParams の結果を予想する（調べる問題） | [predict-url.mjs](predict-url.mjs) | 3 | — |
| 5 | 応用 | パターンの照らし合わせ `matchPath` と優先順位 | [pattern.mjs](pattern.mjs)、[pattern.test.mjs](pattern.test.mjs) | 3.5, 4, 6 | — |
| 6 | 応用 | Router（404・405・HEAD・OPTIONS・優先順位・最後の `/`） | [router.mjs](router.mjs)、[router.test.mjs](router.test.mjs) | 3, 5, 6, 7 | 空いている番号 |
| 7 | 応用 | クエリを決めた形で読む `parseQuery` | [query.mjs](query.mjs)、[query.test.mjs](query.test.mjs) | 3.4, 9 | — |
| 8 | 発展 | ミドルウェアをつなぐ `compose` | [compose.mjs](compose.mjs)、[compose.test.mjs](compose.test.mjs) | 10 | — |
| 9 | 発展 | if 文のタスク API のバグを直す（管理用のページのすり抜けも） | [buggy-tasks.mjs](buggy-tasks.mjs)、[check-tasks.sh](check-tasks.sh) | 2, 3.3 | 9184 |

**発展**（8・9）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

- 問題1〜3・5〜8: `○○.mjs` の「ここを書く」を埋め、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。
- 問題6は、問題5の `pattern.mjs` を使います。問題5を先に解いてください。
- 問題9は `bash check-tasks.sh` で確かめます。サーバの起動と停止は、確認スクリプトがします。

---

## 基本

### 問題1 パスをセグメントに分けて `%xx` を戻す

[split-path.mjs](split-path.mjs) に、URL のパス（`pathname`）を `/` で分けて、それぞれの `%xx` を戻した配列を返す関数 `splitPath(pathname)` を作ってください。

| 入力 | 返す値 |
| --- | --- |
| `'/api/tasks/42'` | `['api', 'tasks', '42']` |
| `'/'` | `[]` |
| `'/users/42/'`・`'/a//b'` | `['users', '42']`・`['a', 'b']`（空の部分は入れない） |
| `'/tags/%E3%81%AD%E3%81%93'` | `['tags', 'ねこ']` |
| `'/files/a%2Fb.txt'` | `['files', 'a/b.txt']`（`%2F` は分けた後で戻すので、1つのまま） |
| `'/c/a+b'` | `['c', 'a+b']`（パスの `+` は `+` のまま） |
| `'/bad/%E0%A4%A'` | `null`（`%xx` の形が壊れている。例外は投げない） |

```sh
$ node --test split-path.test.mjs
ℹ pass 7
ℹ fail 0
```

ヒント:

- `pathname.split('/')` で分け、`for...of` で1つずつ見ます。空の文字列（`''`）は飛ばします（`continue`）。
- 戻すのは `decodeURIComponent(seg)` です（本文3.5節）。形が壊れていると `URIError` を投げるので、`try`/`catch` で受け止めて `return null;` にします。
- 先に全体を `decodeURIComponent` してから分けると、`%2F` が `/` になって2つに分かれてしまいます。

### 問題2 ルートの表を引く `findRoute`

本文4節の `routes-table.mjs` の「表を引く」部分を、関数にします。[find-route.mjs](find-route.mjs) に `findRoute(routes, method, pathname)` を作ってください。`routes` は `{ method, path, handler }` の配列です（`path` はパラメータの無い、決まった文字列）。

| 状況 | 返す値 |
| --- | --- |
| `method` と `path` があうルートがある | `{ status: 200, handler: そのルートのハンドラ }` |
| `method` が `HEAD` で、HEAD のルートは無いが GET のルートがある | `{ status: 200, handler: GET のハンドラ }` |
| `path` があうルートはあるが、メソッドが違う | `{ status: 405, allow: 'GET, HEAD, POST' }`（使えるメソッドを、アルファベット順に `, ` でつなぐ。GET があれば HEAD も入れる。同じものは1回だけ） |
| `path` があうルートが無い | `{ status: 404 }` |

```sh
$ node --test find-route.test.mjs
ℹ pass 7
ℹ fail 0
```

ヒント:

- まず `routes.filter((r) => r.path === pathname)` で、パスがあうルートだけを集めます。0個なら 404 です。
- その中から `find` でメソッドがあうものを探します。
- 重ならないように集めるには `new Set(配列)` が使えます。`set.add('HEAD')` で足し、`[...set].sort().join(', ')` で、並べた文字列にします。

### 問題3 クエリの `page` と `sort` を確かめて読む

一覧の API の `?page=2&sort=old` を、確かめてから使うための関数を [read-query.mjs](read-query.mjs) に作ってください（本文9節の `parseQuery` の小さな版です）。

- **`readPage(value)`**: `value` は `searchParams.get('page')` の値（文字列か `null`）。`null` なら `1`。1〜1000 の整数の形（`/^[1-9]\d*$/`）なら、その数。それ以外（`''`・`'0'`・`'1.5'`・`'abc'`・`'1e3'`・`' 3'`・`'007'`・`'1001'` など）は `null`
- **`readSort(value)`**: `null` なら `'new'`。`'new'` か `'old'` ならそのまま。それ以外は `null`
- **`readListQuery(searchParams)`**: 上の2つを使い、両方正しければ `{ ok: true, page, sort }`。間違いがあれば `{ ok: false, errors: [...] }`。`errors` には、間違っているものの文を**全部**入れる（`'page は 1〜1000 の整数で指定してください'`、`'sort は new か old で指定してください'` の順）

```sh
$ node --test read-query.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- `Number('')` は `0`、`Number('1e3')` は `1000` になってしまうので、先に正規表現で形を確かめてから `Number` にします（第16章と同じ考え方です）。
- `errors` は空の配列から始め、間違いを見つけるたびに `errors.push(文)` します。最後に `errors.length > 0` で分けます。

### 問題4 URL と URLSearchParams の結果を予想する（調べる問題）

[predict-url.mjs](predict-url.mjs) に 15 個の式があります。**実行する前に**結果を予想して書き出してから、`node predict-url.mjs` で確かめてください。

特に、次の3つは理由を説明してください。

- 3番と4番: どちらも `a+b` に見える値が、違う結果になるのはなぜか
- 9番と10番: `..` や `%2e%2e` が消えるのは、誰がしているのか。第19章で「公開するフォルダ」の中のファイルを返すときに、これで安全になったと言えるか（ヒント: パスの中の `%2F` や、`\` はどうなるか）
- 13〜15番: `//evil.example/admin` を `new URL(t, base)` で読むと、何が起きているのか

---

## 応用

### 問題5 パターンの照らし合わせ

[pattern.mjs](pattern.mjs) に3つの関数を作ってください。問題6の Router の部品です。

**パターンの書き方**

| 書き方 | あてはまるもの |
| --- | --- |
| `/users` | ふつうの文字（静的なセグメント）。完全に同じときだけ。大文字と小文字は区別する |
| `:名前` | 1つのセグメント（`/` を含まない、空でないもの）。名前は英字か `_` で始まり、英数字と `_` だけ |
| `*` | 最後にだけ書ける。残り全部（`/` を含んでよい。空でもよい）。パラメータの名前は `'*'` |

**`parsePattern(pattern)`**: パターンを `[{ type: 'static', value }, { type: 'param', name }, { type: 'rest' }]` の配列にする。`/` で始まらない、空のセグメントがある（`//` や最後の `/`。ただし `/` だけは空の配列）、`*` が最後でない、名前が正しくない、ときは `TypeError`。

**`matchPath(pattern, pathname)`**: `pattern` は文字列か、`parsePattern` の結果。`pathname` は URL の `pathname`（`%xx` のまま）。あてはまればパラメータのオブジェクト、あてはまらなければ `null` を返す。

- `/` で分けてから、セグメントごとに `decodeURIComponent` する。壊れた `%xx` なら `URIError` をそのまま投げる
- 静的なセグメントも、戻した値と比べる（`/café` のパターンは `/caf%C3%A9` にあてはまる）
- パターンの `.` や `+` は、ただの文字
- 空のセグメント（`/users//` など）には、`:名前` はあてはまらない
- `/files/*` は `/files/` と `/files/a/b` にあてはまり、`/files` にはあてはまらない
- パラメータの名前が `constructor` や `__proto__` でも、正しく値を入れられるようにする（ヒント: `Object.create(null)`）

**`comparePatterns(a, b)`**: `sort` に渡すと、具体的なパターンが先に並ぶ比べ方。前のセグメントから比べて「静的 → `:名前` → `*`」の順。最後まで同じなら、セグメントの多い方が先。

[pattern.mjs](pattern.mjs) の `matchPath` には、よく見る正規表現の書き方が入っています。いくつかのテストは通りますが、まちがいがあります。

```sh
$ node --test pattern.test.mjs
```

最初は 11 個のうち 7 個が失敗します。すべて通れば完成です。

### 問題6 Router

[router.mjs](router.mjs) の `Router` の `handle` を完成させてください。`router.get('/users/:id', (req, res, params) => ...)` のように登録し、`createApp(router.handle)` でサーバにします。

仕様:

1. `req.url` が `/` で始まらなければ、`HttpError(400)` を投げる。`new URL('http://localhost' + req.url)` で読み、`req.pathname`（`pathname`）と `req.query`（`searchParams`）に入れる
2. ルートは、**登録した順ではなく、具体的な順**（問題5の `comparePatterns`）に試す。同じ具体さなら登録順
3. メソッドが同じで、パスがあてはまるルートのうち、いちばん具体的なものを選び、`handler(req, res, params)` を `await` する。`req.params` にも `params` を入れる。ハンドラの失敗は、そのまま外に伝える（`createApp` が 500 にする）
4. HEAD で、HEAD のルートが無ければ、GET のルートを使う
5. パスがあてはまるルートはあるが、メソッドがどれとも違うときは `Allow` ヘッダを作る。あてはまったルートのメソッドに、GET があれば HEAD を、そして OPTIONS を足し、`GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS` の順に並べる
   - OPTIONS なら、204 と `Allow` を返す
   - それ以外は `HttpError(405, ..., { headers: { Allow } })` を投げる
6. どのルートにもあてはまらないとき、最後の `/` を付けた（または取った）パスがどれかにあてはまるなら、**308** で `Location: そのパス + クエリ` を返す。ただし、`//` で始まる案内先は作らない。それも無ければ `HttpError(404)`
7. 壊れた `%xx`（`URIError`）は `HttpError(400)`

```sh
$ node --test router.test.mjs
```

最初は 14 個のうち 10 個が失敗します。すべて通れば完成です。テストは、第17章の `createApp` と `send.mjs` の模範解答を使います。

### 問題7 クエリを決めた形で読む

[query.mjs](query.mjs) の `parseQuery(searchParams, schema, { strict })` を作ってください。

```js
parseQuery(req.query, {
  page: { type: 'int', default: 1, min: 1, max: 1000 },
  sort: { type: 'enum', values: ['new', 'old'], default: 'new' },
  done: { type: 'bool' },
  tag: { type: 'string', multiple: true, maxLength: 30 },
});
```

**スキーマの書き方**

| キー | 意味 |
| --- | --- |
| `type` | `'int'`（`-?` と数字だけ。安全な整数の範囲）・`'bool'`（`true`・`false`・`1`・`0`）・`'enum'`（`values` のどれか）・`'string'` |
| `default` | 無いときの値。`default` も無ければ、結果にそのキーを作らない（`multiple` なら空の配列） |
| `required` | `true` なら、無いときに間違い |
| `min`・`max` | `int` の範囲 |
| `maxLength` | `string` の最大の文字数（絵文字も1文字。ヒント: `[...s].length`） |
| `multiple` | `true` なら `getAll` で全部読んで配列にする。`false` なら、2つ以上あれば間違い |

- `?page=` のように値が空なのは「指定した」ことになる。`int` なら間違い
- 間違いは**全部集めてから**、`QueryError`（400 の `HttpError`。もう書いてあります）で投げる。`err.errors` は `[{ key, message }]`
- `strict: true` なら、スキーマに無いキーも間違いにする（`pgae=2` のような打ち間違いに気付ける）

```sh
$ node --test query.test.mjs
```

[query.mjs](query.mjs) には、よく見る書き方が入っていますが、テストは1つも通りません（10 個すべて失敗）。すべて通れば完成です。

考えてみてください: `Number(raw) || rule.default` は、どんな値で困るでしょう（`?page=0` と `?page=abc` を比べてください）。

---

## 発展

### 問題8 ミドルウェアをつなぐ compose

本文10節のミドルウェアを、何個でもつなげる `compose(...middlewares)` を [compose.mjs](compose.mjs) に作ってください。

```js
const app = compose(timing, poweredBy, auth);
await app(req, res, handler); // 最後に handler を呼ぶ
```

仕様:

1. 返り値は `(req, res, last?) => Promise`。ミドルウェアを前から順に `(req, res, next)` で呼ぶ
2. `next()` は Promise を返し、**後ろのミドルウェア（と `last`）が全部終わってから**解決される
3. `next()` を呼ばなければ、後ろは動かない
4. 最後のミドルウェアが `next()` を呼んだら `last(req, res)` を呼ぶ（`last` が無ければ何もしない）
5. ミドルウェアの失敗（同期の `throw` も）は、返り値の Promise の rejected になる。外側のミドルウェアは `try { await next() } catch` で受け取れる
6. 1つのミドルウェアの中で `next()` を2回呼んだら、`Error('next() が2回呼ばれました')` で失敗する
7. `compose` の結果を、別の `compose` の中でミドルウェアとして使える。同じ結果を、同時に何回呼んでもよい
8. 関数でないものを渡したら、`compose` を呼んだときに `TypeError`

```sh
$ node --test compose.test.mjs
```

[compose.mjs](compose.mjs) には、`next` を待たない書き方が入っています。最初は 11 個のうち 7 個が失敗します。すべて通れば完成です。

考えてみてください: 仕様の 6 が無いと、どんなことが起きるでしょう（ヒント: 2回目の `next()` で、ハンドラがもう一度動くと、レスポンスは？）。

### 問題9 if 文のタスク API のバグを直す

[buggy-tasks.mjs](buggy-tasks.mjs) は、if 文でルーティングしているタスクの API です。確認スクリプトを動かすと、21 個のうち 13 個が失敗します。

```sh
$ bash check-tasks.sh
```

| メソッドとパス | 返すもの |
| --- | --- |
| `GET /api/tasks` | 一覧。`?done=true`・`?done=false` で絞れる |
| `GET /api/tasks/:id` | 1件。無ければ 404 |
| `DELETE /api/tasks/:id` | 消して 204 |
| `GET /api/tags/:name` | そのタグが付いたタスクの一覧 |
| `GET /admin/stats` | 件数。`X-Admin-Token: dev-only-token` ヘッダが無ければ 403 |

あわせて、405 と `Allow`、HEAD、最後の `/` の 308、壊れた `%xx` の 400 も確かめます。

直し方は自由です。if 文のまま直してもよいし、問題6の Router で書き直してもかまいません（模範解答は Router で書き直しています）。

**管理用のページの確かめ方について**: 確認スクリプトの 18・19 は、`curl --path-as-is` で `/./admin/stats` と `//x/admin/stats` を送り、トークンが無いのに管理用のページが返ってしまわないかを確かめます。本文3.3節の「チェックと選ぶ処理で違う文字列を見ている」問題です。このような確かめ方は、**自分の Mac の中で動かしている、自分のサーバ**だけに使ってください。

`dev-only-token` は練習用の決まった値です。本物のアプリでは、トークンをコードに書かず、比べ方にも気をつけます（第10部）。
