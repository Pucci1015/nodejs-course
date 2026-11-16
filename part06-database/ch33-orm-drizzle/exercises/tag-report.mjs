// 練習問題6: slowReport と同じ結果を返す fastReport を、SQL 2 回までで書いてください（N+1 を直す）。
// 要件は README にあります。slowReport は書き換えないでください（テストが、答え合わせに使います）。
// 確かめ方: node --test tag-report.test.mjs
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
  // ここを書く
}
