# 第18章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 内容 |
| --- | --- |
| [pattern.mjs](pattern.mjs) | 問題2: `parsePattern`・`matchPath`・`comparePatterns` |
| [router.mjs](router.mjs) | 問題3: `Router`（第19章からも使います） |
| [tasks.mjs](tasks.mjs) | 問題4: タスクの API を Router で書き直したもの |
| [query.mjs](query.mjs) | 問題5: `parseQuery` と `QueryError` |
| [compose.mjs](compose.mjs) | 問題6: `compose` |

模範解答は、`exercises` フォルダで次のように確かめられます。

```sh
$ cd ../exercises
$ MODULE=../solutions/pattern.mjs node --test pattern.test.mjs
$ MODULE=../solutions/router.mjs node --test router.test.mjs
$ bash check-tasks.sh ../solutions/tasks.mjs
$ MODULE=../solutions/query.mjs node --test query.test.mjs
$ MODULE=../solutions/compose.mjs node --test compose.test.mjs
```

---

## 問題1 URL と URLSearchParams の結果を予想する

```
$ node predict-url.mjs
 1: "/users/42"
 2: "?tab=posts"
 3: "a b"
 4: "a+b"
 5: "js"
 6: ["js","node"]
 7: ""
 8: null
 9: "/a/c/d"
10: "/etc/passwd"
11: "/files/a%2Fb"
12: "/%E6%97%A5%E6%9C%AC%E8%AA%9E"
13: "/admin"
14: "evil.example"
15: "//evil.example/admin"
```

- **3番と4番**: クエリ（`application/x-www-form-urlencoded` の決まり）では、`+` は空白です。本当の `+` を送りたいときは `%2B` と書きます。HTML のフォームを送ったときも同じ決まりで、第20章でもう一度出てきます
- **9番と10番**: `URL` が、URL の決まり（WHATWG URL Standard）にしたがって `.` と `..` を取り除いています。`%2e` も `.` と同じに扱われます。ただし、これで「公開するフォルダの外に出られない」とは言えません。`/files/..%2F..%2Fetc` の `%2F` は区切りではないので取り除かれず、`pathname` は `/files/..%2F..%2Fetc` のまま残ります。これを `decodeURIComponent` すると `../../etc` になります。第19章では、**戻した後の値**でフォルダの外を指していないかを確かめます
- **13〜15番**: `//evil.example/admin` は「スキームは同じで、ホストは evil.example」という URL（スキーム相対 URL）として読まれました。`pathname` だけを見ると `/admin` で、元の文字列と違います。文字列をつないでから読む（15番）と、`//evil.example/admin` という、どのルートにもあてはまらないパスのままになります

## 問題2 パターンの照らし合わせ

[pattern.mjs](pattern.mjs) は、正規表現を使わず、セグメントごとに比べる形にしました。

```js
const parts = pathname === '/' ? [] : pathname.slice(1).split('/');
for (let i = 0; i < segments.length; i++) {
  ...
  const value = decodeURIComponent(part); // 分けてから戻す
  if (seg.type === 'static') { if (value !== seg.value) return null; }
  else params[seg.name] = value;
}
return parts.length === segments.length ? params : null;
```

最初に入っていた正規表現の書き方の、まちがいは次のとおりです。

| まちがい | 何が起きるか |
| --- | --- |
| パターンの文字をエスケープしていない | `/v1.0/items` が `/v1x0/items` にもあてはまる。`/a+b` は「a が1回以上と b」になる |
| パラメータが `(.+)` | `/` もまたぐので、`/users/1/2` が `id = "1/2"` になる |
| 全体を先に `decodeURIComponent` している | `%2F` が区切りの `/` に見える。`/tags/a%2Fb` に `/tags/:a/:b` があてはまってしまう |
| `params = {}` | パラメータの名前が `__proto__` だと、値が入らない（ふつうのオブジェクトでは、`__proto__` への代入は特別な意味を持つ） |

セグメントごとに比べる書き方なら、エスケープも `[^/]+` も要りません。本文4節の `SimpleRouter` のように正規表現に変える書き方も、まちがいを直せば正しく動きます。どちらを選んでもかまいません。

`comparePatterns` は、セグメントの種類に `static: 0`・`param: 1`・`rest: 2` の点を付けて、前から比べています。

## 問題3 Router

[router.mjs](router.mjs) のポイント:

- **`handle` をアロー関数のフィールドにした。** `createApp(router.handle)` と渡しても `this` が失われません（第3部 第11章の `this`）
- ルートを登録するたびに `comparePatterns` で並べ替える。`Array.prototype.sort` は安定なので、同じ具体さなら登録順のまま
- まず、パスがあてはまるルートを**メソッドに関係なく全部**集める。そこから、メソッドが同じものを選ぶ。1つも無ければ、集めたもののメソッドで `Allow` を作る。こうすると、`GET /users/me` と `DELETE /users/:id` を登録したとき、`DELETE /users/me` は `/users/:id` の DELETE に届きます（テストの「同じパスでも、メソッドで選ぶ」）
- 308 の案内先が `//` で始まるときは作らない。`matchPath` は空のセグメントにあてはまらないので、`//evil.example` があてはまるルートはそもそもありませんが、オープンリダイレクトは危ないので、はっきり書いておきます

第5部の Express では、`app.get(...)` が同じ役目です。ただし Express は登録した順に試し、405 は自動では返しません（第5部で確かめます）。

## 問題4 タスクの API のバグ

| 失敗していた確認 | 原因 | 直し方 |
| --- | --- | --- |
| 2・3 | `req.url === '/api/tasks'` は、クエリが付くと一致しない | `pathname` で比べる（Router がする） |
| 4 | `req.method === 'GET'` だけなので、HEAD が 404 | HEAD は GET で答える（Router がする） |
| 5・6 | 最後の `/` が付くと 404 | 308 で案内する（Router がする） |
| 8・9 | 正規表現に `^` と `$` が無い | パターンで書く |
| 10・11 | DELETE 以外のメソッドが全部 GET として扱われる | メソッドごとにルートを登録する。違えば 405 と `Allow` |
| 14・15 | `decodeURIComponent` の URIError でプロセスが終わる | Router が 400 にする。ハンドラ全体は `createApp` で包む |
| 18・19 | 権限のチェックは生の `req.url`、ルートの選択は `pathname` で、別の文字列を見ている | チェックを、選ばれたルートに付ける（`requireAdmin`） |

18・19 の直し方が大事です。`req.url.startsWith('/admin')` を `pathname.startsWith('/admin')` に変えるだけでも、この2つの確認は通ります。ただ、`/administrator` も `/admin` で始まる、`/Admin` は別のパスになる、など、文字列で調べる限り、新しい書き方が見つかるたびに直すことになります。**「このルートを動かすには、このチェックが要る」と、ルートそのものにチェックを付ける**と、パスの書き方に関係なく、そのハンドラが動く前には必ずチェックが通ります。

## 問題5 クエリを決めた形で読む

[query.mjs](query.mjs) のポイント:

- 整数は `/^-?\d+$/` で形を確かめてから `Number` にする。`Number('')` は `0`、`Number(' 3')` は `3`、`Number('1e3')` は `1000`、`Number('0x10')` は `16` です。`Number.isSafeInteger` で、大きすぎて正確に表せない数も断ります
- 最初に入っていた `Number(raw) || rule.default` は、`?page=abc`（`NaN`）でも `?page=0`（`0`）でも既定の `1` になります。`0` は「間違い」として 400 にしたいのに、黙って `1` にしてしまうので、使う人は間違いに気付けません
- `Boolean('false')` は `true` です（空でない文字列は全部 `true`。第3部 第11章）
- 間違いは配列に集めて、最後に1回だけ投げる

## 問題6 compose

[compose.mjs](compose.mjs) は、Koa というフレームワークの koa-compose と同じ形です。

```js
async function dispatch(i) {
  if (i <= called) throw new Error('next() が2回呼ばれました');
  called = i;
  const fn = i === middlewares.length ? last : middlewares[i];
  if (!fn) return;
  await fn(req, res, () => dispatch(i + 1));
}
return dispatch(0);
```

- `next` は `() => dispatch(i + 1)`。`dispatch` は async 関数なので、後ろが全部終わってから解決される Promise を返します
- `dispatch` が async 関数なので、ミドルウェアが同期で `throw` しても、rejected の Promise になります
- `called` は、`composed` を呼ぶたびに新しく作ります。`compose` の外に置くと、同時に2つのリクエストを処理したときに、お互いの番号が混ざってしまいます（テストの「同時に使える」）

**仕様 6 が無いと**: ミドルウェアのまちがいで `next()` を2回呼ぶと、後ろのハンドラが2回動き、2回目の `res.end` が `ERR_STREAM_WRITE_AFTER_END` になります（第17章4.2節）。データを追加するハンドラなら、2件追加されます。早く、はっきり失敗させる方が、原因を見つけやすくなります。

第5部の Express のミドルウェアも `(req, res, next)` ですが、Express の `next` は、後ろが終わるのを待つための Promise を返しません。そのため、`await next()` の後に「ハンドラが終わった後の処理」を書く、という使い方はできません（アクセスログは `res.on('finish')` などで書きます）。違いは第5部で確かめます。
