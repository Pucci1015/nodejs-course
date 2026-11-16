// 練習問題3 の模範解答
import { and, asc, desc, eq, ilike, lt } from 'drizzle-orm';
import { tasks } from './schema.mjs';

const SORTABLE = {
  id: tasks.id,
  title: tasks.title,
  dueDate: tasks.dueDate,
  createdAt: tasks.createdAt,
};

export function listQuery(db, { status, q, dueBefore, sort = 'id', order = 'asc', limit = 20 } = {}) {
  // Object.hasOwn で調べる（SORTABLE['toString'] のような、元から持っている名前を通さない）
  if (!Object.hasOwn(SORTABLE, sort)) throw new RangeError(`並べ替えに使えない名前です: ${sort}`);
  if (order !== 'asc' && order !== 'desc') throw new RangeError(`order は asc か desc です: ${order}`);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError(`limit は 1〜100 の整数です: ${limit}`);

  // 条件は、渡されたものだけを配列に入れる。and() は、undefined を飛ばし、空なら WHERE を付けない
  const conditions = [];
  if (status !== undefined) conditions.push(eq(tasks.status, status));
  if (q !== undefined) conditions.push(ilike(tasks.title, `%${q}%`));
  if (dueBefore !== undefined) conditions.push(lt(tasks.dueDate, dueBefore));

  const direction = order === 'asc' ? asc : desc;
  return db
    .select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate })
    .from(tasks)
    .where(and(...conditions))
    .orderBy(direction(SORTABLE[sort]), asc(tasks.id)) // 同じ値のときの順を決めるため、最後に id
    .limit(limit);
}
