// 練習問題2・4 で使う、メモリの中のタスクの保存場所（ここは、できている）
// 第2部 第10章の samples/tasks-store.mjs を、何度でも作り直せるように「作る関数」にしたもの。
// サーバを止めると消える。データベースは第6部で扱う。

/**
 * @param {{ now?: () => Date }} [options]
 */
export function createTaskStore({ now = () => new Date() } = {}) {
  const tasks = [
    { id: 1, title: '牛乳を買う', done: false, createdAt: '2026-11-05T09:00:00.000Z' },
    { id: 2, title: '第23章を読む', done: true, createdAt: '2026-11-05T10:00:00.000Z' },
  ];
  let nextId = 3;
  const copy = (t) => ({ ...t }); // 中身を外から書き換えられないように、コピーを返す

  return {
    /** @param {{ done?: boolean }} [filter] */
    list({ done } = {}) {
      return tasks.filter((t) => done === undefined || t.done === done).map(copy);
    },
    get(id) {
      const task = tasks.find((t) => t.id === id);
      return task ? copy(task) : null;
    },
    /** title は、確かめてから渡すこと（ここでは確かめない） */
    create({ title }) {
      const task = { id: nextId++, title, done: false, createdAt: now().toISOString() };
      tasks.push(task);
      return copy(task);
    },
    /** 無ければ null */
    update(id, changes) {
      const task = tasks.find((t) => t.id === id);
      if (!task) return null;
      if (changes.title !== undefined) task.title = changes.title;
      if (changes.done !== undefined) task.done = changes.done;
      return copy(task);
    },
    /** 消せたら true、無ければ false */
    remove(id) {
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) return false;
      tasks.splice(index, 1);
      return true;
    },
  };
}
