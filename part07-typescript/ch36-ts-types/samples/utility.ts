// 5節: ユーティリティ型。今ある型から、別の型を作る
type Task = {
  id: number;
  title: string;
  status: 'todo' | 'doing' | 'done';
  dueDate: string | null;
  createdAt: string;
};

// 作るときに客が送ってくるもの: id と createdAt はサーバが付けるので除く
type NewTask = Omit<Task, 'id' | 'createdAt'>;
// 変えるときに送ってくるもの: 3つのうち、変えたいものだけ
type TaskPatch = Partial<Pick<Task, 'title' | 'status' | 'dueDate'>>;
// 状態ごとの数
type Counts = Record<Task['status'], number>;

function applyPatch(task: Task, patch: TaskPatch): Task {
  return { ...task, ...patch };
}

const task: Task = { id: 1, title: '牛乳を買う', status: 'todo', dueDate: null, createdAt: '2026-11-11T09:00:00.000Z' };
const draft: NewTask = { title: '本を返す', status: 'todo', dueDate: '2026-11-20' };
const counts: Counts = { todo: 2, doing: 0, done: 1 };
console.log(applyPatch(task, { status: 'doing' }));
console.log(draft, counts);

// 関数の型から取り出す
async function loadTask(id: number): Promise<Task> {
  return { ...task, id };
}
type Loaded = Awaited<ReturnType<typeof loadTask>>; // Task（Promise を外したもの）
const loaded: Loaded = await loadTask(2);
console.log(loaded.id);

// Readonly: 全部の項目を readonly に
const frozen: Readonly<Task> = task;
console.log(frozen.title);
