# 第7章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
作るファイルは `~/dev/ch07/` に置き、コマンドもそこで実行します（本文の「読み方」でコピーした `samples/` と `exercises/` を使います）。

| 問題 | 種類 | テーマ | 本文の節 |
| --- | --- | --- | --- |
| 1 | 基本 | 文字化けから原因を推理する | 2.2 |
| 2 | 基本 | meta と JSON の文字コード | 2.3 |
| 3 | 基本 | Cookie を2つ使い、消せるようにする | 3 |
| 4 | 基本 | リダイレクトを足す | 4 |
| 5 | 基本 | Cache-Control を選ぶ | 5.1, 5.4 |
| 6 | 応用 | 静的ファイルのサーバに ETag を付ける | 5.3 |
| 7 | 応用 | Cookie を読む関数をテストで確かめる | 3, 8 |
| 8 | 応用 | Brotli にも対応する | 6 |
| 9 | 応用 | 言語を選んであいさつするサーバ | 7 |
| 10 | 発展 | ETag の比較の決まりをすべて守る | 5.3 |
| 11 | 発展 | q の値を見て圧縮方式を選ぶ | 6, 7, 8 |
| 12 | 発展 | Set-Cookie を組み立てる関数 | 3.3, 8 |

**発展**（10〜12）は、少し長めの問題です。できなくても次の章に進んでかまいません。

---

## 基本

### 問題1 文字化けから原因を推理する

次の3つは、どれも「ありがとう」が文字化けしたものです。それぞれ「**何の文字コードで書いたバイト列を、何の文字コードとして読んだ**」のかを、本文2.2節の例を手がかりに推理してください。推理してから `node samples/mojibake-demo.mjs ありがとう` で確かめます。

- (a) `縺ゅｊ縺後→縺�`
- (b) `ã‚ã‚ŠãŒã¨ã†`
- (c) `‚ ‚è‚ª‚Æ‚¤`

### 問題2 meta と JSON の文字コード

本文2.3節の `charset-server.mjs` をコピーして `charset-server-v2.mjs` を作り、次のパスを足してください。

| パス | Content-Type | ボディ |
| --- | --- | --- |
| `/meta` | `text/html`（charset なし） | HTML の `<!doctype html>` の次に `<meta charset="utf-8">` を入れたもの |
| `/json` | `application/json; charset=utf-8` | `{"message":"こんにちは"}` |

1. ブラウザで `/no-charset` と `/meta` を開いて比べる。`/meta` が化けない理由を、本文2.3節の「ブラウザが文字コードを決める順」で説明する。
2. `/json` はブラウザでも curl でも化けないことを確かめる。

ヒント: `JSON.stringify({ message: 'こんにちは' })` で、オブジェクトを JSON の文字列にできます。

### 問題3 Cookie を2つ使い、消せるようにする

本文3.2節の `cookie-server.mjs` をコピーして `cookie-server-v2.mjs` を作り、次のようにしてください。

- 訪問回数（`visits`）に加えて、**前回の訪問の日時**を `last` という Cookie に入れる。2回目からは `前回の訪問: 2026/11/9 10:32:10` と表示する
- `/reset` にアクセスしたら、2つの Cookie を消して `リセットしました` と返す

確かめ方:

```sh
$ curl -c c.txt -b c.txt http://127.0.0.1:8102/
1 回目の訪問です。
$ curl -c c.txt -b c.txt http://127.0.0.1:8102/
2 回目の訪問です。
前回の訪問: 2026/11/9 10:32:10
$ curl -c c.txt -b c.txt http://127.0.0.1:8102/reset
リセットしました
$ curl -c c.txt -b c.txt http://127.0.0.1:8102/
1 回目の訪問です。
```

ヒント:

- 今の日時は `new Date().toLocaleString('ja-JP')` です。日時には空白や `/` が入るので、本文3.3節の `encodeURIComponent` で変換してから Cookie に入れ、読むときに `decodeURIComponent` で戻します。
- Cookie を消すには、同じ名前・同じ `Path` で `Max-Age=0` を送ります（本文3.3節の表）。
- `Set-Cookie` を2つ送るときは、`res.setHeader('Set-Cookie', ['visits=...', 'last=...'])` のように**配列**で渡します。ヘッダの行が2つになります。

### 問題4 リダイレクトを足す

本文4.1節の `redirect-server.mjs` をコピーして `redirect-server-v2.mjs` を作り、次の2つを足してください。

| パス | ステータス | 移動先 |
| --- | --- | --- |
| `/home` | 302 | `/new` |
| `/old-memo` | 308 | `/memo` |

確かめ方:

```sh
$ curl -i http://127.0.0.1:8103/home              # 302 と Location: /new
$ curl -L -d 'text=a' http://127.0.0.1:8103/old-memo
保存しました
```

2つ目のとき、サーバのターミナルには何が、どの順で表示されたか。`POST /old-memo` → ？ → ？ の「？」を埋め、それぞれのメソッドがそうなった理由を、本文4.2節の表で説明してください。`/old-memo` を 301 にすると、どう変わるかも予想して確かめます。

### 問題5 Cache-Control を選ぶ

次のものに付ける `Cache-Control` を、本文5.1節・5.4節の表から選び、理由を1文で書いてください。

1. ビルドツールが出力した `/assets/app.3f9a1c7e.js`（中身が変わるとファイル名も変わる）
2. それを読み込む `/index.html`
3. ログインしている人の「自分のタスク一覧」を返す API `GET /api/me/tasks`
4. ネットバンクの「残高と入出金の履歴」のページ
5. 天気予報の API `GET /api/weather?city=tokyo`（10分ごとに更新される。全員に同じ内容）

## 応用

### 問題6 静的ファイルのサーバに ETag を付ける

[static-server.mjs](static-server.mjs) は、[public/](public/) のファイルを配信するだけのサーバで、キャッシュの仕組みを持っていません。`~/dev/ch07/cached-static-server.mjs` にコピーして、次を足してください。

- **ETag**: ファイルの中身（`data`）のハッシュ（本文5.3節）を `"..."` で囲んだもの
- **Last-Modified**: ファイルの更新日時
- **Cache-Control**: HTML なら `no-cache`、それ以外は `max-age=60`
- リクエストの `If-None-Match` が ETag と同じなら、ボディ無しの **304** を返す。304 にも ETag・Last-Modified・Cache-Control を付ける

確かめ方:

```sh
$ bash exercises/check-cache.sh exercises/static-server.mjs     # 元のサーバ: ほとんど失敗する
$ bash exercises/check-cache.sh cached-static-server.mjs        # 作ったサーバ
[OK] 1. ETag が "..." の形で付いている
...
```

この問題では、**8・9・10・12 以外**がすべて `[OK]` になれば完成です（8〜12 は発展の問題10で扱います）。`check-cache.sh` は、`public/` を一時フォルダにコピーし、そこを配信するサーバを 8119番で起動して試します。

ヒント:

- このサーバは、ヘッダを `res.writeHead(200, { 名前: 値, ... })` でまとめて書いています。`writeHead` は、`statusCode` と `setHeader` を一度に行う書き方です。
- 更新日時は、`fs.readFile` の次に `const stat = await fs.stat(file);` と書くと、`stat.mtime` で分かります。HTTP の日付の形にするには `stat.mtime.toUTCString()` です（`Mon, 09 Nov 2026 10:24:04 GMT` の形）。
- `import crypto from 'node:crypto';` を足すのを忘れずに。`update` にはファイルの中身（バイト列）をそのまま渡せます。
- ブラウザでも確かめます。`node cached-static-server.mjs` を起動して `http://localhost:8110/` を開き、DevTools の Network タブ（**Disable cache を外す**）で、再読み込みしたときの `index.html`、`style.css` のステータスを見て、違いを説明します。

### 問題7 Cookie を読む関数をテストで確かめる

本文3.2節の `parseCookies` は、とても簡単なものでした。きちんとした `parseCookie` 関数を作り、[cookie.test.mjs](cookie.test.mjs) のテストで確かめます。

- `~/dev/ch07/exercises/cookie.mjs` に作る（テストが同じフォルダの `cookie.mjs` を読み込むため）
- `export function parseCookie(header) { ... }` で、`'a=1; b=2'` → `{ a: '1', b: '2' }` を返す
- テストの名前が `parseCookie:` で始まる8つが通れば完成です（`serializeCookie:` で始まるものは発展の問題12）

```sh
$ cd exercises
$ node --test --test-name-pattern=parseCookie cookie.test.mjs
...
ℹ pass 8
ℹ fail 0
```

まず `cookie.test.mjs` の `parseCookie:` のテストを読んで、何が求められているかを書き出してから作り始めましょう。主なものは次のとおりです。

| テスト | 求められていること | ヒント |
| --- | --- | --- |
| 余分な空白や空の部分 | `'  a=1 ;b=2;;  c = 3 '` も読める | `;` で分けて、それぞれ `trim()`。空の部分は飛ばす |
| 値に `=` | `'token=abc=='` の値は `abc==` | `split('=')` ではなく、`indexOf('=')` で**最初の** `=` の位置を探して `slice` で分ける（第6章5.4節） |
| パーセントエンコード | `%E5%B1%B1` を `山` に戻す | `decodeURIComponent` |
| 戻せない値 | `%E5%B1` で例外にしない | `decodeURIComponent` は戻せないと例外を投げるので、`try` / `catch`（第5章5.4節）で囲み、`catch` ではそのままの値を使う |
| 同じ名前が複数 | 最初のものを使う | 入れる前に、もう入っているか（`cookies[name] !== undefined`）を調べる |
| ヘッダが無い | `undefined` なら `{}` | 本文3.2節と同じ |
| ダブルクォート | `"abc"` の `"` を外す | `value.startsWith('"') && value.endsWith('"')` なら `value.slice(1, -1)`（最初と最後の1文字を除く） |

`export function serializeCookie() {}` も（中身は空のまま）書いておくと、テストのファイルが読み込むときに困りません。

### 問題8 Brotli にも対応する

本文6.1節の `gzip-server.mjs` をコピーして `gzip-server-v2.mjs` を作り、`br`（Brotli）にも対応してください。

- `Accept-Encoding` に `br` が含まれていれば `br`、そうでなく `gzip` が含まれていれば `gzip`、どちらも無ければ圧縮しない
- 選んだ結果を、サーバのターミナルに `Accept-Encoding: gzip, deflate, br → br` のように表示する

確かめ方:

```sh
$ for h in identity gzip br 'gzip, deflate, br'; do curl -s -o /dev/null -w "$h %{size_download}\n" -H "Accept-Encoding: $h" http://127.0.0.1:8105/big; done
identity 45893
gzip 2627
br 1204
gzip, deflate, br 1204
```

ヒント: Brotli で圧縮するのは `zlib.brotliCompressSync(文字列)`、`Content-Encoding` は `br` です。

### 問題9 言語を選んであいさつするサーバ

`Accept-Language` を見て、日本語か英語であいさつするサーバ `greet-server.mjs` を作ってください（127.0.0.1 の 8106番）。

| Accept-Language | 返すもの |
| --- | --- |
| `en-US,en;q=0.9,ja;q=0.8` | `Hello` |
| `ja,en;q=0.9` | `こんにちは` |
| `fr,ja;q=0.5` | `こんにちは`（フランス語には対応していないので、次の希望） |
| `fr` / ヘッダなし | `こんにちは`（どれにも当てはまらなければ日本語） |

- `en-US` や `en-GB` は `en` として扱う（`-` の前だけを見る）
- `q` が省略されていたら 1
- いちばん `q` が大きい、対応している言語を選ぶ
- レスポンスに `Vary: Accept-Language` を付ける

確かめ方:

```sh
$ curl -H 'Accept-Language: en-US,en;q=0.9,ja;q=0.8' http://127.0.0.1:8106/
Hello
```

ヒント: 本文7節の REPL のとおり、`split(',')` で1つずつに分け、さらに `split(';q=')` で言語と q に分けます。「今までにいちばん q が大きかった言語」と「その q」を変数に覚えておき、`for` で1つずつ比べます。対応している言語は `const messages = { ja: 'こんにちは', en: 'Hello' };` のようにオブジェクトにしておくと、`messages[lang] !== undefined` で「対応しているか」を調べられます。

## 発展

### 問題10 ETag の比較の決まりをすべて守る

問題6の `cached-static-server.mjs` を、`check-cache.sh` の18項目すべてが `[OK]` になるように直してください。足りないのは次の決まりです。

- **弱い比較**: `W/"abc"` と `"abc"` は一致とみなす（先頭の `W/` を取り除いてから比べる）
- `"a", "b"` のように**複数並んでいたら**、どれか1つが一致すればよい（`,` で分けて、それぞれ `trim()`）
- `*` は何にでも一致する
- `If-None-Match` が**無いときだけ**、`If-Modified-Since` を見る。ファイルの更新日時が、その日時と同じか前なら 304

ヒント: `new Date('Mon, 09 Nov 2026 10:24:04 GMT')` で、HTTP の日付の文字列を日時にできます。HTTP の日付は秒までしか無いので、比べるときは `stat.mtime` の側も秒にそろえます（`Math.floor(stat.mtime.getTime() / 1000)` と `Math.floor(new Date(...).getTime() / 1000)`。`getTime()` はミリ秒の数を返す）。

### 問題11 q の値を見て圧縮方式を選ぶ

問題8は `includes` で調べるだけで、`q` の値を無視していました（`br;q=0` は「br は受け入れない」という意味なのに、br を選んでしまいます）。`Accept-Encoding` の決まりを守って選ぶ関数 `chooseEncoding` を、`~/dev/ch07/exercises/negotiate.mjs` に作ってください。

```js
// available はサーバが使える方式（好む順）
export function chooseEncoding(acceptEncoding, available = ['br', 'gzip']) { ... }
// → 'br' / 'gzip' など。圧縮しないなら 'identity'、どれも受け入れられないなら null
```

決まり（[negotiate.test.mjs](negotiate.test.mjs) に、すべてのテストがあります）:

- 各方式に `;q=` で優先度（0〜1、省略すると1）が付く。`q=0` は「受け入れない」
- いちばん `q` が大きい方式を選ぶ。同じなら `available` の順（サーバの好み）
- `*` は「書かれていない方式すべて」に当てはまる
- `identity`（圧縮しない）は、`identity;q=0` か `*;q=0` で断られない限り、いつでも受け入れられる
- ヘッダが無い・空なら `identity`
- 大文字・小文字を区別しない。空白があってもよい

```sh
$ cd exercises
$ node --test negotiate.test.mjs
ℹ pass 17
ℹ fail 0
```

ヒント: まず、ヘッダを `{ gzip: 1, br: 0.5, '*': 0.8 }` のような「方式 → q」のオブジェクトにする関数を作ると、後が考えやすくなります。

### 問題12 Set-Cookie を組み立てる関数

問題7の `cookie.mjs` に、`Set-Cookie` の値を組み立てる関数 `serializeCookie` を足し、`cookie.test.mjs` のテスト18個すべてを通してください。

```js
export function serializeCookie(name, value, options = {}) { ... }
// serializeCookie('sid', 'abc', { maxAge: 3600, path: '/', httpOnly: true })
// → 'sid=abc; Max-Age=3600; Path=/; HttpOnly'
```

```sh
$ node --test cookie.test.mjs
ℹ pass 18
ℹ fail 0
```

`cookie.test.mjs` の `serializeCookie:` のテストを読んで、属性の順番、`expires` の形（`toUTCString()`）、エラーにする場合（`throw new TypeError('説明')` で投げる）を確かめてから作り始めましょう。

ヒント:

- 整数かどうかは `Number.isInteger(x)`、Date かどうかは `x instanceof Date` で調べられます（どちらも `true` / `false` になる）。
- 名前の検査は、使えない文字を並べた文字列（`' ;=,"'` など）を作っておき、`for (const ch of name)` で1文字ずつ取り出して `includes` で調べます。日本語の文字は `ch.charCodeAt(0) > 126` で見分けられます（`charCodeAt(0)` は文字の番号。英数字や記号は 126 以下）。

最後に考えてください: `serializeCookie` で値をパーセントエンコードしないと、`serializeCookie('memo', 'a; Path=/admin')` はどんなヘッダになるか。何が問題か。
