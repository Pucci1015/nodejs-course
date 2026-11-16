// 練習問題5 の模範解答

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

// サーバが付ける4つを除いたもの。Pick<Task, 'title' | 'status' | 'dueDate' | 'tags'> でも同じ
export type NewTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'version'>;
// 変えられる4つを、どれも無くてよいものにした
export type TaskPatch = Partial<NewTask>;
export type TaskSummary = Pick<Task, 'id' | 'title' | 'status'>;
export type StatusCounts = Record<Status, number>;

export function applyPatch(task: Task, patch: TaskPatch, now: string): Task {
  const next: Task = { ...task, updatedAt: now, version: task.version + 1 };
  // undefined の項目は無視する。{ ...task, ...patch } だと、{ title: undefined } で題名が消えてしまう
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.dueDate !== undefined) next.dueDate = patch.dueDate; // null は「消す」なので入れる
  if (patch.tags !== undefined) next.tags = patch.tags;
  return next;
}

export function toSummary(task: Task): TaskSummary {
  // return task; と書いても型は通るが、ほかの項目も付いたまま返ってしまう（型は形が足りているかしか見ない）
  return { id: task.id, title: task.title, status: task.status };
}

export function countStatuses(tasks: Task[]): StatusCounts {
  const counts: StatusCounts = { todo: 0, doing: 0, done: 0 };
  for (const t of tasks) counts[t.status] += 1;
  return counts;
}
