// データの層: タスクをメモリに置く（第26章 3節）
// 「どう覚えるか」だけを知っている。題名が重なってよいか、などの決まりは知らない。
// 第6部では、同じ形（list・get・insert）で PostgreSQL に置くものに差し替える
export function createMemoryTaskRepo() {
  const rows = new Map();
  let nextId = 1;
  const copy = (t) => (t ? { ...t } : null); // 中のものを、外から書き換えられないように
  return {
    async list() {
      return [...rows.values()].map(copy);
    },
    async get(id) {
      return copy(rows.get(id));
    },
    async insert(fields) {
      const task = { id: nextId++, ...fields };
      rows.set(task.id, task);
      return copy(task);
    },
  };
}
