# 第10部の道具（tools/）

第10部の章と成果物で使う、練習用の小さなサーバです。どちらも、この Mac の中（`127.0.0.1`）だけで動き、外とはつながりません。中身は読まなくてかまいません（外から見た動きを、章の本文で確かめます）。

| ファイル | 中身 | 動かし方（`~/dev/part10` で） | 使う章 |
| --- | --- | --- | --- |
| [fake-smtp.ts](fake-smtp.ts) | 練習用の SMTP サーバ。受け取ったメールをメモリに覚え、HTTP で JSON にして見せる。どこへも送らない。`temp-fail@example.com` には 451、`no-such-user@example.com` には 550 を返す | `npm run mail` → SMTP `127.0.0.1:1025`、受け取ったメール `http://127.0.0.1:8025/api/messages` | 第53章、成果物 |
| [mini-idp.ts](mini-idp.ts) | 練習用の OpenID Connect の IdP。認可コードフロー + PKCE だけを持ち、ID トークンを RS256 で署名する。ユーザーは alice（メールアドレスは確認済み）と bob（確認されていない）。登録してあるアプリは `task-app`（`client_secret` は `dev-only-client-secret`） | `npm run idp` → `http://127.0.0.1:9640` | 第54章、成果物 |
| [tsconfig.json](tsconfig.json) | この2つを `npx tsc` で確かめるための設定（部の `tsconfig.base.json` を使う） | — | — |

- 本物のメールの確かめには Mailpit（部の [compose.yaml](../compose.yaml)。第53章 2.1節）も使えます。`fake-smtp.ts` は、Docker が無くても動かせるように用意したものです
- `mini-idp.ts` に登録してある戻り先（`redirect_uri`）は、第54章の「手を動かす」の `http://127.0.0.1:9647/auth/callback` と、成果物の画面の `http://localhost:5173/api/auth/idp/callback` です
- 本番では、こういうものを自分で作らず、実績のあるメール送信サービスや IdP を使います（第53章 8節、第54章 8節）
- 成果物のテストは、この2つのコピー（`project-task-auth/solutions/test/`）を、テストの中で空いているポートに起動して使います
