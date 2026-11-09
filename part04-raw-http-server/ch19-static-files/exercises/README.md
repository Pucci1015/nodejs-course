# 第19章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- |
| 1 | パスの組み立ての結果を予想する | [predict-paths.mjs](predict-paths.mjs) | 4 | — |
| 2 | 外に出ないパスを作る `safePath`・`resolveFile` | [safe-path.mjs](safe-path.mjs)、[safe-path.test.mjs](safe-path.test.mjs) | 4 | — |
| 3 | 静的ファイルのハンドラ `serveStatic`（304・キャッシュ・HEAD・mount） | [static.mjs](static.mjs)、[static.test.mjs](static.test.mjs) | 3〜6 | 空いている番号 |
| 4 | Range ヘッダを読む `parseRange` | [range.mjs](range.mjs)、[range.test.mjs](range.test.mjs) | 7 | — |
| 5 | それらしく見える静的ファイルのサーバのバグを直す | [buggy-static.mjs](buggy-static.mjs)、[check-static.sh](check-static.sh) | 2〜6 | 9195 |
| 6 | Accept-Encoding を読む `negotiateEncoding` | [encoding.mjs](encoding.mjs)、[encoding.test.mjs](encoding.test.mjs) | 8 | — |

- 問題2・3・4・6は `node --test ○○.test.mjs` ですべてのテストが通れば完成です。テスト用のファイルは OS の一時フォルダに作り、最後に消します
- 問題3は、問題2の `safe-path.mjs` を使います。問題2を先に解いてください
- 問題5は `bash check-static.sh` で確かめます

---

## 問題1 パスの組み立ての結果を予想する

[predict-paths.mjs](predict-paths.mjs) に 12 個の式があります。公開するフォルダを `/srv/site/public` として、**実行する前に**結果を予想して書き出してから、`node predict-paths.mjs` で確かめてください。

特に、次の3つは理由を説明してください。

- 3番と4番: `/../a` と `/..%2Fa` は、どちらも「1つ上の a」に見えるのに、結果が違うのはなぜか
- 7番と8番: `startsWith` で「中にあるか」を確かめると、どんな名前のフォルダで間違えるか
- 11番と12番: `%252e%252e%252f` を1回戻したもの、2回戻したものは何か。2回戻すと、なぜ危ないのか

## 問題2 外に出ないパスを作る

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

## 問題3 静的ファイルのハンドラ

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

最初は 13 個のうち 8 個が失敗します（問題2が解けている場合）。すべて通れば完成です。

## 問題4 Range ヘッダを読む

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

## 問題5 それらしく見える静的ファイルのサーバのバグを直す

[buggy-static.mjs](buggy-static.mjs) は `../samples/public` を公開するサーバです。ブラウザで http://127.0.0.1:9195/ を開くと、ページも CSS も表示されます。でも、確認スクリプトを動かすと、21 個のうち 16 個が失敗します。

```sh
$ bash check-static.sh
```

すべて通るように直してください。直し方は自由です。問題3の `serveStatic` を使って書き直してもかまいません（模範解答はそうしています）。

ブラウザでも確かめてください。直す前は、ページの「JavaScript がまだ動いていません」が変わらず、ロゴの画像も表示されません。DevTools の Console に、理由が出ています（本文3.2節）。

**外のファイルの確かめ方について**: 確認スクリプトの 9 は、`curl --path-as-is` で `/..%2Foutside.txt` を送ります。このような確かめ方は、自分の Mac の中で動かしている、自分のサーバだけに使ってください。

## 問題6 Accept-Encoding を読む

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
