// 練習問題5: 「無いかもしれない」を正しく扱う4つの関数を書いてください。要件は README にあります。
// 型は、もう書いてあります。! と as は使いません。
// 確かめ方: node --test find.test.ts

export type Task = { id: number; title: string; done: boolean; dueDate?: string };

export function findTask(tasks: Task[], id: number): Task | undefined {
  throw new Error('まだ書いていません');
}

export function titleOf(tasks: Task[], id: number): string {
  throw new Error('まだ書いていません');
}

export function lastTitle(tasks: Task[]): string | undefined {
  throw new Error('まだ書いていません');
}

export function nextDue(tasks: Task[]): string | null {
  throw new Error('まだ書いていません');
}
