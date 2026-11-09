# layered — レイヤーに分けたタスク API（第26章 3・4節）

[../fat-route.mjs](../fat-route.mjs) と同じ「タスクを作る」を、3つの層に分けて書いたものです。

| ファイル | 層 | 知っていること | 知らないこと |
| --- | --- | --- | --- |
| [routes/tasks-routes.mjs](routes/tasks-routes.mjs) | ルート | HTTP（`req`・`res`・ステータス、ボディの形） | 仕事の決まり、データの置き場所 |
| [services/task-service.mjs](services/task-service.mjs) | サービス | 仕事の決まり（題名が重ならない、締め切り、上限） | HTTP、データの置き場所 |
| [repositories/memory-task-repo.mjs](repositories/memory-task-repo.mjs) | データ | どう覚えるか（ここではメモリの `Map`） | 仕事の決まり、HTTP |
| [errors.mjs](errors.mjs) | （サービスのエラー） | 「無い」「できない」「決まりに合わない」 | ステータスの番号 |
| [app.mjs](app.mjs) | 組み立て | 層をつなぎ、サービスのエラーをステータスにする | どの repo・clock を使うか |
| [server.mjs](server.mjs) | 起動 | 本物（メモリの repo、本物の時計）を選んで、`listen` する | — |
| [task-service.test.mjs](task-service.test.mjs) | テスト | サービスだけを、決めた時計で確かめる | — |

```sh
$ node server.mjs                  # 127.0.0.1:9331
$ node --test task-service.test.mjs
```

依存の向きは「ルート → サービス → データ」の一方向です。サービスは `express` も `zod` も import しません。
