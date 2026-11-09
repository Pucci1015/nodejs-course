# 第17章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 内容 |
| --- | --- |
| [server.mjs](server.mjs) | 問題2: 直した伝言板 |
| [app.mjs](app.mjs) | 問題3: `createApp` と `HttpError` |
| [send.mjs](send.mjs) | 問題4: `sendText`・`sendHtml`・`sendJson`・`redirect`・`noContent` |
| [graceful-server.mjs](graceful-server.mjs) | 問題5: 安全に止まるサーバ |

模範解答は、`exercises` フォルダで次のように確かめられます。

```sh
$ cd ../exercises
$ bash check-server.sh ../solutions/server.mjs
$ MODULE=../solutions/app.mjs node --test app.test.mjs
$ MODULE=../solutions/send.mjs node --test send.test.mjs
$ bash check-shutdown.sh ../solutions/graceful-server.mjs
```

---

## 問題1 10個のハンドラが何を返すか予想する

`node predict-run.mjs all` の結果をまとめると、次のようになります（Node 26 で確かめたもの）。

| 番号 | 届くもの | プロセス | 理由 |
| --- | --- | --- | --- |
| 1 | 200、`Content-Length: 3`、`abc` | 動き続ける | `end(本文)` だけなので、長さが分かる |
| 2 | **200**、chunked、`x` | 動き続ける | `write('x')` の時点でステータス行とヘッダが送られた。後から `statusCode = 404` としても、もう送ったものは変えられない |
| 3 | 302、`Location: /next`、chunked で本文は空 | 動き続ける | `writeHead` はヘッダをすぐ送る。その時点で `Content-Length` が無いので chunked になる |
| 4 | 200、chunked、`途中まで` で止まる | 動き続ける | `end` を呼んでいないので、レスポンスが終わらない。客は待ち続ける（`predict-run.mjs` は2秒で諦める） |
| 5 | 200、`Content-Length: 7`、`1回目` | **終わる** | 2回目の `end` が `ERR_STREAM_WRITE_AFTER_END` の `'error'` イベントになり、リスナーが無いので例外 |
| 6 | 200、`Content-Length: 2`、`abc`（3バイト届く） | 動き続ける | Node.js は `Content-Length` と本文が合っているかを確かめずに送る。客は `ab` までを本文として読み、残りの `c` は次のレスポンスの先頭として読もうとする。同じ接続で次のリクエストを送ると、`cHTTP/1.1 200 OK...` を読むことになり、客はエラーにする |
| 7 | 何も届かない | **終わる** | `end(123)` は `ERR_INVALID_ARG_TYPE`。ヘッダを送る前に例外になったので、何も送られない |
| 8 | 204、`Content-Type: text/plain`、本文なし | 動き続ける | 204 は本文を持てないので、Node.js が本文を捨てる |
| 9 | 200、`Content-Type` だけ。`Content-Length` も本文もない | 動き続ける | HEAD なので Node.js が本文を捨てる。そのとき、自動の `Content-Length` も付かない。GET と同じにするには、自分で `Content-Length: Buffer.byteLength(本文)` を付ける（問題4の解答） |
| 10 | 200、`Set-Cookie: b=2` と `Set-Cookie: c=3` | 動き続ける | `setHeader` は置き換え（`a=1` は消えた）、`appendHeader` は足す |

5番と7番のように、1つのハンドラのまちがいでプロセスごと終わるものがあることを覚えておいてください。問題3の `createApp` で包むと、7番は 500 になります。5番は `'error'` イベントなので、`res.on('error', ...)` が無いと包んでも止まります（2回 `end` しないのが一番の対策です）。

## 問題2 伝言板のバグ

[server.mjs](server.mjs) で直したのは、次の6か所です（コメントの `// 修正:`・`// 追加:`）。

| 失敗していた確認 | 原因 | 直し方 |
| --- | --- | --- |
| 1・2・3 | `write` の後に `setHeader('Cache-Control')` で `ERR_HTTP_HEADERS_SENT`。例外でプロセスが終わる。charset も無い | ヘッダをすべて決めてから、本文を `end` で1回で送る |
| 4・5 | `Content-Length` に `body.length`（文字数）。日本語の分だけ短く、JSON の途中で切れる | `Buffer.byteLength(body)`。`charset=utf-8` も付ける |
| 6 | 見つからないときに何も返さない。客は待ち続ける | 404 を返す |
| 10 | 400 を返した後、`return` しないので先に進み、`data.name`（`data` は `undefined`）で例外 | 返した後は `return`。ボディは `for await` で最後まで読んでから使う |
| 11・12 | `stats.json` が無いと `readFile` が rejected。unhandled rejection でプロセスが終わる | ハンドラ全体を `try/catch` で包み、500 を返す |

`name`・`text` が文字列かどうかも確かめるようにしました（確認スクリプトには無い、おまけです）。ボディの読み方と、大きすぎるボディを断る方法は第20章で扱います。

## 問題3 `createApp`

[app.mjs](app.mjs) のポイント:

- **`res.once('close', ...)` でログを書く。** `close` は、最後まで返せたときも、客が先に切ったときも1回だけ来るので、ログが抜けたり2回書かれたりしません。`res.writableFinished` が `false` なら `aborted`
- 時間は、ハンドラを呼ぶ前の `now()` と、`close` のときの `now()` の差。`now` を引数で差し替えられるようにしたので、テストでは「ちょうど 42ms」を作れる（第3部 第16章10節の「時計を差し替える」）
- `await handler(req, res)` を `try` で囲む。同期の例外も、rejected も、ここで捕まる
- `HttpError` の 400 番台だけをメッセージごと返す。500 番台はサーバの問題なので、`HttpError` でも中身を見せない
- ヘッダを送った後なら、`res.destroy()`

**`X-Request-Id` を確かめる理由**: 客が送ってきた値は、そのままアクセスログに書かれます。スペースや `GET /admin 200 1ms` のような文字を入れた値を送られると、ログの1行の形が崩れ、ログを列に分けて読む道具（第3部 第11章の `parseLine` のようなもの）が、偽の値を読んでしまいます（ログインジェクション）。とても長い値で、ログの量を増やされることもあります。HTTP のヘッダの値には改行を入れられない（Node.js が受け付けない）ので、気をつけるのは改行以外の文字と長さです。決まった形（`/^[A-Za-z0-9-]{1,64}$/`）のときだけ使い、それ以外は自分で作ります。前に置いた別のサーバ（リバースプロキシなど）が付けた ID を受け継げるので、複数のサーバをまたいでログを追えるのが、客の ID を使う利点です。

第5部の Express では、この部品が「エラーハンドリングのミドルウェア」と「ログのミドルウェア」（morgan など）に分かれています。

## 問題4 返し方の部品

[send.mjs](send.mjs) では、5つの関数すべてが、内部の `send(res, status, type, body, headers)` を呼ぶ形にしました。決まり（バイト数、charset、204・304、HEAD）を1か所で守れば、すべての関数で守られます。

`sendText` のまちがいは2つでした。

1. `Content-Length: text.length` は文字数。`Buffer.from(text, 'utf8')` にしてから `.length` を使う
2. `Content-Type` に `charset=utf-8` が無い。無いと、ブラウザが文字コードを推測して、文字化けすることがある（第2部 第7章）

HEAD のときは `res.end()` に本文を渡していません。渡しても Node.js が捨てますが、渡さない方が「HEAD では本文を送らない」ことがコードから分かります。

## 問題5 安全に止まるサーバ

[graceful-server.mjs](graceful-server.mjs) のポイントは、本文7節の手順に、2つを足したものです。

- **`clearInterval(statsTimer)`**: これが無いと、接続が全部閉じても、10 秒ごとのタイマーが残っているので、プロセスが終わりません。確認スクリプトでは、7 件が「終わらない（timeout）」か「時間がかかりすぎる」で失敗します
- **止めている途中の返事に `Connection: close`**: `/slow` を処理している途中で止め始めると、その接続は `close()` の時点では「処理中」なので閉じられません。返事の後は keep-alive の接続として残り、`keepAliveTimeout`（既定 5 秒）が過ぎるまでプロセスは終われません。確認スクリプトの3では、上限の 1 秒で切られて、終了コードが 1 になります。`Connection: close` を付けると、Node.js は返事の後に接続を閉じます

`closeIdleConnections()` は、Node 19 からは `close()` が同じことをしてくれるので、無くても確認スクリプトは通ります（Node 26 で確かめた）。古い Node.js でも動くように、また何をしたいのかがコードから分かるように、書いておいています。

`server.close()` のコールバックの中で `process.exit()` を呼ばないのは、第3部 第16章6.1節と同じ理由です。ログをファイルやパイプに書いている途中なら、`exit` で捨てられることがあります。すべてが終われば、Node.js は自然に終わります。
