// 練習問題2 の模範解答
export type Task = {
  readonly id: number;
  title: string;
  done: boolean;
  dueDate?: string;
};

export function createTask(id: number, title: string, dueDate?: string): Task {
  const task: Task = { id, title, done: false };
  // dueDate: undefined という項目を作らないため、渡されたときだけ足す
  if (dueDate !== undefined) task.dueDate = dueDate;
  return task;
}

export function isOverdue(task: Task, today: string): boolean {
  if (task.done || task.dueDate === undefined) return false;
  // 'YYYY-MM-DD' の文字列は、そのまま < で比べると日付の順になる
  return task.dueDate < today;
}

export function toggle(task: Task): Task {
  // ... で写してから done だけ変える。元のオブジェクトは変えない
  return { ...task, done: !task.done };
}
