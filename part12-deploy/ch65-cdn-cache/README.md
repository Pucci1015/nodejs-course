# 第65章 CDN とキャッシュ

公開したアプリの画面（JS・CSS・画像）は、利用者が開くたびに、遠くのサーバから届きます。**CDN**（Content Delivery Network）は、世界中に置いたサーバに応答を覚えさせ、利用者の近くから返す仕組みです。速くなり、アプリのサーバの負担も減ります。ただし、覚えさせ方を間違えると、古い画面が消えなかったり、**ある人の情報が別の人に見えたり**します。この章では、練習用の小さな CDN をアプリの前に置き、`Cache-Control` の書き方で何が変わるかを、手を動かして確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 3〜4時間 |
| 前提 | 第2部 第7章 5節（`Cache-Control`・ETag・304）・6.2節（`Vary`）、第8部 第40章（ハッシュ付きのファイル名）、第62章 |
| この章のゴール | CDN が、何を・いつまで覚え、いつ確かめ直すかを説明できる / `s-maxage`・`stale-while-revalidate`・`private`・`no-store`・`immutable` を使い分けられる / ハッシュ付きのファイルと `index.html` を、違う決まりで配れる / 画面の中の URL に `index.html` を返し、無いファイルや API には 404 を返せる / 変わったものを、URL や印（タグ）で CDN から消せる / 人ごとの応答を CDN に覚えさせない書き方を守れる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | CDN の後ろに置くオリジン（`origin.ts`）、`Cache-Control` を分ける・ハッシュの名前を作る例、ビルドした画面を配る Express のサーバ |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part12/ch65-cdn-cache/` で実行します（`cd ~/dev/part12/ch65-cdn-cache`）。
> - 3節からは、ターミナルを3つ使います。1つ目でオリジン（`node samples/origin.ts`、**9857**）、2つ目で練習用の CDN（`cd ~/dev/part12 && npm run cdn`、**9858**）、3つ目で `curl` を打ちます。CDN の中身（[../tools/mini-cdn.ts](../tools/mini-cdn.ts)）は読まなくてかまいません。
> - 6節の画面のサーバは **9856** で待ちます。
> - 本物の CDN（Cloudflare、Amazon CloudFront など）は使いません。9節で、選び方だけを説明します。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| `Cache-Control` の設計（2・4節） | 成果物（画面・API・添付ファイルに、それぞれの決まり） |
| ビルドした画面を配る（5・6節） | 成果物（API と同じサーバから `web/dist` を配る） |
| キャッシュを消す（7節） | 成果物（デプロイの後）、第13部 |
| 人ごとの応答を覚えさせない（8節） | 成果物、第66章（見張る）、第13部 |

---

## 1. CDN は何をするか

```
利用者（東京） ── 近い ──▶ CDN のサーバ（東京） ── 遠い ──▶ アプリのサーバ（オリジン。米国）
                              │
                              └ 覚えていれば、ここで返す（HIT）。オリジンまで行かない
```

| 言葉 | 意味 |
| --- | --- |
| **オリジン**（origin） | 本当の応答を作る、自分のアプリのサーバ。第9章のオリジン（スキーム + ホスト + ポート）とは別の意味 |
| **エッジ**（edge） | CDN の、利用者の近くにあるサーバ。世界中に数百ある |
| **HIT**・**MISS** | 覚えていたので返した・覚えていなかったのでオリジンに取りに行った |
| **共有キャッシュ**（shared cache） | 多くの人の応答を覚える場所（CDN、会社のプロキシ）。ブラウザのキャッシュは、その人だけの**個人のキャッシュ**（private cache） |

CDN は、ブラウザと同じく HTTP のキャッシュ（第2部 第7章 5節）です。違うのは**共有**であることです。ブラウザが間違えて覚えても困るのはその人だけですが、CDN が間違えて覚えると、全員に同じものが返ります。

## 2. 共有キャッシュに向けた Cache-Control

### 2.1 第7章に足すもの

第2部 第7章 5節の表（`max-age`・`no-cache`・`no-store`・`private`・`public`・`immutable`）に、共有キャッシュのための指示を足します。

| Cache-Control | 意味 |
| --- | --- |
| `s-maxage=60` | **共有キャッシュだけ**、60 秒新鮮とする。あれば `max-age` より優先する。ブラウザは見ない |
| `max-age=0, s-maxage=60` | ブラウザは毎回聞き直し、CDN は 60 秒覚える。「CDN だけに覚えさせたい」ときの形 |
| `stale-while-revalidate=300` | 新鮮でなくなってから 300 秒までは、**古いものをすぐ返し、後ろで取り直す**。待たせない |
| `private` | 共有キャッシュは覚えてはいけない（ブラウザは覚えてよい） |

### 2.2 手を動かす: Cache-Control を分ける

値は「名前」か「名前=値」をカンマでつないだものです。`samples/cc.ts` を作って、分けてみます。

```ts
function parse(value: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of value.split(',')) {
    const [name = '', arg = ''] = part.trim().split('=');
    out.set(name.toLowerCase(), arg);
  }
  return out;
}

for (const v of [
  'public, max-age=31536000, immutable',
  'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
  'private, no-store',
]) {
  const cc = parse(v);
  const shared = cc.get('s-maxage') ?? cc.get('max-age');
  console.log(JSON.stringify(Object.fromEntries(cc)));
  console.log(`  → CDN が覚えてよい秒数: ${cc.has('private') || cc.has('no-store') ? 'なし' : shared}`);
}
```

```sh
$ node samples/cc.ts
{"public":"","max-age":"31536000","immutable":""}
  → CDN が覚えてよい秒数: 31536000
{"public":"","max-age":"0","s-maxage":"60","stale-while-revalidate":"300"}
  → CDN が覚えてよい秒数: 60
{"private":"","no-store":""}
  → CDN が覚えてよい秒数: なし
```

| 書き方 | 意味 |
| --- | --- |
| `const [name = '', arg = ''] = …split('=')` | 分割代入（第3部 第11章）。`=` が無いときは `arg` が無いので、既定の `''` になる |
| `toLowerCase()` | 名前は大文字・小文字を区別しない（`Max-Age` も同じ） |
| `cc.get('s-maxage') ?? cc.get('max-age')` | 共有キャッシュは `s-maxage` を先に見る |
| `Object.fromEntries(cc)` | `Map` を、ふつうのオブジェクトにする（表示のため） |

この分け方は、`"…"` で囲んだ値の中のカンマ（`no-cache="Set-Cookie, X-Foo"` のような書き方）には対応していません。練習問題2で直します。うまく動かないときは、[samples/cc.ts](samples/cc.ts) と比べてください。

## 3. 小さな CDN を動かす

### 3.1 オリジンと CDN を起動する

[samples/origin.ts](samples/origin.ts) は、CDN の後ろに置くアプリです。頼みが来るたびに、`origin: GET /api/stats` のように1行出すので、**オリジンまで届いたか**が分かります。

| パス | Cache-Control | 中身 |
| --- | --- | --- |
| `/` | `no-cache` + ETag | HTML。ハッシュ付きの JS を読む |
| `/assets/app.（ハッシュ）.js` | `public, max-age=31536000, immutable` | JS |
| `/api/stats` | `public, max-age=0, s-maxage=10, stale-while-revalidate=30`、`Cache-Tag: stats` | みんなに同じ数。作るのに 0.5 秒かかる。`generated` は作った回数 |
| `/api/tasks/1` | `public, max-age=0, s-maxage=60`、`Cache-Tag: task-1, tasks` | 1つのタスク。`PUT` で題名を変える（7節） |
| `/api/greeting` | `public, max-age=0, s-maxage=60`、`Vary: Accept-Language` | 言語ごとのあいさつ（8.2節） |
| `/api/me` | `private, no-store` | Cookie の `user` の名前（8.1節） |

1つ目のターミナルでオリジン、2つ目で CDN を起動します。

```sh
$ node samples/origin.ts
オリジン: http://127.0.0.1:9857/ （JS は /assets/app.a80a786c.js）
```

```sh
$ cd ~/dev/part12 && npm run cdn
mini-cdn: http://127.0.0.1:9858/ → オリジン http://127.0.0.1:9857
```

練習用の CDN は、9858 で受けた頼みを 9857 に中継し、応答に **`X-Cache`**（HIT・MISS など。本物の CDN でも、似た名前のヘッダで返すものが多い）と **`Age`**（覚えてから何秒たったか。HTTP の標準のヘッダ）を付けます。

### 3.2 手を動かす: HIT と MISS と Age

3つ目のターミナルで、同じ `curl` を、間をあけて3回打ちます。

```sh
$ W='%{http_code} %header{x-cache} age=%header{age}\n'
$ curl -s -w "$W" http://127.0.0.1:9858/api/stats
{"tasks":2,"generated":1}
200 MISS age=0
$ curl -s -w "$W" http://127.0.0.1:9858/api/stats
{"tasks":2,"generated":1}
200 HIT age=0
$ curl -s -w "$W" http://127.0.0.1:9858/api/stats      # 3 秒ほど待ってから
{"tasks":2,"generated":1}
200 HIT age=3
```

| 書き方 | 意味 |
| --- | --- |
| `W='…'` | シェルの変数に、`-w` の書式を入れておく（毎回打たなくてよいように）。`"$W"` で使う |
| `-w '%{http_code}'` | ステータスコードを出す（第2部 第6章） |
| `%header{x-cache}` | 応答のヘッダの値を出す（curl 7.84 以降。Mac の curl で使える） |

1回目は MISS（オリジンの1つ目のターミナルに `origin: GET /api/stats` が出る）、2回目からは HIT で、オリジンには何も出ません。最初の応答は 0.5 秒かかりましたが、HIT は一瞬です。`generated` も 1 のままです。

### 3.3 手を動かす: 古くなったら確かめる（REVALIDATED）

`/` は `no-cache` なので、CDN は覚えますが、**使う前に毎回オリジンに確かめます**。

```sh
$ curl -s -o /dev/null -w "$W" http://127.0.0.1:9858/
200 MISS age=0
$ curl -s -o /dev/null -w "$W" http://127.0.0.1:9858/
200 REVALIDATED age=0
```

オリジンには、こう出ます。

```
origin: GET /
origin: GET /（If-None-Match 付き）
```

2回目は、CDN が覚えた ETag を `If-None-Match` に付けて聞き、オリジンは 304（ボディなし）を返しました。CDN は覚えていた HTML を返します。第7章 5.3節でブラウザがしていたことを、CDN がしています。HTML が大きくても、オリジンから CDN へは、ヘッダだけが流れます。

### 3.4 手を動かす: 古いものをすぐ返す（STALE）

`/api/stats` は `s-maxage=10, stale-while-revalidate=30` です。最後の MISS から 10 秒より後、40 秒より前に打ちます。

```sh
$ curl -s -w "$W" http://127.0.0.1:9858/api/stats
{"tasks":2,"generated":1}
200 STALE age=12
$ curl -s -w "$W" http://127.0.0.1:9858/api/stats
{"tasks":2,"generated":2}
200 HIT age=0
```

1回目は、古い（`generated: 1`）ものを**すぐに**返し、後ろでオリジンに取り直しに行きました。2回目は、取り直した新しいもの（`generated: 2`）の HIT です。だれも 0.5 秒待っていません。40 秒を過ぎてから打つと、古いものは使えず、待って取り直します。

| 指示 | 古くなった後の、最初の1人 |
| --- | --- |
| `s-maxage=10` だけ | オリジンの応答を待つ（遅い人が出る） |
| `s-maxage=10, stale-while-revalidate=30` | 古いものをすぐ受け取る（少し古いことがある） |

「少し古くてよいか」は、データによります。全体の数・ランキング・記事の一覧ならよく、在庫の数・自分の注文の状態なら、よくありません。

### 3.5 手を動かす: 同時の MISS をまとめる（COLLAPSED）

覚えていたものが消えた直後に、たくさんの人が同時に来ると、全員の頼みがオリジンに届き、オリジンが止まることがあります（**thundering herd**）。CDN は、同じ URL を取りに行っている最中なら、ほかの頼みを**待たせて、1つの応答を分けます**。

まず、CDN の `/__purge`（7節）で覚えたものを消し、`&` で5つの `curl` を同時に動かします。

```sh
$ curl -s -X POST -H 'Authorization: Bearer dev-only-purge-token' --json '{"tags":["stats"]}' http://127.0.0.1:9858/__purge
{"removed":1}
$ for i in 1 2 3 4 5; do curl -s -o /dev/null -w "$W" http://127.0.0.1:9858/api/stats & done; wait
200 MISS age=0
200 COLLAPSED age=0
200 COLLAPSED age=0
200 COLLAPSED age=0
200 COLLAPSED age=0
```

| 書き方 | 意味 |
| --- | --- |
| `--json '…'` | ボディを JSON で POST する（`Content-Type: application/json` も付く。curl 7.82 以降） |
| `for i in 1 2 3 4 5; do …; done` | 5 回繰り返す（第1部 第1章） |
| `コマンド &` | 終わるのを待たずに、次へ進む（後ろで動かす） |
| `wait` | 後ろで動かしたものが、全部終わるまで待つ |

オリジンには `origin: GET /api/stats` が1行だけ出ます。5人の頼みが、1回の取りに行きになりました。

## 4. 何を、どれだけ覚えさせるか

### 4.1 応答の種類ごとの決まり

第7章 5.4節の表を、CDN を前に置いた形に広げます。

| 応答 | Cache-Control | 理由 |
| --- | --- | --- |
| ハッシュ付きの JS・CSS・フォント | `public, max-age=31536000, immutable` | 中身が変われば名前が変わる（5節）。1年覚えて、再読み込みでも確かめない |
| `index.html` | `no-cache` + ETag | どのハッシュの JS を読むかが書いてある。毎回確かめて、デプロイをすぐ届ける |
| 名前の変わらない静的ファイル（`robots.txt`、`favicon.ico`） | `public, max-age=0`（か短い時間）+ ETag | 変えたときに届かないと困る |
| みんなに同じ API（公開の一覧・数） | `public, max-age=0, s-maxage=60, stale-while-revalidate=300` | ブラウザは毎回聞き、CDN が受け止める。少し古くてよいものだけ |
| ログインした人の API・ページ | `private, no-store`（か `private, no-cache`） | CDN に覚えさせない（8節） |
| エラー（500 など）、書き換え（POST・PUT・DELETE）の応答 | `no-store` | 覚えたエラーを返し続けない |

### 4.2 CDN が覚えない応答

`Cache-Control` のほかにも、CDN が覚えない（覚えるべきでない）条件があります。練習用の CDN は、次のものを覚えません（本物の CDN は、設定で変えられるものが多い。執筆時点）。

| 条件 | 理由 |
| --- | --- |
| GET 以外 | 書き換えの頼みは、毎回オリジンへ |
| `no-store`・`private` | 書いたとおり |
| `Set-Cookie` がある | 人ごとの Cookie を、全員に配ってしまう |
| `Vary: *` | 「頼みごとに違う」という意味なので、使い回せない |
| `Authorization` 付きの頼みで、`public`・`s-maxage` が無い | HTTP の決まり（RFC 9111 3.5節）。ログインした人の応答とみなす |
| 新鮮な時間（`s-maxage`・`max-age`）も `no-cache` も書いていない | 練習用の CDN は、書いていないものを覚えない。本物の CDN やブラウザは、`Last-Modified` から時間を**推測**して覚えることがあるので、いつも書く |

練習用の CDN のターミナルには、覚えなかった理由が出ます（`覚えない: no-store` など）。

## 5. ハッシュ付きのファイル名

### 5.1 手を動かす: 中身から名前を作る

「1年覚えてよい」と言えるのは、**中身が変われば名前が変わる**からです。第8部 第40章で Vite が作った `index-C4mP8sLa.js` のような名前の仕組みを、自分で作ってみます。`samples/hash-name.ts` を作ります。

```ts
import crypto from 'node:crypto';
import path from 'node:path';

function hashedName(fileName: string, content: string): string {
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
  const ext = path.extname(fileName); // '.js'
  return `${path.basename(fileName, ext)}.${hash}${ext}`;
}

console.log(hashedName('app.js', 'console.log(1);\n'));
console.log(hashedName('app.js', 'console.log(1);\n'));
console.log(hashedName('app.js', 'console.log(2);\n'));
console.log(hashedName('style.css', 'body { color: black; }\n'));
```

```sh
$ node samples/hash-name.ts
app.b603d946.js
app.b603d946.js
app.881ba83e.js
style.494f4abf.css
```

| 書き方 | 意味 |
| --- | --- |
| `createHash('sha256').update(…).digest('hex')` | 中身のハッシュ（第2部 第7章 5.3節） |
| `.slice(0, 8)` | 先頭の 8 文字だけ使う。名前としては十分にぶつからない |
| `path.extname('app.js')` | 拡張子 `'.js'`（第3部 第15章） |
| `path.basename('app.js', '.js')` | 拡張子を除いた名前 `'app'` |

同じ中身なら同じ名前、1文字違えば別の名前になりました。HTML は `/assets/app.881ba83e.js` を読むように書き換えます（これをビルドの道具がします。練習問題6で自分で書きます）。うまく動かないときは、[samples/hash-name.ts](samples/hash-name.ts) と比べてください。

### 5.2 デプロイの間の古いファイル

新しい版をデプロイした瞬間に、古い `index.html` を開いていた人がいます。その人の画面は、古い JS（`app.b603d946.js`）を、後から（画面の移動で `import()` したときなど。第8部 第40章 7節）読みに来ます。

| 置き方 | 古い JS を読みに来たとき |
| --- | --- |
| 新しい版のファイルだけ | 404。画面が壊れる |
| 古い版のファイルも、しばらく残す | 読める。CDN が1年覚えているので、たいていオリジンまで来ない |

コンテナのイメージ（第61章）には新しい版のファイルしか入らないので、古いファイルを残したいときは、ビルドした `assets/` をオブジェクトストレージ（第63章）に**足していき**、CDN はそこから配る、という形にします。成果物では簡単のために、API と同じサーバから配り、古いファイルは残しません。

## 6. ビルドした画面を配る

### 6.1 手を動かす: Express で dist を配る

第8部の画面は、`vite build` で `dist/` にできた HTML・JS・CSS です。本番では、これを API と同じサーバか、静的ファイル用のサービスから配ります。[samples/dist/](samples/dist/) に、ビルドの結果のつもりのファイルを置きました。`samples/spa-server.ts` を作ります。

```ts
import path from 'node:path';
import express from 'express';

const dist = path.join(import.meta.dirname, 'dist');
const app = express();

// 1. ハッシュ付きのファイル: 1年、確かめずに使ってよい。無ければ 404（index.html を返さない）
app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));

// 2. API は、無ければ JSON の 404（index.html を返さない）
app.use('/api', (_req, res) => {
  res.status(404).json({ title: 'Not Found' });
});

// 3. ほかのファイル（robots.txt など）: 名前が変わらないので、毎回確かめる
app.use(express.static(dist, { index: false, maxAge: 0 }));

// 4. 残りの GET（/tasks/12 など、画面の中の URL）: index.html を返す。拡張子のある名前は 404
app.get('/{*rest}', (req, res) => {
  if (path.extname(req.path) !== '') {
    res.status(404).type('text/plain').send('見つかりません\n');
    return;
  }
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(dist, 'index.html'));
});

// express.static の fallthrough: false が出す 404 などを、短い文で返す
app.use((err: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status ?? 500).type('text/plain').send(err.status === 404 ? '見つかりません\n' : 'エラー\n');
});

app.listen(9856, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9856/ で待っています');
});
```

| 書き方 | 意味 |
| --- | --- |
| `express.static(フォルダ, { immutable, maxAge: '1y' })` | `Cache-Control: public, max-age=31536000, immutable` を付けて配る |
| `fallthrough: false` | ファイルが無ければ、次に進まず 404 のエラーにする（4 の `index.html` に落ちない） |
| `index: false` | `/` に `index.html` を自動で返さない（4 で `no-cache` を付けて返すため） |
| `'/{*rest}'` | 残りのすべてのパス（Express 5 の書き方。第8部 第46章） |
| `res.sendFile(ファイル)` | ファイルを、ETag と `Last-Modified` 付きで返す。先に `Cache-Control` を書いておくと、それを使う |
| エラーのミドルウェア | `fallthrough: false` の 404 は `next(err)` で来るので、ここで短い文にする（第5部 第24章） |

```sh
$ node samples/spa-server.ts
```

別のターミナルで、`-D -`（ヘッダを出す。第2部 第6章）と `grep -iE`（大文字・小文字を区別せず、どれかの形に合う行だけ）で、要る行だけを見ます。

```sh
$ for p in / /tasks/12 /assets/index-C4mP8sLa.js /assets/index-OLD.js /api/nothing /favicon.ico; do echo "== $p"; curl -s -D - -o /dev/null "http://127.0.0.1:9856$p" | grep -iE '^HTTP|cache-control|content-type'; done
== /
HTTP/1.1 200 OK
Cache-Control: no-cache
Content-Type: text/html; charset=utf-8
== /tasks/12
HTTP/1.1 200 OK
Cache-Control: no-cache
Content-Type: text/html; charset=utf-8
== /assets/index-C4mP8sLa.js
HTTP/1.1 200 OK
Cache-Control: public, max-age=31536000, immutable
Content-Type: text/javascript; charset=utf-8
== /assets/index-OLD.js
HTTP/1.1 404 Not Found
Content-Type: text/plain; charset=utf-8
== /api/nothing
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8
== /favicon.ico
HTTP/1.1 404 Not Found
Content-Type: text/plain; charset=utf-8
```

ブラウザで `http://127.0.0.1:9856/tasks/12` を開くと、「この画面のパスは /tasks/12 です」と出ます。うまく動かないときは、[samples/spa-server.ts](samples/spa-server.ts) と比べてください。

### 6.2 なぜ 404 を分けるか

画面の中の URL（`/tasks/12`）は、サーバにはファイルが無いので、`index.html` を返して、画面（React Router。第8部 第44章）に決めさせます（**SPA のフォールバック**）。ただし、何でも `index.html` を返すと困ります。

| 何でも `index.html` を返すと | 困ること |
| --- | --- |
| 無い JS（`/assets/index-OLD.js`）にも 200 の HTML | ブラウザは HTML を JS として読もうとして、分かりにくいエラーになる。CDN が「200 の HTML」を1年覚えると、直らない |
| 無い API（`/api/nothing`）にも 200 の HTML | 画面の `fetch` が、JSON のつもりで HTML を受け取る |
| 検索エンジン | 無いページが 200 になる（ソフト 404。第8部 第46章） |

404 の応答には `Cache-Control` を書いていないので、練習用の CDN は覚えません（4.2節）。本物の CDN は 404 を短い間覚えることがあるので、デプロイの直後に古い 404 が残らないよう、`no-store` を付けることもあります。

## 7. キャッシュを消す

### 7.1 消し方の種類

| やり方 | 向いているもの |
| --- | --- |
| **名前を変える**（5節） | JS・CSS・画像。消さなくてよいので、いちばん確か |
| 短い時間 + `stale-while-revalidate` | 少し古くてよい API。消さなくても、すぐ入れ替わる |
| **URL を指定して消す**（パージ） | 名前を変えられないもの（`robots.txt` など） |
| **印（タグ）を指定して消す** | 1つのデータが、いくつもの URL に出るもの（タスクの詳細・一覧・数） |

本物の CDN にも、消す API があります（Cloudflare の Purge by URL・Cache-Tag、Fastly の Surrogate-Key など。印の名前やヘッダは CDN ごとに違い、プランによって使えないものもある。執筆時点。必ず公式で確認）。消すのは、世界中のエッジに伝わるまで、数秒かかります。

### 7.2 手を動かす: 書き換えたら印で消す

オリジンの `/api/tasks/1` は `Cache-Tag: task-1, tasks` を付けて返します。`PUT` で題名を変えると、オリジンが CDN の `/__purge` に `{"tags":["task-1","stats"]}` を送ります（[samples/origin.ts](samples/origin.ts) の `PUT` の所）。

```sh
$ curl -s -w '%header{x-cache}\n' http://127.0.0.1:9858/api/tasks/1
{"id":1,"title":"牛乳を買う"}
MISS
$ curl -s -w '%header{x-cache}\n' http://127.0.0.1:9858/api/tasks/1
{"id":1,"title":"牛乳を買う"}
HIT
$ curl -s -X PUT --data '豆乳を買う' -w '%header{x-cache}\n' http://127.0.0.1:9858/api/tasks/1
{"id":1,"title":"豆乳を買う"}
PASS
$ curl -s -w '%header{x-cache}\n' http://127.0.0.1:9858/api/tasks/1
{"id":1,"title":"豆乳を買う"}
MISS
```

`PUT` は覚えずにそのまま渡され（PASS）、オリジンが印で消したので、次の GET は MISS になって新しい題名が返りました。`curl -s http://127.0.0.1:9858/__cache` で、CDN が今覚えているものと印を見られます。

| 書き方 | 意味 |
| --- | --- |
| `Cache-Tag: task-1, tasks` | オリジンが付ける印。CDN は覚えるときに印も覚え、利用者には渡さない |
| `POST /__purge` + `Authorization: Bearer …` | 消す API。合言葉が無いと、だれでもキャッシュを消せてしまう（毎回オリジンまで来るので、負担をかけられる） |
| `{"tags": [...]}`・`{"urls": [...]}` | 印か URL で消す |

消すのは、**書き換えのトランザクションが終わった後**にします。先に消すと、消してから書き換えるまでの間に来た頼みが、古いデータを CDN にもう一度覚えさせます。消すのに失敗しても、`s-maxage` が過ぎれば入れ替わるように、時間は短めにしておきます。

## 8. 人ごとの応答を覚えさせない

### 8.1 手を動かす: 間違えて public にすると

`/api/me` は Cookie の `user` を見て、その人の名前を返します。オリジンを止め（`Ctrl+C`）、わざと `public, max-age=60` にする `MISTAKE=1` を付けて起動し直します。

```sh
$ MISTAKE=1 node samples/origin.ts
```

alice と bob の Cookie で、順に開きます（第2部 第7章 3.2節ではファイルを渡した `-b` に、`-b 名前=値` と書くと、その Cookie をそのまま送る）。

```sh
$ curl -s -b user=alice -w '%header{x-cache}\n' http://127.0.0.1:9858/api/me
{"user":"alice"}
MISS
$ curl -s -b user=bob -w '%header{x-cache}\n' http://127.0.0.1:9858/api/me
{"user":"alice"}
HIT
$ curl -s -w '%header{x-cache}\n' http://127.0.0.1:9858/api/me
{"user":"alice"}
HIT
```

bob にも、ログインしていない人にも、**alice の情報**が返りました。CDN は、Cookie が違っても同じ URL なら同じものを返します（Cookie はキャッシュのキーに入らない）。`MISTAKE=1` を付けずに起動し直すと、`private, no-store` なので覚えず、毎回 MISS になって、それぞれの名前が返ります。

| 守り方 | やり方 |
| --- | --- |
| 人ごとの応答には、必ず `private, no-store`（か `private, no-cache`） | Express なら、ログインを確かめるミドルウェア（第10部 第52章の `requireAuth`）で、まとめて付ける |
| 何も書かない応答を作らない | 書かないと、CDN の設定や推測で覚えられることがある（4.2節）。既定を `no-store` にして、覚えてよいものだけ書く |
| CDN の設定で、API の道（`/api/*`）は「`Cache-Control` に従う」か「覚えない」にする | 「拡張子で決める」設定だと、`/api/me.css` のような URL で、人ごとの応答が覚えられることがある |
| CDN の中でログインを確かめない限り、人ごとの応答は覚えない | `Vary: Cookie` は、Cookie が少し違うだけで別々に覚えるので、ほとんど HIT しない。覚える意味が無い |

### 8.2 手を動かす: Vary で分けて覚える

言語のように「頼みのヘッダで中身が変わる」ものは、**`Vary`** で、どのヘッダで分けるかを伝えます（第2部 第7章 6.2節）。オリジンを、`MISTAKE` なしで起動し直してから打ちます。

```sh
$ for l in ja en ja en; do curl -s -H "Accept-Language: $l" -w '%header{x-cache}\n' http://127.0.0.1:9858/api/greeting; done
こんにちは
MISS
Hello
MISS
こんにちは
HIT
Hello
HIT
```

`Accept-Language` の値ごとに、別々に覚えました。実際のブラウザは `ja,en-US;q=0.9,en;q=0.8` のような長い値を送るので、値の種類が多いと HIT しにくくなります。本物の CDN では、キーに入れる前に値をそろえる（`ja` か `en` にする）設定をすることがあります。

## 9. 本物の CDN

| 種類 | 例（執筆時点。必ず公式で確認） | 向いている場面 |
| --- | --- | --- |
| PaaS に付いている CDN | Render の Static Site、Vercel、Netlify | ビルドした画面を配るだけなら、いちばん簡単 |
| ドメインの前に置く CDN | Cloudflare（DNS を Cloudflare に任せる） | 独自ドメインのアプリ全体の前に置く。TLS の証明書も CDN が持つ |
| クラウドの CDN | Amazon CloudFront、Google Cloud CDN | 同じクラウドのオブジェクトストレージ（第63章）から配る |

CDN を前に置くと、アプリから見た客の IP アドレスは CDN のものになります。本当の客の IP は `X-Forwarded-For` などのヘッダに入るので、Express の `trust proxy`（第60章 7節）を、CDN の数に合わせて設定します。練習用の CDN も `X-Forwarded-For` を付けます。

CDN に任せる前に、まず `Cache-Control` を正しく書きます。CDN の設定で上書きすることもできますが、アプリが書いた値が「何をしてよいか」の元になるからです。

## 10. Flask との対応

Flask は、`static/` フォルダのファイルを `url_for('static', filename='app.js')` の URL で配り、`SEND_FILE_MAX_AGE_DEFAULT`（既定は `None`。ブラウザに確かめさせる）でキャッシュの時間を決めます。名前にハッシュは入らないので、長く覚えさせるには、Flask-Assets などで名前を変えるか、`?v=…` を付けます。

| Flask | この章（Node.js） |
| --- | --- |
| `static/` と `url_for('static', …)` | `vite build` の `dist/assets/`（名前にハッシュ）と `express.static` |
| `SEND_FILE_MAX_AGE_DEFAULT` | `express.static` の `maxAge`・`immutable` |
| `response.headers['Cache-Control'] = 'private, no-store'` | `res.setHeader('Cache-Control', 'private, no-store')` |
| 本番では nginx や WhiteNoise が `static/` を配る | Express か、PaaS の CDN・静的ファイルのサービスが `dist/` を配る |
| `@app.errorhandler(404)` で、どのパスにも同じ 404 | API・ファイルは 404、画面の中の URL だけ `index.html`（6節） |

## まとめ

- CDN は共有キャッシュ。間違えて覚えさせると、全員に同じものが返る。
- `s-maxage` は CDN だけの時間、`max-age=0, s-maxage=60` で「CDN だけに覚えさせる」。`stale-while-revalidate` で、古いものをすぐ返して後ろで取り直す。
- `no-cache` は「覚えてよいが、使う前に確かめる」。ETag があれば、確かめるのは 304 で軽い。
- ハッシュ付きのファイルは `immutable` で1年、`index.html` は `no-cache`。画面の中の URL には `index.html` を返し、無いファイルと API には 404。
- 消すのは、名前を変えるのがいちばん確か。変えられないものは URL か印で消す。書き換えが終わった後に消す。
- 人ごとの応答には `private, no-store`。Cookie は CDN のキーに入らない。
- 同時の MISS は、CDN がまとめてオリジンを守る。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- RFC 9111「HTTP Caching」（`s-maxage` 5.2.2.10節、`Authorization` 3.5節、`Age` 5.1節）: https://www.rfc-editor.org/rfc/rfc9111
- RFC 5861「HTTP Cache-Control Extensions for Stale Content」（`stale-while-revalidate`）: https://www.rfc-editor.org/rfc/rfc5861
- MDN「Cache-Control」: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Cache-Control
- MDN「HTTP キャッシュ」: https://developer.mozilla.org/ja/docs/Web/HTTP/Caching
- Express「express.static」（serve-static のオプション）: https://expressjs.com/en/5x/api.html#express.static
- Cloudflare Docs「Cache」（Purge・Cache-Tag）: https://developers.cloudflare.com/cache/
- Render Docs「Static Sites」: https://render.com/docs/static-sites

---

前の章: [第64章 バックグラウンドジョブ](../ch64-background-jobs/README.md) ／ 第12部の目次: [../README.md](../README.md) ／ 次の章: [第66章 監視とパフォーマンス](../ch66-monitoring/README.md)
