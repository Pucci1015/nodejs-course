# 第19章 静的ファイル配信

HTML・CSS・JavaScript・画像のように、**フォルダに置いたファイルを、そのまま返す**ことを「静的ファイルの配信」と言います。第1部 第4章の `serve.mjs` で、すでに一度やりました。
仕組みは「URL のパスを、フォルダの中のファイルのパスにして、中身を返す」だけです。ただ、この「パスにする」ところを間違えると、**公開するつもりのないファイル**（設定ファイル、秘密鍵、ソースコード）まで返してしまいます。この章では、その危なさを自分の Mac の中で確かめてから、安全なサーバを作ります。あわせて、Content-Type、大きなファイルの流し方、キャッシュ（304）、Range、圧縮も扱います。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第17章（`createApp`）、第18章（`req.url` の分解、`..` と `%2F`）、第2部 第7章（Cache-Control・ETag・304・gzip）、第3部 第15章（`path`、`fs/promises`、Stream） |
| この章のゴール | 拡張子から正しい Content-Type を返し、`nosniff` の意味を説明できる / パストラバーサルが起きる理由と、防ぎ方（戻した後に確かめる、`.` で始まる名前、シンボリックリンク）を説明できる / 大きなファイルを Stream で流せる / ETag・Last-Modified で 304 を返せる / Range と圧縮の決まりを説明できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 危ないサーバ、パスの表、安全なサーバ、キャッシュ、Range、圧縮。`public/` は公開するフォルダの例 |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答（`static.mjs` の `serveStatic` は、成果物の掲示板でも使います） |

> この章のサンプルと練習問題は、第17章の模範解答を `import` して使います。外部のパッケージは使わないので、`npm install` は不要です。

---

## 1. Flask の static フォルダは何をしていたか

Flask では、アプリのフォルダに `static/` というフォルダを作ってファイルを置くと、`/static/style.css` のような URL で開けました。HTML の中では `url_for('static', filename='style.css')` と書きました。

Flask は、アプリを作るときに「`/static/<path:filename>` という規則で、`static/` フォルダの中のファイルを返す」ルートを、自動で1つ登録しています。そのルートの中で使われているのが `send_from_directory` という関数で、次のことをしています。

1. URL の `filename` を、`static/` フォルダの中のパスにする。このとき、`..` などでフォルダの外に出ていないかを確かめる（`safe_join` という関数）
2. 拡張子から Content-Type を決める
3. `Last-Modified` や `ETag` を付け、ブラウザが「前と同じなら送らなくてよい」と聞いてきたら 304 を返す
4. ファイルを少しずつ送る

この章では、この1〜4を自分で書きます。Flask を使っていたときは、1 で守られていたことに気付かなかったはずです。

> 本番では、静的ファイルは Node.js ではなく、前に置いた Web サーバ（nginx など）や CDN が返すことがよくあります（第12部）。それでも、開発中や小さなアプリでは Node.js が返しますし、Express の `express.static`（第5部）も、中でしていることはこの章と同じです。

## 2. いちばん素朴なサーバと、その問題

[samples/naive-static.mjs](samples/naive-static.mjs) は、よく見かける書き方です。

```js
const ROOT = path.join(import.meta.dirname, 'public');

const server = http.createServer(async (req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url));
  try {
    const data = await fs.readFile(file);
    res.end(data);
  } catch (err) {
    res.statusCode = 404;
    res.end(`${err.code}\n`);
  }
});
```

ブラウザで http://127.0.0.1:9190/ を開くと、ちゃんと動いているように見えます。でも、次の問題があります。

| 問題 | 何が起きるか | この章の節 |
| --- | --- | --- |
| Content-Type が無い | ブラウザが中身から種類を推測する。`nosniff` を付けると、CSS や JavaScript として使われない | 3 |
| `%xx` を戻した後の `..` を確かめていない | **公開するフォルダの外のファイルが読める** | 4 |
| クエリを取り除いていない | `/style.css?v=2` が 404 | 4 |
| 全部をメモリに読んでから返す | 大きなファイルでメモリが足りなくなる | 5 |
| エラーの code を客に見せる、どのエラーも 404 | 中の様子が漏れる。フォルダ（`EISDIR`）も 404 | 4.4 |
| キャッシュのヘッダが無い | 毎回、全部を送り直す | 6 |

2つ目を、自分の Mac の中で確かめます。`samples/outside.txt` は、`public` の**外**に置いた練習用のファイルです。

```sh
$ cd samples
$ node naive-static.mjs
# 別のターミナルで
$ curl --path-as-is 'http://127.0.0.1:9190/..%2Foutside.txt'
これは public の外にあるファイルです（練習用。中身に秘密はありません）。
これが見えたら、公開するフォルダの外を読めてしまっています。
```

公開するフォルダの外が読めました。これを**パストラバーサル**（ディレクトリトラバーサル）と言います。外にあるのが `.env` や `~/.ssh` の秘密鍵なら、大きな事故です。

> この確かめ方は、**自分の Mac の中で動かしている、自分のサーバ**だけに使ってください。ほかの人のサーバに試すと、不正アクセスになります。

## 3. Content-Type

### 3.1 拡張子から決める

ファイルの種類は、拡張子から決めます（[samples/mime.mjs](samples/mime.mjs)）。

```js
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  ...
};
export function contentType(file) {
  return TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
}
```

- 文字のファイルには `charset=utf-8` を付けます。無いと、ブラウザが文字コードを推測して、文字化けすることがあります（第2部 第7章）
- JavaScript は `text/javascript` です（古い資料には `application/javascript` もありますが、今の決まりは `text/javascript`）
- 知らない拡張子は `application/octet-stream`（「ただのバイト列」）にします。ブラウザは表示せずにダウンロードします。分からないものを `text/html` にすると、ファイルの中の HTML や JavaScript がページとして動いてしまうかもしれません
- 拡張子は小文字にしてから比べます（`LOGO.PNG`）

### 3.2 nosniff: 推測させない

ブラウザは、Content-Type が無かったり、おかしかったりすると、中身を見て種類を推測することがあります（MIME スニッフィング）。たとえば、利用者がアップロードした「画像」の中身が HTML なら、ブラウザがそれをページとして表示し、中の JavaScript が動いてしまうかもしれません。

`X-Content-Type-Options: nosniff` を付けると、ブラウザは推測をやめ、**Content-Type をそのまま信じます**。その代わり、Content-Type が間違っていると、正しく使われなくなります。練習問題5のサーバ（`app.js` を `text/plain`、`logo.svg` を `text/plain` で返し、`nosniff` を付けている）を Chromium で開くと、次のようになりました（Playwright で確かめた）。

```
Refused to execute script from 'http://127.0.0.1:9195/app.js' because its MIME type ('text/plain')
is not executable, and strict MIME type checking is enabled.
```

JavaScript は動かず、SVG の画像も表示されませんでした。正しい Content-Type にすると、どちらも動きます。**正しい Content-Type と `nosniff` は、いつも組で付けます。**

## 4. パストラバーサルを防ぐ

### 4.1 URL が `..` を消してくれる範囲

第18章3節で見たとおり、`URL` は `..` と `.`（`%2e%2e` も）を取り除きます。`curl` やブラウザも、送る前に取り除きます。だから `/../outside.txt` は、サーバに届く前か、`URL` で読んだ時点で `/outside.txt` になり、`public` の中を指します。

ところが、`%2F`（`/`）は区切りではないので、`/..%2Foutside.txt` の `..` は取り除かれません。サーバがこれを `decodeURIComponent` すると `/../outside.txt` になり、ここで初めて `..` が現れます。

```sh
$ node samples/traversal-demo.mjs
公開するフォルダ: /Users/ryota/site/public

"/..%2Foutside.txt"
  URL の pathname : /..%2Foutside.txt
  %xx を戻すと    : "/../outside.txt"
  path.join       : /Users/ryota/site/outside.txt
  path.relative   : "../outside.txt"   ← 外を指している
"/docs/..%2F..%2F..%2F.ssh%2Fid_ed25519"
  URL の pathname : /docs/..%2F..%2F..%2F.ssh%2Fid_ed25519
  %xx を戻すと    : "/docs/../../../.ssh/id_ed25519"
  path.join       : /Users/ryota/.ssh/id_ed25519
  path.relative   : "../../.ssh/id_ed25519"   ← 外を指している
...
```

`path.join` は `..` をそのまま計算するので、外に出るのを止めません（第3部 第15章 練習問題1）。

### 4.2 戻した「後」で、外を指していないか確かめる

守り方の基本は、**`%xx` を戻して、`path.join` でつないだ「後」の結果が、公開するフォルダの中にあるか**を確かめることです。

```js
const decoded = decodeURIComponent(pathname); // 戻すのは1回だけ
const full = path.join(ROOT, decoded);
const rel = path.relative(ROOT, full);
if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
  throw new HttpError(403, 'このフォルダの外は開けません');
}
```

`path.relative(ROOT, full)` は「ROOT から full への道順」です。`..` で始まれば、一度 ROOT の外に出ています。

`full.startsWith(ROOT)` で確かめる書き方もよく見ますが、`ROOT` が `/site/public` のとき、`/site/public-backup/secret` も `startsWith` を満たしてしまいます。`path.relative` を使うか、`startsWith(ROOT + path.sep)` にします。

また、**`%xx` を戻すのは1回だけ**にします。`%252F` を2回戻すと `%2F` → `/` になり、1回目の後で確かめた意味がなくなります（二重デコード）。第18章の Router の `params['*']` はもう戻した後の値なので、静的ファイルのハンドラは、%xx のままの `pathname` から自分で1回だけ戻します（練習問題3）。

### 4.3 そのほかに気をつけるもの

| もの | 例 | どうするか |
| --- | --- | --- |
| `.` で始まる名前 | `/.env`、`/.git/config` | 404（あることも知らせない）。`public` に置かないのが一番だが、まちがって置いても返さない |
| NUL 文字 | `/a%00.html` | 400。`fs` に渡すと `ERR_INVALID_ARG_VALUE` で失敗する |
| `\` | `/img/..%5C..%5Coutside.txt` | 400。Mac や Linux では、`\` はふつうの文字なので外には出ないが、Windows では区切り。紛らわしいので受け付けない |
| 壊れた `%xx` | `/%E0%A4%A` | 400（第18章3.5節） |
| `//` | `/docs//a.txt` | 404。案内先（`Location`）が `//` で始まると、別のサイトへのリダイレクトになる（第18章7節） |
| シンボリックリンク | `public/link.txt` → `/etc/passwd` | `fs.realpath` でたどった先も、中にあるか確かめる |

シンボリックリンクは、`ln -s 元 リンクの名前` で作れる「別のファイルを指す印」です。`public` の中にあっても、指している先が外なら、外のファイルが読めてしまいます。`fs.realpath` は、リンクをたどった本当のパスを返します。

これらをまとめて、`safePath` と `resolveFile` という部品にするのが練習問題2です。

### 4.4 フォルダと、最後の `/`

`/docs/` のようにフォルダを指す URL には、フォルダの中の `index.html` を返すのがふつうです。フォルダの中身の一覧は、見せない方が安全です（見せたいものだけを `index.html` に書く）。

`/docs`（最後の `/` が無い）で開かれたときは、`/docs/` へ **308** で案内します。[samples/public/docs/index.html](samples/public/docs/index.html) の中の `guide.html` という相対パスのリンクは、ページの URL が `/docs/` なら `/docs/guide.html` に、`/docs` なら **`/guide.html`** になってしまうからです（相対 URL の解決。第2部 第9章）。

```sh
$ node samples/static-server.mjs
$ curl -i http://127.0.0.1:9191/docs
HTTP/1.1 308 Permanent Redirect
Location: /docs/
```

## 5. 少しずつ流す

`fs.readFile` は、ファイル全部をメモリに読みます。動画のような大きなファイルを、同時に何人もが開くと、メモリが足りなくなります。第3部 第15章7節の Stream で、少しずつ流します。

```js
const fh = await fs.open(file);
try {
  await pipeline(fh.createReadStream({ start: 0, end: stat.size - 1 }), res);
} catch (err) {
  // 客が先に切った（ERR_STREAM_PREMATURE_CLOSE）なら、することは無い
  if (err.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw err;
}
```

- `pipeline` は、客の受け取りが遅ければ読むのを待ち（背圧）、客が途中で切れば読むのをやめます
- 客が途中で切ると、`pipeline` は `ERR_STREAM_PREMATURE_CLOSE` で失敗します。客がいないだけなので、エラーとして扱う必要はありません
- `end`（最後のバイトの位置）を渡しておくと、ストリームは最後のバイトを読んだところで終わります。渡さないと、もう一度「ファイルの終わり」を確かめる読み込みが入ります。この教材の環境では、その間に客（curl）が先に接続を閉じ、全部受け取れているのに `ERR_STREAM_PREMATURE_CLOSE` になることがありました
- 空のファイルでは `end` が `-1` になるので、先に `res.end()` で終えます
- 練習問題3の解答では、**先にファイルを開いてから**、開いたファイルの `stat` で大きさを調べます。`stat` してから開くまでの間にファイルが消えたり変わったりすると、`Content-Length` と中身が合わなくなるからです

## 6. キャッシュと 304

### 6.1 Cache-Control

第2部 第7章で見たとおり、`Cache-Control` は「この返事を、どれだけの間、聞き直さずに使ってよいか」をブラウザに伝えます。

| 値 | 意味 | 向いているもの |
| --- | --- | --- |
| `no-cache` | 保存してよいが、使う前に毎回「変わった？」と聞く | HTML。いつも新しいものを見せたい |
| `max-age=60` | 60 秒は聞かずに使う | すぐには変わらないもの |
| `no-store` | 保存しない | 個人の情報が入ったページ |
| `public, max-age=31536000, immutable` | 1年、聞かずに使う。変わらない | 名前に中身のハッシュを入れたファイル（`app.3f9a1c.js`） |

最後の形は、第8部の Vite がビルドしたファイルで使われます。中身が変われば名前も変わる（新しい名前の URL になる）ので、古いものを長く使っても困りません。

### 6.2 ETag・Last-Modified と 304

`no-cache` のときに「変わった？」と聞く仕組みが、条件付きリクエストです。

1. サーバは、返事に `ETag`（中身の目印）と `Last-Modified`（最後に変わった時刻）を付ける
2. ブラウザは、次に同じ URL を開くとき、`If-None-Match: 前の ETag` と `If-Modified-Since: 前の Last-Modified` を付けて聞く
3. サーバは、変わっていなければ **304 Not Modified** を、本文なしで返す。ブラウザは保存しておいたものを使う

```sh
$ node samples/cache-demo.mjs
$ curl -i http://127.0.0.1:9192/no-cache
HTTP/1.1 200 OK
Cache-Control: no-cache
ETag: "kVBgR_EJgx3wp227"
Last-Modified: Wed, 04 Nov 2026 18:39:57 GMT
...
$ curl -i -H 'If-None-Match: "kVBgR_EJgx3wp227"' http://127.0.0.1:9192/no-cache
HTTP/1.1 304 Not Modified
```

（ETag と時刻は、環境によって変わります。）ブラウザで http://127.0.0.1:9192/ を開き、DevTools の Network タブを見ながら再読み込みすると、`/no-cache` は 304、`/max-age` は 60 秒の間「(disk cache)」や「(memory cache)」になる様子が見られます。

決まりの細かいところ:

- `If-None-Match` があれば、`If-Modified-Since` は見ない（ETag の方が正確だから）
- HTTP の日付は**秒まで**です。ファイルの時刻にはミリ秒があるので、切り捨ててから比べます。そうしないと、いつまでも「変わった」ことになります
- ETag には「強い」（`"abc"`）と「弱い」（`W/"abc"`）があります。弱い ETag は「意味として同じ」という印で、304 を返すかどうかを決めるときは、`W/` を無視して比べます（弱い比較）
- 練習問題3の解答の ETag は、ファイルの大きさと更新時刻から作る弱い ETag です（中身を読まずに作れる）。`cache-demo.mjs` は中身のハッシュから作る強い ETag で、正確ですが、毎回中身を全部読む必要があります

## 7. Range: 一部だけを返す

動画を途中から見る、止まったダウンロードを続きから始める、というときに、ブラウザは `Range` ヘッダで「何バイト目から何バイト目まで」を頼みます。

```sh
$ node samples/range-demo.mjs
$ curl -i -r 0-8 http://127.0.0.1:9193/hello.txt
HTTP/1.1 206 Partial Content
Content-Type: text/plain; charset=utf-8
Content-Range: bytes 0-8/86
Content-Length: 9
Accept-Ranges: bytes

こんに
$ curl -i -r 1000-2000 http://127.0.0.1:9193/hello.txt
HTTP/1.1 416 Range Not Satisfiable
Content-Range: bytes */86
```

- 返すのは **206 Partial Content** と、`Content-Range: bytes 始め-終わり/全体の大きさ`
- ファイルの中に1バイトも無い範囲なら **416**
- `Accept-Ranges: bytes` は「Range に対応している」という印です。`<video>` は、これを見て途中から読もうとします
- `bytes=-500` は「最後の 500 バイト」、`bytes=500-` は「500 バイト目から最後まで」。`bytes=0-99,200-299` のように複数の範囲も頼めますが、対応しないなら、Range を無視して全部を 200 で返してかまいません
- 9バイト（`こんに`）でちょうど切れたのは、日本語が1文字3バイトだからです。10バイトにすると、文字の途中で切れます（第3部 第15章6節）

`Range` を正しく読む `parseRange` を作るのが練習問題4です。

## 8. 圧縮して返す

文字のファイル（HTML・CSS・JavaScript・JSON）は、gzip や Brotli（br）で圧縮すると、ずっと小さくなります。

```sh
$ node samples/gzip-demo.mjs
$ curl -s -o /dev/null -w '%{size_download} バイト\n' http://127.0.0.1:9194/big.txt
146000 バイト
$ curl -s -o /dev/null -w '%{size_download} バイト\n' -H 'Accept-Encoding: gzip' http://127.0.0.1:9194/big.txt
5537 バイト
$ curl -s -o /dev/null -w '%{size_download} バイト\n' -H 'Accept-Encoding: br' http://127.0.0.1:9194/big.txt
2820 バイト
```

（同じような行が続く、とてもよく縮むデータです。ふつうのファイルは、ここまでは縮みません。）

- 客は `Accept-Encoding` で「この圧縮なら戻せる」と伝え、サーバは `Content-Encoding` で「この圧縮で送った」と伝える（第2部 第7章）
- **`Vary: Accept-Encoding`** を付けます。「同じ URL でも、`Accept-Encoding` によって中身が違う」と、途中のキャッシュ（CDN など）に知らせるためです。無いと、gzip を戻せない客に、gzip のデータが渡るかもしれません
- 圧縮した後の長さは、圧縮し終わるまで分からないので、`Content-Length` を付けずに流します（chunked）
- 画像（PNG・JPEG）や動画は、もう圧縮されているので、もう一度圧縮しても小さくなりません。CPU を使うだけです（`mime.mjs` の `isCompressible`）
- 毎回圧縮すると CPU を使うので、本番では、前もって圧縮したファイル（`app.js.br`）を置いておいたり、前に置いた Web サーバや CDN に任せたりします

`Accept-Encoding` には `gzip;q=0.5` のような「好みの強さ」も書けます。きちんと読む `negotiateEncoding` を作るのが練習問題6です。

## 9. Flask との対応

| やりたいこと | Flask | この章 |
| --- | --- | --- |
| フォルダを公開する | `static/` に置く（自動で `/static/...`） | `router.get('/static/*', serveStatic(root, { mount: '/static' }))` |
| ファイルを1つ返す | `send_from_directory(folder, name)` | `resolveFile` + `serveStatic` の中身 |
| 外に出ないか確かめる | `safe_join`（`send_from_directory` の中） | `safePath`（練習問題2） |
| Content-Type | 拡張子から自動 | `contentType`（`mime.mjs`） |
| 304 | 自動 | ETag・Last-Modified を自分で比べる（練習問題3） |
| キャッシュの時間 | `SEND_FILE_MAX_AGE_DEFAULT` の設定 | `cacheControl` のオプション |
| 本番 | nginx などに任せることが多い | 同じ（第12部） |

## まとめ

- 静的ファイルの配信は「URL のパスを、フォルダの中のファイルのパスにして返す」こと。このパスの作り方を間違えると、外のファイルが読める（パストラバーサル）。
- `%2F` を戻すと `..` が現れる。**戻した後に** `path.relative` で、公開するフォルダの中か確かめる。戻すのは1回だけ。
- `.` で始まる名前、NUL、`\`、`//`、シンボリックリンクにも気をつける。フォルダは `/` を付けて案内し、一覧は見せない。
- 拡張子から正しい Content-Type を付け、`nosniff` で推測をやめさせる。間違った Content-Type では JavaScript が動かない。
- 大きなファイルは Stream で流す。先に開いてから大きさを調べる。客が先に切るのはエラーではない。
- `Cache-Control`、`ETag`・`Last-Modified` と 304 で、送り直しを減らす。日付は秒まで。
- Range は 206 と 416。圧縮は `Accept-Encoding`・`Content-Encoding`・`Vary`。

## 練習問題

[exercises/README.md](exercises/README.md) に6問あります。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- OWASP「Path Traversal」: https://owasp.org/www-community/attacks/Path_Traversal
- MDN「X-Content-Type-Options」: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/X-Content-Type-Options
- MDN「MIME タイプ（IANA メディアタイプ）」: https://developer.mozilla.org/ja/docs/Web/HTTP/MIME_types
- IANA「Media Types」: https://www.iana.org/assignments/media-types/media-types.xhtml
- MDN「HTTP キャッシュ」: https://developer.mozilla.org/ja/docs/Web/HTTP/Caching
- MDN「HTTP 範囲リクエスト」: https://developer.mozilla.org/ja/docs/Web/HTTP/Range_requests
- RFC 9110「HTTP Semantics」（8.8 ETag、13 条件付きリクエスト、14 Range、12.5.3 Accept-Encoding）: https://www.rfc-editor.org/rfc/rfc9110
- RFC 9111「HTTP Caching」: https://www.rfc-editor.org/rfc/rfc9111
- Node.js「File system: fs.realpath」: https://nodejs.org/api/fs.html#fspromisesrealpathpath-options
- Flask「Static Files」: https://flask.palletsprojects.com/en/stable/quickstart/#static-files

前の章: [第18章 ルーティングを自作する](../ch18-routing/README.md) ／ 次の章: [第20章 フォームと JSON を受け取る](../ch20-request-body/README.md)
