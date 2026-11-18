# 第63章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part12/ch63-file-storage/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | オブジェクトのキーを決める | [object-key.ts](object-key.ts)、[object-key.test.ts](object-key.test.ts) | 5.1 |
| 2 | 基本 | ダウンロードの名前（`Content-Disposition`） | [content-disposition.ts](content-disposition.ts)、[content-disposition.test.ts](content-disposition.test.ts) | 6.1 |
| 3 | 基本 | 先頭のバイトで種類を決める（WebP・PDF も） | [sniff-file.ts](sniff-file.ts)、[sniff-file.test.ts](sniff-file.test.ts) | 5.2・6.3 |
| 4 | 基本 | 考えて答える（調べる問題） | [predict.md](predict.md) | 1〜8 |
| 5 | 応用 | 署名付き URL を作る関数 | [presign.ts](presign.ts)、[presign.test.ts](presign.test.ts) | 4.2 |
| 6 | 応用 | `BlobStore` のメモリの偽物 | [memory-blob-store.ts](memory-blob-store.ts)、[memory-blob-store.test.ts](memory-blob-store.test.ts) | 7 |
| 7 | 応用 | 受け取って置き、中継して返すルーター | [upload-router.ts](upload-router.ts)、[upload-router.test.ts](upload-router.test.ts) | 5・6 |
| 8 | 発展 | 孤児を掃除する | [sweep-orphans.ts](sweep-orphans.ts)、[sweep-orphans.test.ts](sweep-orphans.test.ts) | 7.1・8 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

問題4以外は、ファイルを書いて、`node --test ○○.test.ts` ですべてのテストが通れば完成です。書く前に失敗するテストの数は、それぞれの問題に書いてあります。模範解答で試すには、`MODULE=../solutions/○○.ts` を付けます（例: `MODULE=../solutions/object-key.ts node --test object-key.test.ts`）。

- 問題5・8のテストは、mini-s3 をテストの中で空いているポートに起動します。`npm run s3` は要りません。
- [typecheck.ts](typecheck.ts) は、テストの部品です。書き換えなくてかまいません。

---

## 基本

### 問題1 オブジェクトのキーを決める

[object-key.ts](object-key.ts) に、`objectKey({ userId, fileName, id, now })` を書いてください。本文 5.1節の「キーはアプリが決める」を、ユーザーと年月で分けた形にします。

```
users/（userId）/（年 4 けた）/（月 2 けた）/（id）（拡張子）
```

- 年と月は **UTC** で決める（`getUTCFullYear`・`getUTCMonth`。`getUTCMonth` は 0 から数える）
- 拡張子は、`fileName` の最後の `.` から後ろを小文字にしたもの。`.png`・`.jpg`・`.jpeg`・`.gif`・`.webp`・`.pdf` だけを付け、`.jpeg` は `.jpg` にそろえる。ほかの拡張子や、拡張子が無い名前（`README`、`.png` のように `.` が先頭のもの）は、何も付けない
- `fileName` のほかの部分（`../` など）は使わない
- `userId` が 1 以上の整数でなければ、`userId` を含む文で例外
- `id` が UUID の形（`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/`）でなければ、`id` を含む文で例外

```sh
$ node --test object-key.test.ts       # 書く前は 7 個が失敗
```

ヒント: 最後の `.` の位置は `fileName.lastIndexOf('.')`（無ければ -1）です。月の 2 けたは `String(n).padStart(2, '0')` で作れます。

### 問題2 ダウンロードの名前（`Content-Disposition`）

[content-disposition.ts](content-disposition.ts) に、`contentDisposition(fileName, { inline })` を書いてください（本文 6.1節）。

```
attachment; filename="（ASCII の名前）"; filename*=UTF-8''（%XX にした名前）
```

1. `/` と制御文字（`\x00`〜`\x1f` と `\x7f`。改行など）を `_` にする。結果が空なら `file`
2. `filename` には、1 の結果の、表示できる ASCII（`\x20`〜`\x7e`）以外の文字と、`"`・`\` を `_` にしたもの
3. `filename*` には、1 の結果を、本文 4.2節の `enc`（`encodeURIComponent` に加えて `! ' ( ) *` も `%XX`）にしたもの
4. `inline: true` なら、先頭を `inline` に

```sh
$ node --test content-disposition.test.ts   # 書く前は 7 個が失敗
```

ヒント: 「ある範囲の文字」は、正規表現の `[\x00-\x1f]` のように書けます。`[^\x20-\x7e]` は「その範囲以外」です。ESLint が `no-control-regex`（正規表現に制御文字を書くと注意する）を出したら、理由のコメントと `// eslint-disable-next-line no-control-regex` を、その行の上に書きます（第8部の決まり）。

### 問題3 先頭のバイトで種類を決める

[sniff-file.ts](sniff-file.ts) に、`sniffFile(data)` を書いてください。本文 5.2節の `sniff` を広げて、`{ type, ext }` を返します（知らなければ `undefined`）。

| 種類 | 印 | 返すもの |
| --- | --- | --- |
| PNG | 0 バイト目から `89 50 4E 47 0D 0A 1A 0A` | `{ type: 'image/png', ext: '.png' }` |
| JPEG | 0 バイト目から `FF D8 FF` | `{ type: 'image/jpeg', ext: '.jpg' }` |
| GIF | 0 バイト目から `GIF87a` か `GIF89a` | `{ type: 'image/gif', ext: '.gif' }` |
| WebP | 0 バイト目から `RIFF`、**かつ** 8 バイト目から `WEBP` | `{ type: 'image/webp', ext: '.webp' }` |
| PDF | 0 バイト目から `%PDF-` | `{ type: 'application/pdf', ext: '.pdf' }` |

- データが短すぎるときは、範囲の外を読まずに「当てはまらない」とする
- SVG・HTML・テキストは受け付けない（本文 6.3節）

```sh
$ node --test sniff-file.test.ts       # 書く前は 6 個が失敗
```

ヒント: `Buffer.from('GIF89a', 'latin1')` は、文字列を「1 文字 = 1 バイト」でバイトにします。「offset バイト目から、このバイトの並びか」を調べる小さな関数を作ると、表をそのまま書けます。

### 問題4 考えて答える

[predict.md](predict.md) の6つの問いに答えてください。

---

## 応用

### 問題5 署名付き URL を作る関数

[presign.ts](presign.ts) に、`presignGetUrl(input)` を書いてください。本文 4.2節の `sign-by-hand.ts` を、値を引数で受け取る関数にし、2つを足します。

- `expiresIn` が 1〜604800 の整数でなければ、`expiresIn` を含む文で例外
- `downloadName` があれば、クエリに `response-content-disposition` = `attachment; filename*=UTF-8''（enc した名前）` を足す。これも署名に含める
- クエリは、名前と値を `enc` で `%XX` にしてから、名前の順に並べる（`response-…` は、`X-Amz-…` より後ろに並ぶ）
- 時刻は `now` を使う（`new Date()` を中で呼ばない）

```sh
$ node --test presign.test.ts          # 書く前は 8 個が失敗
```

テストは、mini-s3 を起動して、作った URL で本当に取り出せるか、期限切れ・書き換え・シークレットの違いで 403 になるかを確かめます。

### 問題6 `BlobStore` のメモリの偽物

[memory-blob-store.ts](memory-blob-store.ts) に、`createMemoryBlobStore()` を書いてください。本文 7節の `BlobStore` を、`Map` で作ります。テストは、本文の契約テスト（[../samples/blob-contract.ts](../samples/blob-contract.ts)）をそのまま当てます。

```sh
$ node --test memory-blob-store.test.ts   # 書く前は 7 個が失敗
```

ヒント: `list` は、キーの順に並べて返します（S3 はキーの順に返すので、それに合わせる）。契約テストの最後の1つが通らなければ、`put` と `get` で、Buffer の写し（`Buffer.from(buf)`）を作っているかを見直してください。

### 問題7 受け取って置き、中継して返すルーター

[upload-router.ts](upload-router.ts) に、`createUploadRouter({ store, maxBytes, newId })` を書いてください。本文 5.2節の `upload-server.ts` を、`BlobStore` を使う Express のルーターにし、取り出しを「署名付き URL へ送る」から「アプリが中継する」に変えたものです。

| 頼み | 応答 |
| --- | --- |
| `POST /files?name=名前`（ボディがファイル） | 201、`Location: /files/（id）`、JSON `{ id, name, type, size }`。キー `files/（id）` に、中身で決めた種類で置く。`name` が無ければ `file` |
| 同じで、空 | 400 JSON `{ error }` |
| 同じで、PNG・JPEG・GIF でない（本文の `sniff` で） | 415 JSON `{ error }` |
| 同じで、`maxBytes` を超える | 413 JSON `{ error }` |
| `GET /files/:id` | 200 で中身。`Content-Type`（置いた種類）、`Content-Disposition: attachment; filename*=UTF-8''（encodeURIComponent した名前）`、`X-Content-Type-Options: nosniff`、`Cache-Control: private, no-cache` |
| `DELETE /files/:id` | 204。ストレージからも消す |
| 知らない ID | 404 JSON `{ error }` |

- `id` は `newId()` で作る（テストは `id-1`・`id-2`…を渡す）
- ファイルの情報（名前・種類・大きさ）は、ルーターの中の `Map` に持つ

```sh
$ node --test upload-router.test.ts    # 書く前は 9 個が失敗（8 個のテストと、準備の before）
```

ヒント: 413 は、本文の `upload-server.ts` の `onError` と同じく、エラーのミドルウェアを `router.use(…)` で付けて返します。`Cache-Control: private` は「ブラウザだけが覚えてよい（CDN など共有のキャッシュは覚えない）」の意味です（第65章で詳しく扱います）。

---

## 発展

### 問題8 孤児を掃除する

[sweep-orphans.ts](sweep-orphans.ts) に、`sweepOrphans(options)` を書いてください（本文 8節）。S3 の一覧（`ListObjectsV2Command`）を、続きも含めて全部見て、データベースが知らないオブジェクトを消します。

- `prefix` で始まるものだけを見る。`pageSize` があれば `MaxKeys` に渡す。続きは本文 7.1節と同じく `ContinuationToken` で頼む
- 見たものごとに `scanned` を 1 増やす
- `now − LastModified` が `graceMs` より小さいもの（置いたばかり）は、消さない
- `isReferenced(key)` が `true` なら消さない。`isReferenced` が例外を投げたら、そこで止めて、例外をそのまま外へ出す（消していないものは、消さないまま）
- `dryRun` が `false` なら `DeleteObjectCommand` で消す。どちらでも、消す（はずの）キーを `deleted` に見つけた順に入れる
- `{ deleted, scanned }` を返す

```sh
$ node --test sweep-orphans.test.ts    # 書く前は 6 個が失敗
```

ヒント: `ListObjectsV2Command` の結果の `Contents` の1つ1つに、`Key`・`Size`・`LastModified`（Date）があります。テストは、置いてから 2 時間たったことにするため、`now` に未来の時刻を渡します。
