// サンプルで使う、メモリの中のタスク（第25章）。version は、変えるたびに 1 増える（7節の ETag に使う）
export function createTasks(count = 0, { now = () => new Date() } = {}) {
  const tasks = [];
  let nextId = 1;
  const base = Date.parse('2026-11-01T00:00:00.000Z');
  for (let i = 0; i < count; i++) {
    tasks.push({ id: nextId++, title: `タスク ${i + 1}`, status: 'todo', createdAt: new Date(base + i * 60_000).toISOString(), version: 1 });
  }
  return {
    all: () => tasks.map((t) => ({ ...t })),
    get: (id) => {
      const t = tasks.find((x) => x.id === id);
      return t ? { ...t } : null;
    },
    create(fields) {
      const t = { id: nextId++, status: 'todo', ...fields, createdAt: now().toISOString(), version: 1 };
      tasks.push(t);
      return { ...t };
    },
    update(id, changes) {
      const t = tasks.find((x) => x.id === id);
      if (!t) return null;
      Object.assign(t, changes, { version: t.version + 1 });
      return { ...t };
    },
    remove(id) {
      const i = tasks.findIndex((x) => x.id === id);
      if (i === -1) return false;
      tasks.splice(i, 1);
      return true;
    },
  };
}
