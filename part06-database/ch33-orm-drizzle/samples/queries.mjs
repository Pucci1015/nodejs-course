// 第33章 4.2節で書く、Drizzle で選ぶ・変えるプログラムの完成形
// 使い方（~/dev/part06/ch33-orm-drizzle で）: node samples/queries.mjs   （先に node samples/seed.mjs）
//   送った SQL も見るなら: SQL_LOG=1 node samples/queries.mjs
import { and, asc, count, desc, eq, ilike, isNotNull, lt, ne, sql } from 'drizzle-orm';
import { closeDb, db } from './db.mjs';
import { tasks } from './schema.mjs';

// SELECT title, due_date FROM tasks WHERE status <> 'done' AND due_date IS NOT NULL ORDER BY due_date
const open = await db
  .select({ title: tasks.title, dueDate: tasks.dueDate })
  .from(tasks)
  .where(and(ne(tasks.status, 'done'), isNotNull(tasks.dueDate)))
  .orderBy(asc(tasks.dueDate));
console.log('締め切りのある、終わっていないタスク:', open);

// 組み立てたクエリは、await する前なら .toSQL() で SQL を見られる
const query = db.select().from(tasks).where(ilike(tasks.title, '%let%')).limit(5);
console.log('toSQL:', query.toSQL());
console.log('結果:', await query);

// GROUP BY と count()
console.log('status ごと:', await db.select({ status: tasks.status, n: count() }).from(tasks).groupBy(tasks.status).orderBy(desc(count())));

// UPDATE … WHERE id = ? AND version = ? RETURNING …（第30章 5節の version）
const [first] = await db.select().from(tasks).where(eq(tasks.title, '本を返す'));
const renamed = await db
  .update(tasks)
  .set({ title: '図書館に本を返す', version: sql`${tasks.version} + 1`, updatedAt: new Date() })
  .where(and(eq(tasks.id, first.id), eq(tasks.version, first.version)))
  .returning({ id: tasks.id, title: tasks.title, version: tasks.version });
console.log('変えた:', renamed);

// 同じ version でもう一度 → 1行も合わないので []
console.log('古い version で:', await db.update(tasks).set({ title: '別の題名' }).where(and(eq(tasks.id, first.id), eq(tasks.version, first.version))).returning());

// 締め切りが 2026-11-11 より前で、終わっていないもの
console.log('期限切れ:', await db.select({ title: tasks.title }).from(tasks).where(and(lt(tasks.dueDate, '2026-11-11'), ne(tasks.status, 'done'))));

// 元に戻す
await db.update(tasks).set({ title: '本を返す' }).where(eq(tasks.id, first.id));
await closeDb();
