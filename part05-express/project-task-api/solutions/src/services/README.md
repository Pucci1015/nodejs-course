# src/services — サービスの層

| ファイル | 中身 |
| --- | --- |
| [tasks.mjs](tasks.mjs) | `createTaskService({ repo, clock, maxDoing, timeZone, publish })`。第26章 練習問題6に、一覧の絞り込み、`expectedVersion`、`publish` を足した |

HTTP（ステータス、ヘッダ）も、SSE も、データの置き場所も知りません。受け取るのは、データの層（`repo`）、時計（`clock`）、「何が起きたか」を知らせる関数（`publish`）だけです。だから、テストでは偽物を渡せ、第6部でデータの層を替えても、ここは変わりません。
