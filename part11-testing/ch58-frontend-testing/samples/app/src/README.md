# 第58章 練習用の画面のソース（samples/app/src）

| ファイル | 中身 |
| --- | --- |
| [main.tsx](main.tsx)・[App.tsx](App.tsx)・[app.css](app.css) | 画面の入り口（`QueryClient` を1つ作る） |
| [api.ts](api.ts) | API を呼ぶ関数と `ApiError` |
| [TaskItem.tsx](TaskItem.tsx) | タスク1つの行 |
| [AddTaskForm.tsx](AddTaskForm.tsx) | タスクを足すフォーム |
| [TaskListPanel.tsx](TaskListPanel.tsx) | 一覧を読み、足す・切り替える・消す |
| [useDebouncedValue.ts](useDebouncedValue.ts) | 値が変わってから少し待つフック |

本文で書くテスト（`*.test.tsx`）は、`web/src/` に作ります。完成形は [../../finished/src/](../../finished/src/) です。
