# src/middleware — Express のミドルウェア

第7部で `.ts` にしました。`problemHandler` が受け取る `err` は `unknown` なので、`status` などの項目は、オブジェクトかどうかを確かめてから読みます（`prop()`）。

| ファイル | 元 | 中身 |
| --- | --- | --- |
| [problem.ts](problem.ts) | 第25章 練習問題5（`part05-express/lib/problem.mjs`） | `HttpProblem`・`notFound`・`problemHandler`。エラーを problem+json にする。500 のログを `req.log` に書くように変えた |
| [request-logger.ts](request-logger.ts) | 第26章 練習問題7 | `requestLogger`。応答の後に1行の JSON のログ。`X-Request-Id` |
| [rate-limit.ts](rate-limit.ts) | 第24章 練習問題5 | `rateLimit`。固定の窓で回数を数える。429 を problem+json にした。数はメモリに置いたまま（Redis に置くなら第34章 練習問題8） |
| [idempotency.ts](idempotency.ts) | 第25章 8節のサンプル | `createIdempotencyStore`・`idempotency`。覚える時間と数の上限、`Location`・`ETag` も覚えるようにした。**第6部で、store を async にし、「無ければ自分のものにする」を `claim` の1回にした**（データベースの store は、第7部の成果物の `repositories/pg-idempotency.ts`。この練習用の API はメモリの store を使う） |
