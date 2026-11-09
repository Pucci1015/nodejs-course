// 第26章 練習問題3で使った、データの層（ch26-app-structure/solutions/memory-task-repo.mjs）のコピー。version を確かめる所を足した（「追加（成果物）」）
// 「どう覚えるか」だけを知っている。決まり（題名が重ならない、など）は、サービスの層で書く
// 第6部で、同じ形（list・get・insert・update・remove）の PostgreSQL 版に取り替える
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
      const task = { id: nextId++, ...fields }; // 変更（成果物）: id を先頭に（JSON で読みやすいように）
      rows.set(task.id, task);
      return copy(task);
    },
    /**
     * 追加（成果物）: expectedVersion を渡されたら、今の version が同じときだけ変える。違えば null。
     * SQL の UPDATE tasks SET … WHERE id = $1 AND version = $2 RETURNING * と同じ形（第6部 第30章）。
     * 「確かめる」と「変える」を1つの操作にしておくと、その間にほかの人が変える、が起きない
     */
    async update(id, fields, { expectedVersion } = {}) {
      const t = rows.get(id);
      if (!t) return null;
      if (expectedVersion !== undefined && t.version !== expectedVersion) return null;
      Object.assign(t, fields, { id }); // id だけは変えさせない
      return copy(t);
    },
    async remove(id, { expectedVersion } = {}) {
      const t = rows.get(id);
      if (!t) return false;
      if (expectedVersion !== undefined && t.version !== expectedVersion) return false; // 追加（成果物）
      return rows.delete(id);
    },
  };
}
