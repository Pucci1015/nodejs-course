# 第18章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- |
| 1 | URL と URLSearchParams の結果を予想する | [predict-url.mjs](predict-url.mjs) | 3 | — |
| 2 | パターンの照らし合わせ `matchPath` と優先順位 | [pattern.mjs](pattern.mjs)、[pattern.test.mjs](pattern.test.mjs) | 3.5, 4, 6 | — |
| 3 | Router（404・405・HEAD・OPTIONS・優先順位・最後の `/`） | [router.mjs](router.mjs)、[router.test.mjs](router.test.mjs) | 3, 5, 6, 7 | 空いている番号 |
| 4 | if 文のタスク API のバグを直す（管理用のページのすり抜けも） | [buggy-tasks.mjs](buggy-tasks.mjs)、[check-tasks.sh](check-tasks.sh) | 2, 3.3 | 9184 |
| 5 | クエリを決めた形で読む `parseQuery` | [query.mjs](query.mjs)、[query.test.mjs](query.test.mjs) | 3.4, 9 | — |
| 6 | ミドルウェアをつなぐ `compose` | [compose.mjs](compose.mjs)、[compose.test.mjs](compose.test.mjs) | 10 | — |

- 問題2・3・5・6は `node --test ○○.test.mjs` ですべてのテストが通れば完成です
- 問題3は、問題2の `pattern.mjs` を使います。問題2を先に解いてください
- 問題4は `bash check-tasks.sh` で確かめます。サーバの起動と停止は、確認スクリプトがします

---

## 問題1 URL と URLSearchParams の結果を予想する

[predict-url.mjs](predict-url.mjs) に 15 個の式があります。**実行する前に**結果を予想して書き出してから、`node predict-url.mjs` で確かめてください。

特に、次の3つは理由を説明してください。

- 3番と4番: どちらも `a+b` に見える値が、違う結果になるのはなぜか
- 9番と10番: `..` や `%2e%2e` が消えるのは、誰がしているのか。第19章で「公開するフォルダ」の中のファイルを返すときに、これで安全になったと言えるか（ヒント: パスの中の `%2F` や、`\` はどうなるか）
- 13〜15番: `//evil.example/admin` を `new URL(t, base)` で読むと、何が起きているのか

## 問題2 パターンの照らし合わせ

[pattern.mjs](pattern.mjs) に3つの関数を作ってください。問題3の Router の部品です。

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

## 問題3 Router

[router.mjs](router.mjs) の `Router` の `handle` を完成させてください。`router.get('/users/:id', (req, res, params) => ...)` のように登録し、`createApp(router.handle)` でサーバにします。

仕様:

1. `req.url` が `/` で始まらなければ、`HttpError(400)` を投げる。`new URL('http://localhost' + req.url)` で読み、`req.pathname`（`pathname`）と `req.query`（`searchParams`）に入れる
2. ルートは、**登録した順ではなく、具体的な順**（問題2の `comparePatterns`）に試す。同じ具体さなら登録順
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

## 問題4 if 文のタスク API のバグを直す

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

直し方は自由です。if 文のまま直してもよいし、問題3の Router で書き直してもかまいません（模範解答は Router で書き直しています）。

**管理用のページの確かめ方について**: 確認スクリプトの 18・19 は、`curl --path-as-is` で `/./admin/stats` と `//x/admin/stats` を送り、トークンが無いのに管理用のページが返ってしまわないかを確かめます。本文3.3節の「チェックと選ぶ処理で違う文字列を見ている」問題です。このような確かめ方は、**自分の Mac の中で動かしている、自分のサーバ**だけに使ってください。

`dev-only-token` は練習用の決まった値です。本物のアプリでは、トークンをコードに書かず、比べ方にも気をつけます（第10部）。

## 問題5 クエリを決めた形で読む

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

## 問題6 ミドルウェアをつなぐ compose

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
