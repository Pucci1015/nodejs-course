# 第70章 練習問題4: 考えて答える

コードを書かずに、本文と [../../project-room-booking/solutions/](../../project-room-booking/solutions/) を読んで答えてください。答えは [../solutions/README.md](../solutions/README.md) の「問題4」にあります。

## (1) 手元の「本番の形」の NODE_ENV

`compose.prod.yaml` は、本番と同じイメージを使うのに `NODE_ENV: development` で動かしています。`production` に書き換えて `docker compose -f compose.prod.yaml up -d` すると、起動はします。ところが、ブラウザで http://127.0.0.1:9913 を開いてログインしようとすると、うまくいきません。何が起きているでしょうか。本番（Render）では、なぜ同じことが起きないのでしょうか。

## (2) ワーカーが app を待つ

`compose.prod.yaml` の `worker` は、`depends_on` で `app` が `service_healthy` になるのを待ちます。`db` と `redis` だけを待つように書き換えると、データベースが空のとき（`down -v` の後の初めての `up`）に、何が起きうるでしょうか。マイグレーションを、だれがいつ動かしているかに注目して答えてください。

## (3) 2つのヘルスチェック

`render.yaml` の `healthCheckPath` は `/readyz`（データベースと Redis につながるか）、Dockerfile の `HEALTHCHECK` は `/healthz`（プロセスが応答するか）です。逆にして、Dockerfile の `HEALTHCHECK` を `/readyz` にすると、データベースが 5 分止まったときに何が起きるでしょうか。`restart: unless-stopped` と合わせて考えてください。

## (4) push しただけではデプロイしない

`render.yaml` は `autoDeployTrigger: 'off'` にして、`deploy.yml` が `npm run check` の後でデプロイフックを呼びます。Render の自動のデプロイ（push のたび）に任せた場合と比べて、何が防げるでしょうか。また、デプロイフックの URL を `deploy.yml` に直接書かず Secrets に置くのはなぜでしょうか。

## (5) 列の名前を変えたい

「予約の題名（`title`）を、`subject` という名前にしたい」と言われました。マイグレーション 005 に `ALTER TABLE bookings RENAME COLUMN title TO subject;` と書いてデプロイすると、どの瞬間に、何が壊れるでしょうか（Render は、新しい版に客を回す前に `preDeployCommand` でマイグレーションを動かします）。運用の手順（`docs/runbook.md` 3節）の「足すだけ」を守りながら名前を変えるには、何回のデプロイに分けて、それぞれ何をすればよいでしょうか。
