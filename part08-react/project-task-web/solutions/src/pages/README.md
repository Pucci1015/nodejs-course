# src/pages — 第8部の成果物の完成例

完成例の全体は [../../README.md](../../README.md) にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [ErrorPage.tsx](ErrorPage.tsx) | 描くときに投げられた失敗を受け止める（第44章 2.3節）。ここに来るのはバグなので、中身は見せない |
| [NewTaskPage.tsx](NewTaskPage.tsx) | 新しいタスク（/tasks/new）。作れたら、そのタスクの画面へ |
| [NotFoundPage.tsx](NotFoundPage.tsx) | どの URL にも合わないとき・タスクが無いとき |
| [TaskDetailPage.tsx](TaskDetailPage.tsx) | 1つのタスク（/tasks/:id）。状態を変える・題名と締め切りを直す・消す |
| [TaskListPage.tsx](TaskListPage.tsx) | 一覧（/）。条件は URL、データは TanStack Query、題名の絞り込みは読み込んだものの中から |
