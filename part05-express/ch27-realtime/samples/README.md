# 第27章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [polling-demo.mjs](polling-demo.mjs) | ポーリングとロングポーリング | 2 | 9340 |
| [sse-demo.mjs](sse-demo.mjs)、[public/sse.html](public/sse.html) | Server-Sent Events。`id` と `Last-Event-ID` での送り直し、心拍 | 3 | 9341 |
| [ws-handshake-demo.mjs](ws-handshake-demo.mjs) | WebSocket のハンドシェイクと、フレームを手で読み書きする（仕組みを見るため） | 4.1, 4.2 | 9342 |
| [ws-demo.mjs](ws-demo.mjs)、[public/chat.html](public/chat.html) | ws ライブラリのチャット。Origin の確かめ、`maxPayload`、心拍、つなぎ直し | 4.3〜4.5 | 9343 |

## 動かし方

`~/dev/part05`（第5部の README の「準備」で作ったもの）の中で動かします。

```sh
$ cd ~/dev/part05/ch27-realtime/samples
$ node sse-demo.mjs          # ブラウザで http://127.0.0.1:9341/sse.html を2つのタブで開く
$ node ws-demo.mjs           # ブラウザで http://127.0.0.1:9343/chat.html を2つのタブで開く
```

- 各ファイルの先頭のコメントに、試す `curl` や `node -e` を書いてあります
- `curl -N` の `-N` は「ためずに、届いたらすぐ出す」です。SSE を curl で見るときに付けます
- Node.js 22 から、ブラウザと同じ `WebSocket` のクライアントが組み込まれています。`node -e` で試せます。ただし、ブラウザと違って `Origin` ヘッダを送らないので、`ws-demo.mjs` には 403 で断られます（ブラウザで試してください）
- DevTools の Network タブで、SSE は「EventStream」、WebSocket は「Messages」のタブを開くと、届いたものが見られます
