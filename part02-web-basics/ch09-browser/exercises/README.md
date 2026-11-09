# 第9章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
作るファイルは `~/dev/ch09/` に置き、コマンドもそこで実行します（本文の「読み方」でコピーした `samples/` と `exercises/` を使います）。ブラウザは Chrome を使い、DevTools（`⌘ + ⌥ + I`）を開いて確かめます。

| 問題 | 種類 | テーマ | 本文の節 |
| --- | --- | --- | --- |
| 1 | 基本 | URL の解釈を予想する（調べる問題） | 1 |
| 2 | 基本 | リンクを完全な URL に直す | 1.2, 4.2 |
| 3 | 基本 | 許可するオリジンを一覧にする | 5.1, 5.3 |
| 4 | 基本 | スクリプトの実行順を予想する（調べる問題） | 3 |
| 5 | 基本 | CORS についての主張を検証する（考える問題） | 4, 5 |
| 6 | 応用 | オリジンとサイトを判定する関数 | 4.2, 4.4 |
| 7 | 応用 | タスクの API を CORS に対応させる | 5 |
| 8 | 発展 | オープンリダイレクトを防ぐ | 1.2 |

**発展**（8）は、少し長めの問題です。できなくても次の章に進んでかまいません。

---

## 基本

### 問題1 URL の解釈を予想する（調べる問題）

次の表の「結果」を、**実行する前に**予想して書いてください。その後で REPL（`node` だけを打つ）の `new URL(入力, 基準)` か、`node samples/url-demo.mjs '入力' '基準'` で確かめ、予想と違ったものについて理由を説明します。

| | 入力 | 基準 | 予想する項目 |
| --- | --- | --- | --- |
| (a) | `img/a.png` | `https://example.com/blog/2026/post` | `href` |
| (b) | `img/a.png` | `https://example.com/blog/2026/post/` | `href` |
| (c) | `../../../../x` | `https://example.com/a/b/` | `href` |
| (d) | `?page=3` | `https://example.com/list?page=2&sort=new` | `href` |
| (e) | `//cdn.example.net/lib.js` | `http://localhost:8000/` | `href` |
| (f) | `https://example.com:443/` | なし | `port` と `origin` |
| (g) | `HTTPS://Example.COM/Path` | なし | `href` |
| (h) | `https://example.com/?q=a b&r=1+1` | なし | `searchParams.get('q')` と `searchParams.get('r')` |

最後に、次の問いにも答えてください。

1. (h) の `r=1+1` の `+` は、何として解釈されたか。クエリに `+` という文字そのものを入れたいときは、どう書けばよいか（ヒント: REPL で `encodeURIComponent('+')`）。
2. ブラウザで `https://example.com/page#section2` を開いたとき、サーバに届くリクエスト行は何か（第6章）。

### 問題2 リンクを完全な URL に直す

ページの URL と、そのページの中のリンク（`href` の値）をいくつか受け取り、それぞれを完全な URL に直して、ページと**同じオリジンか**を表示する `link-check.mjs` を作ってください。

```sh
$ node link-check.mjs https://example.com/docs/guide/ logo.png ../img/a.png /about //cdn.example.net/lib.js http://example.com/ '?page=2'
https://example.com/docs/guide/logo.png       同じオリジン
https://example.com/docs/img/a.png            同じオリジン
https://example.com/about                     同じオリジン
https://cdn.example.net/lib.js                別のオリジン
http://example.com/                           別のオリジン
https://example.com/docs/guide/?page=2        同じオリジン
```

ヒント:

- 1つ目の引数（`process.argv[2]`）がページの URL、残り（`process.argv.slice(3)`）がリンクです。
- 本文1.2節の `new URL(相対, 基準)` と、4.2節の `origin` の比べ方を使います。
- `文字列.padEnd(45)` で、45文字になるまで後ろに空白を足すと、列がそろいます。

### 問題3 許可するオリジンを一覧にする

本文5節の `my-api.mjs` をコピーして `my-api-v2.mjs` を作り、許可するオリジンを**一覧**にしてください。

- 許可するオリジンは `http://localhost:8310` と `http://127.0.0.1:8310` の2つ
- リクエストの `Origin` が一覧に**ちょうど一致**するときだけ、`Access-Control-Allow-Origin` にそのオリジンを入れる（`Access-Control-Allow-Origin` には1つしか書けないので、届いた `Origin` の値を返す）
- 一致しなければ、`Access-Control-Allow-Origin` を付けない
- すべてのレスポンスに `Vary: Origin` を付ける（本文5.3節）

確かめ方:

```sh
$ node my-api-v2.mjs                     # ターミナル1（my-api.mjs は止めておく）
$ curl -si -H 'Origin: http://127.0.0.1:8310' http://localhost:8311/api/hello | grep -i -E 'access-control|vary'
Vary: Origin
Access-Control-Allow-Origin: http://127.0.0.1:8310
$ curl -si -H 'Origin: http://evil.example' http://localhost:8311/api/hello | grep -i -E 'access-control|vary'
Vary: Origin
```

`curl -H 'Origin: ...'` で、ブラウザの代わりに `Origin` ヘッダを付けて送れます。ブラウザでも、`node samples/my-front.mjs` を起動して `http://localhost:8310/` と `http://127.0.0.1:8310/` の両方で「GET で呼ぶ」が成功することを確かめます。

ヒント: 配列に入っているかは `配列.includes(値)` で調べられます。

### 問題4 スクリプトの実行順を予想する（調べる問題）

`node samples/render-lab-server.mjs` を起動し、`http://localhost:8200/order` を開く**前に**、HTML（下に抜き出したもの）を読んで、ログに表示される順番を予想してください。括弧の中は、サーバがそのスクリプトを返すまでにわざと待つ時間です。

```html
<head>
  <script>/* ログを書く仕組み。DOMContentLoaded と load もログに書く */</script>
  <script defer src="/slow.js?ms=300&name=defer A（300ms）"></script>
  <script defer src="/slow.js?ms=100&name=defer B（100ms）"></script>
  <script async src="/slow.js?ms=600&name=async C（600ms）"></script>
  <script async src="/slow.js?ms=50&name=async D（50ms）"></script>
  <script type="module" src="/slow.js?ms=10&name=module E（10ms）"></script>
  <script>log("head のインライン F")</script>
</head>
<body>
  ...
  <script src="/slow.js?ms=200&name=body の普通の G（200ms）"></script>
  ...
  <script>log('body の最後の、普通の（インライン）スクリプト')</script>
</body>
```

1. A〜G、「body の最後の、普通の（インライン）スクリプト」、DOMContentLoaded、load の10個を、実行される順に並べる。
2. ページを開いて確かめる（何度か再読み込みして、順番が変わるものと変わらないものを確かめる）。予想と違ったものについて、本文3.2節の表で理由を説明する。
3. `defer B` は A より先に読み込み終わるのに、A の後に実行される。なぜこの決まりが必要なのか、「ライブラリと、それを使う自分のスクリプト」の例で説明する。

### 問題5 CORS についての主張を検証する（考える問題）

次の主張は正しいでしょうか。本文5節の実験（`my-front.mjs` と `my-api.mjs`、`cors-lab.mjs`）を思い出し、必要なら curl で確かめて、正しくない場合は正しく直してください。

1. 「CORS のエラーが出たリクエストは、サーバには届いていない」
2. 「API に CORS のヘッダを付けなければ、他のサイトからはその API を使えないので安全だ」
3. 「`http://localhost:3000` の画面から `http://localhost:4000` の API を呼ぶとき、両方とも自分の Mac の中なので CORS は関係ない」
4. 「CORS のエラーを直すには、ブラウザの拡張機能や起動オプションで CORS を無効にすればよい」

## 応用

### 問題6 オリジンとサイトを判定する関数

本文4.2節と4.4節の表を、コードにしてください。次の3つを export する `origin.mjs` を、`~/dev/ch09/exercises/` に作ります（テストが同じフォルダの `origin.mjs` を読み込むため）。

```js
export const PUBLIC_SUFFIXES = ['com', 'net', 'org', 'jp', 'co.jp', 'github.io'];
export function sameOrigin(a, b) { ... }  // 2つの URL が同じオリジンなら true
export function sameSite(a, b) { ... }    // 2つの URL が同じサイトなら true
```

- オリジンは「スキーム + ホスト名 + ポート」。本文4.2節のとおり、`new URL(...).origin` を比べれば、既定のポートや大文字・小文字も正しく扱えます
- サイトは「スキーム（`protocol`）+ 登録できるドメイン」。登録できるドメインは、`PUBLIC_SUFFIXES` のうち**いちばん長く一致するもの**に、その1つ左のラベルを足したもの（`shop.example.co.jp` → 公開の接尾辞は `co.jp`（`jp` より長い）→ `example.co.jp`）
- `PUBLIC_SUFFIXES` に一致しないホスト名（`localhost` など）と IP アドレスは、ホスト名そのものをサイトとする
- URL として読めない文字列は `TypeError`（`new URL` が投げるものをそのまま投げればよい）

```sh
$ cd exercises
$ node --test origin.test.mjs
ℹ pass 22
ℹ fail 0
```

ヒント:

- まず「ホスト名から登録できるドメインを求める関数」`registrableDomain(hostname)` を作ると、後が簡単です。
- ホスト名が接尾辞で終わるかは `hostname.endsWith('.' + suffix)` で調べます（`.` を付けないと、`example.com` が `e.com` で終わる、と判定されてしまう）。
- 接尾辞の前の部分は `hostname.slice(0, hostname.length - suffix.length - 1)`（`shop.example`）、そのいちばん右のラベルは `.split('.').pop()`（第5章4.4節の REPL）で取り出せます。
- IP アドレスかどうかは、`import net from 'node:net';` の `net.isIP(文字列)` が `0` でないかで分かります。

### 問題7 タスクの API を CORS に対応させる

[api-server.mjs](api-server.mjs) はタスクの API（8401番）で、[front-server.mjs](front-server.mjs)（中身は読まなくてよい）はそれを使う画面（8400番）です。両方を起動して `http://localhost:8400/` を開くと、タスクが表示されず、Console に CORS のエラーが出ます。

```sh
$ node exercises/api-server.mjs        # ターミナル1
$ node exercises/front-server.mjs      # ターミナル2 → http://localhost:8400/ を開く
```

`api-server.mjs` を `~/dev/ch09/cors-api-server.mjs` にコピーして、次の要件を満たしてください。`api-server.mjs` は第6章・第7章で書いたサーバと同じ書き方なので、まず全体を読んでから始めます。

- 許可するオリジンは `http://localhost:8400` と `http://127.0.0.1:8400` の2つ。一覧と**ちょうど一致**するときだけ許可する（問題3と同じ）
- 許可したオリジンからのリクエストには、`Access-Control-Allow-Origin`（そのオリジン）と `Access-Control-Allow-Credentials: true` を付ける。エラーのレスポンス（404、422 など）にも付ける
- すべてのレスポンスに `Vary: Origin` を付ける
- プリフライト（`OPTIONS`）には、オリジン・メソッド（`GET`、`POST`、`DELETE`）・ヘッダ（`Content-Type`）がすべて許可の範囲なら `204` と `Access-Control-Allow-Methods`・`Access-Control-Allow-Headers`・`Access-Control-Max-Age: 600` を返し、そうでなければ CORS のヘッダを付けずに `403` を返す

`bash exercises/check-cors.sh` がすべて成功し、ブラウザで追加・削除・ログイン状態（「ログイン状態: alice」。先に画面のリンクから `/api/login` を開く）の表示ができれば完成です。

```sh
$ node cors-api-server.mjs              # ターミナル1（api-server.mjs は止めておく）
$ bash exercises/check-cors.sh          # ターミナル3
[OK] 1. 許可したオリジンの GET に Allow-Origin
...
すべて成功しました
```

ヒント:

- CORS のヘッダを付ける関数 `setCors(req, res)` を作り、`handle` のはじめで呼ぶと、エラーのレスポンスも含めて、すべてのレスポンスに付きます（`res.setHeader` で付けたヘッダは、後で `res.end` するまで残る）。
- プリフライトで頼まれたメソッドは `req.headers['access-control-request-method']`、ヘッダは `req.headers['access-control-request-headers']`（`'content-type'` や `'content-type,x-admin'` のような、`,` で区切った小文字の文字列。無いこともある）です。
- `Access-Control-Allow-Credentials: true` の意味は本文5.4節です。

最後に考えてください: 「許可していないオリジンにも `Vary: Origin` を付ける」のはなぜか。付けないと、どんな順番でリクエストが来たときに問題が起きるか（ヒント: 第7章6.2節の CDN の例）。

## 発展

### 問題8 オープンリダイレクトを防ぐ

ログインが必要なページを開くと、ログインの画面に移り、ログインした後で元のページに戻る、という仕組みはよくあります。元のページは、`/login?next=/tasks/42` のように URL のクエリで渡し、ログインに成功したら `Location: /tasks/42` でリダイレクトします。

ここで `next` の値をそのまま使うと、`/login?next=https://evil.example/` のようなリンクを踏ませることで、**本物のサイトのログインの後に、偽のサイトへ飛ばす**ことができてしまいます（**オープンリダイレクト**）。利用者は本物のサイトで本物の証明書を確かめてログインしたので、その後に表示された偽のページを信じてしまいます。

`next` の値を受け取り、同じサイトの中のパスだけを返す関数 `safeRedirectPath(next, fallback = '/')` を持つ `safe-redirect.mjs` を、`~/dev/ch09/exercises/` に作ってください。

- `/` で始まる、同じサイトの中のパスなら、正規化した形（`/a/../b` → `/b`、日本語はパーセントエンコード）で返す
- 次のようなものは、すべて `fallback` を返す
  - 別のホストを指すもの: `https://evil.example/`、`//evil.example/`、`/\evil.example/`、`/` + タブ + `/evil.example`
  - `javascript:` や `data:` で始まるもの
  - `/` で始まらないもの、文字列でないもの（`undefined`、配列など）

```sh
$ cd exercises
$ node --test safe-redirect.test.mjs
ℹ pass 23
ℹ fail 0
```

ヒント: `next.startsWith('/') && !next.startsWith('//')` のような**文字列の見た目による判定**では、テストの一部が通りません。ブラウザは `\` を `/` として扱い、タブや改行を取り除いてから URL を解釈します。ブラウザと同じ規則で解釈してくれる `new URL(next, 基準)` を使い、結果の `origin` が基準のオリジンのままかを調べましょう（本文1.2節）。基準には、実在しない `https://base.invalid` のようなものを使います（`.invalid` は、決して実在しないと決められたドメイン）。

できたら、次の問いにも答えてください。

1. `/\evil.example/` は、なぜ別のホストを指すのか。REPL で `new URL('/\\evil.example/', 'https://example.com').href` を確かめる（JavaScript の文字列の中では、`\` を1つ書くのに `\\` と書く）。
2. 文字列の見た目で判定する方法（`startsWith` など）が危ないのはなぜか、一般的な教訓として説明する。
