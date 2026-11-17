# src — API のコード

第26章 9節の形です。第7部で、すべて `.ts` にし、`types.ts` と `express.d.ts` を足しました。第10部で、ユーザー・ログイン・メール・練習用の IdP を足し、タスクを人ごとにしました（`auth/`・`session.d.ts` と、各フォルダの第10部の行）。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [server.ts](server.ts) | 起動（コンポジションルート）。設定を読み、データベースにつないでマイグレーションを動かし、部品を作ってつなぎ、`listen` し、SIGTERM で止める（プールも閉じる）。第10部: ユーザー・セッション・メール・IdP を作り、リクエストごとに「その人のサービス」を作る `serviceFor(req)` と、人ごとのハブを作る |
| [app.ts](app.ts) | `createApp({ serviceFor, sse, logger, config, isReady, idempotencyStore, auth, users, sessionStore, oidc })`。ミドルウェアの順番を決める。`listen` はしない。第10部: helmet・CSRF（`requireSameOrigin`）・セッション・`/api/auth` を足し、`/api/tasks` と `/api/events` の前に `requireUser` を置いた |
| [config.ts](config.ts) | `loadConfig(env)`。環境変数を zod で確かめる（第26章 練習問題5に、成果物の設定と、第6部のデータベースの設定を足した）。第10部: `APP_URL`・メール・IdP（3つそろえる）・ログインの回数の上限・セッションの期限を足した |
| [types.ts](types.ts) | 第7部: タスクと、層と層の間でやりとりする形の型（`Task`・`Status`・`Sort`・`interface TaskRepo`・`interface IdempotencyStore` など）。ほかのファイルを import しない |
| [express.d.ts](express.d.ts) | 第7部: Express の `Request` に `id` と `log` を足す（宣言のマージ。第37章 5.2節）。第10部: `user`（ログインしている人）を足した |
| [session.d.ts](session.d.ts) | 第10部: `req.session` に `userId` と `oidc`（IdP でのログインの途中だけ覚える値）を足す（第52章 2節） |
| [auth/](auth/) | 第10部: 章で作ったログインの部品（パスワード・決まり・トークン・メール・OIDC）と、セッションを PostgreSQL に置く `PgSessionStore` |
| [db/](db/) | 第6部: PostgreSQL のプールと、マイグレーションを動かす部品 |
| [errors.ts](errors.ts) | サービスの層のエラー。HTTP のステータスは知らない |
| [routes/](routes/) | ルートの層。HTTP を読み、サービスを呼び、応答の形にする |
| [services/](services/) | サービスの層。タスクの決まり |
| [repositories/](repositories/) | データの層。どう覚えるか（第6部から PostgreSQL） |
| [middleware/](middleware/) | Express のミドルウェア（エラー、ログ、回数の上限、冪等キー。第10部: ログインしている人だけを通す・CSRF への備え） |
| [lib/](lib/) | Express にも HTTP にも頼らない部品 |

層の向きは、`routes` → `services` → `repositories` の一方向です。`services` は Express も zod も `import` しません。どの層も、形は `types.ts` から `import type` します。
