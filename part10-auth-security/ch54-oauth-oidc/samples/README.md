# 第54章 サンプル

本文の「手を動かす」で書くプログラムの完成形です。うまく動かないときは、自分で書いたものと比べてください。動かすときは、章のフォルダ（`~/dev/part10/ch54-oauth-oidc`）で `node samples/○○.ts` と打ちます。先に、別のターミナルで練習用の IdP（`~/dev/part10` で `npm run idp`）を動かしておきます。

| ファイル | 本文の節 | ポート | 中身 |
| --- | --- | --- | --- |
| [pkce.ts](pkce.ts) | 3.1 | （9640 の URL を作る） | `state`・`nonce`・PKCE の値と、ログインのリンクを作る |
| [exchange.ts](exchange.ts) | 3.3 | （9640 に送る） | コードをトークンに取り替え、ID トークンの中身を見る |
| [id-token.ts](id-token.ts) | 4.1 | （9640 の JWKS を読む） | `fetchJwks`・`verifyIdToken`（RS256 と JWKS） |
| [oidc-client.ts](oidc-client.ts) | 5.1 | 9647 | OpenID Connect でログインする Express のアプリ |
| [github-login.ts](github-login.ts) | 7 | 9647 | GitHub の OAuth App でログインする（GitHub への登録が要る。執筆の環境では型と ESLint だけを確かめた） |
| [tsconfig.json](tsconfig.json) | | | このフォルダを `npx tsc` で確かめる設定 |

```sh
$ cd ~/dev/part10/ch54-oauth-oidc
$ node samples/pkce.ts
$ node samples/exchange.ts コード verifier
$ node samples/id-token.ts ID トークン nonce
$ node samples/oidc-client.ts       # Ctrl+C で止める
```

`oidc-client.ts` と `github-login.ts` は同じポートを使うので、同時には動かせません。
