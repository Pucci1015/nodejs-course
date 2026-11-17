# 第55章 Web セキュリティの総点検

ここまでの部で、XSS・CSRF・SQL インジェクション・パストラバーサルなどへの備えを、その場その場で学んできました。この章では、それを1つの表にまとめて点検し、まだ足りない所（セキュリティのヘッダ、CSP、認可の漏れ、SSRF、依存パッケージ、エラーの見せ方）を埋めます。どれも「自分のアプリが、正しく断るか」を確かめる形で進めます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第4部 第19〜22章（パストラバーサル・XSS・CSRF）、第6部 第31章（プレースホルダ）、第3部 第14・15章（npm、`execFile`）、第51〜54章 |
| この章のゴール | helmet でセキュリティのヘッダを付け、1つずつの意味を説明できる / CSP の nonce で、決めたスクリプトだけを動かせる / XSS・CSRF・インジェクションの備えを、どこで何をするかの表で点検できる / 認可の漏れ（ほかの人のデータ）を、持ち主を条件に入れて防げる / 利用者が書いた URL にサーバから取りに行くときの危険（SSRF）を説明し、確かめる関数を書ける / `npm audit` の結果を読んで、どう対応するかを決められる / エラーの中身を利用者に見せず、ログに残せる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形 |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part10/ch55-web-security/` で実行します。手を動かして作るファイルは、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part10/ch55-web-security
>   ```
>
> - 「手を動かす」のサーバは、どれもポート **9657** を使います。1つ動かしたら `Ctrl+C` で止めてから、次へ進みます。
> - **攻撃の仕組みを試すのは、自分の Mac の中で動かしているサーバだけにします。** ほかの人のサイトに試すのは、たとえ「確かめるだけ」でも、法律（不正アクセス禁止法など）に触れることがあります。この章も、攻撃に使う入力は書かず、「`'` を含む名前」「別のサイトからのリクエスト」のような、ふつうに起きることで確かめます。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| helmet と CSP（2・3節） | 成果物（API と画面のヘッダ）、第12部（本番の HTTPS と HSTS） |
| CSRF の点検と Fetch Metadata（5節） | 成果物（Cookie のセッションで動く API） |
| 認可の漏れ（7節） | 成果物（自分のタスクだけ）、第13部 |
| SSRF（8節） | 第12部 第63章（画像の URL・署名付き URL）、第64章（Webhook） |
| `npm audit` と依存パッケージ（9節） | 第11部 第59章（CI で毎回確かめる） |
| エラーとログ（10節） | 第12部 第66章（ログとエラーの監視） |

---

## 1. 点検の地図

**OWASP**（Open Worldwide Application Security Project）は、Web アプリの危険を調べて公開している団体です。よく起きる危険の上位 10 を「**OWASP Top 10**」としてまとめています。執筆時点の最新は 2025 年版です（内容は版ごとに変わるので、必ず公式 https://owasp.org/Top10/ で確かめてください）。この教材のどこで備えたかを並べます。

| 番号 | 危険 | 例 | この教材 |
| --- | --- | --- | --- |
| A01 | アクセス制御の不備（Broken Access Control） | ほかの人のタスクが読める・消せる、SSRF | 第51章 7節、この章の7・8節 |
| A02 | セキュリティの設定ミス | ヘッダが無い、開発用の設定のまま公開、エラーの中身を見せる | この章の2・3・10節、第52章（Cookie の属性） |
| A03 | ソフトウェアのサプライチェーンの失敗 | 危険のある依存パッケージ、install scripts | 第3部 第14章 12節、この章の9節 |
| A04 | 暗号の失敗 | パスワードを SHA-256 で保存、HTTP で送る | 第2部 第8章、第51章 2〜3節 |
| A05 | インジェクション | SQL・コマンド・XSS | 第4部 第21章、第6部 第31章、この章の4・6節 |
| A06 | 安全でない設計 | パスワードの再設定のトークンが何度でも使える | 第53章 4・6節 |
| A07 | 認証の失敗 | 総当たり、セッション固定化、ユーザーの列挙 | 第51〜52章 |
| A08 | ソフトウェアとデータの完全性の失敗 | 署名を確かめない JWT、ロックファイルを使わない | 第52章 7節、第54章 4節、この章の9節 |
| A09 | ログと警告の失敗 | 失敗のログが無い、ログに秘密を書く | 第5部 第26章、この章の10節 |
| A10 | 例外的な状態の扱いの誤り | エラーのときに認可を飛ばす、例外でサーバが止まる | 第3部 第12〜13章、この章の10節 |

**Flask では**: Flask にはセキュリティのヘッダを付ける仕組みが入っていないので、Flask-Talisman などの拡張を使います。CSRF は Flask-WTF の `CSRFProtect`、XSS は Jinja2 の自動エスケープ、SQL は SQLAlchemy のプレースホルダが受け持ちます。この章では、それぞれに当たるものを Express で点検します。

## 2. セキュリティのヘッダ

ブラウザには、「このページでは、これをしないで」と応答のヘッダで頼める仕組みがいくつもあります。**helmet** は、そのヘッダをまとめて付ける Express のミドルウェアです。

### 2.1 手を動かす: helmet の前と後

まず helmet なしの `plain.ts` を作ります。

```ts
import express from 'express';

const app = express();

app.get('/', (_req, res) => {
  res.type('html').send('<!doctype html><meta charset="utf-8"><title>ヘッダ</title><p>こんにちは</p>');
});

app.listen(9657, '127.0.0.1', () => console.log('http://127.0.0.1:9657'));
```

```sh
$ node plain.ts
```

別のターミナルで、応答のヘッダだけを見ます（`-I` は HEAD で聞いてヘッダだけを表示する。第2部 第6章）。

```sh
$ curl -sI http://127.0.0.1:9657/
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
Content-Length: 83
ETag: W/"53-QWiO3NZmKcanrPYdf/7AkS1e+zY"
Date: Tue, 17 Nov 2026 17:09:40 GMT
Connection: keep-alive
Keep-Alive: timeout=5
```

`Ctrl+C` で止め、`headers.ts` として、`import helmet from 'helmet';` と `app.use(helmet());` の2行を足したものを作って動かします（[samples/headers.ts](samples/headers.ts)）。

```sh
$ curl -sI http://127.0.0.1:9657/
HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
Content-Type: text/html; charset=utf-8
（以下は同じ）
```

`X-Powered-By: Express` が消え、12 個のヘッダが増えました（helmet 8.3.0 の既定）。大事なものを見ます。

| ヘッダ | 意味 | 防ぐこと |
| --- | --- | --- |
| `Content-Security-Policy` | このページで、どこから来たスクリプト・画像などを使ってよいか（3節） | XSS の被害を小さくする |
| `Strict-Transport-Security` | この先1年（31536000 秒）は、このサイトに HTTPS でしかつながない（HSTS。第2部 第8章） | HTTP に落とされる中間者攻撃。`http://127.0.0.1` ではブラウザが無視する |
| `X-Content-Type-Options: nosniff` | `Content-Type` を信じ、中身から種類を推測しない（第4部 第19章） | 画像として上げたファイルがスクリプトとして動く |
| `X-Frame-Options: SAMEORIGIN` と CSP の `frame-ancestors` | ほかのサイトの `<iframe>` に入れさせない | 透明な iframe の上でボタンを押させる（クリックジャッキング） |
| `Referrer-Policy: no-referrer` | リンクを踏んだ先に `Referer` を送らない | URL に入ったトークンなど（第53章）が外に漏れる |
| `Cross-Origin-Opener-Policy: same-origin` | 別のオリジンから開かれたとき、`window.opener` でつながらない | 開いた側のページを書き換えられる |
| `X-Powered-By` を消す | 何で作ったかを言わない | 攻撃する側が、狙う弱点を選びやすくなるのを少し防ぐ（これだけで安全にはならない） |
| `X-XSS-Protection: 0` | 古いブラウザの XSS フィルタを止める | フィルタ自体に問題があったため、今は「止める」が推奨 |

JSON だけを返す API にも、helmet は付けておきます。API の応答をブラウザで直接開かれることもあるからです。

## 3. CSP で、決めたスクリプトだけを動かす

**CSP**（Content Security Policy）は、ページで動かしてよいものをサーバが決める仕組みです。XSS で `<script>` が紛れ込んでも、CSP が許していなければブラウザは動かしません。エスケープ（第4部 第21章）が第1の守りで、CSP は漏れたときの第2の守りです。

helmet の既定は `script-src 'self'`（同じオリジンのファイルだけ）です。ページの中に直接書いた `<script>…</script>`（インライン）は動きません。どうしてもインラインで書きたいときは、**nonce**（ナンス。1回だけの値）を使います。

### 3.1 手を動かす: nonce 付きの script

[samples/csp-nonce.ts](samples/csp-nonce.ts) を開き、上から読みながら `csp-nonce.ts` として打ち込みます。要は次の3つです。

```ts
// 1. リクエストごとに nonce を作る
const nonce = randomBytes(16).toString('base64');
// 2. CSP の script-src に 'nonce-その値' を書く
scriptSrc: ["'self'", (_req, res) => `'nonce-${nonces.get(res) ?? ''}'`],
// 3. 動かしてよい <script> にだけ、同じ値を書く
<script nonce="${nonce}">…</script>
```

```sh
$ node csp-nonce.ts
$ curl -sI http://127.0.0.1:9657/ | grep -i content-security
Content-Security-Policy: default-src 'self';…;script-src 'self' 'nonce-kWO39XSZKHL6QCvrxf+8bQ==';script-src-attr 'none';…
```

ブラウザで http://127.0.0.1:9657/ を開き、2つのボタンを押してから、DevTools の Console を見ます（Chromium で確かめました）。

| ページの中のもの | 動いたか | 理由 |
| --- | --- | --- |
| `<script nonce="…">` | 動く（「nonce 付きの script が動きました」） | CSP の nonce と同じ |
| nonce の無い `<script>` | 動かない。Console に `Executing inline script violates the following Content Security Policy directive…` | nonce が無い |
| `<script src="/app.js">` | 動く | `'self'`（同じオリジンのファイル） |
| `addEventListener` で付けたクリック | 動く | nonce 付きの script の中で付けた |
| `onclick="…"` の属性 | 動かない。Console に `Executing inline event handler violates … 'script-src-attr 'none''` | 属性に書いたスクリプトは `script-src-attr 'none'` で禁止 |

XSS で紛れ込むのは、たいてい「nonce の無い script」か「`onclick` などの属性」です。攻撃する側は、リクエストごとに変わる nonce を知らないので、書けません。

| 気を付けること | 理由 |
| --- | --- |
| nonce はリクエストごとに作る。決まった値にしない | 値を知られたら、その値を書いた script が動いてしまう |
| nonce を付けた `<script>` の中に、利用者の入力を入れない | nonce 付きの中身は、何でも動く |
| `'unsafe-inline'` を `script-src` に書かない | インラインがすべて動き、CSP の意味がなくなる |
| 入れる前に `Content-Security-Policy-Report-Only` で試す | 止めずに、違反を Console（と報告先）に知らせるだけ。既存のページが壊れないか確かめられる |

`CSP_REPORT_ONLY=1 node csp-nonce.ts` で動かすと、ヘッダが `Content-Security-Policy-Report-Only` になり、すべてのスクリプトが動いたうえで、Console に違反が出ます。

Vite でビルドした React の画面（第8部）は、スクリプトがすべてファイル（`/assets/index-….js`）なので、`script-src 'self'` のままで動きます。CSP の指示（`default-src` など）の一覧は、練習問題1で自分で組み立てます。

## 4. XSS の点検

XSS（クロスサイトスクリプティング）は、利用者の入力がページの HTML やスクリプトとして読まれてしまうことです。第4部 第21章と第8部 第41章で学んだ備えを、「どこに入れるか」ごとに並べます。

| 入れる場所 | 備え | 学んだ所 |
| --- | --- | --- |
| HTML の本文・属性の値 | `escapeHtml`（`&` `<` `>` `"` `'`）、または React の JSX（自動でエスケープ） | 第4部 第21章、第8部 第41章 2.3節 |
| DOM に入れる（素の JavaScript） | `textContent` を使う。`innerHTML` に入力を入れない | 第2部 第10章、第8部 第39章 |
| `href`・`src` の URL | `http:`・`https:` などだけを許す（`safeUrl`）。`javascript:` を入れない | 第4部 第21章 |
| `<script>` の中の JSON | `<` などを `<` に（`jsonForScript`） | 第4部 第21章、第8部 第46章 |
| React の `dangerouslySetInnerHTML` | 使わない。使うなら、決まったタグだけを残すライブラリ（DOMPurify など）を通す | 第8部 第41章 |
| メールの HTML | `escapeHtml` | 第53章 5.1節 |
| 応答の `Content-Type` | JSON は `application/json`、ファイルは正しい種類 + `nosniff` | 第4部 第19章、この章の2節 |

それでも漏れたときのために、CSP（3節）とセッションの Cookie の `HttpOnly`（第52章）で、被害を小さくします。

## 5. CSRF の点検

CSRF（クロスサイトリクエストフォージェリ）は、別のサイトのページから、利用者のブラウザに、こちらのサイトへのリクエストを送らせることです。ブラウザは Cookie を自動で付けるので、ログインしている人の操作として受け付けてしまいます。

| 備え | 何をするか | 学んだ所 |
| --- | --- | --- |
| GET で状態を変えない | 状態を変えるのは POST・PATCH・DELETE だけ | 第2部 第10章 |
| `SameSite=Lax` の Cookie | 別のサイトからの POST・fetch に Cookie を付けない | 第4部 第22章、第52章 3節 |
| `Origin` を確かめる | 状態を変えるリクエストの `Origin` が自分か | 第52章 5節 |
| CSRF トークン | フォームに、セッションと結びついた値を入れる | 第4部 第22章 |
| **Fetch Metadata**（`Sec-Fetch-Site`） | ブラウザが付ける「どこから来たか」を見る | この節 |

今のブラウザは、リクエストに `Sec-Fetch-*` ヘッダを付けます。ページの JavaScript から変えることはできません。

| ヘッダ | 値の例 | 意味 |
| --- | --- | --- |
| `Sec-Fetch-Site` | `same-origin`・`same-site`・`cross-site`・`none` | どこから来たか。`none` はアドレスバーやブックマーク |
| `Sec-Fetch-Mode` | `navigate`・`cors`・`no-cors` | ページの移動か、fetch か |
| `Sec-Fetch-Dest` | `document`・`iframe`・`image`・`empty` | 何に使われるか。`empty` は fetch |

### 5.1 手を動かす: 別のサイトからのリクエストを断る

[samples/fetch-metadata.ts](samples/fetch-metadata.ts) の `rejectCrossSite` を読みながら、`fetch-metadata.ts` を作ります。

```ts
function rejectCrossSite(req: Request, res: Response, next: NextFunction) {
  const site = req.get('sec-fetch-site');
  if (site === undefined) return next();
  if (site === 'same-origin' || site === 'none') return next();
  if (req.method === 'GET' && req.get('sec-fetch-mode') === 'navigate' && req.get('sec-fetch-dest') === 'document') return next();
  res.status(403).json({ detail: '別のサイトからのリクエストは受け付けません' });
}
```

`req.get(名前)` は、リクエストのヘッダを、名前の大文字小文字を問わずに読みます（無ければ `undefined`）。curl でヘッダを付けて、ブラウザのふりをします（`-H` はヘッダを足す。第2部 第6章）。

```sh
$ node fetch-metadata.ts
$ curl -s -X POST -H 'Content-Type: application/json' -d '{"title":"牛乳"}' http://127.0.0.1:9657/api/tasks
{"created":{"title":"牛乳"}}
$ curl -s -X POST -H 'Sec-Fetch-Site: same-origin' -H 'Content-Type: application/json' -d '{"title":"牛乳"}' http://127.0.0.1:9657/api/tasks
{"created":{"title":"牛乳"}}
$ curl -s -X POST -H 'Sec-Fetch-Site: cross-site' -H 'Content-Type: application/json' -d '{"title":"牛乳"}' -w ' %{http_code}\n' http://127.0.0.1:9657/api/tasks
{"detail":"別のサイトからのリクエストは受け付けません"} 403
$ curl -s -o /dev/null -w '%{http_code}\n' -H 'Sec-Fetch-Site: cross-site' -H 'Sec-Fetch-Mode: navigate' -H 'Sec-Fetch-Dest: document' http://127.0.0.1:9657/
200
```

Chromium で、`http://localhost:9657/` のページ（`127.0.0.1` とは別のサイト）から `http://127.0.0.1:9657/api/tasks` へ POST を送ると、ブラウザは `Sec-Fetch-Site: cross-site` を付け、サーバは 403 を返しました。同じオリジンのページからの fetch は 201 でした。

ヘッダが無いリクエストを通すのは、古いブラウザと、curl のようなブラウザでないものを止めないためです。ブラウザでないものは、利用者の Cookie を勝手に付けないので、CSRF にはなりません。Fetch Metadata は `SameSite` と `Origin` の確かめに重ねる備えで、1つだけに頼りません。

## 6. インジェクション

**インジェクション**は、利用者の値が、SQL やシェルのコマンドなどの「命令」の一部として読まれてしまうことです。どれも、「命令」と「値」を別々に渡せば防げます。

### 6.1 手を動かす: SQL（おさらい）

[samples/sql.ts](samples/sql.ts) を動かします（第6部 第31章のおさらい。中身は短いので読んでみてください）。

```sh
$ node samples/sql.ts
つなげた SQL: near "s": syntax error
プレースホルダ: [ [Object: null prototype] { id: 1, title: "Let's ストレッチ" } ]
```

題名に `'` があるだけで、文字列をつなげた SQL は壊れます。壊れるということは、値の書き方しだいで、SQL の意味を変えられるということです。プレースホルダ（`?`、PostgreSQL では `$1`）なら、値は SQL として読まれません。Drizzle（第6部 第33章）のクエリビルダも、中でプレースホルダを使います。

### 6.2 手を動かす: シェルのコマンド

アプリから外のコマンド（画像の変換など）を動かすとき、利用者が付けたファイルの名前を渡すことがあります。`run-command.ts` を、[samples/run-command.ts](samples/run-command.ts) を見ながら作ります。

```ts
// ✗ exec: 1つの文字列をシェル（/bin/sh）に渡す
await execAsync(`wc -l '${name}'`, { cwd: dir });
// ✓ execFile: コマンドと引数を配列で渡す。シェルを通らない
await execFileAsync('wc', ['-l', '--', name], { cwd: dir });
```

```sh
$ node run-command.ts
exec: 失敗しました: Command failed: wc -l 'Let's go.txt' / /bin/sh: 1: Syntax error: Unterminated quoted string
execFile: 3 Let's go.txt
```

（Mac の `/bin/sh` は bash なので、エラーの文は `unexpected EOF while looking for matching` のようになります。どちらも「`'` が閉じていない」という意味です。）

| 書き方 | 何が起きるか |
| --- | --- |
| `exec('コマンド 文字列')` | 文字列をシェルが読む。`'` `"` `$` `;` `|` `` ` `` などが、シェルの記号として働く |
| `execFile('コマンド', [引数, …])` | シェルを通さず、引数をそのまま渡す。どんな文字も、ただの文字 |
| 引数の前の `--` | 「ここから後はオプションではない」の印。名前が `-` で始まっても、オプションと読まれない（多くのコマンドが従う決まり） |

第3部 第15章で学んだ `execFile` を、利用者の値を渡すときは**必ず**使います。`spawn` も、`shell: true` を付けなければシェルを通りません。練習問題3で、`exec` の関数を直します。

## 7. 認可の漏れ

OWASP Top 10 の1位は「アクセス制御の不備」です。いちばん多いのは、「ログインしているか」は確かめているのに、「**その人のデータか**」を確かめ忘れることです。URL の id を変えるだけで、ほかの人のデータが読めてしまいます。

### 7.1 手を動かす: 持ち主を条件に入れる

[samples/owner-check.ts](samples/owner-check.ts) を見ながら、`owner-check.ts` を作ります。大事なのは、探すときに id と持ち主を**一緒に**条件にすることです。

```ts
app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.find((t) => t.id === Number(req.params.id) && t.ownerId === req.session.userId);
  if (task === undefined) return res.status(404).json({ detail: 'タスクがありません' });
  res.json(task);
});
```

curl の `-c ファイル` は受け取った Cookie をファイルに保存し、`-b ファイル` はそれを送ります（第4部 第22章）。

```sh
$ node owner-check.ts
$ curl -s -c jar.txt -X POST -H 'Content-Type: application/json' -d '{"name":"alice"}' -w '%{http_code}\n' http://127.0.0.1:9657/login
204
$ curl -s -b jar.txt http://127.0.0.1:9657/api/tasks
[{"id":1,"ownerId":1,"title":"牛乳を買う"},{"id":3,"ownerId":1,"title":"第55章を読む"}]
$ curl -s -b jar.txt -w ' %{http_code}\n' http://127.0.0.1:9657/api/tasks/2
{"detail":"タスクがありません"} 404
$ curl -s -b jar.txt -w ' %{http_code}\n' http://127.0.0.1:9657/api/tasks/9
{"detail":"タスクがありません"} 404
```

id 2 は bob のタスクです。無い id 9 と同じ 404 を返すので、「id 2 のタスクがある」ことも分かりません（403 だと、あることが分かります）。

| 気を付けること | 理由 |
| --- | --- |
| 読む・書き換える・消すの**すべて**で、持ち主を条件に入れる | 一覧だけ絞って、1つを読む・消す所で忘れることが多い |
| SQL なら `WHERE id = $1 AND owner_id = $2` | 探してから比べるより、漏れにくい。成果物はこの形 |
| 持ち主は、入力（ボディ）ではなくセッションから決める | `{"ownerId": 2}` を送られると、ほかの人のタスクとして作れてしまう（**マスアサインメント**） |
| 知らない項目は断る（Zod の `z.strictObject`） | `id`・`ownerId` などを、書き換えで送られても変えない |

`z.strictObject({ … })` は、決めた項目以外があればエラーにするスキーマです（`z.object` は知らない項目を黙って捨てます。第7部 第38章）。練習問題5で、漏れのあるアプリを直します。

## 8. サーバから外へ取りに行く: SSRF

「画像の URL を貼ると、サーバが取ってきて表示する」「Webhook の送り先を登録できる」のように、**利用者が書いた URL に、サーバがリクエストを送る**機能があります。サーバは、ふつうの利用者が届かない場所（自分自身の `127.0.0.1`、会社の中の網、クラウドの管理用の住所 `169.254.169.254`）にも届きます。利用者がそこを指す URL を書くと、サーバが代わりに取りに行ってしまいます。これを **SSRF**（Server-Side Request Forgery）と呼びます。

### 8.1 手を動かす: 取りに行く前に確かめる

Node.js の `net.BlockList` は、IP アドレスの範囲の一覧を作り、あるアドレスが入っているかを調べる道具です。`dns/promises` の `lookup(名前, { all: true })` は、名前のすべての IP アドレスを返します。[samples/outbound-url.ts](samples/outbound-url.ts) を見ながら、`outbound-url.ts` を作ります。

```ts
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

const blocked = new BlockList();
blocked.addSubnet('127.0.0.0', 8); // 自分（127.0.0.0〜127.255.255.255）
blocked.addSubnet('169.254.0.0', 16); // リンクローカル（クラウドの管理用の住所もここ）
blocked.addSubnet('192.168.0.0', 16); // 中の網
blocked.addAddress('::1', 'ipv6'); // 自分（IPv6）
// …ほかは samples を見て足す

const isBlocked = (address: string) => blocked.check(address, isIP(address) === 6 ? 'ipv6' : 'ipv4');
```

`addSubnet('127.0.0.0', 8)` の `8` は、「先頭の 8 ビット（最初の数）が同じ範囲」という意味です（`127.0.0.0/8` と書く書き方。第2部 第5章）。`isIP` は、文字列が IPv4 なら 4、IPv6 なら 6、どちらでもなければ 0 を返します。

```sh
$ node outbound-url.ts
https://nodejs.org/                OK 104.16.212.131, 104.16.213.131
http://nodejs.org/                 NG https だけを使えます
https://127.0.0.1/                 NG 中の網のアドレスです（127.0.0.1）
https://localhost/                 NG 中の網のアドレスです（127.0.0.1）
https://[::1]/                     NG 中の網のアドレスです（::1）
https://[::ffff:127.0.0.1]/        NG 中の網のアドレスです（::ffff:7f00:1）
https://169.254.169.254/latest/    NG 中の網のアドレスです（169.254.169.254）
https://192.168.1.1/               NG 中の網のアドレスです（192.168.1.1）
https://user:pass@nodejs.org/      NG ユーザー名・パスワードは書けません
https://nodejs.org:8443/           NG ポートは書けません（443 だけ）
```

（`nodejs.org` のアドレスは、出力例です。）

| 確かめること | 理由 |
| --- | --- |
| 名前ではなく、**引いた IP アドレス**で調べる | `localhost` のほか、外の名前でも `127.0.0.1` を返すように設定できる |
| アドレスが2つ以上なら、**すべて**を調べる | 1つだけ調べると、もう1つの中の網のアドレスにつながることがある |
| IPv6 の形の IPv4（`::ffff:127.0.0.1`）も止める | `BlockList` は IPv4 の決まりで調べてくれる（Node.js 24 で確かめた） |
| https・決まったポートだけ | 中の網のほかのサービス（データベースなど）のポートに送らせない |
| リダイレクトを自動でたどらない | 外のサーバが `302 Location: http://127.0.0.1/…` を返すと、確かめた後で中へ送られる |

fetch でリダイレクトを自分でたどるには、`fetch(url, { redirect: 'manual' })` とします。3xx の応答がそのまま返ってくるので、`Location` ヘッダの行き先を `new URL(location, 今の URL)`（相対の URL を解決する。第2部 第9章）にして、もう一度確かめてから送ります。応答の大きさにも上限を付けます（`Content-Length` ヘッダを見る、読んだ `await res.arrayBuffer()` の長さを見る）。練習問題6で、この全部を `safeFetch` にまとめます。

それでも、確かめてから fetch するまでの間に、名前の答えを変えられる手口（**DNS リバインディング**）は残ります。本番では、確かめた IP アドレスに直接つなぐ、外へ出る通信を決まったプロキシに通す、などを重ねます（第12部）。

**オープンリダイレクト**（`?returnTo=` で別のサイトへ飛ばせてしまう）も、「利用者の書いた URL」の問題です。第2部 第9章の `safeRedirectPath` と、第54章 練習問題8 の `safeReturnTo` で備えました。

## 9. 依存パッケージ

第10部のフォルダには、`npm install` で 185 個のパッケージが入っています。自分で書いたコードより、ずっと多いコードです。そのどれかに危険が見つかることがあります。

### 9.1 手を動かす: npm audit を読む

`npm audit` は、ロックファイルのすべてのパッケージの版を npm のサーバに送り、知られている危険（**勧告**、advisory）と照らし合わせます。

```sh
$ cd ~/dev/part10
$ npm audit
# npm audit report

minimatch  7.0.0 - 11.0.0
Severity: moderate
minimatch has potential denial of service via globparts amplification - https://github.com/advisories/GHSA-g3hv-75wg-m249
fix available via `npm audit fix --force`
Will install typescript-eslint@8.73.0, which is outside the stated dependency range
node_modules/minimatch
  @typescript-eslint/typescript-estree  6.16.0 - 8.72.2
  Depends on vulnerable versions of minimatch
  …（省略）
  eslint  10.0.0-alpha.0 - 10.14.0
  Depends on vulnerable versions of minimatch
  node_modules/eslint

8 moderate severity vulnerabilities

To address all issues, run:
  npm audit fix --force
```

これは**執筆時点（2026-11-17）の出力例**です。勧告は毎日増えるので、皆さんが打つと違う結果になります。読み方を見ていきます。

| 行 | 意味 |
| --- | --- |
| `minimatch  7.0.0 - 11.0.0` | 危険のあるパッケージと、危険のある版の範囲 |
| `Severity: moderate` | 重さ。`low`・`moderate`・`high`・`critical` |
| `minimatch has potential denial of service…` と URL | 勧告の題名と、詳しい説明の場所（GitHub Advisory Database） |
| `Depends on vulnerable versions of minimatch` | 自分は危険でないが、危険な版を使っているパッケージ |
| `fix available via npm audit fix --force` / `outside the stated dependency range` | 直す版はあるが、`package.json` で決めた版の範囲の外 |

次に、「本当に困るか」を調べます。`npm ls パッケージ名` は、そのパッケージが、どの依存から入っているかを木の形で見せます。

```sh
$ npm ls minimatch
part10-auth-security@1.0.0 /Users/alice/dev/part10
+-- eslint@10.13.0
| +-- @eslint/config-array@0.23.6
| | `-- minimatch@11.0.9
| `-- minimatch@10.2.6
`-- typescript-eslint@8.72.1
  `-- @typescript-eslint/typescript-estree@8.72.1
    `-- minimatch@10.2.6 deduped
$ npm audit --omit=dev
found 0 vulnerabilities
```

`--omit=dev` は、`devDependencies`（開発のときだけ使うもの）を除いて調べるオプションです。今回の危険は、ESLint（コードを調べる道具）の中だけで、アプリと一緒に本番で動くもの（`dependencies`）には無いことが分かります。

| 判断の手がかり | 今回 |
| --- | --- |
| 本番で動くか（`dependencies`）、開発の道具か（`devDependencies`） | 開発の道具だけ |
| 危険が起きる条件に、自分の使い方が当てはまるか | 外から来た文字列をグロブ（`*.ts` のような形）として読ませると遅くなる。ESLint は自分の設定のグロブしか読まない |
| 直す版があるか・出たばかりか | typescript-eslint 8.73.0（2026-11-16）、eslint 10.15.0（2026-11-13）。出て数日 |

この場合は、急いで `npm audit fix --force` を打たず、直す版が落ち着くのを少し待ってから、`package.json` の版を上げて動作を確かめる、という判断ができます。逆に、本番で動くパッケージに `high` や `critical` が出たら、すぐに対応します。

| 気を付けること | 理由 |
| --- | --- |
| `npm audit fix --force` を、中身を見ずに打たない | メジャー版を上げて、アプリが動かなくなることがある |
| ロックファイルをコミットし、`npm ci` で入れる | 全員・CI・本番で同じ版になる（第3部 第14章） |
| `npm ci --ignore-scripts`（この教材の setup） | install scripts（入れたときに勝手に動くプログラム）を動かさない（第3部 第14章 12節） |
| 名前を打ち間違えない、知らないパッケージを入れる前に調べる | 似た名前の悪いパッケージ（typosquatting） |
| `npm audit` を CI で毎回動かす | 新しい勧告に気付ける（第11部 第59章） |

`npm audit --json` と打つと、同じ内容が JSON で出ます。形は次のとおりです（大事な所だけ）。

```json
{
  "auditReportVersion": 2,
  "vulnerabilities": {
    "minimatch": {
      "name": "minimatch",
      "severity": "moderate",
      "isDirect": false,
      "via": [{ "title": "minimatch has potential denial of service via globparts amplification", "url": "https://github.com/advisories/GHSA-g3hv-75wg-m249", "range": ">=7.0.0 <11.0.1" }],
      "fixAvailable": { "name": "typescript-eslint", "version": "8.73.0", "isSemVerMajor": false }
    },
    "eslint": { "name": "eslint", "severity": "moderate", "isDirect": true, "via": ["minimatch"], "fixAvailable": { "name": "eslint", "version": "10.15.0", "isSemVerMajor": false } }
  },
  "metadata": { "vulnerabilities": { "info": 0, "low": 0, "moderate": 8, "high": 0, "critical": 0, "total": 8 } }
}
```

| 項目 | 意味 |
| --- | --- |
| `isDirect` | 自分の `package.json` に書いたパッケージか |
| `via` | 勧告そのもの（オブジェクト）か、「このパッケージのせい」の名前（文字列） |
| `fixAvailable` | `false`（直す版なし）、`true`（`npm audit fix` で直る）、オブジェクト（その版にすれば直る。`isSemVerMajor` はメジャー版の更新か） |

練習問題8で、この JSON を読んで、決めた重さ以上があれば終了コード 1 にするコマンドを作ります（`parseArgs`・標準入力・`process.exitCode` は第3部 第16章）。

## 10. エラーを見せない

エラーの中身（スタックトレース、データベースの接続の文字列など）を利用者に見せると、アプリの作りや秘密が漏れます。

### 10.1 手を動かす: Express の既定のエラーの画面

`boom.ts` を作ります。

```ts
import express from 'express';

const app = express();
app.get('/boom', () => {
  throw new Error('データベースにつなげません: postgres://app:dev-only-password@127.0.0.1:5433/taskapi');
});
app.listen(9657, '127.0.0.1');
```

```sh
$ node boom.ts
$ curl -s http://127.0.0.1:9657/boom
<!DOCTYPE html>
…
<pre>Error: データベースにつなげません: postgres://app:dev-only-password@127.0.0.1:5433/taskapi<br> &nbsp; &nbsp;at file:///Users/alice/dev/part10/ch55-web-security/boom.ts:5:9<br> &nbsp; &nbsp;at Layer.handleRequest (…
```

パスワードもファイルの場所も、そのまま返ってきました。止めて、`NODE_ENV=production node boom.ts` で動かし直すと、`<pre>Internal Server Error</pre>` だけになります。Express の既定の処理は、`NODE_ENV` が `production` でなければ、中身を見せるからです。

本番で `NODE_ENV` を付け忘れても漏れないように、エラーを受け取るミドルウェア（第5部 第23章）を自分で置きます。[samples/errors.ts](samples/errors.ts) を見ながら、`boom.ts` に足します。

```ts
const redact = (text: string) => text.replace(/(\/\/[^:/@\s]+:)[^@\s]+@/g, '$1***@');

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const errorId = randomUUID();
  const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
  console.error(`[${errorId}] ${redact(detail)}`);
  res.status(500).type('application/problem+json').json({ title: 'サーバの中でエラーが起きました', status: 500, errorId });
});
```

```sh
$ curl -s http://127.0.0.1:9657/boom
{"title":"サーバの中でエラーが起きました","status":500,"errorId":"71af4da9-74c0-42a8-81a2-103c04096959"}
```

サーバのターミナルには、パスワードを隠したログが出ます。

```
[71af4da9-74c0-42a8-81a2-103c04096959] Error: データベースにつなげません: postgres://app:***@127.0.0.1:5433/taskapi
    at file:///Users/alice/dev/part10/ch55-web-security/boom.ts:（行:列）
    …
```

利用者が「エラーが出ました」と問い合わせてきたら、`errorId` でログを探せます。

| 気を付けること | 理由 |
| --- | --- |
| 500 の応答には、中身を入れない | 作り・秘密が漏れる |
| 4xx の「入力が違う」は、何が違うかを返してよい | 利用者が直せるように（第5部 第25章）。body-parser のエラーは `status` と `expose: true` を持つ |
| ログには中身を残し、秘密は隠す | ログを読める人は、アプリの利用者より多いことがある（第6部 第32章の `redactUrl`） |
| 応答を送り始めた後のエラー（`res.headersSent`）は、自分で応答しない | もう別の応答を返せない。`next(err)` で Express に任せると、接続を閉じる |
| 認証・認可の失敗もログに残す | 総当たりや、ほかの人のデータを探す動きに気付ける（OWASP A09） |

練習問題7で、この形を広げたミドルウェアを作ります。

## 11. Next.js では

- ヘッダ: `next.config.ts` の `headers()` で、すべてのページに付けられます。CSP の nonce は、Next.js の公式ドキュメント「Content Security Policy」の方法（リクエストごとに nonce を作り、Next.js が自分の `<script>` に付ける）を使います。nonce を使うと、ページは静的に作れず、毎回レンダリングになります（第9部 第50章）。
- CSRF: Server Actions は POST だけで受け付け、`Origin` と `Host` を比べて、違えば断ります（第9部 第49章）。Route Handler は、自分で確かめます。
- 認可: Server Action と Route Handler の中で、毎回「だれが・何に」を確かめます。ページで隠しただけでは、Server Action は直接呼べます（第9部 第49章 4節）。
- 内容は版によって変わるので、使うときは公式で確かめてください。

## 12. Flask との対応

| この章 | Flask |
| --- | --- |
| helmet | Flask-Talisman（`Talisman(app, content_security_policy=…)`） |
| CSP の nonce | Flask-Talisman の `content_security_policy_nonce_in=['script-src']` と、テンプレートの `csp_nonce()` |
| Fetch Metadata・`Origin` の確かめ | `@app.before_request` で `request.headers.get('Sec-Fetch-Site')` を見る |
| プレースホルダ | SQLAlchemy の `text('… :title')` と `{'title': …}` |
| `execFile` | `subprocess.run(['wc', '-l', '--', name])`（リストで渡し、`shell=True` にしない） |
| 持ち主を条件に入れる | `Task.query.filter_by(id=id, owner_id=current_user.id).first_or_404()` |
| `npm audit` | `pip-audit` |
| エラーの画面 | `app.debug` を本番で `False` にする（`True` だとブラウザでコードが動くデバッガが出る）、`@app.errorhandler(500)` |

## まとめ

- OWASP Top 10 を地図にして、これまでの備えを点検する。1位は「アクセス制御の不備」。
- helmet でセキュリティのヘッダをまとめて付け、`X-Powered-By` を消す。CSP は nonce で、決めたスクリプトだけを動かす。
- XSS はエスケープが第1の守り、CSP と `HttpOnly` が第2の守り。CSRF は `SameSite`・`Origin`・Fetch Metadata を重ねる。
- インジェクションは、命令と値を分ける（プレースホルダ、`execFile` と `--`）。
- 読む・書き換える・消すのすべてで、持ち主を条件に入れる。持ち主は入力ではなくセッションから。
- 利用者の書いた URL に取りに行くときは、引いた IP アドレスで中の網を断り、リダイレクトを自分でたどる。
- `npm audit` は、本番で動くか・条件に当てはまるかを見て判断する。500 の中身は見せず、隠してログに残す。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- OWASP Top 10: https://owasp.org/Top10/
- OWASP Cheat Sheet Series（XSS・CSRF・SSRF・Authorization など）: https://cheatsheetseries.owasp.org/
- helmet: https://helmetjs.github.io/
- MDN「Content Security Policy (CSP)」: https://developer.mozilla.org/ja/docs/Web/HTTP/Guides/CSP
- MDN「Sec-Fetch-Site」: https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site
- web.dev「Protect your resources from web attacks with Fetch Metadata」: https://web.dev/articles/fetch-metadata
- Node.js `net.BlockList`: https://nodejs.org/api/net.html#class-netblocklist
- Node.js `child_process.execFile`: https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback
- npm Docs「npm audit」: https://docs.npmjs.com/cli/commands/npm-audit
- GitHub Advisory Database: https://github.com/advisories
- Next.js「Content Security Policy」: https://nextjs.org/docs/app/guides/content-security-policy

---

前の章: [第54章 OAuth 2.0 と OpenID Connect](../ch54-oauth-oidc/README.md) ／ 第10部の目次: [../README.md](../README.md) ／ 次: [成果物 ユーザー登録・メール確認・ログイン](../project-task-auth/README.md)
