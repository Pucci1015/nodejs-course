# 第20章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part04/ch20-request-body/exercises/` で行います。最初に `cd exercises` で移動してください（`cd ~/dev/part04/ch20-request-body/exercises` と打っても構いません）。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- | --- |
| 1 | 基本 | Content-Type の種類を取り出す | [media-type.mjs](media-type.mjs)、[media-type.test.mjs](media-type.test.mjs) | 3 | — |
| 2 | 基本 | フォームのボディを決めた形にする | [form-fields.mjs](form-fields.mjs)、[form-fields.test.mjs](form-fields.test.mjs) | 5 | — |
| 3 | 基本 | 受け取った JSON を確かめ、決めたキーだけ取り出す | [validate-message.mjs](validate-message.mjs)、[validate-message.test.mjs](validate-message.test.mjs) | 6, 7 | — |
| 4 | 基本 | フォームと JSON の読み方の結果を予想する（調べる問題） | [predict-body.mjs](predict-body.mjs) | 5, 6, 7 | — |
| 5 | 応用 | ボディを上限付きで読む `readBody`・`readJson`・`readForm` | [body.mjs](body.mjs)、[body.test.mjs](body.test.mjs) | 2〜6 | 空いている番号 |
| 6 | 応用 | 受け取った JSON を安全に混ぜる `safeMerge`、選ぶ `pick` | [merge.mjs](merge.mjs)、[merge.test.mjs](merge.test.mjs) | 7 | — |
| 7 | 発展 | アップロードされた画像を安全に保存する `saveImage` | [upload.mjs](upload.mjs)、[upload.test.mjs](upload.test.mjs) | 8 | 空いている番号 |
| 8 | 発展 | お問い合わせフォームと JSON の API のバグを直す | [buggy-contact.mjs](buggy-contact.mjs)、[check-contact.sh](check-contact.sh) | 2〜7 | 9205 |

**発展**（7・8）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

- 問題1〜3・5〜7: `○○.mjs` の「ここを書く」を埋め、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。問題7のテストは、OS の一時フォルダに保存して、最後に消します。
- 問題8は `bash check-contact.sh` で確かめます。模範解答は、問題5・6の解答を使います。

---

## 基本

### 問題1 Content-Type の種類を取り出す

[media-type.mjs](media-type.mjs) に、3つの関数を作ってください（本文3節）。

- **`mediaTypeOf(header)`**: `Content-Type` ヘッダの値から、`;` より前を、前後の空白を取って小文字にして返す。ヘッダが無い（`undefined`）ときは `''`
  - `'application/json; charset=utf-8'` → `'application/json'`
  - `' Application/JSON ;charset=UTF-8'` → `'application/json'`
- **`isJson(header)`**: 種類が `application/json` なら `true`
- **`isForm(header)`**: 種類が `application/x-www-form-urlencoded` なら `true`

```sh
$ node --test media-type.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- 本文5節の `form-server.mjs` の `(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()` を関数にしたものです。
- `typeof header !== 'string'` なら、先に `''` を返すと安全です。
- `isJson` と `isForm` は、`mediaTypeOf` を使えば1行で書けます。

### 問題2 フォームのボディを決めた形にする

お問い合わせのフォーム（名前、本文、タグのチェックボックス、「同意する」のチェックボックス）から届いたボディの文字列を、決まった形のオブジェクトにする関数 `readContactForm(bodyText)` を [form-fields.mjs](form-fields.mjs) に作ってください。

```js
readContactForm('name=alice&message=hello&tags=js&tags=node&agree=on');
// → { name: 'alice', message: 'hello', tags: ['js', 'node'], agree: true }
readContactForm('');
// → { name: '', message: '', tags: [], agree: false }
```

- `name`・`message`: 最初の1つの値を、前後の空白を取って。無ければ `''`
- `tags`: 全部の値の配列。無ければ `[]`
- `agree`: `agree` という名前があれば（値が何でも）`true`。無ければ `false`
- `+` は空白、`%xx` は文字に戻す

```sh
$ node --test form-fields.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- `new URLSearchParams(bodyText)` で読みます。`get`（最初の1つ、無ければ `null`）、`getAll`（全部の配列）、`has`（あるか）を使い分けます（本文5.1節）。
- `null` のときに `''` にするには `?? ''` が使えます。

### 問題3 受け取った JSON を確かめ、決めたキーだけ取り出す

伝言の API に届いた JSON（`JSON.parse` した後の値）を確かめる関数 `validateMessage(data)` を [validate-message.mjs](validate-message.mjs) に作ってください。

- `data` がオブジェクトでない（`null`・配列・文字列・数など）ときは `{ ok: false, errors: ['オブジェクトで送ってください'] }`
- `name` は、前後の空白を取って 1〜20 文字。違えば `'name は 1〜20 文字で書いてください'`
- `text` は、前後の空白を取って 1〜200 文字。違えば `'text は 1〜200 文字で書いてください'`
- 文字列でない `name`・`text` は、無いのと同じ（間違い）
- 間違いは、`name`・`text` の順に全部まとめて `{ ok: false, errors: [...] }` で返す
- 正しければ `{ ok: true, value: { name, text } }`。`value` には、前後の空白を取った `name` と `text` **だけ**を入れる（`id` や `isAdmin` などが送られてきても入れない）

```sh
$ node --test validate-message.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- 「オブジェクトか」は `typeof data === 'object' && data !== null && !Array.isArray(data)` で確かめます。`typeof null` も `typeof []` も `'object'` だからです（第11章）。
- 本文7節の `pick-keys.mjs` のとおり、`{ ...data }` で広げずに、`{ name, text }` と新しく作ります。
- サーバでは、この `ok: false` を **422** で返します（本文6.3節）。`JSON.parse` で失敗したときの 400 とは分けます。

### 問題4 フォームと JSON の読み方の結果を予想する（調べる問題）

[predict-body.mjs](predict-body.mjs) に 15 個の式があります。**実行する前に**結果を予想して書き出してから、`node predict-body.mjs` で確かめてください。

特に、次の3つは理由を説明してください。

- 4番: `q=1=1` を自分で `split('=')` して読むと、値はどうなるか
- 6番: `Object.fromEntries` でフォームをオブジェクトにすると、何が消えるか
- 13番と14番: `__proto__` は、`JSON.parse` の結果に入っているのか、いないのか。それなのに、7.2節では何が起きたのか

---

## 応用

### 問題5 ボディを上限付きで読む

[body.mjs](body.mjs) に、5つの関数を作ってください。どれも `limit`（バイト数。既定 1MB）のオプションを受け取ります。

**`readBody(req, { limit })`**: ボディを全部読んで `Buffer` で返す。

- `Content-Length` が `limit` を超えていたら、**読まずに** `HttpError(413)` を投げる。ヘッダに `Connection: close` を付ける（`{ headers: { Connection: 'close' } }`）
- 読みながら数え、`limit` を超えたら、そこで読むのをやめて、同じ 413 を投げる（chunked で送られてきたとき）。**`for await` の途中で `throw` しない**こと（本文4.4節）
- 客が送り終える前に切ったら、失敗する（いつまでも待たない。ヒント: `req` の `'close'` と `req.complete`）

**`mediaType(req)`**: `Content-Type` を `{ type, params }` に分ける。`type` とパラメータの名前は小文字にする。値の `"..."` は外す。ヘッダが無ければ `{ type: '', params: {} }`。

**`readText(req, options)`**: `text/plain` のボディを文字列で返す。

**`readJson(req, options)`**: `application/json`、または `application/○○+json` のボディを `JSON.parse` して返す。

**`readForm(req, options)`**: `application/x-www-form-urlencoded` のボディを `URLSearchParams` で返す。

3つの `read○○` に共通の決まり:

| こういうとき | 投げるもの |
| --- | --- |
| `Content-Type` が違う（無いときも）、`charset` が UTF-8 以外 | `HttpError(415)` |
| UTF-8 として正しくないバイト列（ヒント: `new TextDecoder('utf-8', { fatal: true })`） | `HttpError(400)` |
| JSON として読めない、空 | `HttpError(400)` |

```sh
$ node --test body.test.mjs
```

最初は 13 個のうち 8 個が失敗します。すべて通れば完成です。

### 問題6 受け取った JSON を安全に混ぜる・選ぶ

設定の一部だけを変える API（`PATCH /api/settings` に `{"notifications":{"email":false}}` を送る）を作るつもりで、[merge.mjs](merge.mjs) に2つの関数を作ってください。

**`safeMerge(target, patch, { maxDepth = 10 })`**: JSON Merge Patch（RFC 7396）の決まりで混ぜた、**新しい**オブジェクトを返す。`target` は書き換えない。

- `patch` の値がオブジェクトなら、中まで混ぜる
- 値が `null` なら、そのキーを消す
- それ以外（配列も）は置き換える（コピーして入れる。結果を書き換えても `patch` が変わらないように）
- `__proto__`・`constructor`・`prototype` というキーがあれば（どの深さでも）、`HttpError(400)`
- 入れ子が `maxDepth` 段より深ければ、`HttpError(400)`
- `target` のプロトタイプの先にあるもの（自分のキーでないもの）は、拾わない

**`pick(obj, keys)`**: `obj` の自分のキー（`Object.hasOwn`）のうち、`keys` にあるものだけを取り出した新しいオブジェクト。`obj` がオブジェクトでなければ（`null`・配列も）空のオブジェクト。

```sh
$ node --test merge.test.mjs
```

[merge.mjs](merge.mjs) には `proto-demo.mjs` と同じ「よくある書き方」が入っています。最初は 8 個すべてが失敗します（`Object.prototype` が汚されたことも、テストが見つけます）。すべて通れば完成です。

---

## 発展

### 問題7 アップロードされた画像を安全に保存する

[upload.mjs](upload.mjs) に、2つの関数を作ってください。

**`detectImageType(bytes)`**: `Uint8Array` の先頭のバイトから、画像の種類を `{ type, ext }` で返す。知らない種類なら `null`。

| 種類 | 先頭のバイト | `type` | `ext` |
| --- | --- | --- | --- |
| PNG | `89 50 4E 47 0D 0A 1A 0A` | `image/png` | `.png` |
| JPEG | `FF D8 FF` | `image/jpeg` | `.jpg` |
| GIF | `GIF87a` または `GIF89a`（文字） | `image/gif` | `.gif` |
| WebP | 0〜3 バイト目が `RIFF`、8〜11 バイト目が `WEBP` | `image/webp` | `.webp` |

**`saveImage(file, dir, { maxBytes = 1MB })`**: `formData()` で受け取った `File` を `dir` に保存し、`{ id, path, type, size, originalName }` を返す。

- `file` が `File` でない（文字の項目、`null`）、空 → `HttpError(400)`。`maxBytes` を超える → `HttpError(413)`
- 種類は**中身で**決める（`detectImageType`）。分からなければ `HttpError(415)`。`file.type` や名前の拡張子は使わない
- 保存する名前は `crypto.randomUUID()` + 中身から決めた拡張子。`file.name` はパスに使わない。同じ名前のファイルがあっても上書きしない（ヒント: `flag: 'wx'`）
- `originalName` は表示のためだけに残す。制御文字（`\u0000`〜`\u001f`、`\u007f`）を除き、100 文字までにする

```sh
$ node --test upload.test.mjs
```

最初は 7 個すべてが失敗します。すべて通れば完成です。最後のテストは、`../samples/form-data.mjs` の `readFormData` で受け取った `File` を、そのまま `saveImage` に渡しています。

考えてみてください: 保存した画像を、第19章の `serveStatic` で配信するとき、ほかに何を付けると安全でしょう（ヒント: 第19章3.2節）。

### 問題8 お問い合わせフォームと JSON の API のバグを直す

[buggy-contact.mjs](buggy-contact.mjs) は、お問い合わせのフォーム（`POST /contact`）と、同じことをする JSON の API（`POST /api/messages`）です。確認スクリプトを動かすと、18 個のうち 17 個が失敗します。

```sh
$ bash check-contact.sh
```

| メソッドとパス | すること |
| --- | --- |
| `GET /` | フォーム（名前・メール・内容・話題のチェックボックス） |
| `POST /contact` | フォームを受け取る。正しければ保存して **303** で `/thanks` へ。間違いがあれば **422** で、入力した値と間違いの説明を入れたフォームを表示する |
| `POST /api/messages` | JSON を受け取る。正しければ保存して **201** と `Location`。間違いがあれば **422** と `{ errors: [...] }` |
| `GET /api/messages` | 保存したものの一覧（確認スクリプトが使う） |

入力の決まり: 名前は前後の空白を除いて 1〜50 文字、メールは `何か@何か`、内容は 1〜1000 文字、話題は `node`・`flask` の配列（無くてもよい）。ボディの上限は 10KB です。保存するのは `id`（サーバが決める）・`name`・`email`・`message`・`topics` だけです。

ヒント: 確認スクリプトの 9 は、JSON の中の「い」の途中でチャンクが切れるように、2回に分けて送ります。12・13 は、`id` と `isAdmin` を付けた JSON を送ります。

直し方は自由です。問題5・6の関数と、第18章の Router を使って書き直してもかまいません（模範解答はそうしています）。
