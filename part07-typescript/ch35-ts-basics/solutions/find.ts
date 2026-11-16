// 練習問題5 の模範解答

export type Task = { id: number; title: string; done: boolean; dueDate?: string };

export function findTask(tasks: Task[], id: number): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function titleOf(tasks: Task[], id: number): string {
  // ?. で「見つからなければ undefined」、?? で「undefined なら （なし）」
  return findTask(tasks, id)?.title ?? '（なし）';
}

export function lastTitle(tasks: Task[]): string | undefined {
  // tasks[tasks.length - 1] の型は Task | undefined（noUncheckedIndexedAccess）。at(-1) も同じ
  return tasks.at(-1)?.title;
}

export function nextDue(tasks: Task[]): string | null {
  let best: string | null = null;
  for (const t of tasks) {
    if (t.done || t.dueDate === undefined) continue;
    // ここでは t.dueDate は string（undefined は上で除いた）
    if (best === null || t.dueDate < best) best = t.dueDate;
  }
  return best;
}
