# 第9章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 問題 | ポート |
| --- | --- | --- |
| [link-check.mjs](link-check.mjs) | 2 | — |
| [my-api-v2.mjs](my-api-v2.mjs) | 3 | 8311 |
| [origin.mjs](origin.mjs) | 6 | — |
| [cors-api-server.mjs](cors-api-server.mjs) | 7 | 8401 |
| [safe-redirect.mjs](safe-redirect.mjs) | 8（発展） | — |

模範解答を動かして試すときも、`cp -R` で `solutions` を `~/dev/ch09/` にコピーしてから、`~/dev/ch09` で動かします（`solutions` と `exercises` が並んでいる必要があります）。

```sh
$ cd ~/dev/ch09
$ node solutions/cors-api-server.mjs      # ターミナル1
$ bash exercises/check-cors.sh            # ターミナル2

$ cd exercises                            # テストは exercises で。MODULE= で、試すファイルを切り替えられる
$ MODULE=../solutions/origin.mjs node --test origin.test.mjs
$ MODULE=../solutions/safe-redirect.mjs node --test safe-redirect.test.mjs
```

ブラウザでの結果は、この教材の作成時に Chromium で確かめたものです。

---

## 基本

## 問題1 URL の解釈を予想する

| | 結果 | ポイント |
| --- | --- | --- |
| (a) | `https://example.com/blog/2026/img/a.png` | 基準の最後の `post` は「ファイル名」とみなされ、`/blog/2026/` が基準のフォルダになる |
| (b) | `https://example.com/blog/2026/post/img/a.png` | 最後に `/` があると、`post/` がフォルダになる。(a) との違いに注意 |
| (c) | `https://example.com/x` | 一番上より上には行けない（`..` が多すぎても `/` で止まる） |
| (d) | `https://example.com/list?page=3` | クエリが**丸ごと**置き換わる（`sort=new` は消える） |
| (e) | `http://cdn.example.net/lib.js` | スキームだけ基準（`http:`）を引き継ぎ、ホストは替わる |
| (f) | `port` は `''`（空）、`origin` は `https://example.com` | 既定のポートは省かれる |
| (g) | `https://example.com/Path` | スキームとホスト名は小文字になる。**パスは大文字・小文字がそのまま**（サーバによっては区別する） |
| (h) | `get('q')` は `a b`、`get('r')` は **`1 1`** | クエリの空白は `%20` になる。`searchParams` は `+` を**空白**として読む |

**1.** `searchParams`（と HTML のフォームの送信）では、`+` は**空白**を表します。`+` という文字そのものは `%2B` と書きます（`encodeURIComponent('+')` は `'%2B'`）。`url.searchParams.set('r', '1+1')` で組み立てれば、自動で `r=1%2B1` にしてくれます。

**2.** リクエスト行は `GET /page HTTP/1.1` で、`#section2` は送られません。フラグメントは「ページの中のどこを表示するか」をブラウザが決めるためのものだからです。SPA（第10章）では、この「フラグメントを変えてもサーバにリクエストが飛ばない」性質を、画面の切り替えに使っていたことがあります。

## 問題2 リンクを完全な URL に直す

模範解答は [link-check.mjs](link-check.mjs) です。

```js
const page = new URL(process.argv[2]);

for (const href of process.argv.slice(3)) {
  const url = new URL(href, page); // ページの URL を基準に、相対 URL を解決する
  const same = url.origin === page.origin ? '同じオリジン' : '別のオリジン';
  console.log(`${url.href.padEnd(45)} ${same}`);
}
```

- `new URL(href, page)` の2つ目には、文字列だけでなく `URL` そのものも渡せます。
- `//cdn.example.net/lib.js` は、パスのように見えて別のホストです。`http://example.com/` は、ホスト名が同じでもスキームが違うので、別のオリジンです。

ブラウザも、ページの中のリンクや画像を、この計算で完全な URL に直してからリクエストしています。第4部で静的ファイルのサーバを作るとき、「CSS が読み込まれない」原因の多くは、この相対 URL の解決の結果が、思っていたパスと違うことです。

## 問題3 許可するオリジンを一覧にする

模範解答は [my-api-v2.mjs](my-api-v2.mjs) です。

```js
const ALLOWED_ORIGINS = ['http://localhost:8310', 'http://127.0.0.1:8310'];

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  // ...
  res.setHeader('Vary', 'Origin');
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // ...（プリフライトと本番の処理は my-api.mjs と同じ）
```

- **ちょうど一致**で比べます。`origin.startsWith('http://localhost:8310')` で比べると、`http://localhost:8310.evil.example` という、他人が取れるドメインを通してしまいます。
- `Origin` ヘッダが無い（curl でそのまま送った）ときは `origin` が `undefined` で、`includes` は `false` になります。
- `Vary: Origin` は、「このレスポンスは `Origin` によって変わる」とキャッシュに伝えるためです（問題7の最後で詳しく）。

## 問題4 スクリプトの実行順を予想する

**1・2.** Chromium で確かめた結果です（時刻は、ページを開いてからの秒数）。

```
 0.01秒  head のインライン F
 0.06秒  async D（50ms） を実行
 0.21秒  body の普通の G（200ms） を実行
 0.21秒  body の最後の、普通の（インライン）スクリプト
 0.31秒  defer A（300ms） を実行
 0.31秒  defer B（100ms） を実行
 0.31秒  module E（10ms） を実行
 0.31秒  DOMContentLoaded（HTML を最後まで解析した）
 0.61秒  async C（600ms） を実行
 0.61秒  load（画像や CSS なども含めて、すべて読み終えた）
```

| 順 | 何が起きたか |
| --- | --- |
| F | インラインのスクリプトは、読み込みが無いので、解析がそこに来た瞬間に実行される |
| D | `async` は読み込み終わり次第すぐ実行。50ms で届いたので、解析の途中で割り込んで実行された |
| G | `<body>` の普通のスクリプト。200ms の間、**解析が止まった** |
| body の最後のインライン | G の後で解析が再開し、実行された |
| A → B → E | `defer` と `type="module"` は、解析が終わった後に、**書いた順**に実行される。B は 100ms で届いていたが、A（300ms）を待った |
| DOMContentLoaded | `defer` と module をすべて実行してから起きる |
| C | `async` なので、DOMContentLoaded を待たずに、届いた 0.6秒の時点で実行 |
| load | C を含めて、すべてが終わってから |

何度か再読み込みすると、**D と G の前後**や、**C と DOMContentLoaded の前後**は、入れ替わることがあります（`async` は「届いた順」なので）。A → B → E の順番は決して変わりません。

**3.** 例えば、次のように書いたとします。

```html
<script defer src="https://cdn.example.net/library.js"></script>  <!-- 大きい。届くのが遅い -->
<script defer src="/app.js"></script>                             <!-- 小さい。library.js の関数を使う -->
```

もし `defer` が `async` のように「届いた順」に実行されると、小さい `app.js` が先に実行され、まだライブラリが無いので「関数が定義されていない」というエラーになります。しかも、ネットワークの具合によって**起きたり起きなかったりする**、最も直しにくい種類のバグになります。`defer` は「書いた順」を保証するので、順番に意味のあるスクリプトを安心して並べられます。

## 問題5 CORS についての主張を検証する

**1. 誤り。** 本文5.1節の `my-api.mjs` では、ブラウザにエラーが出ても、API のターミナルには `GET /api/hello` が表示されました。`cors-lab.mjs` の実験7では、POST も届いています。**単純なリクエストは送られて処理され、レスポンスを読むことだけが止められます**。届かないのは、プリフライトで断られた場合の本番のリクエスト（本文5.2節の PUT）だけです。

**2. 誤り。** CORS のヘッダが無くても、

- curl や Node.js、他のサーバからは、普通に使えます（CORS はブラウザだけの確認）
- ブラウザからでも、単純なリクエスト（フォームと同じ形式の POST など）は**送れて、処理されます**。ログイン中の利用者のブラウザに、攻撃者のページから「タスクを削除する」POST を送らせることができてしまいます（CSRF。第10部）

API を守るのは、認証・認可、CSRF の対策、入力の検査です（第10部）。

**3. 誤り。** オリジンは「スキーム + ホスト名 + ポート」なので、ポートが違えば別のオリジンです。本文5節の `localhost:8310` と `localhost:8311` で確かめたとおりです。なお、この2つは**同じサイト**なので、`SameSite=Lax` の Cookie は送られます（本文4.4節）。

開発中によく使う解決方法は、次の2つです。

- API に CORS のヘッダを付ける（問題3・7）
- 画面の開発用サーバに**プロキシ**（中継）を設定し、`http://localhost:3000/api/...` へのリクエストを `http://localhost:4000/api/...` に転送させる。ブラウザから見ると同じオリジンなので、CORS が要らない（第8部の Vite）

**4. 誤り。** 自分のブラウザで CORS を無効にしても、**利用者のブラウザでは**エラーのままです。また、同一オリジンポリシーを無効にしたブラウザで普段のサイトを見ると、開いた悪意のあるページが、ログイン中の他のサイトの情報を読めるようになり、とても危険です。直す場所はサーバのヘッダか、プロキシの設定です。

## 応用

## 問題6 オリジンとサイトを判定する関数

模範解答は [origin.mjs](origin.mjs) です。

```js
export function sameOrigin(a, b) {
  return new URL(a).origin === new URL(b).origin;
}

// ホスト名から「登録できるドメイン」を求める（例: shop.example.co.jp → example.co.jp）
function registrableDomain(hostname) {
  let host = hostname;
  if (host.startsWith('[')) host = host.slice(1, -1); // IPv6 の [::1] の括弧を外す
  if (net.isIP(host) !== 0) return host; // IP アドレスはそれ自体がサイト

  // いちばん長く一致する公開の接尾辞を探す
  let best = '';
  for (const suffix of PUBLIC_SUFFIXES) {
    if (host.endsWith(`.${suffix}`) && suffix.length > best.length) best = suffix;
  }
  if (best === '') return host; // 一致しなければ（localhost など）、ホスト名そのもの

  const rest = host.slice(0, host.length - best.length - 1); // 'shop.example'
  const label = rest.split('.').pop(); // 'example'
  return `${label}.${best}`;
}

export function sameSite(a, b) {
  const ua = new URL(a);
  const ub = new URL(b);
  return ua.protocol === ub.protocol && registrableDomain(ua.hostname) === registrableDomain(ub.hostname);
}
```

```sh
$ cd exercises
$ MODULE=../solutions/origin.mjs node --test origin.test.mjs
ℹ pass 22
ℹ fail 0
```

- **`sameOrigin` は `origin` を比べるだけ**です。`origin` は、スキームとホスト名を小文字にし、既定のポートを省いた形になっているので、自分で比べるより確実です。
- **いちばん長く一致する接尾辞を探す**: `shop.example.co.jp` には `jp` も `co.jp` も一致しますが、`co.jp` を使います。`jp` を使うと、登録できるドメインが `co.jp` になり、すべての `.co.jp` のサイトが「同じサイト」になってしまいます（テスト `a.co.jp` と `b.co.jp`）。
- **`.` を付けて `endsWith`**: `host.endsWith('.com')` とすると、`github.io` そのもののようなホスト名は `.github.io` で終わらないので、接尾辞として扱わず、ホスト名そのものをサイトにできます。

**なぜ `github.io` が公開の接尾辞なのか**: GitHub Pages では、誰でも `ユーザー名.github.io` のサイトを作れます。もし `alice.github.io` と `bob.github.io` が同じサイトなら、alice のページからのリクエストに bob のサイトの `SameSite=Lax` の Cookie が付いてしまいます。実際のアプリでは、本物の一覧を更新し続けているライブラリを使います（一覧が古いと、新しいホスティングサービスのドメインを知らず、別の人のサイトを同じサイトと判断してしまう）。

## 問題7 タスクの API を CORS に対応させる

模範解答は [cors-api-server.mjs](cors-api-server.mjs) です。`api-server.mjs` に足したところには `// 追加:` のコメントがあります。

```js
const ALLOWED_ORIGINS = ['http://localhost:8400', 'http://127.0.0.1:8400'];
const ALLOWED_METHODS = ['GET', 'POST', 'DELETE'];

function setCors(req, res) {
  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

function headersAllowed(requested) {
  if (requested === undefined) return true;
  for (const name of requested.split(',')) {
    const h = name.trim().toLowerCase();
    if (h !== '' && h !== 'content-type') return false;
  }
  return true;
}

function handlePreflight(req, res) {
  const origin = req.headers.origin;
  const method = req.headers['access-control-request-method'];
  const ok = ALLOWED_ORIGINS.includes(origin) && ALLOWED_METHODS.includes(method) && headersAllowed(req.headers['access-control-request-headers']);
  if (!ok) {
    res.statusCode = 403;
    res.setHeader('Vary', 'Origin');
    res.end();
    return;
  }
  setCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
  res.statusCode = 204;
  res.end();
}

function handle(req, res, pathname, body) {
  if (req.method === 'OPTIONS') {
    handlePreflight(req, res);
    return;
  }
  setCors(req, res);
  // ...（ここから下は api-server.mjs と同じ）
```

```sh
$ bash exercises/check-cors.sh
[OK] 1. 許可したオリジンの GET に Allow-Origin
...
[OK] 18. POST 自体も動く（201）

すべて成功しました
```

ブラウザでも、タスクの追加・削除と「ログイン状態: alice」の表示ができることを確かめました。API のターミナルを見ると、POST と DELETE の前に、それぞれ OPTIONS（プリフライト）が届いています。

```
GET /api/me  Origin: http://localhost:8400
GET /api/tasks  Origin: http://localhost:8400
OPTIONS /api/tasks  Origin: http://localhost:8400
POST /api/tasks  Origin: http://localhost:8400
...
OPTIONS /api/tasks/1  Origin: http://localhost:8400
DELETE /api/tasks/1  Origin: http://localhost:8400
```

- **エラーのレスポンスにも CORS のヘッダを付ける**: 付け忘れると、422（入力の誤り）のときに、画面の JavaScript はエラーの内容（`title が必要です`）を読めず、ただの「CORS のエラー」に見えます。CORS のエラーだと思って調べていたら、実はサーバのエラーだった、ということはよくあります。
- **プリフライトを先に処理する**: `OPTIONS` は、`/api/tasks` にも `/api/tasks/1` にも来ます。パスで分ける前に、まとめて処理しています。
- **プリフライトで断るときは 403**: CORS のヘッダを付けなければ、ステータスが何でもブラウザは本番のリクエストを送りません。403 にしておくと、curl で調べたときに「断られた」ことが分かりやすくなります。
- **`ALLOWED_METHODS.join(', ')`**: 配列の要素を `', '` でつないだ文字列（`'GET, POST, DELETE'`）にします。

**`Vary: Origin` を許可しないときにも付ける理由**: 例えば、API の手前に CDN（共有のキャッシュ）があり、`/api/tasks` をキャッシュしているとします。

1. 別のオリジン（`Origin: http://evil.example`）から `/api/tasks` が取りに来られる。サーバは `Access-Control-Allow-Origin` を**付けずに**返し、CDN はそれを保存する
2. 次に、正しい画面（`Origin: http://localhost:8400`）から取りに来ると、CDN は保存してある「`Allow-Origin` の無いレスポンス」を返す
3. 正しい画面なのに CORS のエラーになる

`Vary: Origin` があれば、CDN は `Origin` の値ごとに別々に保存するので、この問題が起きません。**「許可しない」という答えも Origin によって変わる**ので、許可しないときにも必要です。

## 発展

## 問題8 オープンリダイレクトを防ぐ

模範解答は [safe-redirect.mjs](safe-redirect.mjs) です。

```js
const BASE = 'https://base.invalid';

export function safeRedirectPath(next, fallback = '/') {
  if (typeof next !== 'string') return fallback;
  let url;
  try {
    url = new URL(next, BASE); // ブラウザと同じ規則で解釈する
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback; // 別のオリジンになったら断る
  if (!next.trimStart().startsWith('/')) return fallback;
  return url.pathname + url.search + url.hash; // 正規化した形を返す
}
```

```sh
$ cd exercises
$ MODULE=../solutions/safe-redirect.mjs node --test safe-redirect.test.mjs
ℹ pass 23
ℹ fail 0
```

- **ブラウザと同じ規則で解釈してから判断する**: 実在しない基準のオリジンを使って `new URL` で解決し、**結果のオリジンが基準のままか**で判断します。`//evil.example`、`/\evil.example`、`https://evil.example`、`javascript:...` は、どれも結果のオリジンが変わるので断れます。
- **`trimStart()`**: 先頭の空白を取り除いた文字列を返します。`new URL` は先頭の空白を無視して解釈するので、それに合わせてから「`/` で始まるか」を調べています（`'tasks'` のような相対パスを断るため）。
- **正規化した形を返す**: 入力の文字列をそのまま返すのではなく、解釈した結果から作り直して返します。判断した内容と、実際に使う内容が一致するので、「判断の後で別の解釈をされる」隙がありません。

**問い1.**

```
> new URL('/\\evil.example/', 'https://example.com').href
'https://evil.example/'
```

URL の決まり（WHATWG URL Standard）では、`http` や `https` の URL では、`\` を `/` と同じものとして扱います。そのため `/\evil.example/` は `//evil.example/`、つまり**スキーム相対 URL**として解釈され、ホストが `evil.example` になります。

**問い2.** 文字列の見た目で判定すると、「**判定する側の解釈**」と「**実際に使う側（ブラウザ）の解釈**」が食い違ったときに、すり抜けられます。ブラウザの URL の解釈は、`\` の扱い、タブや改行の除去、大文字・小文字、パーセントエンコードなど、たくさんの細かい規則でできていて、それを `startsWith` で全部まねするのはほぼ不可能です。

教訓は、「**使う側と同じ部品で解釈してから判断し、判断に使った結果をそのまま使う**」ことです。第6章の練習問題8（長さの解釈が違うと、リクエストの区切りがずれる）と同じ考え方です。第10部の XSS 対策（HTML のエスケープ）や SQL インジェクション対策（プレースホルダ）も、「自分で文字列をいじらず、正しく解釈してくれる仕組みに任せる」という同じ考え方に立っています。
