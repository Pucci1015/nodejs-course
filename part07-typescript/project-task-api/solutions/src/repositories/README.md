# src/repositories — データの層

| ファイル | 中身 |
| --- | --- |
| [pg-tasks.ts](pg-tasks.ts) | `createPgTaskRepo(pool)`。タスクを PostgreSQL の表 `tasks` に置く。第32章 8.2節の `pg-task-repo.mjs` から始めた |
| [pg-idempotency.ts](pg-idempotency.ts) | `createPgIdempotencyStore(pool)`。Idempotency-Key で覚えた応答を、表 `idempotency_keys` に置く |

第7部: どちらも、戻り値の型（`TaskRepo`・`IdempotencyStore`。[../types.ts](../types.ts)）を書いて、形が合っているかを `tsc` に確かめさせます。表の行には `TaskRow` の型を付けるだけです（自分のマイグレーションで作った表なので）。ただし、`idempotency_keys` の `response` 列（JSON）は、Zod で確かめてから使います。

`createPgTaskRepo` のメソッド:

| メソッド | SQL | 使う所 |
| --- | --- | --- |
| `listPage({ statuses, dueBefore, sort, limit, after })` | `WHERE status = ANY($1) AND due_date < $2 AND (並べる値, id) が after より後ろ ORDER BY … , id LIMIT limit + 1` | 一覧（キーセット・ページネーション。第30章 6節） |
| `get(id)` | `SELECT … WHERE id = $1` | 1件・変える前の確かめ |
| `findOpenByTitle(title, exceptId)` | `WHERE status <> 'done' AND title = $1` | 題名が重ならないか |
| `countByStatus(status)` | `SELECT count(*)::int …` | 作業中の数（WIP 制限） |
| `insert(fields)` | `INSERT … RETURNING *` | 作る |
| `update(id, fields, { expectedVersion })` | `UPDATE … WHERE id = $n AND version = $m RETURNING *` | 変える（版が違えば `null`） |
| `remove(id, { expectedVersion })` | `DELETE … WHERE id = $1 AND version = $2` | 消す |

- 第5部の `memory-tasks.mjs`（`Map` に覚える）は、第6部で消しました。`list` で全部を読む代わりに、サービスが必要な問い合わせ（`listPage`・`findOpenByTitle`・`countByStatus`）を足したためです。
- 終わっていないタスクの題名は、サービスも確かめますが、同時に2つ来たときは、部分ユニークインデックス `tasks_open_title` で止まります。そのエラー（23505）は、ここでサービスの言葉の `ConflictError` に読み替えます。
- `title` で並べるときは `COLLATE "C"`（文字の番号の順）にしています。データベースの決まりの並べ方（言語ごとの辞書の順）だと、第5部の JavaScript の並べ方と順番が変わることがあるためです。
