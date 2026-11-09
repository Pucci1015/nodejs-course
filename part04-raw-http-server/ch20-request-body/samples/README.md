# 第20章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [simple-body.mjs](simple-body.mjs) | いちばん簡単な、ボディを全部読む関数（上限が無い） | 2 | — |
| [body-chunks.mjs](body-chunks.mjs) | ボディがチャンクで届く様子。チャンクごとに文字に戻すと、文字が壊れる | 2 | 9200 |
| [form-demo.mjs](form-demo.mjs) | HTML のフォーム（入力欄、複数行、同じ名前のチェックボックス）を受け取り、303 で結果のページへ | 5 | 9201 |
| [json-demo.mjs](json-demo.mjs) | JSON を受け取る。415・400、大きな整数、同じキー | 3, 6 | 9202 |
| [limit-demo.mjs](limit-demo.mjs) | 大きすぎるボディを 413 で断る。`Connection: close` の有る無しで、受け取る量を比べる | 4 | 9203 |
| [form-data.mjs](form-data.mjs) | multipart/form-data を、上限付きで読んでから `Request.formData()` に渡す `readFormData`（練習問題5でも使う） | 8 | — |
| [multipart-demo.mjs](multipart-demo.mjs) | ファイルのアップロードを受け取り、名前・種類・最初のバイトを表示する | 8 | 9204 |
| [proto-demo.mjs](proto-demo.mjs) | JSON の `__proto__` と、`Object.assign`・深いマージで起きるプロトタイプ汚染 | 7 | — |

外部のパッケージは使わないので、`npm install` は不要です。

```sh
$ node body-chunks.mjs
$ node form-demo.mjs        # ブラウザで http://127.0.0.1:9201/
$ node json-demo.mjs        # 先頭のコメントの curl を試す
$ node limit-demo.mjs       # 先頭のコメントの curl を試す（/tmp に 5MB のファイルを作る）
$ node multipart-demo.mjs   # ブラウザで http://127.0.0.1:9204/
$ node proto-demo.mjs
```

- `curl -d '...'` は `Content-Type: application/x-www-form-urlencoded` で送ります。JSON を送るときは `-H 'Content-Type: application/json'` を付けます
- `curl -F 'name=値' -F 'file=@パス'` は multipart/form-data で送ります
- `limit-demo.mjs` の確かめ方で作った `/tmp/big.bin` は、終わったら `rm /tmp/big.bin` で消してください
- `multipart-demo.mjs` は、受け取ったファイルを保存しません
