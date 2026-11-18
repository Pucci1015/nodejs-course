# 第63章 模範解答

練習問題（[../exercises/README.md](../exercises/README.md)）の模範解答です。動かすときは、`exercises/` で `MODULE=../solutions/○○.ts` を付けてテストを動かします。

| 問題 | ファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [object-key.ts](object-key.ts) | `MODULE=../solutions/object-key.ts node --test object-key.test.ts` |
| 2 | [content-disposition.ts](content-disposition.ts) | `MODULE=../solutions/content-disposition.ts node --test content-disposition.test.ts` |
| 3 | [sniff-file.ts](sniff-file.ts) | `MODULE=../solutions/sniff-file.ts node --test sniff-file.test.ts` |
| 4 | このファイルの「問題4」 | |
| 5 | [presign.ts](presign.ts) | `MODULE=../solutions/presign.ts node --test presign.test.ts` |
| 6 | [memory-blob-store.ts](memory-blob-store.ts) | `MODULE=../solutions/memory-blob-store.ts node --test memory-blob-store.test.ts` |
| 7 | [upload-router.ts](upload-router.ts) | `MODULE=../solutions/upload-router.ts node --test upload-router.test.ts` |
| 8 | [sweep-orphans.ts](sweep-orphans.ts) | `MODULE=../solutions/sweep-orphans.ts node --test sweep-orphans.test.ts` |

---

## 問題1 オブジェクトのキーを決める

```ts
const dot = fileName.lastIndexOf('.');
const raw = dot > 0 ? fileName.slice(dot).toLowerCase() : '';
const ext = Object.hasOwn(EXTENSIONS, raw) ? EXTENSIONS[raw] : '';
```

- `dot > 0`（`>= 0` ではない）にしたのは、`.png` のように `.` が先頭の名前（Mac の隠しファイルの形）を「拡張子だけ」と見ないためです。
- 拡張子の表 `EXTENSIONS` は「受け付けるもの → 付けるもの」にしたので、`.jpeg` を `.jpg` にそろえるのも表の1行で済みます。`Object.hasOwn` で調べるのは、`.constructor` のような名前を「ある」と見ないためです（第4部 第19章）。
- 拡張子は、キーを見て人が分かりやすくするためだけのものです。種類は、中身で決めます（問題3）。
- 年と月で分けると、ライフサイクルの設定（本文 8節）や、手で調べるときに、`users/42/2026/11/` の `Prefix` で絞れます。日本の時刻で分けたいときも、キーは UTC にしておくと、夏時間のある国の利用者がいても、年月の境目がずれません。

## 問題2 ダウンロードの名前

```ts
const cleaned = fileName.replace(/[/\x00-\x1f\x7f]/g, '_') || 'file';
const ascii = cleaned.replace(/[^\x20-\x7e]|["\\]/g, '_');
return `${type}; filename="${ascii}"; filename*=UTF-8''${enc(cleaned)}`;
```

- 改行（`\r\n`）を名前に入れたままヘッダに書くと、ヘッダがそこで切れて、別のヘッダを足されるおそれがあります（Node.js は、ヘッダの値に改行があると例外を投げて防ぎます）。だから、最初に制御文字を消します。
- `/` を `_` にするのは、保存するときに、ブラウザやダウンロードの道具がフォルダの区切りと見ないためです（ブラウザも自分で消しますが、送る側でも消しておきます）。
- `filename` の `"` は、ヘッダの中の文字列の終わりになってしまうので、`_` にします。`\` は、`"…"` の中で「次の文字をそのまま」の印なので、これも `_` にします。
- `||` は、左が空の文字列（falsy）なら右を使います。`??` は `null`・`undefined` のときだけなので、ここでは `||` を使います。

## 問題3 先頭のバイトで種類を決める

```ts
function startsAt(data: Buffer, offset: number, bytes: string | number[]): boolean {
  const want = typeof bytes === 'string' ? Buffer.from(bytes, 'latin1') : Buffer.from(bytes);
  if (data.length < offset + want.length) return false;
  return want.every((v, i) => data[offset + i] === v);
}
```

- 種類ごとに「印」の配列を持たせ、`every` で「全部の印が合うか」を調べました。WebP のように印が2つあるものも、表に1行足すだけです。
- 長さを先に調べないと、`data[offset + i]` は `undefined` になり、比べた結果は `false` になるので、この関数では答えは変わりません。それでも先に調べるのは、「範囲の外を読まない」ことを、読む人にはっきり示すためです。
- SVG を受け付けないのは、中に `<script>` を書けるからです（本文 6.3節）。画像として表示したいなら、サーバで PNG に変換する（sharp などのパッケージ）か、別のオリジンから `Content-Security-Policy: script-src 'none'` 付きで配ります。
- 先頭のバイトが合っても、後ろが壊れている・別のものが付いている、ということはあります。画像をきちんと確かめたいなら、変換のパッケージで読み込んでみて、読めたものだけを、変換し直して置きます（変換し直すと、写真の位置の情報などの、見せたくない情報も消せます）。

## 問題4 考えて答える

1. デプロイすると、新しいコンテナが作られるので、`uploads/` は空になり、前の画像は全部消えます（データベースの行は残るので、壊れた画像だらけになる）。2 台にすると、1 台目に置いた画像は 2 台目のディスクには無いので、どちらの台に頼みが回るかによって、見えたり見えなかったりします。
2. 1つ目: メールは転送されたり、ほかの人のパソコンに残ったりするので、7 日間はだれでも開けます（あとから「やっぱり見せない」ができない）。2つ目: 署名付き URL は、作った時の鍵で決まるので、7 日の間に鍵を取り替える（第60章 6節）と、取り替えた時点で開けなくなります。メールには、アプリの `/files/123` の URL を書き、開いたときにログインと持ち主を確かめてから、短い署名付き URL へ送るほうがよいです。
3. 署名に含めたヘッダは、開く人が同じ値で送らないと、署名が合わなくなります。`Host` は、URL から決まるので、だれが開いても同じです。`user-agent` を含めると、署名を作ったプログラム（Node.js）の値と、ブラウザの値が違うので、ブラウザで開くと `SignatureDoesNotMatch` になります。
4. `report.html` の中のスクリプトが、`app.example.com` のページとして動きます。ログインしている人が開くと、そのスクリプトは、その人の Cookie で API を呼べます（XSS）。直し方: HTML は受け付けない（中身で種類を確かめる）、返すときは `attachment` と `nosniff`、利用者のファイルは別のオリジン（ストレージの署名付き URL や `files.example.com`）から配る。
5. 1 の後で落ちると、データベースには行が残り、ストレージには中身が無い状態になります。利用者には、添付が見えるのに開くと 404 になるものが残ります。逆の順（行を先に消す）なら、落ちたときに残るのは、ストレージの中身だけ（孤児）です。利用者からは見えず、練習問題8の掃除で消せます。だから「**データベースを先に、ストレージを後に**」のほうがよいです。
6. ファイルでないストリームで `ContentLength` が無いと、SDK は長さが分からないので、`Are you using a Stream of unknown length as the Body of a PutObject request?` と注意を出し、長さを決めずに（`Transfer-Encoding: chunked` で）送ります。S3 は長さの分からない送り方を断るので、mini-s3 も同じく `失敗: MissingContentLength 411 Content-Length ヘッダが要ります` になりました。`ContentLength` の行を消すだけ（ファイルのストリームのまま）なら、成功します。SDK が、`fs.createReadStream` のストリームなら、ファイルの大きさを自分で調べるからです。長さの分からないもの（ほかのサーバから流れてくるもの）を置くときは、注意のとおり `@aws-sdk/lib-storage` の `Upload`（いくつかに分けて置く、マルチパートアップロード）を使います。

## 問題5 署名付き URL を作る関数

本文の `sign-by-hand.ts` との違いは、`expiresIn` の確かめと、`response-content-disposition` を足すところです。

```ts
if (input.downloadName !== undefined) {
  query.set('response-content-disposition', `attachment; filename*=UTF-8''${enc(input.downloadName)}`);
}
const canonicalQuery = [...query]
  .map(([k, v]) => [enc(k), enc(v)] as const)
  .sort(([a], [b]) => (a < b ? -1 : 1))
  .map(([k, v]) => `${k}=${v}`)
  .join('&');
```

- 値の中の `%` は、もう一度 `enc` されて `%25` になります（名前を `%E3…` にした後、クエリにするときにもう一度 `%XX` にするため）。本文 4.3節の SDK の出力にも、`%25E3%2583…` と出ていました。
- 並べる順は、`%XX` にした**後の**文字列で比べます（AWS の決まり）。大文字は小文字より前なので、`X-Amz-…` が `response-…` より先に来ます。
- `now` を引数にしたので、テストで「2 分前に作った URL」を作り、期限切れを確かめられます（第11部 第56章の「今を引数で」）。
- `as const` は、`[a, b]` を「2つの要素の組」の型にするための書き方です（第7部 第36章）。

## 問題6 `BlobStore` のメモリの偽物

- `put` で `Buffer.from(body)` と写しを作らないと、呼んだ側が後で `body` を書き換えたとき、置いてあるものも変わります。S3 では、置いた時点の中身が送られるので、変わりません。偽物も同じにします。
- `get` でも写しを返します。S3 は、取り出すたびに新しいバイトを返すからです。
- `list` の並べ替えは、`a.key < b.key` の比べ方（UTF-16 の順）にしました。S3 は UTF-8 のバイトの順で、絵文字などの一部の文字で順番が違うことがあります。契約テストに、そういうキーを足すと、違いが見つかります。
- これで、成果物のテストは、S3 が無くてもメモリの偽物で速く動き、S3 の `BlobStore` が同じ契約を守っていることは、別のテストで確かめられます。

## 問題7 受け取って置き、中継して返すルーター

```ts
router.get('/files/:id', async (req, res) => {
  const info = files.get(req.params.id);
  const blob = info && (await store.get(keyOf(info.id)));
  if (info === undefined || blob === undefined) {
    res.status(404).json({ error: 'ありません' });
    return;
  }
  res.set({ … });
  res.send(blob.body);
});
```

- 情報はあるのにストレージに中身が無い（問題4の5の「行だけ残った」状態）ときも、404 にしました。500 にすると、利用者に「サーバの故障」と見えてしまいます。ログには残しておくと、食い違いに気づけます。
- `res.send(Buffer)` は、`Content-Length` を付けて送ります。大きなファイルを中継するなら、`BlobStore` に「ストリームで取り出す」操作を足して、`pipeline` で流します（第3部 第15章）。
- `Cache-Control: private, no-cache` は、ブラウザには覚えてよいが、使う前に毎回確かめよ、という意味です。持ち主だけが見てよいファイルを、CDN に覚えさせないためです。
- 本番では、`GET` と `DELETE` の前に、ログインと持ち主を確かめます（成果物）。

## 問題8 孤児を掃除する

```ts
const age = now.getTime() - (o.LastModified?.getTime() ?? now.getTime());
if (age < graceMs) continue;
if (await isReferenced(o.Key)) continue;
if (!dryRun) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: o.Key }));
deleted.push(o.Key);
```

- `LastModified` が無いもの（ふつうは無い）は、「今置いた」として扱い、消さない側に倒しました。
- `isReferenced` の例外を `try` で受けないのは、受けて「使われていない」と見なすと、データベースが止まった日に、全部のファイルを消してしまうからです。分からないときは止めます。
- 一覧を読みながら消しても、S3 の一覧の続き（`ContinuationToken`）は、消したものを飛ばして続きを返すので、取りこぼしません。心配なら、先に全部のキーを集めてから消します（数が多いとメモリを使います）。
- キーごとに `isReferenced` を呼ぶと、データベースへの問い合わせが、オブジェクトの数だけ起きます（第6部 第33章の N+1）。1000 件ずつのページごとに、`SELECT key FROM attachments WHERE key = ANY($1)` のように、まとめて聞くと速くなります。
- 消した数が多すぎたら止める（「1回に 100 件まで」）安全装置もよく使います。第64章で、これを定期実行のジョブにします。
