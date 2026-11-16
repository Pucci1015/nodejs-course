// 練習問題6: unknown の値が Task の形かを確かめる、型ガードの関数を書いてください。要件は README にあります。
// 型は書いてあります。as と any は使いません。
// 確かめ方: node --test guards.test.ts

export type Status = 'todo' | 'doing' | 'done';
export type Task = { id: number; title: string; status: Status; dueDate: string | null; tags: string[] };

export function isStatus(value: unknown): value is Status {
  throw new Error('まだ書いていません');
}

export function isTask(value: unknown): value is Task {
  throw new Error('まだ書いていません');
}

export function assertTask(value: unknown): asserts value is Task {
  throw new Error('まだ書いていません');
}

export function parseTasks(json: string): Task[] {
  throw new Error('まだ書いていません');
}
