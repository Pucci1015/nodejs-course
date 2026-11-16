// 練習問題5: ユーティリティ型で、Task から4つの型を作り、3つの関数を書いてください。要件は README にあります。
// 確かめ方: node --test task-types.test.ts

export type Status = 'todo' | 'doing' | 'done';

export type Task = {
  id: number;
  title: string;
  status: Status;
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
};

// ここに4つの型を書く（export を付ける）: NewTask・TaskPatch・TaskSummary・StatusCounts

export function applyPatch(task, patch, now) {
  throw new Error('まだ書いていません');
}

export function toSummary(task) {
  throw new Error('まだ書いていません');
}

export function countStatuses(tasks) {
  throw new Error('まだ書いていません');
}
