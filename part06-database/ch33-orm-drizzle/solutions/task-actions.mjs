// 練習問題7 の模範解答
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { tasks } from './schema.mjs';
import { PG } from './pg-errors.mjs';

export async function listPage(db, { after = 0, limit }) {
  // limit より1つ多く読み、あふれたら「続きがある」（第30章 6節）
  const rows = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(gt(tasks.id, after))
    .orderBy(asc(tasks.id))
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const next = rows.length > limit ? items.at(-1).id : null;
  return { items, next };
}

export async function complete(db, id, { expectedVersion }) {
  const now = new Date();
  const [row] = await db
    .update(tasks)
    // version + 1 はデータベースの中で計算させる（読んでから足すと、同時に動いたときに数え漏れる）
    .set({ status: 'done', completedAt: now, updatedAt: now, version: sql`${tasks.version} + 1` })
    .where(and(eq(tasks.id, id), eq(tasks.version, expectedVersion)))
    .returning({ id: tasks.id, status: tasks.status, version: tasks.version, completedAt: tasks.completedAt });
  return row ?? null;
}

export async function rename(db, id, title) {
  try {
    const [row] = await db.update(tasks).set({ title }).where(eq(tasks.id, id)).returning({ id: tasks.id, title: tasks.title });
    return row ? { ok: true, task: row } : { ok: false, reason: 'not-found' };
  } catch (err) {
    // Drizzle は pg のエラーを包んで投げる。元のエラー（code が入っている）は err.cause
    const code = err.cause?.code;
    if (code === PG.UNIQUE_VIOLATION) return { ok: false, reason: 'duplicate' };
    if (code === PG.CHECK_VIOLATION) return { ok: false, reason: 'invalid' };
    throw err; // 知らないエラーは、握りつぶさずに投げ直す
  }
}
