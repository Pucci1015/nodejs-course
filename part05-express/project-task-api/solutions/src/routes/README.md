# src/routes — ルートの層

| ファイル | 中身 |
| --- | --- |
| [tasks.mjs](tasks.mjs) | `createTasksRouter({ service, cursorSecret })`（`/api/tasks` の5つと 405）と、`mapDomainErrors()`（サービスのエラーを HTTP のステータスにする）。第26章 練習問題5に、ページ分け・ETag・冪等キーを足した |
| [list-query.mjs](list-query.mjs) | `parseListQuery`。一覧のクエリを zod で確かめる（第25章 練習問題4） |

ルートがすること: パスの id を数にする（形が違えば 404）、`Content-Type` を確かめる（415）、ボディとクエリの「形」を zod で確かめる、`If-Match` から客が見ていた版を決める、サービスを呼ぶ、ステータス・ヘッダ・JSON にする。

ルートがしないこと: 題名の長さ、締め切り、`doing` の数などの決まり（サービスがする）。
