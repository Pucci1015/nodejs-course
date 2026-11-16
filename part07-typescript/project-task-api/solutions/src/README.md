# src — API のコード

第26章 9節の形です。第7部で、すべて `.ts` にし、`types.ts` と `express.d.ts` を足しました。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [server.ts](server.ts) | 起動（コンポジションルート）。設定を読み、データベースにつないでマイグレーションを動かし、部品を作ってつなぎ、`listen` し、SIGTERM で止める（プールも閉じる） |
| [app.ts](app.ts) | `createApp({ service, sse, logger, config, isReady, idempotencyStore })`。ミドルウェアの順番を決める。`listen` はしない |
| [config.ts](config.ts) | `loadConfig(env)`。環境変数を zod で確かめる（第26章 練習問題5に、成果物の設定と、第6部のデータベースの設定を足した） |
| [types.ts](types.ts) | 第7部: タスクと、層と層の間でやりとりする形の型（`Task`・`Status`・`Sort`・`interface TaskRepo`・`interface IdempotencyStore` など）。ほかのファイルを import しない |
| [express.d.ts](express.d.ts) | 第7部: Express の `Request` に `id` と `log` を足す（宣言のマージ。第37章 5.2節） |
| [db/](db/) | 第6部: PostgreSQL のプールと、マイグレーションを動かす部品 |
| [errors.ts](errors.ts) | サービスの層のエラー。HTTP のステータスは知らない |
| [routes/](routes/) | ルートの層。HTTP を読み、サービスを呼び、応答の形にする |
| [services/](services/) | サービスの層。タスクの決まり |
| [repositories/](repositories/) | データの層。どう覚えるか（第6部から PostgreSQL） |
| [middleware/](middleware/) | Express のミドルウェア（エラー、ログ、回数の上限、冪等キー） |
| [lib/](lib/) | Express にも HTTP にも頼らない部品 |

層の向きは、`routes` → `services` → `repositories` の一方向です。`services` は Express も zod も `import` しません。どの層も、形は `types.ts` から `import type` します。
