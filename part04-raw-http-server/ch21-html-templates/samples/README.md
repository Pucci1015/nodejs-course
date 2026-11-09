# 第21章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [concat-demo.mjs](concat-demo.mjs) | 文字列をつなぐだけで HTML を作ると、`<` や `&` の入った題名の表示が崩れる。`/safe` はエスケープしてからつなぐ | 2, 3 | 9210 |
| [mini-html.mjs](mini-html.mjs) | 値を自動でエスケープする `html` タグと `raw`・`escapeHtml`（練習問題と模範解答でも使う） | 4 | — |
| [layout-demo.mjs](layout-demo.mjs) | `layout()`・`taskItem()`・`tagList()` という関数を部品にして、ページを組み立てる | 5 | 9211 |
| [json-script-demo.mjs](json-script-demo.mjs) | サーバのデータを `<script>` に渡すとき、`JSON.stringify` だけでは足りない理由 | 7 | — |
| [csp-demo.mjs](csp-demo.mjs) | `Content-Security-Policy` の nonce。nonce の付いた `<script>` だけが動く | 8 | 9212 |

外部のパッケージは使わないので、`npm install` は不要です。`layout-demo.mjs` は第17章・第18章の模範解答（`createApp`・`sendHtml`・`Router`）を相対パスで読み込みます。

```sh
$ node concat-demo.mjs        # ブラウザで http://127.0.0.1:9210/ と /safe を見比べる
$ node layout-demo.mjs        # ブラウザで http://127.0.0.1:9211/ と /tasks/3
$ node json-script-demo.mjs   # サーバは使わない。出力を読む
$ node csp-demo.mjs           # ブラウザで http://127.0.0.1:9212/ を開き、DevTools の Console も見る
```

- `concat-demo.mjs` の `/` では、1冊目の題名の `<p>` と `<div>` がタグとして読まれ、文字が消えたりレイアウトが変わったりします。DevTools の Elements で、ブラウザがどう読んだかを見てください
- 見た目が同じでも、ページのソース（`view-source:`）と Elements では見えるものが違います。ソースはサーバが送った文字、Elements はブラウザが読んだ結果です
- `csp-demo.mjs` の Console には、nonce の無い `<script>` を CSP が止めたというメッセージが出ます（Chromium で確かめた）
