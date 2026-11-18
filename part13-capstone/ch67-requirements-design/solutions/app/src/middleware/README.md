# src/middleware — ミドルウェア

| ファイル・フォルダ                     | 中身                                                                                           |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [problem.ts](problem.ts)               | エラーを problem+json（RFC 9457）にする。`HttpProblem`・`notFound`・`problemHandler`（第25章） |
| [domain-errors.ts](domain-errors.ts)   | サービスの層のエラーを HTTP のステータスに読み替える `mapDomainErrors`（第26章 3節）           |
| [request-logger.ts](request-logger.ts) | 応答の後に1行のログ（第26章 6節）                                                              |
| [rate-limit.ts](rate-limit.ts)         | 回数の上限（固定の窓。第24章 5節）                                                             |
| [require-user.ts](require-user.ts)     | ログインしている人だけを通し、`req.user` を入れる（第10部）                                    |
| [same-origin.ts](same-origin.ts)       | 書き換えのリクエストを、画面のオリジンからのものだけにする（CSRF への備え。第52章 4節）        |
