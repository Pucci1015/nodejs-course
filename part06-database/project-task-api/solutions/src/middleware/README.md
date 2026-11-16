# src/middleware — Express のミドルウェア

| ファイル | 元 | 中身 |
| --- | --- | --- |
| [problem.mjs](problem.mjs) | 第25章 練習問題5（`part05-express/lib/problem.mjs`） | `HttpProblem`・`notFound`・`problemHandler`。エラーを problem+json にする。500 のログを `req.log` に書くように変えた |
| [request-logger.mjs](request-logger.mjs) | 第26章 練習問題7 | `requestLogger`。応答の後に1行の JSON のログ。`X-Request-Id` |
| [rate-limit.mjs](rate-limit.mjs) | 第24章 練習問題5 | `rateLimit`。固定の窓で回数を数える。429 を problem+json にした。数はメモリに置いたまま（Redis に置くなら第34章 練習問題8） |
| [idempotency.mjs](idempotency.mjs) | 第25章 8節のサンプル | `createIdempotencyStore`・`idempotency`。覚える時間と数の上限、`Location`・`ETag` も覚えるようにした。**第6部で、store を async にし、「無ければ自分のものにする」を `claim` の1回にした**（データベースの store は [../repositories/pg-idempotency.mjs](../repositories/pg-idempotency.mjs)） |
