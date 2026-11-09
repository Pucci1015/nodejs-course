# 第20章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 内容 |
| --- | --- |
| [body.mjs](body.mjs) | 問題2: `readBody`・`mediaType`・`readText`・`readJson`・`readForm` |
| [merge.mjs](merge.mjs) | 問題3: `safeMerge`・`pick` |
| [contact.mjs](contact.mjs) | 問題4: お問い合わせフォームと JSON の API を、問題2・3の関数と第18章の Router で書き直したもの |
| [upload.mjs](upload.mjs) | 問題5: `detectImageType`・`saveImage` |

模範解答は、`exercises` フォルダで次のように確かめられます。

```sh
$ cd ../exercises
$ MODULE=../solutions/body.mjs node --test body.test.mjs
$ MODULE=../solutions/merge.mjs node --test merge.test.mjs
$ bash check-contact.sh ../solutions/contact.mjs
$ MODULE=../solutions/upload.mjs node --test upload.test.mjs
```

---

## 問題1 フォームと JSON の読み方の結果を予想する

```
 1: "a b"
 2: "a+b"
 3: "1=1"
 4: "1=1"
 5: "a"
 6: {"tags":"b"}
 7: "on"
 8: ""
 9: {"a":2}
10: 9007199254740992
11: "文字"
12: null
13: undefined
14: ["__proto__"]
15: SyntaxError: Unexpected end of JSON input
```

- **4番**: `URLSearchParams` は、最初の `=` で名前と値を分けるので、値は `1=1` です。自分で `'q=1=1'.split('=')` とすると `['q', '1', '1']` になり、`[1]` だけを取ると値は `1` になってしまいます（ブラウザは値の中の `=` を `%3D` にして送りますが、curl や自分で書いたプログラムは、そうするとは限りません）
- **6番**: `Object.fromEntries` は、同じキーが来ると後ろで上書きするので、`tags` は最後の `"b"` だけになります。チェックボックスや複数選択の項目が消えます
- **13番と14番**: `JSON.parse` は `__proto__` を**自分のキー**として入れます（14番）。プロトタイプは変わらないので、`.x` は `undefined` です（13番）。危ないのは、このオブジェクトを `Object.assign` や深いマージに渡したときで、そこで `結果["__proto__"] = 値` という代入が起き、代入がプロトタイプを差し替えます

## 問題2 ボディを上限付きで読む

[body.mjs](body.mjs) のポイント:

- `readBody` は Promise を自分で作り、`'data'`・`'end'`・`'error'`・`'close'` を聞く。上限を超えたら `req.pause()` で読むのをやめ、413 で失敗させる。`req` を壊さないので、`createApp` が 413 を返せます。`Connection: close` が付いているので、Node.js は返事の後に接続を閉じ、残りを受け取りません
- `'close'` が来たときに `req.complete` が `false` なら、客が途中で切ったということです。これを聞かないと、`'end'` も `'error'` も来ないまま、Promise がずっと終わらないことがあります
- `finish` で、2回目以降の結果を無視する（上限を超えた後に `'close'` が来ても、413 のまま）
- 文字に戻すのは `TextDecoder('utf-8', { fatal: true })`。`Buffer.toString()` は、正しくないバイト列を `�` に置き換えて、黙って続けてしまいます
- `mediaType` は、`;` で分けてから `=` で分けています。`boundary` のように、大文字と小文字に意味がある値は、小文字にしません

`readJson` で受け付ける `+json` は、`application/merge-patch+json`（問題3の JSON Merge Patch）や `application/problem+json` のような、JSON の決まりを使った種類です。

## 問題3 受け取った JSON を安全に混ぜる・選ぶ

[merge.mjs](merge.mjs) のポイント:

- 結果は、いつも新しい `{}` に作る。`target` のキーは `Object.keys`（自分のキーだけ）でコピーする
- `patch` のキーを1つずつ見て、`__proto__`・`constructor`・`prototype` なら 400
- 値を入れるときは `Object.defineProperty` を使っています。`FORBIDDEN` で断っているので、ふつうの代入でも問題は起きませんが、「どんな名前でも、ふつうのキーとして入れる」ことを、コードではっきりさせています
- 配列や値は `structuredClone` でコピーしてから入れる
- 深さは、オブジェクトを1段下りるごとに数える

最初に入っていた「よくある書き方」では、`patch` の `__proto__` を見たときに `target["__proto__"]` が `Object.prototype` を返し、そこに `isAdmin: true` が書き込まれます。これで、プロセスの中のすべてのオブジェクトが `isAdmin` を持つようになります。サーバのプロセスの中で一度これが起きると、`if (user.isAdmin)` のようなコードが、すべての利用者で `true` になるかもしれません。

`pick` は、マスアサインメント（本文7.1節）を防ぐ部品です。受け取ったデータを「保存するもの」に変えるときは、いつも、使うキーを決めて取り出します。

## 問題4 お問い合わせフォームと JSON の API のバグ

| 失敗していた確認 | 原因 |
| --- | --- |
| 1・2 | 保存した後、ページを直接返している（200）。PRG にする（303） |
| 3 | 自分で `split('&')` と `decodeURIComponent` で読んでいる。`+` が空白に戻らない |
| 4 | `Object.fromEntries` で、同じ名前のチェックボックスが最後の1つだけになる |
| 5・6 | `name` が無いと `data.name.trim()` が TypeError。`createApp` で包んでいないので、プロセスが終わる |
| 7 | 入力の間違いを 200 で返している（422 にする） |
| 8 | もう一度表示するフォームの `value` に、入力をエスケープせずに入れている。`<script>` がページに入る |
| 9 | `body += chunk` で、チャンクごとに文字に戻している |
| 10 | 上限が無い |
| 12・13 | `{ id: nextId++, topics: [], ...data }` で、客の送ったキーで `id` が上書きされ、`isAdmin` も保存される |
| 14 | `Content-Type` を見ていない |
| 15・16 | `JSON.parse` の失敗を捕まえていない。プロセスが終わる |
| 17・18 | `name` が数だと `data.name.trim` が無く TypeError |

8 は、自分で入力したものが自分のページで動くだけなので、大したことがないように見えます。ところが、ほかのサイトに置いたフォームから、このサーバへ `<script>` 入りの値を POST させることができるので、利用者のブラウザで、このサイトの JavaScript として動かせてしまいます（反射型 XSS。第21章、第10部 第55章）。

[contact.mjs](contact.mjs) は、フォームと JSON の API で、同じ `validate` と `save` を使っています。入り口（`readForm` と `readJson`）が違っても、確かめ方と保存の仕方を1か所にまとめておくと、片方だけ直し忘れることがありません。

## 問題5 アップロードされた画像を安全に保存する

[upload.mjs](upload.mjs) のポイント:

- 調べる順番は「`File` か → 空でないか → 大きすぎないか → 中身の種類 → 保存」。大きさは `file.size` で、中身を読む前に分かります
- `detectImageType` は、先頭の数バイトを比べるだけです。これで分かるのは「先頭が PNG の形をしている」ことまでで、ファイル全体が正しい画像かどうかは分かりません。もっと確かめるなら、画像のライブラリ（sharp など）で一度読み込み、新しい画像として書き出し直します（そのとき、写真に入っている位置情報などのメタデータも消せます）
- `flag: 'wx'` は「無ければ作る、あれば失敗」です。`randomUUID` がぶつかることはまずありませんが、上書きしないことをはっきりさせています

**`serveStatic` で配信するとき**: `X-Content-Type-Options: nosniff` を付け（第19章の `serveStatic` は付けています）、Content-Type を拡張子から正しく付けます。保存するときに中身で拡張子を決めたので、拡張子と中身が合っています。さらに、アップロードされたファイルは、アプリのファイル（HTML や JavaScript）とは別のフォルダ（できれば別のドメイン）から配信します（第10部）。
