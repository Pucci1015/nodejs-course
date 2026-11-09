// 練習問題3の模範解答で使う、データの層（exercises/memory-task-repo.mjs と同じもの）
// 「どう覚えるか」だけを知っている。決まり（題名が重ならない、など）は、サービスの層で書く
export function createMemoryTaskRepo(initial = []) {
  const rows = new Map(initial.map((t) => [t.id, { ...t }]));
  let nextId = Math.max(0, ...rows.keys()) + 1;
  const copy = (t) => (t ? { ...t } : null);
  return {
    async list() {
      return [...rows.values()].map(copy);
    },
    async get(id) {
      return copy(rows.get(id));
    },
    async insert(fields) {
      const task = { ...fields, id: nextId++ };
      rows.set(task.id, task);
      return copy(task);
    },
    async update(id, fields) {
      const t = rows.get(id);
      if (!t) return null;
      Object.assign(t, fields, { id }); // id だけは変えさせない
      return copy(t);
    },
    async remove(id) {
      return rows.delete(id);
    },
  };
}
