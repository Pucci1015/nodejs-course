# 第17章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- |
| 1 | 10個のハンドラが何を返すか予想する | [predict-handlers.mjs](predict-handlers.mjs)、[predict-run.mjs](predict-run.mjs) | 4 | 9176 |
| 2 | 動いているように見える伝言板のバグを直す | [buggy-server.mjs](buggy-server.mjs)、[check-server.sh](check-server.sh) | 4, 5 | 9177 |
| 3 | ハンドラを包む `createApp`（500・リクエスト ID・アクセスログ） | [app.mjs](app.mjs)、[app.test.mjs](app.test.mjs) | 3, 5 | 空いている番号 |
| 4 | 返し方の部品 `sendText`・`sendJson`・`redirect` など | [send.mjs](send.mjs)、[send.test.mjs](send.test.mjs) | 4, 6 | 空いている番号 |
| 5 | SIGTERM で安全に止まるサーバ | [graceful-server.mjs](graceful-server.mjs)、[check-shutdown.sh](check-shutdown.sh) | 7 | 9178 |

- 問題3・4は `node --test ○○.test.mjs` ですべてのテストが通れば完成です。テストは `listen(0)` で空いているポートを使うので、ほかのサーバとぶつかりません
- 問題2・5は `bash check-○○.sh` で確かめます。確認スクリプトがサーバを起動し、最後に止めます。同じポートで別のサーバを動かしていると失敗するので、先に止めておいてください
- テストや確認スクリプトは、答えが返ってこないときに止まったままにならないよう、数秒で諦めるようにしてあります

---

## 問題1 10個のハンドラが何を返すか予想する

[predict-handlers.mjs](predict-handlers.mjs) に、少しずつ違う10個のハンドラがあります。それぞれについて、**実行する前に**次の3つを予想して書き出してください。

- ステータス行とヘッダ（特に `Content-Length` か `Transfer-Encoding: chunked` か）
- 客に届く本文
- サーバのプロセスは動き続けるか、終わるか

予想したら、`node predict-run.mjs 番号`（`all` で全部）で確かめます。`predict-run.mjs` はハンドラを別のプロセスのサーバ（127.0.0.1:9176）で動かし、客として生の HTTP のバイト列を送って、届いたものをそのまま表示します。

```sh
$ node predict-run.mjs 1
===== 1（GET）
HTTP/1.1 200 OK
...
```

予想と違ったものは、なぜそうなるのかを本文4節を見ながら説明してください。特に次の3つ。

- 2番: `write` の後に `statusCode = 404` としたのに、なぜ 200 なのか
- 6番: `Content-Length: 2` で `abc` を送ると、客には何が届くか。同じ接続で次のリクエストを送ったら、何が起きると思うか
- 9番: HEAD で開いたとき、`Content-Length` が無いのはなぜか。GET と同じにするにはどうするか（問題4につながります）

## 問題2 動いているように見える伝言板のバグを直す

[buggy-server.mjs](buggy-server.mjs) は、伝言を一覧・追加できる小さなサーバです。ブラウザで http://127.0.0.1:9177/ を開くと、一見ちゃんと動いています。でも、確認スクリプトを動かすと、12 個のうち 9 個が失敗します。

```sh
$ bash check-server.sh
[NG] 1. / の Content-Type に charset=utf-8 がある
...
9 件失敗しました
```

すべて通るように直してください。API は次のとおりです。

| メソッドとパス | 返すもの |
| --- | --- |
| `GET /` | 伝言の一覧の HTML。`Content-Type: text/html; charset=utf-8`、`Cache-Control: no-store` |
| `GET /api/messages` | 伝言の一覧の JSON |
| `GET /api/messages/:id` | 1件の JSON。無ければ 404 |
| `POST /api/messages` | JSON のボディ `{ "name": "...", "text": "..." }` で追加。201 と `Location: /api/messages/新しい id`。JSON として読めなければ 400 |
| `GET /api/stats` | `stats.json` の中身。ファイルが無い（このフォルダには置いていません）ときは 500。サーバは止まらない |

ヒント:

- 失敗の中には、同じ原因から来ているものがあります。1つ直すと、まとめて通ることがあります
- サーバが止まったときは、確認スクリプトが起動し直してから次へ進みます。サーバのターミナルの出力（スクリプトの最後に表示されます）も見てください
- 日本語の本文で、`Content-Length` の値と本文のバイト数が合っているか
- `if` の中で返した後に、その先まで進んでしまっていないか

直せたら、`bash check-server.sh` が「すべて成功しました」になります。

## 問題3 ハンドラを包む `createApp`

本文5節の「ハンドラを包む」処理を、どのサーバでも使える部品にします。[app.mjs](app.mjs) の `createApp(handler, { logger, now })` を完成させてください。返り値は `http.createServer` に渡す関数です。

```js
import http from 'node:http';
import { createApp, HttpError } from './app.mjs';

const server = http.createServer(createApp(async (req, res) => {
  if (req.method !== 'GET') throw new HttpError(405, 'このメソッドは使えません', { headers: { Allow: 'GET' } });
  res.end('ok');
}));
```

仕様:

1. **リクエスト ID**: 客が `X-Request-Id` ヘッダを付けてきて、それが英数字とハイフンだけの 1〜64 文字なら、それを使う。そうでなければ `crypto.randomUUID()` で作る。`req.id` に入れ、レスポンスの `X-Request-Id` ヘッダにも付ける
2. **例外**: ハンドラが同期で例外を投げても、async で失敗しても、サーバは止めない
   - `HttpError` で、ステータスが 400 番台なら、そのステータスと、`err.headers` のヘッダで、`{ "error": メッセージ, "requestId": ID }` の JSON を返す。エラーのログ（`logger.error`）には書かない（客の間違いなので）
   - それ以外（`HttpError` の 500 番台も含む）は、`logger.error` に中身を書き、客には 500 と `{ "error": "Internal Server Error", "requestId": ID }` を返す。**メッセージを見せない**
   - JSON は `Content-Type: application/json; charset=utf-8` で、`Content-Length` はバイト数
   - ヘッダを送った後の失敗なら、接続を切る（`res.destroy()`）
3. **アクセスログ**: レスポンスが閉じたときに、`logger.info` に1行で `メソッド URL ステータス 時間ms ID` を書く（例: `POST /items?x=1 201 42ms 6f1c...`）。時間は `now()`（既定は `performance.now()`）の差を四捨五入したもの。最後まで返す前に客が切ったら、ステータスの代わりに `aborted` と書く

```sh
$ node --test app.test.mjs
```

最初は 9 個のテストがすべて失敗します。すべて通れば完成です。

考えてみてください: なぜ、客が送ってきた `X-Request-Id` を、確かめずにそのまま使ってはいけないのでしょう（ヒント: その値はアクセスログの1行に書かれます。スペースや、`200 1ms` のような文字が入っていたら？ 1万文字だったら？）。

## 問題4 返し方の部品

本文6節の部品を [send.mjs](send.mjs) に作ります。第18章からは、この部品を使います。

| 関数 | すること |
| --- | --- |
| `sendText(res, status, text, headers?)` | `Content-Type: text/plain; charset=utf-8` |
| `sendHtml(res, status, html, headers?)` | `Content-Type: text/html; charset=utf-8` |
| `sendJson(res, status, value, headers?)` | `Content-Type: application/json; charset=utf-8`。`JSON.stringify` できない値（`undefined` など）なら `TypeError` を投げる |
| `redirect(res, location, status = 302)` | `Location` ヘッダ。ステータスが 301・302・303・307・308 でなければ `RangeError` を投げる |
| `noContent(res, headers?)` | 204 |

共通の決まり:

- `Content-Length` は**バイト数**
- `headers` で渡されたヘッダも付ける
- 204 と 304 のときは、本文も `Content-Type` も `Content-Length` も付けない
- HEAD のリクエストには、GET と同じ `Content-Length` を付け、本文は送らない（`res.req` で、そのレスポンスのリクエストを見られます）
- ヘッダを全部決めてから、`end` を1回だけ呼ぶ

`sendText` だけ書いてありますが、まちがいが2つあります。

```sh
$ node --test send.test.mjs
```

最初は 9 個のうち 8 個が失敗します（HEAD のテストは、たまたま通ります）。すべて通れば完成です。

## 問題5 SIGTERM で安全に止まるサーバ

[graceful-server.mjs](graceful-server.mjs) に、SIGTERM と SIGINT を受け取ったときの処理を書いてください。サーバには3つのパスがあります。

| パス | すること |
| --- | --- |
| `/` | すぐに返す |
| `/slow` | 1 秒かけて返す |
| `/hang` | 返さない（終わらない処理のつもり） |

また、10 秒ごとにログを書く `setInterval` が動いています。

仕様（本文7節）:

1. シグナルを受け取ったら、新しい接続を受け付けるのをやめる
2. 処理中のリクエストは最後まで返し、すべて終わったら**終了コード 0** で自然に終わる（`process.exit()` は使わない）
3. keep-alive の接続が開いたままでも、待たずに終わる。止め始めた後に返事を終えた接続も同じ
4. 環境変数 `SHUTDOWN_TIMEOUT_MS`（既定 3000）だけ待っても終わらなければ、残りの接続を切って**終了コード 1** で終わる
5. 止めている途中にもう一度シグナルが来たら、すぐに**終了コード 1** で終わる

```sh
$ bash check-shutdown.sh
```

確認スクリプトは、`SHUTDOWN_TIMEOUT_MS=1000` でサーバを5回起動し、いろいろな状況で SIGTERM を送ります。何も書いていない状態では、15 個のうち 9 個が失敗します（SIGTERM の既定の動きで、すぐに終わるため。終了コードは 143）。すべて通れば完成です。

ヒント: `server.close()` を呼んだのにプロセスが終わらないときは、「まだ何が残っているか」を考えてください。接続だけでなく、タイマーも「残っているもの」です。
