# src — API のコード

第26章 9節の層の形です。層の向きは `routes` → `services` → `repositories` の一方向で、`services` は Express も zod も import しません。予約の決まり（時刻の計算など）は、どこにも頼らない純粋な関数として `domain/` に置きます（第67章）。

| ファイル・フォルダ             | 中身                                                                                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [server.ts](server.ts)         | 起動（コンポジションルート）。設定 → ログ → データベース（マイグレーション）→ Redis → 部品を作ってつなぐ → `listen` → SIGTERM で止める。どの実物（PostgreSQL・Redis・SMTP）を使うかを知っているのは、このファイルだけ |
| [worker.ts](worker.ts)         | ワーカーだけを動かすプロセス（`npm run worker`。`WORKER_MODE=separate` のとき）                                                                                                                                       |
| [app.ts](app.ts)               | `createApp(deps)`。ミドルウェアの順番を決め、ルートをつなぐ。`listen` はしない                                                                                                                                        |
| [config.ts](config.ts)         | `loadConfig(env)`。環境変数を zod で確かめる。本番で必須のものが足りなければ、名前を全部書いて止まる                                                                                                                  |
| [redis.ts](redis.ts)           | Redis の接続を作る `createRedis` と、URL のパスワードを隠す `redactRedisUrl`                                                                                                                                          |
| [errors.ts](errors.ts)         | サービスの層のエラー（`NotFoundError`・`ConflictError`・`ValidationError`）。HTTP のステータスは知らない                                                                                                              |
| [express.d.ts](express.d.ts)   | Express の `Request` に `id`・`log`・`user` を足す（宣言のマージ。第37章 5.2節）                                                                                                                                      |
| [session.d.ts](session.d.ts)   | `req.session` に `userId` と `oidc` を足す（第52章 2節）                                                                                                                                                              |
| [domain/](domain/)             | 第67章: 予約の決まり（時刻・枠・確かめ）。Express にもデータベースにも頼らない純粋な関数                                                                                                                              |
| [auth/](auth/)                 | ログインの部品（パスワード・決まり・トークン・メール・OIDC）と、セッションを PostgreSQL に置く `PgSessionStore`                                                                                                       |
| [db/](db/)                     | PostgreSQL のプールと、マイグレーションを動かす部品                                                                                                                                                                   |
| [jobs/](jobs/)                 | 後ろで動かす仕事（BullMQ）とワーカー                                                                                                                                                                                  |
| [lib/](lib/)                   | Express にも HTTP にも頼らない部品                                                                                                                                                                                    |
| [middleware/](middleware/)     | Express のミドルウェア                                                                                                                                                                                                |
| [repositories/](repositories/) | データの層（PostgreSQL）                                                                                                                                                                                              |
| [routes/](routes/)             | ルートの層。HTTP を読み、サービスを呼び、応答の形にする                                                                                                                                                               |
| [services/](services/)         | サービスの層。仕事の決まり                                                                                                                                                                                            |
