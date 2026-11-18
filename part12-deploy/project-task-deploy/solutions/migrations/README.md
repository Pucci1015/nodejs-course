# migrations — マイグレーションの SQL

`src/db/migrate.ts` が、名前の順に、まだのものだけを動かします（済んだものは表 `schema_migrations` に、ファイルの中身のチェックサムと一緒に覚えます）。サーバの起動のときにも動きます。

| ファイル                                                           | すること                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [001_create_tasks.sql](001_create_tasks.sql)                       | 表 `tasks`、題名の部分ユニークインデックス `tasks_open_title`、並べ方ごとの索引                                                                                                                                                                                             |
| [002_create_idempotency_keys.sql](002_create_idempotency_keys.sql) | 表 `idempotency_keys`（Idempotency-Key で覚えた応答）                                                                                                                                                                                                                       |
| [003_create_users.sql](003_create_users.sql)                       | 第10部: 表 `users`（アドレスは小文字だけ・一意）、`user_identities`（外のログイン。`(issuer, subject)` が主キー）、`email_tokens`（メールのトークンのハッシュ・使い道・期限）、`sessions`（express-session のセッション。`user_id` の列で、その人のセッションを全部消せる） |
| [004_add_task_owner.sql](004_add_task_owner.sql)                   | 第10部: `tasks` に `owner_id`（`users` への外部キー、`ON DELETE CASCADE`）を足す。**今あるタスクと冪等キーは消す**（持ち主を決められないため）。題名の部分ユニークインデックスと並べ方の索引を、`owner_id` から始まるものに作り直す                                         |

| [005_create_attachments.sql](005_create_attachments.sql) | 第12部: 表 `attachments`（添付ファイル。中身はストレージに置き、ここには `object_key`（一意）・利用者が付けた名前・中身で決めた種類・大きさを書く）。`task_id` は `ON DELETE CASCADE`（タスクを消すと行も消え、中身は孤児の掃除が消す） |
| [006_create_digest_log.sql](006_create_digest_log.sql) | 第12部: 表 `digest_log`（毎朝のお知らせを送った人と日。主キー `(user_id, day)` で、1人1日1通にする） |

- 一度動かしたファイルは、書き換えません。書き換えると、起動のときに「動かした後で書き換えられています」で止まります。直したいときは、`003_….sql` を足します（第32章 8.1節）。
- 番号は 3 桁で 0 を埋めます（`010_` でも順番が崩れないように）。
