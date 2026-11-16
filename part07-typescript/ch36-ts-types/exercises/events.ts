// 練習問題2: タスクのイベント（判別できるユニオン）を扱う2つの関数を書いてください。要件は README にあります。
// 確かめ方: node --test events.test.ts

export type Task = { id: number; title: string; done: boolean };

export type TaskEvent =
  | { type: 'created'; task: Task }
  | { type: 'renamed'; id: number; title: string }
  | { type: 'completed'; id: number }
  | { type: 'deleted'; id: number };

export function eventText(e: TaskEvent): string {
  throw new Error('まだ書いていません');
}

export function applyEvent(tasks: Task[], e: TaskEvent): Task[] {
  throw new Error('まだ書いていません');
}

export function assertNever(x: never): never {
  throw new Error(`知らないイベントです: ${JSON.stringify(x)}`);
}
