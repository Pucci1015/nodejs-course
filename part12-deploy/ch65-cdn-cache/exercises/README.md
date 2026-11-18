# 第65章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part12/ch65-cdn-cache/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 応答の種類ごとに Cache-Control を決める | [cache-policy.ts](cache-policy.ts)、[cache-policy.test.ts](cache-policy.test.ts) | 4.1 |
| 2 | 基本 | Cache-Control を分ける（`"…"` の中のカンマも） | [parse-cache-control.ts](parse-cache-control.ts)、[parse-cache-control.test.ts](parse-cache-control.test.ts) | 2.2 |
| 3 | 基本 | 年齢と、新鮮か・古いか | [freshness.ts](freshness.ts)、[freshness.test.ts](freshness.test.ts) | 3.2〜3.4 |
| 4 | 基本 | 考えて答える（調べる問題） | [predict.md](predict.md) | 1〜9 |
| 5 | 応用 | CDN が覚えてよい応答か | [storable.ts](storable.ts)、[storable.test.ts](storable.test.ts) | 4.2 |
| 6 | 応用 | 名前にハッシュを入れて、HTML を書き換える | [hash-assets.ts](hash-assets.ts)、[hash-assets.test.ts](hash-assets.test.ts) | 5.1 |
| 7 | 応用 | ビルドした画面を配るアプリ | [spa-app.ts](spa-app.ts)、[spa-app.test.ts](spa-app.test.ts) | 6 |
| 8 | 発展 | 印で消せる、アプリの中のキャッシュ | [tag-cache.ts](tag-cache.ts)、[tag-cache.test.ts](tag-cache.test.ts) | 3・7 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

問題4以外は、ファイルを書いて、`node --test ○○.test.ts` ですべてのテストが通れば完成です。書く前に失敗するテストの数は、それぞれの問題に書いてあります。模範解答で試すには、`MODULE=../solutions/○○.ts` を付けます（例: `MODULE=../solutions/cache-policy.ts node --test cache-policy.test.ts`）。

- どの問題も、オリジンや CDN を起動しておく必要はありません。問題7のテストは、一時フォルダに `dist` を作り、空いているポートでアプリを動かします。
- [typecheck.ts](typecheck.ts) は、テストの部品です。書き換えなくてかまいません。どのテストも最後に、書いたファイルに `tsc` のエラーが無いことを確かめます。

---

## 基本

### 問題1 応答の種類ごとに Cache-Control を決める

[cache-policy.ts](cache-policy.ts) に、`cacheControlFor(method, pathname, status)` を書いてください。本文 4.1節の表を、関数にします。上から順に調べて、最初に当てはまったものを返します。

| 条件 | 返す値 |
| --- | --- |
| `method` が `GET`・`HEAD` でない | `no-store` |
| `status` が 200・304 でない | `no-store` |
| `/assets/` で始まり、名前の最後が「`-` か `.` + 英数字・`_`・`-` が 8 文字 + `.js`・`.css`・`.woff2`・`.png`・`.svg`」 | `public, max-age=31536000, immutable` |
| `/assets/` で始まる、ほかの名前 | `public, max-age=0` |
| `/api/public/` で始まる | `public, max-age=0, s-maxage=60, stale-while-revalidate=300` |
| `/api` か、`/api/` で始まる | `private, no-store` |
| 最後の `/` の後に `.` が無い（`/`、`/tasks/12`） | `no-cache` |
| それ以外（`/robots.txt`、`/index.html`） | `public, max-age=0` |

```sh
$ node --test cache-policy.test.ts       # 書く前は 7 個が失敗
```

ヒント: 「名前の最後が…」は、正規表現 `/[.-][A-Za-z0-9_-]{8}\.(js|css|woff2|png|svg)$/` の `test` で調べられます。`/api/publicity` は `/api/public/` で始まらない（`/` まで比べる）ことに気をつけます。

### 問題2 Cache-Control を分ける（`"…"` の中のカンマも）

[parse-cache-control.ts](parse-cache-control.ts) に、2つの関数を書いてください。本文 2.2節の `parse` を、正しく直したものです。

**`parseCacheControl(value)`**: 名前（小文字）→ 値の `Map` を返します。

- `"…"` で囲まれた値の中のカンマでは切らない（`no-cache="Set-Cookie, X-Foo"`）。値の囲みの `"` は取る
- 名前と値は、**最初の** `=` で分ける（`private="a=b"` の値は `a=b`）
- 名前と値のまわりの空白は取る。値が無ければ `''`
- 空の部分（`,,`）は飛ばす。同じ名前が2回あれば、最初のものを使う
- `undefined` や `''` なら、空の `Map`

**`sharedLifetime(value)`**: CDN が新鮮とみなしてよい秒数を返します。

- `no-store` か `private` があれば `undefined`（覚えてはいけない）
- `no-cache` があれば `0`
- それ以外は、`s-maxage`、無ければ `max-age` の値を数にしたもの。どちらも無いか、値が数字だけでない（`-1`、`1.5`、空）なら、無いものとして扱う

```sh
$ node --test parse-cache-control.test.ts    # 書く前は 7 個が失敗
```

ヒント: カンマで切る所は、`for (const ch of value)` で1文字ずつ見て、`"` が来るたびに「囲みの中か」を `inQuote = !inQuote` で切り替え、囲みの外のカンマのときだけ区切ります。最初の `=` の位置は `indexOf('=')` です。「数字だけ」は `/^\d+$/.test(v)` で調べます。

### 問題3 年齢と、新鮮か・古いか

[freshness.ts](freshness.ts) に、2つの関数を書いてください（本文 3.2〜3.4節で CDN がしていたこと）。

- `cacheState({ storedAt, initialAge, lifetime, swr }, now)`: `{ age, state }` を返す
  - `age`（秒）= `initialAge` + 覚えてから過ぎた秒（`(now - storedAt) / 1000` を切り捨て）。負なら 0
  - `age < lifetime` なら `'fresh'`、`age < lifetime + swr` なら `'stale-while-revalidate'`、それ以外は `'stale'`
- `ageHeader(info, now)`: 返すときの `Age` ヘッダの値（`age` を文字列にしたもの）

```sh
$ node --test freshness.test.ts          # 書く前は 7 個が失敗
```

`initialAge` は、オリジンの応答にもう `Age` が付いていたとき（オリジンの手前に、もう1つキャッシュがある）の値です。それも足すので、2段のキャッシュでも、合わせて `lifetime` を超えて新鮮にはなりません。

### 問題4 考えて答える

[predict.md](predict.md) の 6 つの問いに答えてください。問い4は、予想してから、本文の練習用の CDN で試します。

---

## 応用

### 問題5 CDN が覚えてよい応答か

[storable.ts](storable.ts) に、`whyNotStore(req, res)` を書いてください。本文 4.2節の表を関数にします。上から順に調べて、最初に当てはまった理由を返し、どれにも当てはまらなければ `undefined` を返します。ヘッダの名前は小文字で渡されます。

| 条件 | 理由 |
| --- | --- |
| `req.method` が `GET` でない | `'method'` |
| `res.status` が 200・203・204・300・301・308・404・405・410・414・501 のどれでもない | `'status'` |
| `Cache-Control` に `no-store` | `'no-store'` |
| `Cache-Control` に `private` | `'private'` |
| `set-cookie` がある | `'set-cookie'` |
| `vary` の中に `*` がある（`Accept-Encoding, *` も） | `'vary-star'` |
| 頼みに `authorization` があり、`Cache-Control` に `public` も `s-maxage` も無い | `'authorization'` |
| `Cache-Control` に `s-maxage`・`max-age`・`no-cache` のどれも無い | `'no-freshness'` |

```sh
$ node --test storable.test.ts           # 書く前は 7 個が失敗
```

`Cache-Control` を分けるのは、本文 2.2節の `parse` の形で十分です（このテストには `"…"` の値は出てきません）。

### 問題6 名前にハッシュを入れて、HTML を書き換える

[hash-assets.ts](hash-assets.ts) に、`hashAssets(html, assets)` を書いてください。本文 5.1節の `hashedName` を使って、ビルドの道具がしていることを自分で作ります。

- `assets` は `{ 'assets/app.js': 中身, … }`。それぞれ、中身の SHA-256 の先頭 8 文字を、拡張子の前に入れた名前にする（`assets/app.b603d946.js`）。名前に `.` がいくつあっても、最後の `.` の前に入れる（`noto.sans.woff2` → `noto.sans.（8 文字）.woff2`）
- 戻り値は `{ html, files, manifest }`
  - `files`: 新しい名前 → 中身（HTML で使われていないファイルも入れる）
  - `manifest`: 元の名前 → 新しい名前
  - `html`: `"/assets/app.js"`（`"` で囲まれた、`/` で始まる、ちょうどその名前）を、すべて `"/assets/app.（8 文字）.js"` に書き換えたもの。似た名前（`"/assets/app.jsx"`）や、`"` で囲まれていない文字はそのまま

```sh
$ node --test hash-assets.test.ts        # 書く前は 7 個が失敗
```

ヒント: フォルダの部分は `path.dirname`、つなぐのは `path.join` です（第3部 第15章）。書き換えは、`` html.replaceAll(`"/${name}"`, `"/${hashed}"`) `` のように、`"` も含めて探すと、似た名前を書き換えません。

### 問題7 ビルドした画面を配るアプリ

[spa-app.ts](spa-app.ts) に、`createSpaApp(distDir)` を書いてください。本文 6.1節の `spa-server.ts` を、`listen` しない関数にして、次を足します。

- `/assets/` のファイル: 本文と同じ（1年・`immutable`、無ければ 404）
- `/api` の下: JSON の 404
- `/index.html` は `/` へ **301**（同じページを2つの URL にしない）
- 名前の変わらないファイル（`robots.txt`）: `public, max-age=0`
- 画面の中の URL（拡張子なし）: `index.html` を `no-cache` で
- **404 の応答には、すべて `Cache-Control: no-store`**（`/assets` の無いファイル、`/api`、拡張子のある無いファイル）
- すべての応答に `X-Content-Type-Options: nosniff`（第4部 第19章）。`X-Powered-By` は出さない（`app.disable('x-powered-by')`。第10部 第55章）
- ETag で 304 が返る（`express.static` と `res.sendFile` が自分でする）

```sh
$ node --test spa-app.test.ts            # 書く前は 7 個が失敗
```

ヒント: すべての応答にヘッダを付けるのは、いちばん最初に置く「`res.setHeader` して `next()` を呼ぶ」ミドルウェアです（第5部 第24章）。`res.redirect(301, '/')` で 301 を返せます。

---

## 発展

### 問題8 印で消せる、アプリの中のキャッシュ

[tag-cache.ts](tag-cache.ts) に、`createTagCache<T>({ now })` を書いてください。CDN が本文 3・7節でしていたことを、アプリの中のメモリでします（データベースへの重い問い合わせの結果を覚える、など）。

`get(key, load)` は、`key` の値を返します。`load()` は `{ value, ttlMs, swrMs?, tags? }` を返す関数です。

| 覚えているものの状態 | すること | 数える |
| --- | --- | --- |
| 覚えてから `ttlMs` 未満 | 覚えているものを返す。`load` は呼ばない | `hit` |
| `ttlMs + swrMs` 未満 | 覚えているもの（古い）をすぐ返し、後ろで `load` して覚え直す。後ろの `load` が失敗しても、外に例外を出さず、古いものを持ち続ける | `stale` |
| 覚えていない・それより古い | `load` を待って、覚えて返す。失敗したら、その例外で失敗し、覚えない | `miss` |

- **同じ `key` の `load` が動いている間は、新しく `load` を呼ばず、その結果を待つ**（本文 3.5節の COLLAPSED。後ろの取り直しも同じ）
- `purgeKey(key)`・`purgeTag(tag)`: 覚えているものを消す。**読み込み中に消された `key` は、その読み込みの結果を覚えない**（待っている人には返す）。消す前に始まった読み込みは、消す前のデータを読んだかもしれないからです
- `stats()`: `{ hit, stale, miss }` の数
- 時刻は `now()`（既定は `Date.now`）で読む

```sh
$ node --test tag-cache.test.ts          # 書く前は 7 個が失敗
```

ヒント:

- 覚えているものは `Map<string, { value, storedAt, ttlMs, swrMs, tags }>`、読み込み中のものは `Map<string, Promise<T>>` に置きます。読み込みが終わったら（`finally`）、読み込み中の `Map` から消します。
- 「読み込み中に消されたか」は、`key` ごとの番号（`Map<string, number>`）を、消すたびに 1 増やしておき、読み込みを始めたときの番号と、終わったときの番号が同じかで分かります。
