# src/repositories — データの層

| ファイル | 中身 |
| --- | --- |
| [memory-tasks.mjs](memory-tasks.mjs) | `createMemoryTaskRepo()`。`Map` に覚える。`update`・`remove` は `expectedVersion` を受け取り、今の版が同じときだけ変える |

`list`・`get`・`insert`・`update`・`remove` の5つの形を決めておき、第6部で PostgreSQL のものに取り替えます。`update` の `expectedVersion` は、SQL の `WHERE id = $1 AND version = $2` にあたります。
