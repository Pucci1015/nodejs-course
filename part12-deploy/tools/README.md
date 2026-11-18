# 第12部の道具（tools/）

第12部の章と成果物で使う、練習用の小さなサーバです。どれも、この Mac の中（`127.0.0.1`）だけで動き、外とはつながりません。中身は読まなくてかまいません（外から見た動きを、章の本文で確かめます）。

| ファイル | 中身 | 動かし方（`~/dev/part12` で） | 使う章 |
| --- | --- | --- | --- |
| [mini-s3.ts](mini-s3.ts) | 練習用の S3 互換のサーバ。Amazon S3 の API のうち、バケット・オブジェクトの置く・取り出す・一覧・消すと、AWS 署名バージョン4（ヘッダと署名付き URL）だけを持つ。既定ではメモリに覚え、`S3_DIR` を付けるとフォルダに保存する | `npm run s3` → `http://127.0.0.1:9800`（アクセスキー `dev-only-access-key`、シークレット `dev-only-secret-key`、バケット `task-files`・`demo`） | 第63章、第65章、成果物 |
| [fake-smtp.ts](fake-smtp.ts) | 第10部 第53章の練習用の SMTP サーバのコピー。受け取ったメールをメモリに覚え、HTTP で JSON にして見せる。どこへも送らない | `npm run mail` → SMTP `127.0.0.1:1025`、受け取ったメール `http://127.0.0.1:8025/api/messages` | 第64章、成果物 |
| [mini-cdn.ts](mini-cdn.ts) | 練習用の小さな CDN（共有キャッシュつきのリバースプロキシ）。`Cache-Control` の `s-maxage`・`max-age`・`no-cache`・`stale-while-revalidate`・`private`・`no-store`、`Vary`、ETag での確かめ直し、同時の取りに行きをまとめる、`Cache-Tag` の印で消す、だけを持つ。応答に `X-Cache`（HIT・MISS・STALE・REVALIDATED・COLLAPSED・PASS）と `Age` を付ける | `npm run cdn` → `http://127.0.0.1:9858`（オリジン `http://127.0.0.1:9857`、`ORIGIN`・`PORT` で変えられる）。消す API は `POST /__purge`（`Authorization: Bearer dev-only-purge-token`）、中身は `GET /__cache` | 第65章 |
| [tsconfig.json](tsconfig.json) | これらを `npx tsc` で確かめるための設定（部の `tsconfig.base.json` を使う） | — | — |

- 本物の S3 互換のストレージには、Amazon S3、Cloudflare R2 などのクラウドのサービスと、自分で動かす MinIO・SeaweedFS・Garage などがあります（第63章 9節）。`mini-s3.ts` は、Docker も外のサービスも無しで、同じ SDK のコードを動かすために用意しました
- 本番では、こういうものを自分で作らず、実績のあるサービスを使います
- 成果物のテストは、`mini-s3.ts` と `fake-smtp.ts` のコピー（`project-task-deploy/solutions/test/support/`）を、テストの中で空いているポートに起動して使います
