# 第9章 ブラウザの仕組み

ここまでは、curl や Node.js のプログラムから HTTP を話してきました。この章の主役は**ブラウザ**です。ブラウザは HTTP のクライアントであると同時に、受け取った HTML・CSS・JavaScript を組み立てて画面に描くプログラムであり、さらに**よその人が書いたコードを、あなたの Mac の上で安全に動かす**ための仕組みを持っています。
URL の構造、URL を入力してから画面に表示されるまでの流れ、スクリプトの読み込み方による表示の違い、そして Web アプリを作ると必ずぶつかる**同一オリジンポリシー**と **CORS** を、小さなプログラムを書いて実験しながら学びます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第5〜8章（DNS、HTTP、Cookie、HTTPS）、第7章8節（`node --test`）、第4章11節（Chrome DevTools） |
| この章のゴール | URL の各部分の名前と、相対 URL の解決のしかたが分かる / URL を入力してから表示されるまでを説明できる / `defer`・`async`・`type="module"` の違いが分かる / オリジンとサイトを区別できる / CORS のエラーの原因を読み解き、サーバ側で正しく直せる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形、スクリプトの読み込み方を比べるサーバ、CORS の実験（2つのサーバ） |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 実習は `~/dev/ch09/` で行います（教材のフォルダは見本として残しておくため）。最初に作業フォルダを作り、教材の `samples` と `exercises` をコピーします（やり方は第5章の「読み方」と同じです）。
>
>   ```sh
>   $ mkdir -p ~/dev/ch09 && cd ~/dev/ch09
>   $ cp -R （ここに Finder から ch09-browser の samples と exercises をドラッグ） .
>   ```
>
> - この章のコマンドは、すべて `~/dev/ch09/` で実行します。ブラウザは Chrome を使い、DevTools（`⌘ + ⌥ + I`）を開いて確かめます。
> - 「**手を動かす**」の所は、実際に打って動かしてください。完成形は `samples/` にあります。
> - ブラウザの表示や時間は、この教材の作成時に Chromium（Chrome の元になっているブラウザ）で確かめたものです。Chrome、Safari、Firefox の版によって、細かい表示や時間は違うことがあります。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| `URL` と `URLSearchParams`（1節） | 第4部でリクエストのパスとクエリを読むとき。第5部の Express の `req.query` の中身を理解するとき |
| 相対 URL の解決（1.2節） | 第4部の静的ファイルのサーバ、第8部で画像や JS のパスがずれたとき |
| `defer`・`async`・`type="module"`（3節） | 第8部の React（Vite が出力する HTML）。ページの表示が遅い原因を探すとき |
| オリジンとサイト（4節） | 第4部 第22章・第10部の Cookie の `SameSite`、CSRF 対策 |
| CORS（5節） | 第5部で Express の API を別のポートの画面から呼ぶとき、第8部の React + API |
| オープンリダイレクト対策（練習問題8） | 第4部 第22章・第10部のログインの後の「元のページに戻る」 |

---

## 1. URL の構造

### 1.1 URL の部品

**URL**（Uniform Resource Locator）は、「どこにある、何を」を1行で表したものです。

```
  https://user:pass@shop.example.com:8443/items/42?color=red&size=M#reviews
  └─┬─┘   └───┬───┘ └──────┬───────┘ └┬─┘└───┬───┘└───────┬───────┘└──┬──┘
 スキーム  ユーザー情報     ホスト名      ポート  パス          クエリ          フラグメント
```

Node.js とブラウザには、同じ **`URL`** クラスが組み込まれていて、URL を部品に分けられます。

**手を動かす**: `~/dev/ch09/url-parts.mjs` を作ります（完成形は [samples/url-parts.mjs](samples/url-parts.mjs)）。

```js
const url = new URL(process.argv[2]);

console.log(`スキーム    : ${url.protocol}`);
console.log(`ホスト名    : ${url.hostname}`);
console.log(`ポート      : ${url.port}`);
console.log(`パス        : ${url.pathname}`);
console.log(`クエリ      : ${url.search}`);
console.log(`フラグメント: ${url.hash}`);
console.log(`オリジン    : ${url.origin}`);
for (const [name, value] of url.searchParams) {
  console.log(`  クエリの ${name} = ${value}`);
}
```

`for (const [name, value] of url.searchParams)` は、クエリの `名前=値` を1つずつ取り出し、名前と値に分けて受け取る書き方です（第6章5.4節の分割代入）。

```sh
$ node url-parts.mjs 'https://example.com:8443/a/b?q=1&x=2#top'
スキーム    : https:
ホスト名    : example.com
ポート      : 8443
パス        : /a/b
クエリ      : ?q=1&x=2
フラグメント: #top
オリジン    : https://example.com:8443
  クエリの q = 1
  クエリの x = 2
```

URL は `'...'` で囲みます。囲まないと、シェルが `?` や `&` や `#` を特別な記号として扱ってしまうからです。日本語や空白を入れて試してみましょう。

```sh
$ node url-parts.mjs 'https://例え.jp/a b/?q=日本語'
スキーム    : https:
ホスト名    : xn--r8jz45g.jp
ポート      :
パス        : /a%20b/
クエリ      : ?q=%E6%97%A5%E6%9C%AC%E8%AA%9E
...
  クエリの q = 日本語
```

ポートは、スキームの既定（https なら 443）なら空になります。もっと詳しく表示する [samples/url-demo.mjs](samples/url-demo.mjs)（中身は読まなくてよい）もあります。

```sh
$ node samples/url-demo.mjs 'https://user:pass@例え.jp:8443/a/b c/?q=日本語&x=1&x=2#top'
入力: https://user:pass@例え.jp:8443/a/b c/?q=日本語&x=1&x=2#top
結果: https://user:pass@xn--r8jz45g.jp:8443/a/b%20c/?q=%E6%97%A5%E6%9C%AC%E8%AA%9E&x=1&x=2#top

  protocol  "https:"
  username  "user"
  password  "pass"
  host      "xn--r8jz45g.jp:8443"
  hostname  "xn--r8jz45g.jp"
  port      "8443"
  pathname  "/a/b%20c/"
  search    "?q=%E6%97%A5%E6%9C%AC%E8%AA%9E&x=1&x=2"
  hash      "#top"
  origin    "https://xn--r8jz45g.jp:8443"
  searchParams:
    "q" = "日本語"
    "x" = "1"
    "x" = "2"
```

| 部品 | `URL` のプロパティ | 説明 |
| --- | --- | --- |
| スキーム | `protocol` | `https:`、`http:`、`file:`、`mailto:` など |
| ユーザー情報 | `username`、`password` | ほとんど使われない。URL に入れると履歴やログに残るので、パスワードを入れてはいけない |
| ホスト名 | `hostname` | DNS で調べる名前（第5章）。日本語のドメイン名は、**Punycode**（`xn--` で始まる ASCII の形）に変換される |
| ポート | `port` | 省略するとスキームの既定（http は 80、https は 443）。既定と同じ値は空文字になる |
| パス | `pathname` | サーバの中の場所。スペースや日本語は**パーセントエンコード**される（`%20`、`%E6%97%A5…`） |
| クエリ | `search`、`searchParams` | `?` 以降の `名前=値` を `&` でつないだもの。同じ名前を複数並べてもよい（`searchParams.getAll('x')`） |
| フラグメント | `hash` | `#` 以降。**サーバには送られない**。ページの中の位置や、SPA の画面の切り替えに使う（第10章） |
| オリジン | `origin` | スキーム + ホスト名 + ポート。4節で詳しく扱う |

**パーセントエンコード**は、URL に使えない文字（スペース、日本語、`?` や `&` などの区切り文字そのもの）を、UTF-8 のバイトを `%` + 16進数で書いたものです。第7章でフォームの送信の中身が `memo=%E3%83%86…` になっていたのも同じです。JavaScript では `encodeURIComponent('日本語')` で作り、`decodeURIComponent` で戻します（第7章3.3節）。URL を文字列のつなぎ合わせで作ると、エンコードし忘れや二重のエンコードが起きやすいので、`URL` の `searchParams` を使いましょう。`node` だけを打って REPL で試します（第5章）。

```
> const url = new URL('https://example.com/search')
> url.searchParams.set('q', 'Node.js & 日本語')
> url.href
'https://example.com/search?q=Node.js+%26+%E6%97%A5%E6%9C%AC%E8%AA%9E'
> url.searchParams.get('q')
'Node.js & 日本語'
```

`set(名前, 値)` でクエリを足し（同じ名前があれば置き換え）、`get(名前)` で読みます。`&` は `%26` に、空白は `+` にエンコードされました。

### 1.2 相対 URL の解決

HTML の中の `<a href="../img/logo.png">` のような**相対 URL** は、今のページの URL を基準にして、完全な URL に直してから使われます。`new URL(相対, 基準)` で同じ計算ができます。REPL で試しましょう。

```
> const base = 'https://example.com/docs/guide/index.html'
> new URL('../img/logo.png', base).href
'https://example.com/docs/img/logo.png'
> new URL('//cdn.example.net/a.js', base).href
'https://cdn.example.net/a.js'
```

下の表の他の行も、REPL で確かめてみてください。

| 相対 URL | 基準 `https://example.com/docs/guide/index.html` からの結果 |
| --- | --- |
| `logo.png` | `https://example.com/docs/guide/logo.png`（同じフォルダ） |
| `../img/logo.png` | `https://example.com/docs/img/logo.png`（1つ上） |
| `/img/logo.png` | `https://example.com/img/logo.png`（ホストの一番上から） |
| `?page=2` | `https://example.com/docs/guide/index.html?page=2`（クエリだけ替える） |
| `#top` | `https://example.com/docs/guide/index.html#top` |
| `//cdn.example.net/a.js` | `https://cdn.example.net/a.js`（**スキームだけ引き継ぎ、ホストは替わる**） |

最後の `//` で始まる形（スキーム相対 URL）は、見た目はパスのようですが、**別のホスト**を指します。練習問題8で、これが原因のセキュリティの穴を扱います。

基準の URL が `/docs/guide`（最後に `/` が無い）か `/docs/guide/`（有る）かで、相対 URL の結果が変わることにも注意してください。`/docs/guide` の `logo.png` は `/docs/logo.png` になります。

## 2. URL を入力してから表示されるまで

アドレスバーに `https://example.com/` と入力して Return を押すと、ブラウザは次のことを行います。ここまでの章で学んだことが、すべて登場します。

| 順番 | すること | 学んだ章 |
| --- | --- | --- |
| 1 | 入力が URL か検索語かを判断する。HSTS の記録があれば `https://` にする | 第8章7節 |
| 2 | キャッシュに新鮮なものがあれば、それを使う | 第7章5節 |
| 3 | DNS でホスト名から IP アドレスを調べる（OS のキャッシュ、`/etc/hosts`、リゾルバ） | 第5章5節 |
| 4 | TCP の接続を作る（HTTP/3 なら QUIC） | 第5章4節、第7章9節 |
| 5 | TLS のハンドシェイクをして、証明書を確かめる | 第8章4節 |
| 6 | HTTP のリクエストを送る（Cookie を付ける） | 第6章、第7章3節 |
| 7 | レスポンスを受け取る。リダイレクトなら1に戻る | 第7章4節 |
| 8 | HTML を少しずつ**解析**して、**DOM**（HTML の部品の木構造）を作る | この章 3節 |
| 9 | 途中で見つけた CSS・JavaScript・画像を、並行して取りに行く（それぞれ 3〜7 を行う） | |
| 10 | CSS から **CSSOM** を作り、DOM と組み合わせて、何をどこに描くかを計算する（レイアウト） | |
| 11 | 画面に描く（ペイント） | |

**手を動かす**: Chrome で好きなサイトを開き、DevTools の Network タブで最初のリクエスト（HTML）を選んで、**Timing** タブを見てください。3〜7 のそれぞれにかかった時間が表示されます（DNS Lookup、Initial connection、SSL、Waiting for server response など）。もう一度読み込むと、DNS や接続の時間が無くなる（前の接続を使い回す）ことも確かめましょう。

> 8〜11 の「ブラウザの中で画面を作る」部分（レンダリング）は、とても奥が深い話題です。この教材では、Web アプリを作るのに必要な「どの順番で何が起きるか」だけを扱います。第8部で React を学ぶときに、DOM の更新と描き直しの話が再び登場します。

## 3. HTML の解析とスクリプト

### 3.1 普通の script は解析を止める

ブラウザは HTML を上から順に解析しながら DOM を作ります。途中で `<script src="...">` を見つけると、**スクリプトを読み込んで実行し終わるまで、解析を止めます**。スクリプトが `document.write` で HTML を書き足したり、その時点までの DOM を操作したりする可能性があるからです。

[samples/render-lab-server.mjs](samples/render-lab-server.mjs)（中身は読まなくてよい）は、わざと 1.5秒遅れて届く JavaScript と CSS を使って、この違いを確かめるサーバです。

```sh
$ node samples/render-lab-server.mjs        # ブラウザで http://localhost:8200/ を開き、各ページを開く
```

各ページには、時刻付きのログが表示されます。`★` は、画面に最初に何かが表示された時刻（First Contentful Paint）です。Chromium で確かめた結果を抜き出すと、次のようになりました。

| ページ | 書き方 | 画面に最初に表示された | DOMContentLoaded |
| --- | --- | --- | --- |
| `/blocking` | `<head>` に `<script src>` | **1.54秒** | 1.54秒 |
| `/body-end` | `</body>` の直前に `<script src>` | 0.03秒 | 1.51秒 |
| `/defer` | `<head>` に `<script defer src>` | 0.03秒 | 1.51秒（スクリプトの実行の後） |
| `/async` | `<head>` に `<script async src>` | 0.05秒 | **0.02秒**（スクリプトを待たない） |
| `/module` | `<head>` に `<script type="module" src>` | 0.03秒 | 1.51秒（スクリプトの実行の後） |
| `/css` | `<head>` に遅い `<link rel="stylesheet">` | **1.53秒** | 1.53秒 |

`/blocking` では、スクリプトが届くまでの 1.5秒間、画面は真っ白のままでした。

### 3.2 defer・async・module

| 書き方 | 読み込み | 実行するタイミング | 実行の順番 |
| --- | --- | --- | --- |
| `<script src>` | 解析を**止めて**読み込む | 読み込んだらすぐ | 書いた順 |
| `<script defer src>` | 解析と**並行して**読み込む | HTML の解析が終わってから（DOMContentLoaded の直前） | **書いた順** |
| `<script async src>` | 解析と並行して読み込む | 読み込み終わったらすぐ（解析の途中でも） | **読み込み終わった順**（バラバラ） |
| `<script type="module" src>` | 解析と並行して読み込む | `defer` と同じ | 書いた順 |
| `<script type="module" async src>` | 並行 | `async` と同じ | 読み込み終わった順 |

使い分けの目安は次のとおりです。

- **自分のアプリのスクリプト**は `defer` か `type="module"`。DOM ができてから、書いた順に実行されるので、`document.querySelector` で要素を探せて、ライブラリとそれを使うコードの順番も守られます。今のビルドツール（第8部の Vite）は `type="module"` を出力します。
- **他と関係ない独立したスクリプト**（アクセス解析など）は `async`。
- 昔からの「`</body>` の直前に置く」方法は、画面は早く表示されますが、HTML を全部受け取って解析するまでスクリプトの**読み込みが始まらない**ので、`defer` の方が速くなることが多いです。

### 3.3 CSS も表示を止める

`/css` では、スクリプトが無いのに、画面が 1.5秒間表示されませんでした。ブラウザは、CSS が届く前にページを描くと、スタイルの無い画面が一瞬見えて（FOUC）、すぐに描き直すことになるので、`<head>` の CSS が揃うまで描くのを待ちます。さらに、**CSS の後ろにある普通のスクリプトは、CSS が届くまで実行されません**（スクリプトが CSS で決まる値を読むかもしれないため）。`/css` のログの「body の最後の、普通の（インライン）スクリプト」が 1.53秒になっているのはそのためです。

ページを速く表示するには、最初の表示に必要な CSS を小さく保ち、スクリプトは `defer` や `type="module"` にします。

### 3.4 DOMContentLoaded と load

| イベント | 起きるとき |
| --- | --- |
| `DOMContentLoaded` | HTML の解析が終わり、`defer` と module のスクリプトを実行し終えたとき（画像や `async` のスクリプトは待たない） |
| `load` | 画像・CSS・`async` のスクリプトなど、ページが使うものをすべて読み終えたとき |

## 4. 同一オリジンポリシー

### 4.1 なぜ必要か

ブラウザでは、いろいろなサイトのページを同時に開きます。もし、`https://evil.example` のページの JavaScript が、`fetch('https://bank.example/api/balance')` で銀行の残高を**読めてしまったら**どうなるでしょうか。ブラウザは `bank.example` の Cookie を自動で付けて送る（第7章3節）ので、あなたがログイン中なら、攻撃者のページはあなたとして銀行の情報を読めてしまいます。

これを防ぐのが**同一オリジンポリシー**（Same-Origin Policy）です。あるページの JavaScript は、**同じオリジン**のレスポンスしか読めません。

### 4.2 オリジン

**オリジン**は「スキーム + ホスト名 + ポート」の組です。3つすべてが同じときだけ、同じオリジンです。

| `http://localhost:8300/a` と比べる URL | 同じオリジンか | 理由 |
| --- | --- | --- |
| `http://localhost:8300/b/c?x=1` | ○ | パスやクエリは関係ない |
| `http://localhost:8301/` | × | ポートが違う |
| `https://localhost:8300/` | × | スキームが違う |
| `http://127.0.0.1:8300/` | × | ホスト名が違う（同じ機械を指していても） |
| `http://sub.localhost:8300/` | × | ホスト名が違う |

REPL で、URL の `origin` を比べて確かめられます。

```
> new URL('http://localhost:8300/a').origin === new URL('http://localhost:8300/b/c?x=1').origin
true
> new URL('http://localhost:8300/a').origin === new URL('http://127.0.0.1:8300/').origin
false
> new URL('https://example.com:443/').origin
'https://example.com'
```

既定のポート（https の 443）は、`origin` では省かれます。だから `https://example.com:443/` と `https://example.com/` は同じオリジンです。

開発中、画面を Vite（5173番など）で、API を Express（3000番など）で動かすと、**ポートが違うので別のオリジン**になります（第8部）。

### 4.3 制限されることと、されないこと

同一オリジンポリシーは、「よそのオリジンとの関わりを全部禁止する」ものではありません。

| | よそのオリジンに対して |
| --- | --- |
| `<img src>`、`<script src>`、`<link rel="stylesheet">`、`<iframe>` で**埋め込む** | できる（CDN の画像やライブラリを使える） |
| `<a href>` で移動する、`<form>` で**送信する** | できる |
| `fetch` で**送る** | 送ること自体はできる（ただし、5節のプリフライトが必要な送り方は、許可されたときだけ） |
| `fetch` のレスポンスを**読む** | **できない**（CORS で許可されたときだけ） |
| `<iframe>` の中の DOM を JavaScript で触る | できない |
| Cookie、`localStorage`、IndexedDB | オリジン（Cookie は 4.4節のとおり少し違う）ごとに分かれている |

大事なのは「**送ることはできるが、結果を読めない**」場合があることです。この「送れてしまう」ことを悪用するのが CSRF という攻撃で、第10部で対策を学びます。

### 4.4 オリジンとサイト

Cookie の `SameSite` 属性（第7章3.3節）は、オリジンではなく**サイト**で判断します。サイトは、おおまかに「スキーム + **登録できるドメイン**」です。登録できるドメインとは、`example.com` や `example.co.jp` のように、誰かが登録して持てる一番上の部分です（`.com` や `.co.jp` の一覧は Public Suffix List で決まっています）。**ポートとサブドメインは無視されます**。

| 2つの URL | 同じオリジン | 同じサイト |
| --- | --- | --- |
| `https://www.example.com` と `https://api.example.com` | × | ○ |
| `http://localhost:8300` と `http://localhost:8301` | × | ○ |
| `https://example.com` と `https://example.co.jp` | × | × |
| `http://example.com` と `https://example.com` | × | ×（スキームが違う） |
| `https://alice.github.io` と `https://bob.github.io` | × | ×（`github.io` は Public Suffix List に載っているので、それぞれが別のサイト） |

`SameSite=Lax`（今の Chrome の既定）の Cookie は、**同じサイト**へのリクエストには付けられ、よそのサイトからのリクエストには（リンクで移動するときなどを除いて）付けられません。練習問題6で、オリジンとサイトを判定する関数を作ります。

## 5. CORS

### 5.1 手を動かす: CORS のエラーを起こして、直す

API を画面と別のオリジンに置くと、同一オリジンポリシーのせいで、画面の JavaScript は API のレスポンスを読めません。そこで、**サーバが「このオリジンには読ませてよい」とヘッダで許可する**仕組みが **CORS**（Cross-Origin Resource Sharing、オリジン間リソース共有）です。

実際にエラーを起こしてみます。画面のサーバ（8310番）と API のサーバ（8311番）を作ります。

`~/dev/ch09/my-front.mjs`（画面。完成形は [samples/my-front.mjs](samples/my-front.mjs)）:

```js
import http from 'node:http';

// ブラウザで動く HTML と JavaScript。ボタンを押すと、8311番の API を fetch する
const page = `<!doctype html>
<meta charset="utf-8">
<title>CORS の実験</title>
<h1>CORS の実験（画面は 8310番、API は 8311番）</h1>
<button id="get">GET で呼ぶ</button>
<pre id="out"></pre>
<script type="module">
  const out = document.querySelector('#out');

  async function call(options) {
    try {
      const res = await fetch('http://localhost:8311/api/hello', options);
      out.textContent = await res.text();
    } catch (err) {
      out.textContent = 'エラー: ' + err.message + '（Console を見る）';
    }
  }

  document.querySelector('#get').addEventListener('click', () => call({}));
</script>
`;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(page);
});

server.listen(8310, '127.0.0.1', () => {
  console.log('画面: http://localhost:8310/');
});
```

`page` の中は、ブラウザで動く HTML と JavaScript です（第4章）。`fetch(URL, options)` は、ブラウザから HTTP のリクエストを送る関数で、`await res.text()` でレスポンスのボディを文字列として受け取ります。

`~/dev/ch09/my-api.mjs`（API。まずは CORS のことを何もしない）:

```js
import http from 'node:http';

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}  Origin: ${req.headers.origin ?? '（なし）'}`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`${req.method} を受け取りました（API のサーバから）\n`);
});

server.listen(8311, '127.0.0.1', () => {
  console.log('API: http://localhost:8311/api/hello');
});
```

```sh
$ node my-api.mjs           # ターミナル1
$ node my-front.mjs         # ターミナル2 → Chrome で http://localhost:8310/ を開き、DevTools の Console を開く
```

「GET で呼ぶ」を押すと、画面に `エラー: Failed to fetch` と表示され、Console に次のエラーが出ます。

```
Access to fetch at 'http://localhost:8311/api/hello' from origin 'http://localhost:8310' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

ところが、API のターミナル（ターミナル1）を見ると、**リクエストは届いています**。

```
GET /api/hello  Origin: http://localhost:8310
```

ブラウザは、よそのオリジンへのリクエストに **`Origin`** ヘッダ（どのオリジンのページから送ったか）を付けて送り、レスポンスに「読ませてよい」という許可が無いので、JavaScript に**読ませなかった**のです。curl で同じ URL を開くと、問題なく読めます（`curl http://localhost:8311/api/hello`）。CORS の確認は、ブラウザだけが行います。

直すのは API の側です。`my-api.mjs` の `console.log` の次に1行足して、API を起動し直します（`Ctrl + C` で止めて、もう一度 `node my-api.mjs`）。

```js
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8310'); // このオリジンの JavaScript には読ませてよい
```

もう一度「GET で呼ぶ」を押すと、`GET を受け取りました（API のサーバから）` と表示されます。

**もっと実験する**: [samples/cors-lab.mjs](samples/cors-lab.mjs)（中身は読まなくてよい）は、画面のサーバ（8300番）と、いろいろな設定の API のサーバ（8301番）を同時に起動します。

```sh
$ node samples/cors-lab.mjs     # ブラウザで http://localhost:8300/ を開き、DevTools の Console と Network を開く
画面のサーバ: http://localhost:8300/
API のサーバ: http://localhost:8301/
```

ボタンを順に押した結果（Chromium で確かめたもの）と、そのときの API のサーバの表示です。

| 実験 | 結果 | Console のエラー（抜粋） |
| --- | --- | --- |
| 1. CORS のヘッダが無い API を GET | **失敗**（`TypeError: Failed to fetch`） | `No 'Access-Control-Allow-Origin' header is present` |
| 2. `Access-Control-Allow-Origin: http://localhost:8300` | 成功 | |
| 3. `Access-Control-Allow-Origin: *` | 成功 | |
| 4. CORS の無い API を `mode: 'no-cors'` で | 「成功」だが、中身は読めない（`type=opaque`、`status=0`） | |
| 5. PUT と JSON（プリフライトに答える API） | 成功 | |
| 6. PUT と JSON（プリフライトに答えない API） | 失敗 | `Method PUT is not allowed by Access-Control-Allow-Methods in preflight response` |
| 7. フォームと同じ形式の POST を CORS の無い API へ | 失敗 | `No 'Access-Control-Allow-Origin' header is present` |
| 8. Cookie 付きで、正しく設定した API へ | 成功（`session` が読めた） | |
| 9. Cookie 付きで、`Access-Control-Allow-Origin: *` の API へ | 失敗 | `must not be the wildcard '*' when the request's credentials mode is 'include'` |
| 10. Cookie を付けずに `/api/me` へ | 成功（`session` は `null`） | |

```
[API] GET     /api/no-cors     Origin: http://localhost:8300  Cookie: （なし）    ← 1. 失敗したのに、届いている
[API] GET     /api/simple      Origin: http://localhost:8300  Cookie: （なし）
[API] GET     /api/star        Origin: http://localhost:8300  Cookie: （なし）
[API] GET     /api/no-cors     Origin: （なし）  Cookie: （なし）                  ← 4. no-cors では Origin を付けない
[API] OPTIONS /api/preflight   Origin: http://localhost:8300  Cookie: （なし）    ← 5. まずプリフライト
[API] PUT     /api/preflight   Origin: http://localhost:8300  Cookie: （なし）    ←    許可されたので本番の PUT
[API] OPTIONS /api/simple      Origin: http://localhost:8300  Cookie: （なし）    ← 6. プリフライトだけで、PUT は送られなかった
[API] POST    /api/no-cors     Origin: http://localhost:8300  Cookie: （なし）    ← 7. 失敗したのに、POST は届いている
[API] GET     /api/me          Origin: http://localhost:8300  Cookie: api_session=bcef1b26a0e35e3a
[API] GET     /api/me-star     Origin: http://localhost:8300  Cookie: api_session=bcef1b26a0e35e3a
[API] GET     /api/me          Origin: http://localhost:8300  Cookie: （なし）
```

**1 と 7 に注目してください**。ブラウザに「失敗」と表示されても、**リクエストはサーバに届いて処理されています**。CORS が止めているのは「JavaScript がレスポンスを**読む**こと」であって、「送ること」ではありません。7 がもし「送金する」API だったら、送金は実行されてしまいます。

### 5.2 単純なリクエストとプリフライト

ブラウザは、よそのオリジンへのリクエストを2種類に分けます。

| 種類 | 条件 | ブラウザの動き |
| --- | --- | --- |
| **単純なリクエスト**（simple request） | メソッドが `GET`・`HEAD`・`POST` で、ヘッダが基本的なものだけ、`Content-Type` が `application/x-www-form-urlencoded`・`multipart/form-data`・`text/plain` のどれか | そのまま送り、レスポンスの `Access-Control-Allow-Origin` を見て、読ませるか決める |
| それ以外（`PUT`、`DELETE`、`Content-Type: application/json`、独自のヘッダなど） | | 本番のリクエストの前に、`OPTIONS` で**プリフライト**（事前の問い合わせ）を送り、許可されたときだけ本番を送る |

単純なリクエストの条件は、「HTML の `<form>` で昔から送れたもの」と同じです。フォームでは昔から、よそのサイトに POST できました。CORS ができる前から送れたものは、今も送れるようにしておき（そうしないと既存のサイトが壊れる）、それ以外の**新しい送り方**は、サーバが CORS を知っていて許可したときだけ送る、という考え方です。

**手を動かす**: `my-front.mjs` の「GET で呼ぶ」のボタンの次に、PUT と JSON で呼ぶボタンを足します。

```html
<button id="put">PUT と JSON で呼ぶ</button>
```

```js
  document.querySelector('#put').addEventListener('click', () =>
    call({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"name":"alice"}' }),
  );
```

画面のサーバを起動し直して、ページを再読み込みし、「PUT と JSON で呼ぶ」を押します。エラーになり、API のターミナルには、PUT ではなく **OPTIONS** が届いています。

```
OPTIONS /api/hello  Origin: http://localhost:8310
```

```
Access to fetch at 'http://localhost:8311/api/hello' from origin 'http://localhost:8310' has been blocked by CORS policy:
Method PUT is not allowed by Access-Control-Allow-Methods in preflight response.
```

ブラウザは、PUT を送ってよいかを OPTIONS で問い合わせ、許可の答えが無かったので、PUT を**送りませんでした**。`my-api.mjs` の `Access-Control-Allow-Origin` の行の次に、プリフライトへの答えを足します（完成形は [samples/my-api.mjs](samples/my-api.mjs)）。

```js
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    res.end();
    return;
  }
```

API を起動し直して押すと、`PUT を受け取りました` と表示され、API のターミナルには `OPTIONS` の後に `PUT` が届きます。

`cors-lab.mjs` のプリフライトのやり取り（実験5）を詳しく見ると、次のようになっています。

```
OPTIONS /api/preflight HTTP/1.1
Origin: http://localhost:8300
Access-Control-Request-Method: PUT                    ← 「PUT で送りたい」
Access-Control-Request-Headers: content-type,x-token  ← 「このヘッダを付けたい」

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:8300
Access-Control-Allow-Methods: GET, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, X-Token
Access-Control-Max-Age: 10                            ← この答えを10秒間覚えておいてよい
```

### 5.3 CORS のヘッダ

| レスポンスのヘッダ | 意味 |
| --- | --- |
| `Access-Control-Allow-Origin` | 読ませてよいオリジン。1つのオリジンか `*`（どこでも）。**複数は書けない**ので、複数を許したいときは、リクエストの `Origin` を許可の一覧と照らし合わせて、合っていればその値を返す |
| `Access-Control-Allow-Methods` | （プリフライトへの答え）許可するメソッド |
| `Access-Control-Allow-Headers` | （プリフライトへの答え）許可するリクエストのヘッダ |
| `Access-Control-Allow-Credentials: true` | Cookie 付きのリクエストのレスポンスを読ませてよい。このときは `Allow-Origin` に `*` を使えない |
| `Access-Control-Max-Age` | プリフライトの答えを覚えておいてよい秒数 |
| `Access-Control-Expose-Headers` | JavaScript から読ませてよいレスポンスのヘッダ（既定では一部のヘッダしか読めない） |
| `Vary: Origin` | `Origin` によって `Allow-Origin` の値を変えるときに付ける（第7章6.2節と同じ理由） |

### 5.4 Cookie と CORS

`fetch` は、よそのオリジンへのリクエストには、既定では Cookie を**付けません**（`credentials: 'same-origin'`）。`credentials: 'include'` を指定すると付けますが、そのレスポンスを読むには、サーバが

- `Access-Control-Allow-Origin` に `*` ではなく**具体的なオリジン**を書き、
- `Access-Control-Allow-Credentials: true` を付ける

必要があります（実験8・9）。さらに、Cookie 自体が送られるかは `SameSite` 属性で決まります。`localhost:8300` と `localhost:8301` は**同じサイト**なので、`SameSite=Lax` の Cookie も送られました（4.4節）。画面と API が別のサイト（`app.example.com` と `api.other.example`）なら、`SameSite=None; Secure` にする必要があり、HTTPS が必須になります。

### 5.5 CORS についてのよくある誤解

- **「curl では動くのに、ブラウザで動かないのは、サーバが壊れているから」** → CORS は**ブラウザだけ**が行う確認です。curl や Node.js の `fetch` は、同一オリジンポリシーを持たないので、CORS のヘッダが無くても結果を読めます。ブラウザで CORS のエラーが出たら、直す場所は**サーバのレスポンスのヘッダ**です。
- **「CORS を設定すれば API が安全になる」** → 逆です。CORS は同一オリジンポリシーという**制限を緩める**仕組みです。CORS で守れるのはブラウザを使う利用者で、curl やスクリプトからの直接のアクセスは何も防げません。API の認証や入力の検査は、別に必要です（第10部）。
- **「とりあえず `Access-Control-Allow-Origin` にリクエストの `Origin` をそのまま返せばよい」** → それは「すべてのオリジンに許可する」のと同じです。Cookie 付きで許可していると、どんなサイトからでも、ログイン中の利用者の情報を読めるようになります。許可するオリジンの一覧を決めて、照らし合わせます。

Flask では flask-cors、第5部の Express では cors というパッケージがこれらのヘッダを付けてくれますが、どのヘッダが何をしているかを知っていれば、設定の意味が分かり、エラーにも対処できます。練習問題3・7で、自分で実装します。

## まとめ

- URL は「スキーム・ホスト・ポート・パス・クエリ・フラグメント」。`URL` と `URLSearchParams` で組み立てて、パーセントエンコードを任せる。`//` で始まる相対 URL は別のホストを指す。
- URL を入力すると、HSTS・キャッシュ・DNS・TCP・TLS・HTTP を経て HTML を受け取り、DOM と CSSOM を作って描く。
- 普通の `<script src>` は HTML の解析を止める。アプリのスクリプトは `defer` か `type="module"`、独立したものは `async`。`<head>` の CSS も表示を止める。
- オリジンは「スキーム + ホスト + ポート」。サイトは「スキーム + 登録できるドメイン」で、`SameSite` はサイトで判断する。
- 同一オリジンポリシーは、よそのオリジンのレスポンスを**読む**ことを止める。送ること自体は止めないことがある。
- CORS は、サーバがヘッダで読み取りを許可する仕組み。単純でないリクエストはプリフライトが先に送られる。Cookie 付きは具体的なオリジンと `Allow-Credentials` が必要。CORS はブラウザだけの確認で、API の守りにはならない。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- MDN「URL とは何か」: https://developer.mozilla.org/ja/docs/Learn/Common_questions/Web_mechanics/What_is_a_URL
- MDN「同一オリジンポリシー」: https://developer.mozilla.org/ja/docs/Web/Security/Same-origin_policy
- MDN「オリジン間リソース共有（CORS）」: https://developer.mozilla.org/ja/docs/Web/HTTP/CORS
- MDN「script 要素」（defer と async）: https://developer.mozilla.org/ja/docs/Web/HTML/Element/script
- web.dev「Understanding "same-site" and "same-origin"」: https://web.dev/articles/same-site-same-origin
- WHATWG URL Standard: https://url.spec.whatwg.org/
- Public Suffix List: https://publicsuffix.org/

前の章: [第8章 HTTPS と TLS](../ch08-https-tls/README.md) ／ 次の章: [第10章 Web アプリの構成パターン](../ch10-web-architecture/README.md)
