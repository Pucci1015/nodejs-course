# 運用の手順（runbook）

公開した後で、動かす人（未来の自分を含む）が、慌てずに同じ手順をたどれるように書いておきます。コマンドは、どれも手元の `docker compose -f compose.prod.yaml` で一度ためしてあります（Render の画面の操作は、執筆の環境からは確かめていません。必ず公式で確認してください）。

## 1. 置き場所の一覧

| もの           | 本番（例）                                        | 手元で同じ形を動かす                                    |
| -------------- | ------------------------------------------------- | ------------------------------------------------------- |
| API と画面     | Render の Web Service `room-booking`              | `compose.prod.yaml` の `app`（http://127.0.0.1:9913）   |
| ワーカー       | Render の Background Worker `room-booking-worker` | `compose.prod.yaml` の `worker`                         |
| PostgreSQL     | Render Postgres `room-booking-db`                 | `db`（外には出さない）                                  |
| Redis          | Render Key Value `room-booking-redis`             | `redis`（外には出さない）                               |
| メール         | メールの送信サービス（SMTP）                      | `mail`（偽の SMTP。http://127.0.0.1:9911/api/messages） |
| 設定と秘密の値 | Render の環境変数（`render.yaml` と画面）         | `compose.prod.yaml` の `x-app-env`（開発用の仮の値）    |

## 2. デプロイする

ふだんは何もしません。`main` にマージすると、`.github/workflows/deploy.yml` が次の順に動きます。

1. `check`: API と画面の `npm run check`、`docker build`
2. `deploy`: Render のデプロイフックを呼ぶ（API とワーカー）
3. Render が新しいイメージを作り、`preDeployCommand`（`node src/db/migrate.ts`）でマイグレーションを動かす
4. `/readyz` が 200 になってから、新しい版に客を回す
5. `scripts/wait-for-version.ts` が、`/version` が新しいコミットになるまで待つ

確かめる: `curl -fsS https://rooms.example.com/version` の `version` が、マージしたコミットになっている。

## 3. 戻す

新しい版で困ったことが起きたら、まず前の版に戻してから、原因を探します。

| 場合                       | 手順                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| コードだけの変更           | Render のダッシュボードの Deploys で、前のデプロイの「Rollback」。または `git revert` して `main` にマージ    |
| マイグレーションを含む変更 | マイグレーションは戻さない（`down` は書いていない）。前の版のコードでも動くように、列は「足すだけ」にしてある |

このアプリのマイグレーション（002〜004）は、どれも表や列を**足すだけ**です。前の版のコードは新しい列を読まないので、そのまま動きます（第62章 6節）。

## 4. 管理者を足す・外す

画面からは決められません。サーバでスクリプトを動かします（第68章 2節）。その人が先に画面から登録しておく必要があります。

```sh
# 手元の compose.prod.yaml
$ docker compose -f compose.prod.yaml exec app node scripts/grant-admin.ts alice@example.com
alice@example.com を admin にしました
$ docker compose -f compose.prod.yaml exec app node scripts/grant-admin.ts alice@example.com --revoke
alice@example.com を member にしました
```

本番では、Render の `room-booking` の Shell で `node scripts/grant-admin.ts alice@example.com` を動かします。

## 5. 困ったとき

| 症状                               | まず見るところ                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| 画面が開かない                     | `/healthz`（プロセスが動いているか）と `/readyz`（DB・Redis につながるか）。ダッシュボードのログ |
| API が 500 を返す                  | 応答の `errorId` で、ログを探す（第66章 2節）。利用者には `errorId` だけを聞く                   |
| 予約が入らない（409 が多い）       | 本当に重なっている（EXCLUDE 制約）か、10 件の上限か。`problem` の `detail` を見る                |
| ほかの人の予約が画面に出ない       | `/metrics` の `sse_connections`。Redis の Pub/Sub（`<QUEUE_PREFIX>:events`）が動いているか       |
| リマインドが届かない               | ワーカーが動いているか。`reminder_log` にその日の行があるか（あれば送ったことになっている）      |
| 管理者の取り消しのメールが届かない | ワーカーのログの `send-mail`。5xx（宛先が無いなど）は再試行しない                                |

リマインドをもう一度送りたいとき（ワーカーが止まっていた日など）は、`reminder_log` から、その日の行を消してから、仕事を入れ直します。消さずに入れ直しても、2通目は送りません（第69章 4節）。

## 6. 定期的にすること

| いつ     | すること                                                                |
| -------- | ----------------------------------------------------------------------- |
| 毎週     | Dependabot のプルリクエストを見る（CI が通ったものからマージ）          |
| 毎月     | `npm audit --omit=dev` の結果、Render の請求、ディスクの使用量          |
| 鍵の漏れ | `SESSION_SECRET` を取り替える（全員がログインし直しになる。第60章 6節） |
