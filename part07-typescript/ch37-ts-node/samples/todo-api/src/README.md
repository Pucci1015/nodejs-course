# todo-api/src

| ファイル | 中身 | 本文の節 |
| --- | --- | --- |
| [task.ts](task.ts) | `Status`・`Task`・`NewTask` の型と、データの層の形 `interface TaskRepo` | 4.1 |
| [memory-repo.ts](memory-repo.ts) | `TaskRepo` をメモリで作る `createMemoryTaskRepo` | 4.2 |
| [app.ts](app.ts) | Express のアプリ（ハンドラの型・`HttpError`・エラーのミドルウェア） | 5.1 |
| [express.d.ts](express.d.ts) | 宣言のマージで、Express の Request に `id` を足す | 5.2 |
| [server.ts](server.ts) | ポート 9477 で待つ | 5.3 |
