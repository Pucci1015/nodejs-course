// 第42章 練習問題3の模範解答
export type Task = { id: number; title: string; done: boolean };

export function toggle(tasks: readonly Task[], id: number): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

export function rename(tasks: readonly Task[], id: number, title: string): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, title } : t));
}

export function remove(tasks: readonly Task[], id: number): Task[] {
  return tasks.filter((t) => t.id !== id);
}

export function moveUp(tasks: readonly Task[], id: number): Task[] {
  const i = tasks.findIndex((t) => t.id === id);
  if (i <= 0) return [...tasks];
  // with(番号, 値) は、1か所だけ替えた新しい配列を返す（元の配列は変えない）
  return tasks.with(i - 1, tasks[i]!).with(i, tasks[i - 1]!);
}
