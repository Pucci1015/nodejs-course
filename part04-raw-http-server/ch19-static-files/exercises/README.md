# 第19章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part04/ch19-static-files/exercises/` で行います。最初に `cd exercises` で移動してください（`cd ~/dev/part04/ch19-static-files/exercises` と打っても構いません）。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- | --- |
| 1 | 基本 | ファイルの名前から Content-Type を決める | [content-type.mjs](content-type.mjs)、[content-type.test.mjs](content-type.test.mjs) | 3 | — |
| 2 | 基本 | フォルダの中を指すか、`.` で始まる名前か | [inside-check.mjs](inside-check.mjs)、[inside-check.test.mjs](inside-check.test.mjs) | 4 | — |
| 3 | 基本 | 弱い ETag を作り、304 を返してよいか決める | [etag.mjs](etag.mjs)、[etag.test.mjs](etag.test.mjs) | 6 | — |
| 4 | 基本 | パスの組み立ての結果を予想する（調べる問題） | [predict-paths.mjs](predict-paths.mjs) | 4 | — |
| 5 | 応用 | 外に出ないパスを作る `safePath`・`resolveFile` | [safe-path.mjs](safe-path.mjs)、[safe-path.test.mjs](safe-path.test.mjs) | 4 | — |
| 6 | 応用 | 静的ファイルのハンドラ `serveStatic`（304・キャッシュ・HEAD・mount） | [static.mjs](static.mjs)、[static.test.mjs](static.test.mjs) | 3〜6 | 空いている番号 |
| 7 | 応用 | Range ヘッダを読む `parseRange` | [range.mjs](range.mjs)、[range.test.mjs](range.test.mjs) | 7 | — |
| 8 | 発展 | Accept-Encoding を読む `negotiateEncoding` | [encoding.mjs](encoding.mjs)、[encoding.test.mjs](encoding.test.mjs) | 8 | — |
| 9 | 発展 | それらしく見える静的ファイルのサーバのバグを直す | [buggy-static.mjs](buggy-static.mjs)、[check-static.sh](check-static.sh) | 2〜6 | 9195 |

**発展**（8・9）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

- 問題1〜3・5〜8: `○○.mjs` の「ここを書く」を埋め、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。テスト用のファイルは OS の一時フォルダに作り、最後に消します。
- 問題6は、問題5の `safe-path.mjs` を使います。問題5を先に解いてください。
- 問題9は `bash check-static.sh` で確かめます。

---

## 基本

### 問題1 ファイルの名前から Content-Type を決める

[content-type.mjs](content-type.mjs) に、ファイルの名前（パスでもよい）から Content-Type を返す関数 `contentTypeOf(file)` を作ってください。

| 拡張子 | Content-Type |
| --- | --- |
| `.html` | `text/html; charset=utf-8` |
| `.css` | `text/css; charset=utf-8` |
| `.js` | `text/javascript; charset=utf-8` |
| `.json` | `application/json; charset=utf-8` |
| `.txt` | `text/plain; charset=utf-8` |
| `.svg` | `image/svg+xml` |
| `.png` | `image/png` |
| `.jpg`・`.jpeg` | `image/jpeg` |
| それ以外・拡張子が無い | `application/octet-stream` |

- 拡張子の大文字・小文字は区別しない（`LOGO.PNG` は `image/png`）
- `x.constructor` や `x.toString` のような名前でも、`application/octet-stream` を返す

```sh
$ node --test content-type.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- 本文3.1節の `my-mime.mjs` を広げたものです。`path.extname(file)` は最後の `.` から後ろ（`'.PNG'`）を、`.toLowerCase()` は小文字にした文字列を返します。
- `TYPES['.constructor']` は、何も書いていなくても `Object` の関数を返してしまいます（第18章3.3節）。表にあるかは `Object.hasOwn(TYPES, ext)` で確かめます。

### 問題2 フォルダの中を指すか、`.` で始まる名前か

[inside-check.mjs](inside-check.mjs) に、2つの関数を作ってください。

- **`isInside(root, target)`**: `target`（ファイルのパス）が、`root`（公開するフォルダ）の中か、`root` そのものなら `true`、外なら `false`。`..` を含むパスは、計算した後の場所で決める。`/srv/site/public-backup/a` は `/srv/site/public` の中ではない
- **`isHidden(pathname)`**: URL のパスを `/` で分けたとき、`.` で始まる部分（`/.env`、`/.git/config`、`/img/.DS_Store`）があれば `true`

```sh
$ node --test inside-check.test.mjs
ℹ pass 8
ℹ fail 0
```

ヒント:

- 本文4.2節の `inside.mjs` の `path.relative` の判定と同じです。`path.resolve(パス)` で、`..` を計算した、`/` から始まるパスにしてから比べます。
- `rel.startsWith('..')` だけで判定すると、`..memo.txt` のような名前のファイルまで外と見なしてしまいます。`rel === '..' || rel.startsWith('..' + path.sep)` と書きます（`path.sep` は区切りの文字。Mac では `/`）。
- `isHidden` は `pathname.split('/').some((seg) => ...)` で書けます。`some` は、1つでも条件にあえば `true` を返す配列のメソッドです。

### 問題3 弱い ETag を作り、304 を返してよいか決める

[etag.mjs](etag.mjs) に、2つの関数を作ってください（本文6.2節）。

- **`weakEtag(stat)`**: `stat` は `fs.stat` の結果（`size` と `mtimeMs` を持つ）。`W/"大きさ-時刻"` の形の文字列を返す。大きさと時刻（ミリ秒。小数点より下は切り捨て）は、どちらも **16 進数**で書く。例: `{ size: 255, mtimeMs: 4096 }` → `W/"ff-1000"`
- **`isNotModified(ifNoneMatch, etag)`**: `ifNoneMatch` はリクエストの `If-None-Match` ヘッダの値（無ければ `undefined` か `null`）。304 を返してよければ `true`
  - ヘッダが無ければ `false`
  - `*` なら `true`
  - `,` で区切られた ETag のどれかが `etag` と同じなら `true`。比べるときは、どちらも前の `W/` を取ってから比べる（弱い比較）。前後の空白は無視する

```sh
$ node --test etag.test.mjs
ℹ pass 8
ℹ fail 0
```

ヒント:

- `(255).toString(16)` は `'ff'` です。数を何進数の文字列にするかを、`toString` の引数で決められます。小数点より下を切り捨てるのは `Math.floor` です。
- `'"x", W/"abc"'.split(',')` で分け、`.map((t) => t.trim())` で前後の空白を取ります。
- `W/` を取る小さな関数 `const strip = (tag) => (tag.startsWith('W/') ? tag.slice(2) : tag);` を作っておくと楽です。

### 問題4 パスの組み立ての結果を予想する（調べる問題）

[predict-paths.mjs](predict-paths.mjs) に 12 個の式があります。公開するフォルダを `/srv/site/public` として、**実行する前に**結果を予想して書き出してから、`node predict-paths.mjs` で確かめてください。

特に、次の3つは理由を説明してください。

- 3番と4番: `/../a` と `/..%2Fa` は、どちらも「1つ上の a」に見えるのに、結果が違うのはなぜか
- 7番と8番: `startsWith` で「中にあるか」を確かめると、どんな名前のフォルダで間違えるか
- 11番と12番: `%252e%252e%252f` を1回戻したもの、2回戻したものは何か。2回戻すと、なぜ危ないのか

---

## 応用

### 問題5 外に出ないパスを作る

[safe-path.mjs](safe-path.mjs) に、2つの関数を作ってください。

**`safePath(root, urlPath)`**: `urlPath` は URL の `pathname` の形（`/` で始まり、`%xx` のまま）。公開するフォルダ `root` の中の、ファイルの絶対パスを返す。

| こういうとき | 投げるもの |
| --- | --- |
| `/` で始まらない、壊れた `%xx`、NUL 文字、`\` | `HttpError(400)` |
| 戻してつないだ結果が `root` の外（`path.relative` で確かめる） | `HttpError(403)` |
| 途中に空のセグメント（`//`）がある。`.` で始まるセグメントがある | `HttpError(404)` |

`%xx` を戻すのは1回だけです。

**`resolveFile(root, urlPath, { index = 'index.html' })`**: `safePath` で作ったパスについて、次を確かめる（async）。

- ファイルなら `{ path: たどった先の本当のパス }`
- フォルダで、`urlPath` が `/` で終わっていなければ `{ redirect: urlPath + '/' }`
- フォルダで `/` で終わっていれば、中の `index` のファイル。無ければ `HttpError(404)`
- 無い（`ENOENT`）、途中がファイル（`ENOTDIR`、`/index.html/x`）、名前が長すぎる（`ENAMETOOLONG`）は `HttpError(404)`。読む許可が無い（`EACCES`）は `HttpError(403)`
- `fs.realpath` でシンボリックリンクをたどった先が、`root`（これも `realpath` したもの）の外なら `HttpError(403)`

```sh
$ node --test safe-path.test.mjs
```

最初は 12 個のうち 10 個が失敗します。すべて通れば完成です。

ヒント: Mac の一時フォルダ（`/var/folders/...`）は、それ自体が `/private/var/folders/...` へのシンボリックリンクです。`root` も `realpath` してから比べないと、中のファイルまで「外」に見えます。

### 問題6 静的ファイルのハンドラ

[static.mjs](static.mjs) の `serveStatic(root, options)` を完成させてください。返り値は `(req, res) => Promise` のハンドラで、`createApp(serveStatic(root))` のように使います。

| オプション | 既定 | 意味 |
| --- | --- | --- |
| `mount` | `''` | この URL の下だけを扱う（`'/static'` なら `/static/style.css` が `root/style.css`） |
| `index` | `'index.html'` | フォルダのときに返すファイル |
| `cacheControl` | `'no-cache'` | `Cache-Control` の値。関数なら `(ファイルのパス) => 値` |

仕様:

1. GET と HEAD 以外は `HttpError(405)` と `Allow: GET, HEAD`
2. パスは `req.pathname`（第18章の Router が入れる）、無ければ `req.url` から、**クエリを除いて** `%xx` のまま取り出す。`mount + '/'` で始まらなければ 404。`mount` を取り除いた残りを `resolveFile` に渡す
3. `redirect` なら 308。`Location` は `mount + 案内先 + 元のクエリ`
4. 200 のヘッダ: `Content-Type`（`../samples/mime.mjs` の `contentType`）、`Content-Length`、`Last-Modified`、`ETag`、`Cache-Control`、`X-Content-Type-Options: nosniff`
5. `If-None-Match` が ETag と合えば（`W/` を無視して比べる。`,` で並んだものや `*` も）、304。`If-None-Match` が無いときだけ `If-Modified-Since` を見て、ファイルの更新時刻（秒まで）がその日時より後でなければ 304。304 には本文を付けず、`ETag`・`Last-Modified`・`Cache-Control` は付ける
6. HEAD は、GET と同じヘッダで本文なし
7. 本文は Stream で流す。空のファイルも返せる

```sh
$ node --test static.test.mjs
```

最初は 13 個のうち 8 個が失敗します（問題5が解けている場合）。すべて通れば完成です。

### 問題7 Range ヘッダを読む

[range.mjs](range.mjs) の `parseRange(header, size)` を作ってください。`size` はファイルのバイト数です。

| 返すもの | いつ |
| --- | --- |
| `{ start, end }`（`end` を含む） | 返す範囲があるとき |
| `'unsatisfiable'` | 形は正しいが、ファイルの中に1バイトも無い（416 を返す） |
| `null` | `Range` が無い、形が読めない、複数の範囲（全部を 200 で返す） |

- `bytes=始め-終わり`・`bytes=始め-`・`bytes=-長さ` の3つの形。数は数字だけ（`+1`、`0x10`、`1.5` は読めない）
- 終わりがファイルより後ろなら、ファイルの最後までにする。`-長さ` がファイルより長ければ全部
- `始め > 終わり`（`bytes=5-2`）は読めない形として `null`
- `bytes=-0` と、空のファイルへの Range は `'unsatisfiable'`
- 前後の空白は無視する

```sh
$ node --test range.test.mjs
```

[range.mjs](range.mjs) には `range-demo.mjs` と同じ簡単な読み方が入っています。最初は 8 個のうち 6 個が失敗します。すべて通れば完成です。模範解答の `serveStatic` は、この `parseRange` を使って 206 と 416 を返します。

---

## 発展

### 問題8 Accept-Encoding を読む

[encoding.mjs](encoding.mjs) の `negotiateEncoding(header, available = ['br', 'gzip'])` を作ってください。`available` は、サーバが使える圧縮を、好きな順に並べたものです。

- 返すのは `available` のどれか、`'identity'`（圧縮しない）、または `null`（どれも受け付けてもらえない。406 を返してよい）
- `Accept-Encoding` が無い・空なら `'identity'`
- 項目は `,` で区切られ、`名前;q=数` の形。`q` は 0〜1 で小数点以下3桁まで、無ければ 1。形の正しくない項目は無視する。名前は大文字と小文字を区別しない
- `q=0` は「いらない」。`*` は「書いていないもの全部」
- `available` の中で、`q` がいちばん大きく、0 より大きいものを選ぶ。同じなら `available` で前にあるもの
- 選べるものが無ければ、`identity` が受け付けてもらえるなら `'identity'`。`identity` は、`identity;q=0` か、`identity` を書かずに `*;q=0` と書かれたときだけ断られている
- 書いていないもの（`*` も無い）は、受け付けてもらえない

```sh
$ node --test encoding.test.mjs
```

最初は 9 個のうち 6 個が失敗します。すべて通れば完成です。

考えてみてください: `gzip-demo.mjs` のように `/\bgzip\b/.test(accept)` で調べると、`gzip;q=0` のときに何が起きるでしょう。

### 問題9 それらしく見える静的ファイルのサーバのバグを直す

[buggy-static.mjs](buggy-static.mjs) は `../samples/public` を公開するサーバです。ブラウザで http://127.0.0.1:9195/ を開くと、ページも CSS も表示されます。でも、確認スクリプトを動かすと、21 個のうち 16 個が失敗します。

```sh
$ bash check-static.sh
```

すべて通るように直してください。直し方は自由です。問題6の `serveStatic` を使って書き直してもかまいません（模範解答はそうしています）。

ブラウザでも確かめてください。直す前は、ページの「JavaScript がまだ動いていません」が変わらず、ロゴの画像も表示されません。DevTools の Console に、理由が出ています（本文3.2節）。

**外のファイルの確かめ方について**: 確認スクリプトの 9 は、`curl --path-as-is` で `/..%2Foutside.txt` を送ります。このような確かめ方は、自分の Mac の中で動かしている、自分のサーバだけに使ってください。
