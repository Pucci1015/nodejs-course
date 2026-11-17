# 第55章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part10/ch55-web-security/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | CSP のヘッダの値を作る | [csp.ts](csp.ts)、[csp.test.ts](csp.test.ts) | 3 |
| 2 | 基本 | Fetch Metadata のミドルウェア | [fetch-metadata.ts](fetch-metadata.ts)、[fetch-metadata.test.ts](fetch-metadata.test.ts) | 5 |
| 3 | 基本 | `exec` の関数を直す | [count-lines.ts](count-lines.ts)、[count-lines.test.ts](count-lines.test.ts) | 6.2 |
| 4 | 基本 | 考えて答える（調べる問題） | [predict.md](predict.md) | 2〜10 |
| 5 | 応用 | 認可の漏れを直す | [owner-app.ts](owner-app.ts)、[owner-app.test.ts](owner-app.test.ts) | 7 |
| 6 | 応用 | 利用者の URL を安全に取りに行く | [safe-fetch.ts](safe-fetch.ts)、[safe-fetch.test.ts](safe-fetch.test.ts) | 8 |
| 7 | 応用 | エラーを受け取るミドルウェア | [error-handler.ts](error-handler.ts)、[error-handler.test.ts](error-handler.test.ts) | 10 |
| 8 | 発展 | `npm audit --json` を読むコマンド | [audit-gate.ts](audit-gate.ts)、[audit-gate.test.ts](audit-gate.test.ts) | 9 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第51章と同じです。問題4以外は、`○○.ts` の `// ここを書く` の所を書き（問題3・5は、書いてあるコードを直し）、`node --test ○○.test.ts` ですべてのテストが通れば完成です。直す前に失敗するテストの数は、それぞれの問題に書いてあります。

- 模範解答で試すには `MODULE=../solutions/csp.ts node --test csp.test.ts` のように、`MODULE` に模範解答のファイルを指定します。
- [client.ts](client.ts) は、第52章の同じ名前のファイルに `patch`・`delete` を足した、テストの部品です。[typecheck.ts](typecheck.ts) は、テストの中から tsc を動かす部品です。[audit-part10.json](audit-part10.json) は、執筆時点の第10部のフォルダで `npm audit --json` を動かした結果です。どれも書き換えなくてかまいません。

---

## 基本

### 問題1 CSP のヘッダの値を作る

[csp.ts](csp.ts) に、`buildCsp(options)` を書いてください。次の9つの指示を、この順に `; `（セミコロンと空白）でつないだ文字列を返します。1つの指示は「名前 値 値 …」です。

| 指示 | 値 |
| --- | --- |
| `default-src` | `'self'` |
| `script-src` | `'self'`。`options.nonce` があれば、続けて `'nonce-その値'` |
| `style-src` | `'self'` |
| `img-src` | `'self' data:` |
| `connect-src` | `'self'`。続けて `options.connectSrc` のオリジンを順に |
| `object-src` | `'none'` |
| `base-uri` | `'none'` |
| `form-action` | `'self'` |
| `frame-ancestors` | `'none'` |

- `options.nonce` が base64 の文字（`A-Z`・`a-z`・`0-9`・`+`・`/`、最後に `=` が0〜2個）だけでなければ、例外を投げる（空の文字列も）
- `options.connectSrc` のそれぞれが、`https:` で、パスもクエリも無いオリジン（`new URL(値).origin` が元の文字列と同じ）でなければ、例外を投げる

```sh
$ node --test csp.test.ts
```

ヒント: `'self'` の `'` も値の一部です。文字列は `"'self'"` のように `"` で囲むと書きやすくなります。値に `;` や空白が混ざると、ヘッダを読むブラウザが、そこで別の指示が始まると考えてしまいます。だから、外から来る値は形を確かめます。

### 問題2 Fetch Metadata のミドルウェア

[fetch-metadata.ts](fetch-metadata.ts) に、2つを書いてください。本文5.1節の `rejectCrossSite` に「だれが読んでもよい場所」を足したものです。

`isAllowedRequest({ method, path, site, mode, dest }, { publicPaths })` は、次のどれかなら `true` です。

1. `site` が `undefined`・`'same-origin'`・`'none'`
2. `path` が `publicPaths`（既定は空の配列）のどれかで始まり、`method` が `GET` か `HEAD`
3. `method` が `GET` か `HEAD` で、`mode` が `'navigate'`、`dest` が `'document'`

`fetchMetadataGuard(options)` は、Express のミドルウェアを返します。`req.method`・`req.path`・`req.get('sec-fetch-site')` などで `isAllowedRequest` を呼び、`true` なら `next()`、`false` なら 403 と `{ "detail": "別のサイトからのリクエストは受け付けません" }` を返します。

```sh
$ node --test fetch-metadata.test.ts
```

### 問題3 `exec` の関数を直す

[count-lines.ts](count-lines.ts) の `countLines(dir, name)` は、`dir` の中の `name` のファイルの行数を `wc -l` で数えます。今は `exec` で書いてあり、名前によっては動かなかったり、別のファイルを数えてしまったりします。直してください（直す前は 4 個のテストが失敗します）。

- `' "` を含む名前、`$` を含む名前、`-` で始まる名前でも、そのファイルを数える（本文6.2節の `execFile` と `--`）
- 名前が空、`/` か `\` を含む、`.` で始まる（隠しファイル、`..`）なら、数えずに例外を投げる（第4部 第19章のパストラバーサル）

```sh
$ node --test count-lines.test.ts
```

ヒント: 名前に `$HOME` があると、`exec` のシェルは、`"…"` の中の `$HOME` を、ホームのフォルダのパスに置き換えます。どの文字がシェルの記号かを覚えるより、シェルを通さないほうが確かです。

### 問題4 考えて答える

[predict.md](predict.md) の6つの問いに答えてください。

---

## 応用

### 問題5 認可の漏れを直す

[owner-app.ts](owner-app.ts) の `createOwnerApp(initialTasks)` は、本文7節の `owner-check.ts` に、作る・書き換える・消す API を足したアプリです。このアプリには、認可の漏れがいくつかあります。テストを読んで見つけ、直してください（直す前は 4 個のテストが失敗します）。

- ほかの人のタスクは、書き換え（PATCH）・消す（DELETE）のどちらも 404 `{ "detail": "タスクがありません" }`。中身は変わらない
- 作る（POST）とき、持ち主はセッションの人。ボディに `ownerId` があれば 422
- 書き換えるとき、`title`・`done` 以外の項目（`ownerId`・`id` など）があれば 422

```sh
$ node --test owner-app.test.ts
```

ヒント: 「id と持ち主で、自分のタスクを探す」関数を1つ作って、GET・PATCH・DELETE のすべてで使うと、書き忘れが無くなります。知らない項目を断るのは `z.strictObject`（本文7.1節）です。

### 問題6 利用者の URL を安全に取りに行く

[safe-fetch.ts](safe-fetch.ts) に、`safeFetch(input, options)` を書いてください。本文8.1節の `checkOutboundUrl` を広げ、確かめた URL を実際に取りに行きます。テストは、本物の DNS と fetch の代わりに、決めた答えを返す関数を渡します。`BlockList` と `isBlocked` は書いてあります。

- `options.lookup(名前)` で IP アドレスの配列を引く（本文の `lookup(名前, { all: true })` の代わり）。`options.fetchFn` で取りに行く（既定は `fetch`）
- 次のときは、`OutboundError`（クラスは書いてあります）を、その `reason` で投げる

| reason | とき |
| --- | --- |
| `url` | URL の形でない、https でない、ユーザー名・パスワードがある、ポートがある |
| `dns` | 名前を引けない（`lookup` が例外を投げた・空の配列） |
| `blocked` | 引いたアドレスに、1つでも `isBlocked` のものがある |
| `too_many_redirects` | リダイレクトが `options.maxRedirects`（既定 3）回をこえる |
| `too_large` | 応答の `Content-Length` か、読んだ本文のバイト数が `options.maxBytes`（既定 1000000）をこえる |

- `fetchFn` は `redirect: 'manual'` で呼ぶ。3xx で `Location` があれば、`new URL(location, 今の URL)` の行き先を、もう一度確かめてから取りに行く
- 成功なら `{ url: 最後の URL, status, body: 本文の文字列 }`

```sh
$ node --test safe-fetch.test.ts
```

ヒント: リダイレクトは `for (let hops = 0; ; hops++) { … }` のループで、確かめる → 取りに行く → 3xx なら URL を変えて `continue`、と書けます。本文のバイト数は `Buffer.from(await res.arrayBuffer()).length` です（文字の数ではありません）。

### 問題7 エラーを受け取るミドルウェア

[error-handler.ts](error-handler.ts) に、2つを書いてください。本文10.1節の `errors.ts` を広げたものです。

`redact(text)`: 秘密を `***` にします。

- URL の中のパスワード: `postgres://app:dev-only-password@127.0.0.1` → `postgres://app:***@127.0.0.1`
- `Bearer` の後のトークン: `Bearer eyJhbGciOi.abc.def` → `Bearer ***`

`createErrorHandler({ isProduction, log, newId })` は、エラーを受け取るミドルウェア（引数が4つ）を返します。

| エラー | 応答 | `log` を呼ぶか |
| --- | --- | --- |
| 応答を送り始めた後（`res.headersSent`） | 自分では応答せず `next(err)` | 呼ばない |
| `status`（か `statusCode`）が 400〜499 の数で、`expose` が `false` でない | その status。`{ title: err.message, status }` | 呼ばない |
| それ以外 | 500。`{ title: 'サーバの中でエラーが起きました', status: 500, errorId }`。`isProduction` が `false` なら、`detail: redact(メッセージ)` も足す | `{ errorId, method, path, detail: redact(stack) }` で呼ぶ |

- 応答の `Content-Type` は `application/problem+json`（`res.type('application/problem+json').json(…)`）
- `errorId` は `newId()`（既定は `randomUUID`）で作る
- Error でない値（文字列など）が投げられても、`String(err)` で同じように扱う

```sh
$ node --test error-handler.test.ts
```

ヒント: 壊れた JSON を送ると、`express.json()` が `status: 400`・`expose: true` のエラーを投げます。`err` は `unknown` なので、`typeof err === 'object' && err !== null && 'status' in err` のように絞り込んでから読みます（第7部 第36章）。

---

## 発展

### 問題8 `npm audit --json` を読むコマンド

[audit-gate.ts](audit-gate.ts) に、`npm audit --json` の結果を読んで、決めた重さ以上の勧告があれば終了コード 1 にするコマンドを作ってください（直す前は 5 個のテストが失敗します）。

`summarize(report)`:

- 本文9.1節の JSON の形を Zod で確かめる（`auditReportVersion` が `2`、`vulnerabilities` の値に `name`・`severity`・`isDirect`・`via`・`fixAvailable`、`metadata.vulnerabilities` に重さごとの数と `total`）。形が違えば例外
- `{ counts: metadata.vulnerabilities, findings }` を返す。`findings` は `vulnerabilities` の値1つにつき1つで、重い順（`critical` → `info`）、同じ重さなら `name` の順

| `Finding` の項目 | 値 |
| --- | --- |
| `name`・`severity`・`isDirect` | そのまま |
| `advisories` | `via` のうちオブジェクトのものの `{ title, url }` |
| `via` | `via` のうち文字列のもの |
| `fix` | `fixAvailable` が `false` なら `'直す版なし'`、`true` なら `'npm audit fix'`、オブジェクトなら `'名前@版'`（`isSemVerMajor` が `true` なら、後ろに `'（メジャー版の更新）'`） |

`exceeds(counts, level)`: `level` 以上の重さの数が、1つでも 0 より大きければ `true`。

コマンドとして動かしたとき（`import.meta.main`）:

- `--level`（既定 `high`）を `parseArgs` で読む（第3部 第16章）。重さの名前でなければ、終了コード 2
- 標準入力をすべて読んで JSON にする（第3部 第16章の `for await (const chunk of process.stdin)`）。JSON でない・形が違うなら、標準エラー出力に理由を書いて終了コード 2
- 1行に1つずつ、`重さ 名前 … 直し方` を出し、勧告があれば次の行に題名と URL。最後の行に `合計 N 件…`
- `exceeds` なら終了コード 1、そうでなければ 0（`process.exitCode` を使う）

```sh
$ node --test audit-gate.test.ts
$ node audit-gate.ts --level moderate < audit-part10.json; echo $?
```

最後の行の `echo $?` は、直前のコマンドの終了コードを表示します（第1部 第1章）。動いたら、`~/dev/part10` で `npm audit --json | node ch55-web-security/exercises/audit-gate.ts` と、今の結果でも試してください。

ヒント: `via` の要素は `z.union([z.string(), z.looseObject({ title: z.string(), url: z.string() })])` で確かめられます。重さの順は、`['info', 'low', 'moderate', 'high', 'critical']` の配列の `indexOf` で比べられます。
