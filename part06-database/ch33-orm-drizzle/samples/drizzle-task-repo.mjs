// 第33章 7.1節で書く、タスクのリポジトリの Drizzle 版の完成形
// 第31・32章と同じ形（list・get・insert・update・remove）。SQL の文字列を組み立てる所が無くなった
// 使い方: import { createDrizzleTaskRepo } from './drizzle-task-repo.mjs';  const repo = createDrizzleTaskRepo(db);
import { and, asc, eq, getTableColumns } from 'drizzle-orm';
import { tasks } from './schema.mjs';

// timestamptz は Date で来るので、第5部と同じ ISO 8601 の文字列にする
const iso = (d) => (d === null ? null : d.toISOString());

function toTask(row) {
  if (!row) return null;
  return { ...row, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt), completedAt: iso(row.completedAt) };
}

// tasks の列の JavaScript の名前（id は除く）。Drizzle は、知らない名前を黙って捨てるので、ここで断る
const COLUMN_KEYS = Object.keys(getTableColumns(tasks)).filter((k) => k !== 'id');
function pickColumns(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k === 'id') continue;
    if (!COLUMN_KEYS.includes(k)) throw new Error(`知らない項目です: ${k}`);
    out[k] = v;
  }
  return out;
}

// db には、drizzle() の戻り値か、db.transaction が渡す tx のどちらを渡してもよい
export function createDrizzleTaskRepo(db) {
  return {
    async list() {
      return (await db.select().from(tasks).orderBy(asc(tasks.id))).map(toTask);
    },

    async get(id) {
      const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
      return toTask(row);
    },

    async insert(fields) {
      const [row] = await db.insert(tasks).values(pickColumns(fields)).returning();
      return toTask(row);
    },

    async update(id, fields, { expectedVersion } = {}) {
      const values = pickColumns(fields);
      if (Object.keys(values).length === 0) return this.get(id);
      const where = expectedVersion === undefined ? eq(tasks.id, id) : and(eq(tasks.id, id), eq(tasks.version, expectedVersion));
      const [row] = await db.update(tasks).set(values).where(where).returning();
      return toTask(row);
    },

    async remove(id, { expectedVersion } = {}) {
      const where = expectedVersion === undefined ? eq(tasks.id, id) : and(eq(tasks.id, id), eq(tasks.version, expectedVersion));
      const deleted = await db.delete(tasks).where(where).returning({ id: tasks.id });
      return deleted.length > 0;
    },
  };
}
