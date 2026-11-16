# src/services — サービスの層

| ファイル | 中身 |
| --- | --- |
| [tasks.ts](tasks.ts) | `createTaskService({ repo, clock, maxDoing, timeZone, publish })`。第26章 練習問題6に、一覧の絞り込み、`expectedVersion`、`publish` を足した。第6部で、一覧（`listPage`）と、題名・作業中の数の確かめを、データの層の問い合わせに任せた |

第7部で `.ts` にしました。受け取るデータの層は `TaskRepo` 型なので、PostgreSQL のものでもメモリのものでも、形が合えば渡せます。

HTTP（ステータス、ヘッダ）も、SSE も、データの置き場所も知りません。受け取るのは、データの層（`repo`）、時計（`clock`）、「何が起きたか」を知らせる関数（`publish`）だけです。だから、テストでは偽物を渡せます。第6部でデータの層を替えたときに変えたのは、データの層に頼む問い合わせ（全部を読んで JavaScript で探す → `findOpenByTitle`・`countByStatus`・`listPage`）だけです。
