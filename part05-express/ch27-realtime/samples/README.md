# 第27章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [long-wait.mjs](long-wait.mjs) | ロングポーリング。タイマーと listener を、どの終わり方でも片付ける | 2 | 9347 |
| [sse-clock.mjs](sse-clock.mjs) | SSE で1秒ごとに時刻を送る | 3 | 9347 |
| [ws-echo.mjs](ws-echo.mjs) | ws で受け取ったものを全員に配る。Origin・大きさ・`JSON.parse` の失敗に気をつける | 4 | 9347 |
| [ws-client.mjs](ws-client.mjs) | `ws-echo.mjs` を試す、Node.js に組み込みの `WebSocket` のクライアント | 4 | — |

## 確かめるためのプログラム（中身は読まなくてよい）

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [polling-demo.mjs](polling-demo.mjs) | ポーリングとロングポーリング | 2 | 9340 |
| [sse-demo.mjs](sse-demo.mjs)、[public/sse.html](public/sse.html) | Server-Sent Events。`id` と `Last-Event-ID` での送り直し、心拍 | 3 | 9341 |
| [ws-handshake-demo.mjs](ws-handshake-demo.mjs) | WebSocket のハンドシェイクと、フレームを手で読み書きする（仕組みを見るため） | 4.1, 4.2 | 9342 |
| [ws-demo.mjs](ws-demo.mjs)、[public/chat.html](public/chat.html) | ws ライブラリのチャット。Origin の確かめ、`maxPayload`、心拍、つなぎ直し | 4.3〜4.5 | 9343 |

## 動かし方

`~/dev/part05/ch27-realtime` で動かします。

```sh
$ cd ~/dev/part05/ch27-realtime
$ node samples/sse-demo.mjs          # ブラウザで http://127.0.0.1:9341/sse.html を2つのタブで開く
$ node samples/ws-demo.mjs           # ブラウザで http://127.0.0.1:9343/chat.html を2つのタブで開く
```

- 各ファイルの先頭のコメントに、試す `curl` や `node -e` を書いてあります
- `curl -N` の `-N` は「ためずに、届いたらすぐ出す」です。SSE を curl で見るときに付けます
- Node.js 22 から、ブラウザと同じ `WebSocket` のクライアントが組み込まれています。ブラウザと違って、そのままでは `Origin` ヘッダを送らないので、`ws-demo.mjs` には 403 で断られます（ブラウザで試してください）。`ws-client.mjs` は、`Origin` を手で付けています
- DevTools の Network タブで、SSE は「EventStream」、WebSocket は「Messages」のタブを開くと、届いたものが見られます
