# 第19章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 内容 |
| --- | --- |
| [content-type.mjs](content-type.mjs) | 問題1: `contentTypeOf` |
| [inside-check.mjs](inside-check.mjs) | 問題2: `isInside`・`isHidden` |
| [etag.mjs](etag.mjs) | 問題3: `weakEtag`・`isNotModified` |
| [safe-path.mjs](safe-path.mjs) | 問題5: `safePath`・`resolveFile` |
| [static.mjs](static.mjs) | 問題6: `serveStatic`（問題7の `parseRange` を使って Range にも対応） |
| [range.mjs](range.mjs) | 問題7: `parseRange` |
| [encoding.mjs](encoding.mjs) | 問題8: `negotiateEncoding` |
| [static-server.mjs](static-server.mjs) | 問題9: `serveStatic` で書き直した静的ファイルのサーバ。`node static-server.mjs フォルダ` で、好きなフォルダを公開する道具にもなる |

模範解答は、`~/dev/part04/ch19-static-files/exercises` で次のように確かめられます。`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。

```sh
$ MODULE=../solutions/content-type.mjs node --test content-type.test.mjs
$ MODULE=../solutions/inside-check.mjs node --test inside-check.test.mjs
$ MODULE=../solutions/etag.mjs node --test etag.test.mjs
$ MODULE=../solutions/safe-path.mjs node --test safe-path.test.mjs
$ MODULE=../solutions/static.mjs node --test static.test.mjs
$ MODULE=../solutions/range.mjs node --test range.test.mjs
$ MODULE=../solutions/encoding.mjs node --test encoding.test.mjs
$ bash check-static.sh ../solutions/static-server.mjs
```

`static.mjs` の Range は、次のように試せます。

```sh
$ node ../solutions/static-server.mjs
# 別のターミナルで
$ curl -i -r 0-8 http://127.0.0.1:9195/hello.txt      # 206
$ curl -i -r 999- http://127.0.0.1:9195/hello.txt     # 416
```

---

## 問題1 ファイルの名前から Content-Type を決める

```js
export function contentTypeOf(file) {
  const ext = path.extname(file).toLowerCase();
  return Object.hasOwn(TYPES, ext) ? TYPES[ext] : 'application/octet-stream';
}
```

（`TYPES` は、問題の表をそのままオブジェクトにしたものです。）

- `TYPES[ext] ?? 'application/octet-stream'` と書くと、`x.constructor` で `Object` の関数が返ってしまいます。本文3.1節の `my-mime.mjs` も、このままでは同じ問題があります。
- `archive.tar.gz` の `path.extname` は `.gz` です（最後の `.` から後ろ）。
- 知らないものを `text/html` や `text/plain` にしないのは、ブラウザが中身を推測したり、ページとして動かしたりしないようにするためです（本文3.2節）。

## 問題2 フォルダの中を指すか、`.` で始まる名前か

```js
export function isInside(root, target) {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return !(rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel));
}

export function isHidden(pathname) {
  return pathname.split('/').some((seg) => seg.startsWith('.'));
}
```

- `target.startsWith(root)` で判定すると、`/srv/site/public-backup/secret.txt` も中と見なしてしまいます（本文4.2節）。
- `root` そのもののときは、`path.relative` が `''`（空の文字列）を返すので、中と判定されます。
- 問題5の `safePath` は、これに `%xx` を戻す処理、NUL 文字や `\` の拒否、シンボリックリンクの確認を足したものです。

## 問題3 弱い ETag を作り、304 を返してよいか決める

```js
export function weakEtag(stat) {
  const size = stat.size.toString(16);
  const time = Math.floor(stat.mtimeMs).toString(16);
  return `W/"${size}-${time}"`;
}

const strip = (tag) => (tag.startsWith('W/') ? tag.slice(2) : tag);

export function isNotModified(ifNoneMatch, etag) {
  if (ifNoneMatch === undefined || ifNoneMatch === null) return false;
  if (ifNoneMatch.trim() === '*') return true;
  return ifNoneMatch
    .split(',')
    .map((t) => t.trim())
    .some((t) => strip(t) === strip(etag));
}
```

- 大きさと時刻だけで作るので、ファイルの中身を読まずに作れます。その代わり、同じ大きさのまま、同じ時刻に書き換えられると気付けません。中身のハッシュで作る強い ETag（本文6節の `etag-server.mjs`）は正確ですが、毎回中身を全部読む必要があります。
- 16 進数にするのは、短く書くためです（決まりではありません）。
- 問題6の `serveStatic` は、これと `If-Modified-Since` を使って 304 を返します。

## 問題4 パスの組み立ての結果を予想する

```
 1: "/srv/site/public/index.html"
 2: "/srv/site/secret"
 3: "/srv/site/public/a"
 4: "/srv/site/a"
 5: "../a"
 6: "docs/a"
 7: true
 8: false
 9: "/etc/passwd"
10: "/srv/site/public/etc/passwd"
11: "%2e%2e%2f"
12: "../"
```

- **3番と4番**: `/../a` の `..` は、`URL` で読んだ時点で取り除かれ、`pathname` は `/a` になります。`/..%2Fa` の `%2F` は区切りではないので、`..` は残ったまま `pathname` になり、`decodeURIComponent` で `/../a` に戻ってから `path.join` が `..` を計算します。**URL が守ってくれるのは、`%2F` を戻す前まで**です
- **7番と8番**: `public-old` のように、公開するフォルダの名前で**始まる**別のフォルダがあると、`startsWith(ROOT)` は `true` になります。`ROOT + path.sep`（`/srv/site/public/`）で始まるかを調べるか、`path.relative` を使います
- **9番と10番**: `path.resolve` は、途中に絶対パスがあると、そこから計算し直します（9番は `/etc/passwd`）。`path.join` はつなぐだけです（10番）。URL のパスは必ず `/` で始まるので、`path.resolve(ROOT, decoded)` と書くと、どんなパスでも `ROOT` の外になります。`path.join` を使います
- **11番と12番**: `%25` は `%` です。1回戻すと `%2e%2e%2f`、2回戻すと `../` です。1回戻した後で「`..` が無いか」を確かめ、その後でもう一度戻すと、確かめた後に `..` が現れます。戻すのは1回だけにします

## 問題5 外に出ないパスを作る

[safe-path.mjs](safe-path.mjs) で調べる順番は、次のとおりです。

1. `/` で始まるか → `decodeURIComponent`（1回だけ） → NUL と `\` が無いか（400）
2. `path.join(root, decoded)` の結果を `path.relative` で確かめる（403）
3. 戻した値を `/` で分け、途中の空のセグメントと、`.` で始まるセグメントを調べる（404）

外に出るもの（2）を、`.` で始まる名前（3）より先に調べています。`/..%2Foutside` の `..` も「`.` で始まる名前」なので、順番を逆にすると 404 になります。どちらも返さないことに変わりはありませんが、403 にしておくと、ログで「外を開こうとした」リクエストを見分けられます。

`resolveFile` のポイント:

- フォルダの中身の一覧は見せず、`index.html` が無ければ 404
- `fs.realpath` は、`root` とファイルの両方に使います。ヒントに書いたとおり、Mac の `/var/folders` は `/private/var/folders` へのリンクなので、片方だけ `realpath` すると比べられません
- `stat.isFile()` でないもの（名前付きパイプなど）も 404 にしています。名前付きパイプを `open` すると、書く人が来るまで待ち続けてしまうからです

`realpath` で確かめてから開くまでの間に、リンクを差し替えられると、すり抜けられる可能性は残ります。公開するフォルダに、信用できない人がファイルを置けるなら、シンボリックリンクそのものを置けないようにする（アップロードの処理で作らない）のが本当の対策です。

## 問題6 静的ファイルのハンドラ

[static.mjs](static.mjs) のポイント:

- **パスは `%xx` のまま取り出す。** Router の `params['*']` は、もう戻した後の値です。それを `resolveFile` に渡すと2回戻すことになり、`/%2541.txt` が `A.txt` を返してしまいます（テストの「%xx を戻すのは1回だけ」）
- `mount` は `${mount}/` で始まるかを調べる。`/static` だけで調べると `/statichello.txt` も通ってしまいます
- **先に `fs.open` してから、`fh.stat()`** で大きさと時刻を調べる（本文5節）
- ETag は `W/"大きさ-更新時刻"`（16進数）。中身を読まずに作れます。中身が同じでも更新時刻が変われば ETag は変わりますが、そのときは 200 で送り直すだけなので困りません
- 304 には `Content-Type` を付けていません。304 は本文が無いので不要です（付けても間違いではありません）
- `If-Modified-Since` の比較は、ファイルの時刻を秒に切り捨ててから行います。`Last-Modified` は秒までしか書けないので、切り捨てないと、ブラウザが送ってきた `If-Modified-Since`（= 前の `Last-Modified`）より、ファイルの時刻がいつもわずかに後になり、304 になりません
- 途中で失敗したら（ヘッダを送った後なら）`res.destroy()`。`finally` でファイルを閉じます

テストの「ファイルが変わると、ETag も変わる」で `fs.utimes` を使っているのは、書き込みが速すぎると、更新時刻がミリ秒まで同じになることがあるからです。

## 問題7 Range ヘッダを読む

[range.mjs](range.mjs) は、`/^bytes=(\d*)-(\d*)$/` で形を確かめてから、3つの形に分けています。

最初に入っていた簡単な読み方では、次のことが起きます。

| Range | 簡単な読み方 | 問題 |
| --- | --- | --- |
| `bytes=-200` | `null`（正規表現にあてはまらない） | 「最後の 200 バイト」に答えられない |
| `bytes=990-5000`（1000 バイトのファイル） | `{ start: 990, end: 5000 }` | `Content-Length` が 4011 になり、本文と合わない |
| `bytes=5000-` | `{ start: 5000, end: 999 }` | 416 にすべきところを、おかしな範囲で 206 にしてしまう |
| `bytes=5-2` | `{ start: 5, end: 2 }` | 同じ |

`Content-Length` と本文が合わないと、第17章 練習問題4の6番のように、接続の中のバイトの区切りがずれます。

## 問題8 Accept-Encoding を読む

[encoding.mjs](encoding.mjs) は、`Accept-Encoding` を `Map`（名前 → q）にしてから、`available` を順に見て、q がいちばん大きいものを選んでいます。

- `q` の形は `/^(0(\.\d{0,3})?|1(\.0{0,3})?)$/`（RFC 9110 12.4.2 の決まり）。`1.5` や `0.12345` は形が正しくないので、その項目ごと無視します
- `identity` の q は、`identity` が書かれていればその値、無ければ `*` の値、どちらも無ければ 1 です

**`/\bgzip\b/.test(accept)` で調べると**: `gzip;q=0`（「gzip はいらない」）でも `gzip` という文字が入っているので、gzip で送ってしまいます。q を読まない決め方は、断られたものを送る可能性があります。

`serveStatic` に圧縮を組み込むなら、`isCompressible(contentType)` で文字のファイルだけを選び、`negotiateEncoding` の結果に応じて `zlib.createGzip()`・`createBrotliCompress()` を `pipeline` の間にはさみ、`Content-Encoding` と `Vary: Accept-Encoding` を付け、`Content-Length` を外します。ETag は、圧縮したものとしないもので変える（`W/"...-gzip"` など）必要があります。Range と圧縮を一緒に扱うのは難しいので、Range を頼まれたら圧縮しない、とするのが簡単です。

## 問題9 静的ファイルのサーバのバグ

| 失敗していた確認 | 原因 |
| --- | --- |
| 1〜4 | `types` に `.js`・`.svg` が無く、`text/plain` になる。`text/css`・`text/plain` に charset が無い |
| 5 | `req.url` をそのまま使っていて、クエリまでファイル名になる |
| 6・7 | フォルダを `createReadStream` で読もうとして `EISDIR`。`'error'` のリスナーが無いので、プロセスが終わる |
| 9 | `%xx` を戻した後に、外を指していないか確かめていない |
| 10 | `.` で始まる名前を返している |
| 14 | 壊れた `%xx` で `decodeURIComponent` が URIError。コールバックの外なので、プロセスが終わる |
| 16・17 | `Content-Length` が無い（`pipe` で流しているので chunked になる）。HEAD にも付かない |
| 19 | `If-Modified-Since` があるだけで、日時を比べずに 304 を返している |
| 20 | ETag が無い |
| 21 | どのメソッドでもファイルを返している |

19 は気付きにくいバグです。ブラウザは、いちど受け取ったファイルには `If-Modified-Since` を付けて聞いてくるので、このサーバでは、**ファイルを書き換えても、ブラウザには古いものが表示され続けます**。「直したのに画面が変わらない」ときに疑うところです。

[static-server.mjs](static-server.mjs) は、`serveStatic` を `createApp` で包むだけになりました。
