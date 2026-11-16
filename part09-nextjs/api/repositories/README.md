# repositories — メモリのデータの層

| ファイル | 中身 |
| --- | --- |
| [memory-tasks.ts](memory-tasks.ts) | `createMemoryTaskRepo(): TaskRepo`。タスクを `Map` に置く。並べ方・締め切りの無いもの（null）の位置・ページ分けは、第7部の PostgreSQL 版（`pg-tasks.ts`）と同じ順になるようにした |

第7部の成果物 5節の「メモリのデータの層を書き直す」の例でもあります。`TaskRepo` に合わせたので、`server.ts` の1行で、PostgreSQL のものと取り替えられます。
