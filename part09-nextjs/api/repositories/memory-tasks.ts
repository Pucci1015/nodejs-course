// 第8・9部の練習用: タスクをメモリに置くデータの層。第7部の成果物の TaskRepo（types.ts）の形に合わせた
// 並べ方・NULL の位置・ページ分けは、PostgreSQL 版（第7部の pg-tasks.ts）と同じ順になるように書いた
import { ConflictError } from '../errors.ts';
import type { CursorPosition, Sort, Task, TaskFields, TaskRepo } from '../types.ts';

/** 並べ方ごとの、並べる値（文字列か null） */
function keyOf(sort: Sort, t: { v: string | null } | Task): string | null {
  if ('v' in t) return t.v;
  const field = sort.startsWith('-') ? sort.slice(1) : sort;
  return field === 'dueDate' ? t.dueDate : field === 'title' ? t.title : t.createdAt;
}

/** 小さい順で比べる。null は最後（PostgreSQL の ASC と同じ）。値が同じなら id の小さい順 */
function compareAsc(a: string | null, aId: number, b: string | null, bId: number): number {
  if (a !== b) {
    if (a === null) return 1;
    if (b === null) return -1;
    return a < b ? -1 : 1;
  }
  return aId - bId;
}

export function createMemoryTaskRepo(): TaskRepo {
  const tasks = new Map<number, Task>();
  let nextId = 1;

  const isOpenTitleTaken = (title: string, exceptId: number | null) =>
    [...tasks.values()].some((t) => t.status !== 'done' && t.title === title && t.id !== exceptId);

  return {
    async listPage({ statuses, dueBefore, sort, limit, after }) {
      const desc = sort.startsWith('-');
      const cmp = (a: Task | CursorPosition, b: Task | CursorPosition) => {
        const r = compareAsc(keyOf(sort, a), a.id, keyOf(sort, b), b.id);
        return desc ? -r : r;
      };
      let items = [...tasks.values()];
      if (statuses && statuses.length > 0) items = items.filter((t) => statuses.includes(t.status));
      if (dueBefore !== undefined) items = items.filter((t) => t.dueDate !== null && t.dueDate < dueBefore);
      items.sort(cmp);
      if (after !== undefined) items = items.filter((t) => cmp(t, after) > 0);
      return { items: items.slice(0, limit).map((t) => ({ ...t })), hasMore: items.length > limit };
    },

    async get(id) {
      const t = tasks.get(id);
      return t === undefined ? null : { ...t };
    },

    async findOpenByTitle(title, exceptId = null) {
      return [...tasks.values()].find((t) => t.status !== 'done' && t.title === title && t.id !== exceptId) ?? null;
    },

    async countByStatus(status) {
      return [...tasks.values()].filter((t) => t.status === status).length;
    },

    async insert(fields: TaskFields) {
      // PostgreSQL の部分ユニークインデックスの代わり
      if (fields.status !== 'done' && isOpenTitleTaken(fields.title, null)) throw new ConflictError('同じ題名の、終わっていないタスクがあります');
      const task: Task = { id: nextId++, ...fields };
      tasks.set(task.id, task);
      return { ...task };
    },

    async update(id, fields, { expectedVersion } = {}) {
      const prev = tasks.get(id);
      if (prev === undefined) return null;
      if (expectedVersion !== undefined && prev.version !== expectedVersion) return null;
      const next: Task = { ...prev };
      for (const [k, v] of Object.entries(fields)) if (v !== undefined) Reflect.set(next, k, v);
      if (next.status !== 'done' && isOpenTitleTaken(next.title, id)) throw new ConflictError('同じ題名の、終わっていないタスクがあります');
      tasks.set(id, next);
      return { ...next };
    },

    async remove(id, { expectedVersion } = {}) {
      const prev = tasks.get(id);
      if (prev === undefined) return false;
      if (expectedVersion !== undefined && prev.version !== expectedVersion) return false;
      tasks.delete(id);
      return true;
    },
  };
}
