# src — API のコード

第26章 9節の形です。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [server.mjs](server.mjs) | 起動（コンポジションルート）。設定を読み、部品を作ってつなぎ、`listen` し、SIGTERM で止める |
| [app.mjs](app.mjs) | `createApp({ service, sse, logger, config, isReady })`。ミドルウェアの順番を決める。`listen` はしない |
| [config.mjs](config.mjs) | `loadConfig(env)`。環境変数を zod で確かめる（第26章 練習問題2に、成果物の設定を足した） |
| [errors.mjs](errors.mjs) | サービスの層のエラー。HTTP のステータスは知らない |
| [routes/](routes/) | ルートの層。HTTP を読み、サービスを呼び、応答の形にする |
| [services/](services/) | サービスの層。タスクの決まり |
| [repositories/](repositories/) | データの層。どう覚えるか |
| [middleware/](middleware/) | Express のミドルウェア（エラー、ログ、回数の上限、冪等キー） |
| [lib/](lib/) | Express にも HTTP にも頼らない部品 |

層の向きは、`routes` → `services` → `repositories` の一方向です。`services` は Express も zod も `import` しません。
