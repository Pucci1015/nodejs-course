# src/routes — ルートの層

| ファイル | 中身 |
| --- | --- |
| [tasks.ts](tasks.ts) | `createTasksRouter({ service, cursorSecret, idempotencyStore })`（`/api/tasks` の5つと 405）と、`mapDomainErrors()`（サービスのエラーを HTTP のステータスにする）。第26章 練習問題8に、ページ分け・ETag・冪等キーを足した。第6部で、一覧はカーソルを読んで1ページ分だけをサービスに頼むようにした |
| [list-query.ts](list-query.ts) | `parseListQuery`。一覧のクエリを zod で確かめる（第25章 練習問題6） |

第7部で `.ts` にしました。`req.body`（`any`）は直接使わず、Zod の `parse` を通した後の値だけを使います。

ルートがすること: パスの id を数にする（形が違えば 404）、`Content-Type` を確かめる（415）、ボディとクエリの「形」を zod で確かめる、`If-Match` から客が見ていた版を決める、サービスを呼ぶ、ステータス・ヘッダ・JSON にする。

ルートがしないこと: 題名の長さ、締め切り、`doing` の数などの決まり（サービスがする）。
