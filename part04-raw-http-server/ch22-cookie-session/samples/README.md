# 第22章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [visits.mjs](visits.mjs) | 「手を動かす」の完成形。訪問回数を Cookie に入れる | 3 | 9226 |
| [my-session.mjs](my-session.mjs) | 「手を動かす」の完成形。Cookie には ID だけを入れ、中身は `Map` に置く。知らない ID は使わない | 4 | 9226 |
| [random-id.mjs](random-id.mjs) | 「手を動かす」の完成形。`Math.random`・`randomBytes(32)`・`randomUUID` を比べる（サーバは起動しない） | 4.1 | — |
| [my-sign.mjs](my-sign.mjs) | 「手を動かす」の完成形。HMAC で署名し、`timingSafeEqual` で確かめる（サーバは起動しない） | 5 | — |
| [cookie-basic.mjs](cookie-basic.mjs) | Cookie を読む `parseCookies`、書く `serializeCookie` の、いちばん簡単な版（練習問題5で、決まりを足した版を作る） | 3 | — |
| [cookie-demo.mjs](cookie-demo.mjs) | 訪問回数を Cookie に入れる。`HttpOnly` の有る無しで、ページの JavaScript から見えるかが変わる | 2, 3 | 9220 |
| [session-demo.mjs](session-demo.mjs) | Cookie にはランダムな ID だけを入れ、回数はサーバのメモリに置く | 4 | 9221 |
| [signed-demo.mjs](signed-demo.mjs) | HMAC で署名した値。鍵が違う・中身が違うと、確かめで通らない。中身は暗号化されていない | 5 | — |
| [login-demo.mjs](login-demo.mjs) | ログイン・ログアウト。パスワードのハッシュ、ログインで ID を作り直す、flash、CSRF トークン | 6〜8 | 9222 |

外部のパッケージは使わないので、`npm install` は不要です。`~/dev/part04/ch22-cookie-session/samples` で（`cd samples` で移ってから）、次のように動かします。`login-demo.mjs` は第17・18・20・21章の模範解答とサンプルを相対パスで読み込みます。

```sh
$ node cookie-demo.mjs    # ブラウザで http://127.0.0.1:9220/ を何度か開く
$ node session-demo.mjs   # ブラウザで http://127.0.0.1:9221/。シークレットウィンドウでも開いてみる
$ node signed-demo.mjs    # サーバは使わない。出力を読む
$ node login-demo.mjs     # ブラウザで http://127.0.0.1:9222/（alice / dev-only-password）
```

- Cookie は、DevTools の Application（Safari では「ストレージ」）→ Cookies で、値と属性（HttpOnly、SameSite、期限）を見られます
- ブラウザは、ポートが違っても同じホスト（`127.0.0.1`）の Cookie を区別しません。第2部・第3部のサンプルの Cookie が見えることがあります。気になるときは、Application の画面で消してください
- `login-demo.mjs` のユーザーとパスワードは、この練習のためのものです。本物のアプリでは、パスワードをコードに書きません
