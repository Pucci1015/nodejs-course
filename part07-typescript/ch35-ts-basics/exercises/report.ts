// 練習問題8（発展）: タスクのファイルを読んで、報告を出す CLI を書いてください。要件は README にあります。
// 確かめ方: node --test report.test.ts
// 動かし方: node report.ts tasks.txt 2026-11-11

export type Status = 'todo' | 'doing' | 'done';
export type Task = { id: number; title: string; status: Status; dueDate?: string };

export function parseLine(line) {
  throw new Error('まだ書いていません');
}

export function formatReport(tasks, today) {
  throw new Error('まだ書いていません');
}

if (import.meta.main) {
  // ここを書く: process.argv からファイル名と今日の日付を受け取り、読んで、報告を出す
}
