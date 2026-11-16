// 練習問題5 の模範解答
import { asc, eq, inArray } from 'drizzle-orm';
import { tags, taskTags, tasks } from './schema.mjs';

export async function setTags(db, taskId, names) {
  const unique = [...new Set(names)];
  // 途中で失敗したら（無いタスクなど）、作ったタグも消えるように、全部を1つのトランザクションで
  return db.transaction(async (tx) => {
    await tx.delete(taskTags).where(eq(taskTags.taskId, taskId));
    if (unique.length === 0) return [];
    // もうあるタグは作らない（ON CONFLICT DO NOTHING）
    await tx
      .insert(tags)
      .values(unique.map((name) => ({ name })))
      .onConflictDoNothing();
    const rows = await tx.select().from(tags).where(inArray(tags.name, unique)).orderBy(asc(tags.name));
    await tx.insert(taskTags).values(rows.map((tag) => ({ taskId, tagId: tag.id })));
    return rows.map((tag) => tag.name);
  });
}

export async function tagsOf(db, taskId) {
  const rows = await db
    .select({ name: tags.name })
    .from(taskTags)
    .innerJoin(tags, eq(tags.id, taskTags.tagId))
    .where(eq(taskTags.taskId, taskId))
    .orderBy(asc(tags.name));
  return rows.map((r) => r.name);
}

export async function tasksWithTags(db) {
  // relations を使う db.query は、with の分もまとめて1つの SQL にする
  const list = await db.query.tasks.findMany({
    columns: { id: true, title: true },
    with: { taskTags: { columns: {}, with: { tag: { columns: { name: true } } } } },
    orderBy: (t, { asc }) => [asc(t.id)],
  });
  return list.map((t) => ({ id: t.id, title: t.title, tags: t.taskTags.map((x) => x.tag.name).sort() }));
}
