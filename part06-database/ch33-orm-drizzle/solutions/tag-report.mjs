// 練習問題6 の模範解答（slowReport は問題と同じ）
import { asc, eq } from 'drizzle-orm';
import { tags, taskTags, tasks } from './schema.mjs';

// タグごとに { tag: タグの名前, total: 付いているタスクの数, open: 終わっていないタスクの title の配列（id の順） }
// タグの名前の順。タスクが付いていないタグも total: 0、open: [] で入る
// タグが N 個あると、SQL を 1 + N 回送る
export async function slowReport(db) {
  const allTags = await db.select().from(tags).orderBy(asc(tags.name));
  const report = [];
  for (const tag of allTags) {
    const rows = await db
      .select({ title: tasks.title, status: tasks.status })
      .from(taskTags)
      .innerJoin(tasks, eq(tasks.id, taskTags.taskId))
      .where(eq(taskTags.tagId, tag.id))
      .orderBy(asc(tasks.id));
    report.push({ tag: tag.name, total: rows.length, open: rows.filter((r) => r.status !== 'done').map((r) => r.title) });
  }
  return report;
}

export async function fastReport(db) {
  // tags から LEFT JOIN でつなぐ（タスクの付いていないタグも1行残る。そのとき title と status は null）
  const rows = await db
    .select({ tag: tags.name, title: tasks.title, status: tasks.status })
    .from(tags)
    .leftJoin(taskTags, eq(taskTags.tagId, tags.id))
    .leftJoin(tasks, eq(tasks.id, taskTags.taskId))
    .orderBy(asc(tags.name), asc(tasks.id));
  // 1回で読んだ行を、タグごとにまとめる（Map は入れた順を保つので、タグの名前の順のまま）
  const byTag = new Map();
  for (const r of rows) {
    if (!byTag.has(r.tag)) byTag.set(r.tag, { tag: r.tag, total: 0, open: [] });
    if (r.title === null) continue;
    const entry = byTag.get(r.tag);
    entry.total += 1;
    if (r.status !== 'done') entry.open.push(r.title);
  }
  return [...byTag.values()];
}
