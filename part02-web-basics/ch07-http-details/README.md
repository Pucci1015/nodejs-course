# 第7章 HTTP の詳細

第6章で、HTTP のメッセージが「開始行・ヘッダ・空行・ボディ」でできていることを学びました。この章では、Web アプリを作るときに必ず出会う**ヘッダの働き**を、`node:http` で小さなサーバを書きながら1つずつ確かめます。文字コード、Cookie、リダイレクト、キャッシュ、圧縮、言語の出し分け、そして HTTP/2・HTTP/3 です。
Flask の `redirect(url_for(...))` や `set_cookie` が、どのヘッダになって流れていたのかが分かるようになります。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第6章（HTTP メッセージ、curl、`node:http` の `req` と `res`）、第4章11節（Chrome DevTools） |
| この章のゴール | 文字化けの原因を説明できる / Cookie で状態を覚えるサーバを書ける / リダイレクトを返せる / ETag と 304 を実装できる / 圧縮して返せる / `node --test` で関数を確かめられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くサーバの完成形、たくさんの実験ができるサーバ（`lab-server.mjs`）、文字化けの実験 |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 実習は `~/dev/ch07/` で行います（教材のフォルダは見本として残しておくため）。最初に作業フォルダを作り、教材の `samples` と `exercises` をコピーします（やり方は第5章の「読み方」と同じです）。
>
>   ```sh
>   $ mkdir -p ~/dev/ch07 && cd ~/dev/ch07
>   $ cp -R （ここに Finder から ch07-http-details の samples と exercises をドラッグ） .
>   ```
>
> - この章のコマンドは、すべて `~/dev/ch07/` で実行します。
> - 「**手を動かす**」の所は、実際に打って動かしてください。サーバは節ごとに別のファイル（ポートも別）にします。完成形は `samples/` にあります。
> - 外部のサイトに対する出力は、執筆時の出力例です。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| `Content-Type` と `charset`（2節） | 第4部で HTML や JSON を返すとき。文字化けの原因を探すとき |
| Cookie（3節） | 第4部 第22章でログインを自作する。第10部で安全な認証を作る |
| リダイレクト（4節） | 第10章の PRG パターン（フォームの送信の後）。第8章で HTTP から HTTPS へ移す |
| キャッシュと ETag（5節） | 第4部の静的ファイルのサーバ、第5部の API（ETag で更新の衝突を防ぐ）、第12部の CDN |
| 圧縮と `Vary`（6節・7節） | 第4部・第12部で、サーバや CDN の設定を決めるとき |
| `node --test`（8節） | 第2部の残りの章の練習問題。第11部でテストを本格的に学ぶ |

---

## 1. ブラウザの DevTools で HTTP を見る

ブラウザが1つのページを表示するために送る**たくさんのリクエスト**を見るには、Chrome DevTools の **Network** タブを使います（第4章11節）。

1. `⌘ + ⌥ + I` で DevTools を開き、Network タブを選ぶ
2. ページを再読み込み（`⌘ + R`）すると、リクエストが1行ずつ並ぶ
3. 1行をクリックすると、**Headers**（ヘッダ）、**Response**（ボディ）、**Timing**（時間）が見られる

| 設定・列 | 使いどころ |
| --- | --- |
| **Preserve log** | ページを移動しても一覧を消さない。リダイレクトを調べるときに付ける |
| **Disable cache** | DevTools を開いている間、キャッシュを使わない。キャッシュの実験のときは**外す** |
| Status 列 | ステータスコード。`(memory cache)` などはキャッシュから読んだ印 |
| Protocol 列 | `http/1.1`、`h2`、`h3`。列の見出しを右クリックして表示させる（9節） |

行を右クリック → **Copy → Copy as cURL** で、ブラウザが送ったのと同じリクエストを curl のコマンドとしてコピーできます。

## 2. Content-Type と文字コード

### 2.1 Content-Type

**Content-Type** ヘッダは、ボディが「何の種類のデータか」を **MIME タイプ**で伝えます。ブラウザはファイル名の拡張子ではなく、**このヘッダを見て**扱いを決めます。

| MIME タイプ | 中身 |
| --- | --- |
| `text/html; charset=utf-8` | HTML |
| `text/css` / `text/javascript` | CSS / JavaScript |
| `application/json` | JSON |
| `image/png` / `image/svg+xml` | 画像 |
| `application/x-www-form-urlencoded` | HTML のフォームの送信（`name=%E3%81%AD%E3%81%93&age=3`） |

### 2.2 手を動かす: 文字化けを作る

日本語をバイト列にするやり方（**文字コード**）は1つではありません。

| 文字コード | 「こ」のバイト | 使われているところ |
| --- | --- | --- |
| **UTF-8** | `e3 81 93`（3バイト） | 今の Web のほぼすべて。Node.js の既定 |
| **Shift_JIS** | `82 b1`（2バイト） | 古い日本語のサイト、Excel の CSV |

書いたときと**違う文字コードで読む**と、文字化けします。REPL（`node`）で試します。

```
$ node
> const bytes = Buffer.from('こんにちは')              // UTF-8 で書いたバイト列
> new TextDecoder('utf-8').decode(bytes)
'こんにちは'
> new TextDecoder('shift_jis').decode(bytes)          // Shift_JIS として読む
'縺薙ｓ縺ｫ縺｡縺ｯ'
> new TextDecoder('windows-1252').decode(bytes)       // 欧米の文字コードとして読む
'ã“ã‚“ã«ã¡ã¯'
```

`new TextDecoder('文字コード').decode(バイト列)` は、バイト列を、その文字コードとして読んで文字列にします。`縺薙ｓ…` は「UTF-8 を Shift_JIS として読んだ」、`ã“ã‚“…` は「UTF-8 を欧米の文字コードとして読んだ」ときの、よく見る文字化けです。**見た目から、何を何として読んだかが推測できます**。いろいろな組み合わせは `node samples/mojibake-demo.mjs ありがとう` で一度に見られます。

### 2.3 手を動かす: charset を付けないとどうなるか

`~/dev/ch07/charset-server.mjs` を作ります（完成形は [samples/charset-server.mjs](samples/charset-server.mjs)）。

```js
import http from 'node:http';

const html = '<!doctype html><title>実験</title><h1>こんにちは、世界</h1>\n';

const server = http.createServer((req, res) => {
  if (req.url === '/utf8') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  } else if (req.url === '/no-charset') {
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
  } else {
    res.statusCode = 404;
    res.end();
  }
});

server.listen(8101, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8101/utf8 と /no-charset で待ち受けています');
});
```

ブラウザで `http://127.0.0.1:8101/utf8` と `http://127.0.0.1:8101/no-charset` を開いて比べます。`/no-charset` は `ã“ã‚“…` のように化けるはずです（ブラウザや Mac の言語の設定によっては、推測が当たって正しく表示されることもあります）。

ブラウザは、次の順に文字コードを決めます。

1. `Content-Type` ヘッダの `charset`
2. HTML の中の `<meta charset="...">`（ファイルの先頭近くに書く）
3. ブラウザの推測

推測に頼ると、ある人の環境では読めて、別の人の環境では化ける、ということが起きます。**サーバは必ず `charset=utf-8` を付け、HTML にも `<meta charset="utf-8">` を書く**のが基本です。Flask の `return "こんにちは"` が化けなかったのは、Flask が `charset=utf-8` を自動で付けていたからです。`node:http` は付けないので、自分で付けます。

## 3. Cookie

### 3.1 状態を覚える仕組み

HTTP はステートレスです（第6章1節）。そこで、サーバがブラウザに**小さな値を預け**、ブラウザが次から毎回それを送り返す仕組みが **Cookie** です。

```
ブラウザ                                            サーバ
  │ ── GET / ──────────────────────────────────────▶ │
  │ ◀── 200  Set-Cookie: visits=1; Max-Age=600 ──── │  ← 「これを覚えておいて」
  │ ── GET /   Cookie: visits=1 ───────────────────▶ │  ← 次から自動で付ける
  │ ◀── 200  Set-Cookie: visits=2; Max-Age=600 ──── │
```

### 3.2 手を動かす: 訪問回数を数える

`~/dev/ch07/cookie-server.mjs`（完成形は [samples/cookie-server.mjs](samples/cookie-server.mjs)）:

```js
import http from 'node:http';

// 'a=1; b=2' → { a: '1', b: '2' }
function parseCookies(header) {
  const cookies = {};
  if (header === undefined) return cookies;
  for (const part of header.split('; ')) {
    const [name, value] = part.split('=');
    cookies[name] = value;
  }
  return cookies;
}

const server = http.createServer((req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const visits = Number(cookies.visits ?? 0) + 1;

  res.setHeader('Set-Cookie', `visits=${visits}; Max-Age=600; Path=/; HttpOnly`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`${visits} 回目の訪問です。届いた Cookie: ${req.headers.cookie ?? '（なし）'}\n`);
});

server.listen(8102, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8102/ で待ち受けています');
});
```

ブラウザが送る `Cookie` ヘッダは `visits=1; theme=dark` のように `; ` で区切られているので、`split` で分けてオブジェクトにします（第6章5.4節のヘッダと同じ考え方）。`req.headers.cookie` は `req.headers['cookie']` と同じ意味です（名前に `-` が無いときは `.` で書けます）。

curl では、`-c ファイル` で受け取った Cookie を保存し、`-b ファイル` で送ります。

```sh
$ curl -c c.txt -b c.txt http://127.0.0.1:8102/
1 回目の訪問です。届いた Cookie: （なし）
$ curl -c c.txt -b c.txt http://127.0.0.1:8102/
2 回目の訪問です。届いた Cookie: visits=1
```

ブラウザでも `http://127.0.0.1:8102/` を何度か再読み込みし、DevTools の **Application** タブ → **Cookies** で中身を見てみましょう。

最後に、`-b` に**自分で書いた値**を渡してみます。

```sh
$ curl -b 'visits=1000' http://127.0.0.1:8102/
1001 回目の訪問です。届いた Cookie: visits=1000
```

**Cookie は利用者が自由に書き換えられます。** サーバは信じてしまいました。そのため、ログイン状態のような大事な情報は、Cookie に**推測できないランダムな ID** だけを入れ、中身はサーバ側に保存します（第4部 第22章）。Flask の `session` は、中身に**改ざんを見破れる署名**を付けていました（署名は第8章）。

### 3.3 Cookie の属性

`Set-Cookie: visits=2; Max-Age=600; Path=/; HttpOnly` の `;` 以降は**属性**で、ブラウザに「どう扱うか」を指示します。ブラウザが送り返す `Cookie` ヘッダには、`visits=2` だけが入ります。

| 属性 | 意味 | 省略すると |
| --- | --- | --- |
| `Max-Age=秒` | いつまで覚えておくか。`Max-Age=0` で**すぐ消す** | ブラウザを閉じると消える |
| `Path=/` | どのパスへのリクエストに付けるか | 受け取ったパスのフォルダ |
| `Domain=example.com` | サブドメインにも送る | 受け取ったホストだけ |
| `Secure` | HTTPS のときだけ送る（第8章） | HTTP でも送る |
| `HttpOnly` | JavaScript（`document.cookie`）から読めなくする | 読める |
| `SameSite=Lax` / `Strict` / `None` | 他のサイトからのリクエストに付けるか（第9章） | ブラウザの既定（Chrome は `Lax`） |

Cookie の値には `;` や空白、日本語をそのまま入れられません。入れるときは、**パーセントエンコード**します。

```
> encodeURIComponent('ねこ いぬ')
'%E3%81%AD%E3%81%93%20%E3%81%84%E3%81%AC'
> decodeURIComponent('%E3%81%AD%E3%81%93')
'ねこ'
```

`encodeURIComponent` は、文字列を UTF-8 のバイトにして、英数字など以外を `%E5` のような形にします。`decodeURIComponent` で元に戻せます。URL のクエリ（`?q=...`）でも同じ形を使います。

## 4. リダイレクト

### 4.1 手を動かす: リダイレクトを返す

**リダイレクト**は「求めるものは別の URL にある」と伝えるレスポンスです。3xx のステータスコードと、移動先を書いた **`Location`** ヘッダを返すと、ブラウザは自動でその URL にリクエストし直します。

`~/dev/ch07/redirect-server.mjs`（完成形は [samples/redirect-server.mjs](samples/redirect-server.mjs)）:

```js
import http from 'node:http';

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  if (req.url === '/old') {
    res.statusCode = 301;
    res.setHeader('Location', '/new');
    res.end('/new に移動しました\n');
  } else if (req.url === '/new') {
    res.end('新しいページです\n');
  } else if (req.method === 'POST' && req.url === '/memo') {
    res.statusCode = 303;
    res.setHeader('Location', '/done');
    res.end();
  } else if (req.url === '/done') {
    res.end('保存しました\n');
  } else {
    res.statusCode = 404;
    res.end('見つかりません\n');
  }
});

server.listen(8103, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8103/ で待ち受けています');
});
```

```sh
$ curl -i http://127.0.0.1:8103/old
HTTP/1.1 301 Moved Permanently
Location: /new
...
$ curl -L http://127.0.0.1:8103/old                     # -L: リダイレクトをたどる
新しいページです
$ curl -L -d 'text=買い物' http://127.0.0.1:8103/memo
保存しました
```

サーバのターミナルを見ると、`POST /memo` の次に `GET /done` が届いています。303 は「結果は別の URL を **GET で**見て」という意味だからです。ブラウザで `http://127.0.0.1:8103/old` を開くと、アドレスバーが `/new` に変わります。

### 4.2 5種類のリダイレクト

| コード | 意味 | 移動し直すときのメソッド | 主な使いどころ |
| --- | --- | --- | --- |
| **301** Moved Permanently | 恒久的に移動した | POST が GET に変わることがある | URL の変更（GET のページ） |
| **302** Found | 一時的に移動した | POST が GET に変わることがある | 昔からの「とりあえずのリダイレクト」。Flask の `redirect()` の既定 |
| **303** See Other | 結果は別の URL で見て | **必ず GET** | フォームの POST の後に結果のページへ（第10章） |
| **307** Temporary Redirect | 一時的に移動した | **変えない**（POST は POST のまま、ボディも送り直す） | メソッドを保ちたい一時的な移動 |
| **308** Permanent Redirect | 恒久的に移動した | **変えない** | API の URL の恒久的な変更 |

`samples/lab-server.mjs` の `/redirect/NNN` で、5種類を一度に比べられます。

```sh
$ node samples/lab-server.mjs                     # ターミナル1（8100番）
$ for c in 301 302 303 307 308; do printf "$c: "; curl -s -L -d 'memo=test' http://localhost:8100/redirect/$c | tr '\n' ' '; echo; done
301: メソッド: GET ボディ: （なし）
302: メソッド: GET ボディ: （なし）
303: メソッド: GET ボディ: （なし）
307: メソッド: POST ボディ: memo=test
308: メソッド: POST ボディ: memo=test
```

（`for c in ...; do ...; done` は第1章の `for`、`tr '\n' ' '` は「改行を空白に置き換える」コマンドです。）

**恒久的なリダイレクト（301・308）はブラウザに保存されます。** 間違えて 301 を返すと、サーバを直してもブラウザが古いリダイレクトを使い続けることがあります。確信が持てないうちは 302・303・307 を使います。

## 5. キャッシュ

### 5.1 2つの段階

ロゴの画像や CSS は、毎回ダウンロードし直すのは無駄です。ブラウザや途中の中継サーバ（CDN）は、レスポンスを保存しておいて使い回します。これが **HTTP キャッシュ**です。

| 段階 | 仕組み | サーバとの通信 |
| --- | --- | --- |
| **新鮮な間はそのまま使う** | `Cache-Control: max-age=秒` の間は、保存したものを使う | **無し** |
| **古くなったら確認する** | 「手元のものはまだ使える？」と聞く。変わっていなければ `304 Not Modified`（ボディなし） | 有り（でも軽い） |

| Cache-Control | 意味 |
| --- | --- |
| `max-age=3600` | 3600秒間は新鮮。その間はサーバに聞かずに使う |
| `no-cache` | 保存してよいが、**使う前に毎回確認する**（「キャッシュしない」ではない） |
| `no-store` | **保存してはいけない**（個人情報や銀行の画面など） |
| `private` | ブラウザだけが保存してよい（CDN は保存しない）。人ごとに違うページ |
| `public` | CDN などの共有のキャッシュも保存してよい |
| `immutable` | 新鮮な間は、再読み込みされても確認しなくてよい |

### 5.2 手を動かす: max-age

`~/dev/ch07/cache-server.mjs` を作ります（完成形は [samples/cache-server.mjs](samples/cache-server.mjs)）。まず `/time` だけを書きます。

```js
import http from 'node:http';

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url} If-None-Match: ${req.headers['if-none-match'] ?? '（なし）'}`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  if (req.url === '/time') {
    res.setHeader('Cache-Control', 'max-age=10');
    res.end(`今は ${new Date().toLocaleTimeString('ja-JP')} です\n`);
  } else {
    res.statusCode = 404;
    res.end('見つかりません\n');
  }
});

server.listen(8104, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8104/ で待ち受けています');
});
```

ブラウザで `http://127.0.0.1:8104/time` を開き、**アドレスバーをクリックして Return** を何度か押します。10秒間は同じ時刻が表示され、サーバのターミナルにもリクエストが表示されません。DevTools の Status には `(disk cache)` などと出ます。

> `⌘ + R`（再読み込み）は、ブラウザが「確認してから使う」に切り替えることがあり、`⌘ + Shift + R`（強制再読み込み）はキャッシュを使いません。キャッシュの実験は、アドレスバーで Return を押して行います。

### 5.3 手を動かす: ETag と 304

古くなったときの確認には、**ETag**（中身の版を表す文字列）を使います。

```
ブラウザ                                                  サーバ
  │ ── GET /news ─────────────────────────────────────────▶ │
  │ ◀── 200  ETag: "0436ec1e"  Cache-Control: no-cache ─── │
  │ ── GET /news   If-None-Match: "0436ec1e" ─────────────▶ │  ← 「手元のはこの版です」
  │ ◀── 304 Not Modified（ボディなし） ──────────────────── │  ← 「それを使って」
```

ETag には、中身の**ハッシュ**（中身から計算した短い値。中身が1文字でも変われば、まったく違う値になる。第8章で詳しく学ぶ）がよく使われます。Node.js では次のように計算します。

```
> import('node:crypto').then((c) => console.log(c.createHash('sha256').update('こんにちは').digest('hex')))
125aeadf27b0459b8760c13a3d80912dfa8a81a68261906f60d87f4a0268646c
```

（REPL では `import` 文が使えないので、`import(...)` という形で読み込んでいます。ファイルの中では、ふつうに `import crypto from 'node:crypto';` と書きます。）

| 書き方 | 意味 |
| --- | --- |
| `crypto.createHash('sha256')` | SHA-256 という方法でハッシュを計算する準備 |
| `.update(中身)` | 計算したい中身を渡す |
| `.digest('hex')` | 結果を16進数の文字列で受け取る（64文字） |

`cache-server.mjs` の先頭に `import crypto from 'node:crypto';` を足し、`/news` を足します。

```js
  } else if (req.url === '/news') {
    const version = Math.floor(Date.now() / 30000);            // 30秒ごとに 1 増える数
    const body = `ニュース 第 ${version} 版\n`;
    const etag = `"${crypto.createHash('sha256').update(body).digest('hex').slice(0, 16)}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'no-cache');

    if (req.headers['if-none-match'] === etag) {
      res.statusCode = 304;
      res.end();
    } else {
      res.end(body);
    }
```

```sh
$ curl -i http://127.0.0.1:8104/news
HTTP/1.1 200 OK
ETag: "0436ec1e1b0b00b5"
Cache-Control: no-cache
...
ニュース 第 59084352 版
$ curl -i -H 'If-None-Match: "0436ec1e1b0b00b5"' http://127.0.0.1:8104/news     # 上の ETag をコピーして
HTTP/1.1 304 Not Modified
...
```

ETag はダブルクォート `"` も含めて1つの値です。`Math.floor(x)` は小数点以下を切り捨てます。30秒たつと中身が変わり、同じ `If-None-Match` を送っても 200 と新しい ETag が返ります。ブラウザで開いて `⌘ + R` を押すと、DevTools に `304` が並びます。

ETag の代わりに更新日時を使う方法（`Last-Modified` と `If-Modified-Since`）もあります。

### 5.4 よく使う組み合わせ

| リソース | Cache-Control | 理由 |
| --- | --- | --- |
| ファイル名にハッシュが入った JS・CSS（`app.3f9a1c.js`） | `max-age=31536000, immutable` | 中身が変わればファイル名が変わるので、1年キャッシュしてよい |
| HTML（`index.html`） | `no-cache` + ETag | 新しい JS・CSS の名前を知るために、毎回確認する |
| ログインした人ごとの API | `private, no-cache` | CDN に保存されると他の人に見えてしまう |
| 個人情報・決済の画面 | `no-store` | ディスクに残さない |

## 6. 圧縮

### 6.1 手を動かす: gzip で返す

テキストは、圧縮するとずっと小さくなります。ブラウザは `Accept-Encoding` で「この圧縮方式なら読める」と伝え、サーバは選んだ方式で圧縮し、`Content-Encoding` で伝えます。

`~/dev/ch07/gzip-server.mjs`（完成形は [samples/gzip-server.mjs](samples/gzip-server.mjs)）:

```js
import http from 'node:http';
import zlib from 'node:zlib';

let big = '';
for (let i = 1; i <= 1000; i++) {
  big += `${i} 行目: 今日の天気は晴れです。\n`;
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Vary', 'Accept-Encoding');

  const accept = req.headers['accept-encoding'] ?? '';
  if (accept.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
    res.end(zlib.gzipSync(big));
  } else {
    res.end(big);
  }
});

server.listen(8105, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8105/big で待ち受けています');
});
```

| 書き方 | 意味 |
| --- | --- |
| `zlib.gzipSync(文字列)` | gzip で圧縮したバイト列を返す |
| `文字列.includes('gzip')` | `gzip` という文字を含むか（`true` / `false`） |

```sh
$ curl -s -o /dev/null -w '%{size_download}\n' -H 'Accept-Encoding: identity' http://127.0.0.1:8105/big
45893
$ curl -s -o /dev/null -w '%{size_download}\n' -H 'Accept-Encoding: gzip' http://127.0.0.1:8105/big
2627
$ curl -s --compressed http://127.0.0.1:8105/big | head -2     # --compressed: 受け取って展開してくれる
1 行目: 今日の天気は晴れです。
2 行目: 今日の天気は晴れです。
```

`%{size_download}` は「受け取ったボディのバイト数」です。同じ形の繰り返しが多いので、45KB が 2.6KB になりました。`identity` は「圧縮しないで」という意味です。一方、PNG・JPEG・動画は**もともと圧縮されている**ので、さらに圧縮してもほとんど小さくなりません。

| 方式 | 特徴 |
| --- | --- |
| `gzip` | 昔からある。どこでも使える |
| `br`（Brotli） | gzip より小さくなることが多い。ブラウザは HTTPS のときだけ対応を伝える |
| `zstd` | 新しい方式 |

### 6.2 Vary

同じ URL でも、`Accept-Encoding` によって中身（gzip か、そのままか）が変わります。そこで **`Vary: Accept-Encoding`** を付けて、「このレスポンスは `Accept-Encoding` によって変わる」とキャッシュに伝えます。付け忘れると、CDN が gzip のレスポンスを保存し、gzip を読めないクライアントにもそれを返してしまいます。

## 7. コンテンツネゴシエーション

圧縮と同じように、クライアントが「何が欲しいか」を伝え、サーバが選ぶ仕組みを**コンテンツネゴシエーション**と言います。

| リクエストのヘッダ | 伝えること | 例 |
| --- | --- | --- |
| `Accept` | 欲しいデータの種類 | `text/html,...;q=0.9,*/*;q=0.8`（ブラウザ）、`application/json` |
| `Accept-Language` | 欲しい言語 | `ja,en-US;q=0.9,en;q=0.8` |
| `Accept-Encoding` | 読める圧縮方式 | `gzip, deflate, br, zstd` |

`q=` は**優先度**（0〜1、省略すると1）です。`ja,en-US;q=0.9,en;q=0.8` は「日本語がいちばん、次にアメリカ英語、次に英語」という意味です。REPL で分けてみます。

```
> 'ja,en-US;q=0.9,en;q=0.8'.split(',')
[ 'ja', 'en-US;q=0.9', 'en;q=0.8' ]
> 'en-US;q=0.9'.split(';q=')
[ 'en-US', '0.9' ]
> Number('0.9')
0.9
```

`lab-server.mjs` の `/greet` は、`Accept-Language` と `Accept` を見て、言語と形式を選びます。

```sh
$ curl -s -H 'Accept-Language: en-US,en;q=0.9,ja;q=0.8' -H 'Accept: application/json' http://localhost:8100/greet
{"lang":"en","message":"Hello"}
```

選んだ結果が変わるので、レスポンスには `Vary: Accept, Accept-Language` を付けます。

## 8. 手を動かす: node --test で関数を確かめる

この先の練習問題では、「用意されたテストが全部通るように関数を作る」問題が出てきます。Node.js に組み込まれたテストの仕組み **`node --test`** を、小さな例で試しておきます（テストは第11部で詳しく学びます）。

`~/dev/ch07/sum.mjs`:

```js
export function sum(numbers) {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
}
```

`~/dev/ch07/sum.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sum } from './sum.mjs';

test('sum: 合計を返す', () => {
  assert.equal(sum([1, 2, 3]), 6);
});

test('sum: 空の配列なら 0', () => {
  assert.equal(sum([]), 0);
});
```

```sh
$ node --test sum.test.mjs
✔ sum: 合計を返す (0.5ms)
✔ sum: 空の配列なら 0 (0.1ms)
ℹ tests 2
ℹ pass 2
ℹ fail 0
```

| 書き方 | 意味 |
| --- | --- |
| `test('名前', () => { ... })` | テストを1つ登録する。中で何も失敗しなければ合格（✔） |
| `assert.equal(実際, 期待)` | 2つが同じでなければ失敗にする |
| `assert.deepEqual(実際, 期待)` | オブジェクトや配列の**中身**が同じでなければ失敗にする |
| `node --test ファイル` | テストを実行して、結果をまとめて表示する |
| `node --test --test-name-pattern=sum ファイル` | 名前に `sum` を含むテストだけを実行する |

`sum.mjs` の `total += n` を `total -= n` に変えて、もう一度実行してみましょう。✖ と、期待した値と実際の値の違いが表示されます。

（Node.js の版によっては、表示の形が少し違います。`pass` と `fail` の数を見れば十分です。）

## 9. HTTP/1.1、HTTP/2、HTTP/3

HTTP/1.1 では、1つの接続で**1つずつ順番に**しか返せません（第6章10節）。ブラウザは1つのサイトに6本ほどの接続を作りますが、画像や JS が100個あるページでは足りません。

| | 運び方 | 工夫 |
| --- | --- | --- |
| **HTTP/2**（2015年） | 1本の TCP 接続 | バイナリの「フレーム」で運び、複数のリクエストを**同時に**やり取りする（多重化）。ヘッダは圧縮し、名前は小文字 |
| **HTTP/3**（2022年） | **UDP の上の QUIC**（第5章4.5節） | TCP で1つのパケットがなくなると全部が待たされる問題を無くした。接続の準備も速い |

意味の部分（メソッド・ステータス・ヘッダ・ボディ）は、どれも同じです。Chrome で実在のサイトを開き、Network タブの **Protocol** 列を見ると、`h2` や `h3` が並んでいるはずです。ブラウザは HTTP/2・3 を **HTTPS のときだけ**使うので、この教材の `127.0.0.1` のサーバはどれも `http/1.1` です。実際のアプリでは、Node.js のサーバは HTTP/1.1 で動かし、手前の CDN などが HTTP/2・3 と HTTPS を担当する構成がよく使われます（第12部）。

---

## まとめ

- `Content-Type` はボディの種類を伝える。違う文字コードで読むと化けるので、`charset=utf-8` を必ず付ける。
- Cookie は、`Set-Cookie` でブラウザに預け、`Cookie` で送り返してもらう値。属性で扱いを指示する。利用者が書き換えられるので、信じてはいけない。
- リダイレクトは 3xx と `Location`。POST の後に結果を見せるなら 303、メソッドを保つなら 307・308。
- キャッシュは「`max-age` の間はそのまま使う」と「ETag で確認して 304」の2段階。`no-cache` は確認、`no-store` は保存しない。
- `Accept-*` で希望を伝え、サーバが選ぶ。選んだ結果が変わるときは `Vary` を付ける。
- `node --test` で、関数がテストのとおりに動くか確かめられる。

## 練習問題

[exercises/README.md](exercises/README.md) に12問あります（基本5問、応用4問、発展3問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- MDN「HTTP キャッシュ」: https://developer.mozilla.org/ja/docs/Web/HTTP/Caching
- MDN「HTTP Cookie の使用」: https://developer.mozilla.org/ja/docs/Web/HTTP/Cookies
- MDN「リダイレクト」: https://developer.mozilla.org/ja/docs/Web/HTTP/Redirections
- MDN「コンテンツネゴシエーション」: https://developer.mozilla.org/ja/docs/Web/HTTP/Content_negotiation
- Node.js ドキュメント `node:test`: https://nodejs.org/docs/latest/api/test.html

前の章: [第6章 HTTP を手で話す](../ch06-http-by-hand/README.md) ／ 次の章: [第8章 HTTPS と TLS](../ch08-https-tls/README.md)
