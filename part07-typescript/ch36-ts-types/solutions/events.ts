// 練習問題2 の模範解答

export type Task = { id: number; title: string; done: boolean };

export type TaskEvent =
  | { type: 'created'; task: Task }
  | { type: 'renamed'; id: number; title: string }
  | { type: 'completed'; id: number }
  | { type: 'deleted'; id: number };

export function eventText(e: TaskEvent): string {
  switch (e.type) {
    case 'created':
      return `#${e.task.id} を作りました: ${e.task.title}`;
    case 'renamed':
      return `#${e.id} の題名を「${e.title}」にしました`;
    case 'completed':
      return `#${e.id} を完了にしました`;
    case 'deleted':
      return `#${e.id} を消しました`;
    default:
      return assertNever(e);
  }
}

export function applyEvent(tasks: Task[], e: TaskEvent): Task[] {
  switch (e.type) {
    case 'created':
      return [...tasks, e.task];
    case 'renamed':
      // map で新しい配列を作り、変えるタスクだけ ... で写して新しいオブジェクトにする
      return tasks.map((t) => (t.id === e.id ? { ...t, title: e.title } : t));
    case 'completed':
      return tasks.map((t) => (t.id === e.id ? { ...t, done: true } : t));
    case 'deleted':
      return tasks.filter((t) => t.id !== e.id);
    default:
      return assertNever(e);
  }
}

export function assertNever(x: never): never {
  throw new Error(`知らないイベントです: ${JSON.stringify(x)}`);
}
