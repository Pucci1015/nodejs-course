// 練習問題6 の模範解答

export type Status = 'todo' | 'doing' | 'done';
export type Task = { id: number; title: string; status: Status; dueDate: string | null; tags: string[] };

export function isStatus(value: unknown): value is Status {
  return value === 'todo' || value === 'doing' || value === 'done';
}

export function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  // 'id' in value の後では、value.id を読める（型は unknown）
  if (!('id' in value) || typeof value.id !== 'number' || !Number.isInteger(value.id) || value.id < 1) return false;
  if (!('title' in value) || typeof value.title !== 'string' || value.title === '') return false;
  if (!('status' in value) || !isStatus(value.status)) return false;
  if (!('dueDate' in value) || (value.dueDate !== null && typeof value.dueDate !== 'string')) return false;
  if (!('tags' in value) || !Array.isArray(value.tags)) return false;
  // Array.isArray の後の value.tags は any[]。中身も1つずつ確かめる
  return value.tags.every((tag: unknown) => typeof tag === 'string');
}

export function assertTask(value: unknown): asserts value is Task {
  if (!isTask(value)) throw new TypeError(`タスクの形ではありません: ${JSON.stringify(value)}`);
}

export function parseTasks(json: string): Task[] {
  const data: unknown = JSON.parse(json); // any のまま使わないよう、unknown の変数に入れる
  if (!Array.isArray(data)) throw new TypeError('配列ではありません');
  const tasks: Task[] = [];
  data.forEach((item: unknown, i) => {
    if (!isTask(item)) throw new TypeError(`${i + 1}番目の要素がタスクの形ではありません`);
    tasks.push(item);
  });
  return tasks;
}
