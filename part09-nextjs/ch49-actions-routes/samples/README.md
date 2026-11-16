# 第49章 サンプル

本文の「手を動かす」で作るアプリ `web/` の完成形です。第48章の `web/` に、この章のものを足しました。

| ファイル | 本文の節 | 中身 |
| --- | --- | --- |
| [web/app/api/health/route.ts](web/app/api/health/route.ts) | 2.1 | `GET /api/health` |
| [web/lib/status.ts](web/lib/status.ts)・[web/lib/api.ts](web/lib/api.ts) | 2.2 | 状態の名前と、API を読む・書き換える関数 |
| [web/app/api/tasks/route.ts](web/app/api/tasks/route.ts) | 2.3 | `GET`・`POST /api/tasks`（BFF） |
| [web/app/api/tasks/[id]/route.ts](web/app/api/tasks/%5Bid%5D/route.ts) | 2.4 | `GET /api/tasks/1` |
| [web/app/tasks/actions.ts](web/app/tasks/actions.ts) | 3 | Server Action（作る・状態を変える・消す） |
| [web/components/TaskForm.tsx](web/components/TaskForm.tsx)・[web/app/tasks/new/page.tsx](web/app/tasks/new/page.tsx) | 3.2 | タスクを作るフォームと `/tasks/new` |
| [web/app/tasks/[id]/page.tsx](web/app/tasks/%5Bid%5D/page.tsx) | 3.3 | 消すフォーム（`bind`） |
| [web/components/StatusButtons.tsx](web/components/StatusButtons.tsx) | 3.4 | 状態を変えるボタン（`useOptimistic`） |
| [web/app/api/events/route.ts](web/app/api/events/route.ts)・[web/components/LiveRefresh.tsx](web/components/LiveRefresh.tsx)・[web/app/layout.tsx](web/app/layout.tsx) | 5 | SSE の中継と、知らせで作り直す部品 |
| ほかのファイル | 第47・48章 | 第48章のまま（`app/tasks/page.tsx` には「新しいタスク」のリンクを足した） |

## 動かし方

```sh
# 1つ目のターミナル
$ cd ~/dev/part09
$ npm run api

# 2つ目のターミナル
$ cd ~/dev/part09/ch49-actions-routes/samples/web
$ npx next dev -p 9530        # http://localhost:9530/tasks
```
