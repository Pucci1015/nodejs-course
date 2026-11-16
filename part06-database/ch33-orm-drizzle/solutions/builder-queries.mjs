// 練習問題2 の模範解答
import { and, asc, count, eq, ilike, lt, ne } from 'drizzle-orm';
import { tasks } from './schema.mjs';

export async function findByStatus(db, status) {
  const rows = await db.select({ title: tasks.title }).from(tasks).where(eq(tasks.status, status)).orderBy(asc(tasks.id));
  return rows.map((r) => r.title);
}

export async function searchTitle(db, word) {
  // ilike に渡す値も、Drizzle が $1 にして送る（「'」が入っていても大丈夫）
  return db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(ilike(tasks.title, `%${word}%`)).orderBy(asc(tasks.id));
}

export async function countByStatus(db) {
  // Drizzle の count() は number で返る（第32章の ::int が要らない）
  const rows = await db.select({ status: tasks.status, n: count() }).from(tasks).groupBy(tasks.status);
  const counts = { todo: 0, doing: 0, done: 0 };
  for (const r of rows) counts[r.status] = r.n;
  return counts;
}

export async function overdue(db, { date, limit }) {
  const rows = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(and(ne(tasks.status, 'done'), lt(tasks.dueDate, date)))
    .orderBy(asc(tasks.dueDate))
    .limit(limit);
  return rows.map((r) => r.title);
}
