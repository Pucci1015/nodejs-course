# 第52章 サンプル

本文の「手を動かす」で書くプログラムの完成形です。うまく動かないときは、自分で書いたものと比べてください。動かすときは、章のフォルダ（`~/dev/part10/ch52-session-token`）で `node samples/○○.ts` と打ちます。サーバのサンプルは、どれもポート 9627 を使うので、1つずつ動かします。

| ファイル | 本文の節 | ポート | 中身 |
| --- | --- | --- | --- |
| [password.ts](password.ts) | 2.1 | | 第51章 3節の `hashPassword`・`verifyPassword` のコピー |
| [session-app.ts](session-app.ts) | 2・3・4.1 | 9627 | express-session でログイン・`/api/me`・ログアウト。`requireAuth` |
| [same-origin.ts](same-origin.ts) | 5.2 | | `Origin` を確かめるミドルウェア `requireSameOrigin` |
| [csrf-check.ts](csrf-check.ts) | 5.2 | 9627 | `requireSameOrigin` を試す小さなアプリ |
| [jwt.ts](jwt.ts) | 6.1 | | `node:crypto` だけで作る HS256 の JWT（`signJwt`・`verifyJwt`） |
| [try-jwt.ts](try-jwt.ts) | 6.1・6.2 | | JWT を作り、中を読み、違う鍵・期限の後・書き換えを試す |
| [store-demo.ts](store-demo.ts) | 8.1 | 9627 | store を自分で持ち、ある人のセッションをすべて消す |
| [tsconfig.json](tsconfig.json) | | | このフォルダを `npx tsc` で確かめる設定 |

```sh
$ cd ~/dev/part10/ch52-session-token
$ node samples/try-jwt.ts
$ node samples/session-app.ts       # Ctrl+C で止める
```
