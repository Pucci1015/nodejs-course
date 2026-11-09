// MPA 版と SPA 版のタスク管理が共通で使う、メモリの中の保存場所（第10章 8節）
// サーバを止めると消える。データベースは第6部で扱う。

const tasks = [
  { id: 1, title: '牛乳を買う', done: false, createdAt: '2026-11-04T09:00:00.000Z' },
  { id: 2, title: '第10章を読む', done: true, createdAt: '2026-11-04T10:00:00.000Z' },
];
let nextId = 3;

export function listTasks() {
  return tasks.map((t) => ({ ...t })); // 中身を外から書き換えられないように、コピーを返す
}

export function getTask(id) {
  const task = tasks.find((t) => t.id === id);
  return task ? { ...task } : null;
}

/** タイトルを検査する。問題があればエラーの文を返す */
export function validateTitle(title) {
  if (typeof title !== 'string' || title.trim() === '') return 'タイトルを入力してください';
  if (title.trim().length > 100) return 'タイトルは100文字以内にしてください';
  return null;
}

export function addTask(title) {
  const task = { id: nextId++, title: title.trim(), done: false, createdAt: new Date().toISOString() };
  tasks.push(task);
  return { ...task };
}

export function updateTask(id, changes) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;
  if (changes.title !== undefined) task.title = changes.title.trim();
  if (changes.done !== undefined) task.done = Boolean(changes.done);
  return { ...task };
}

export function deleteTask(id) {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
}
