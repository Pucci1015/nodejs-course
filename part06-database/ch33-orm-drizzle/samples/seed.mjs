// 第33章 4.1節で書く、Drizzle で行を足すプログラムの完成形（第32章と同じ5つのタスクとタグを入れ直す）
// 使い方（~/dev/part06/ch33-orm-drizzle で）: node samples/seed.mjs
//   先に、3節のマイグレーションで表を作っておく
import { sql } from 'drizzle-orm';
import { closeDb, db } from './db.mjs';
import { tags, taskTags, tasks } from './schema.mjs';

// 全部消して、id の番号も 1 に戻してから入れる。Drizzle の関数に無い SQL は、db.execute(sql`…`) で送れる
await db.execute(sql`TRUNCATE tasks, tags RESTART IDENTITY CASCADE`);

const inserted = await db
  .insert(tasks)
  .values([
    { title: '牛乳を買う', status: 'done', dueDate: '2026-11-01', completedAt: new Date('2026-11-01T03:00:00Z'), version: 2 },
    { title: '本を返す', dueDate: '2026-11-12' },
    { title: '部屋の掃除', status: 'doing', dueDate: '2026-11-15', version: 2 },
    { title: "Let's ストレッチ" },
    { title: '報告書を書く', dueDate: '2026-11-10' },
  ])
  .returning({ id: tasks.id, title: tasks.title });
console.log('タスク:', inserted);

const [home, urgent] = await db.insert(tags).values([{ name: '家' }, { name: '急ぎ' }]).returning();
await db.insert(taskTags).values([
  { taskId: inserted[1].id, tagId: home.id },
  { taskId: inserted[2].id, tagId: home.id },
  { taskId: inserted[4].id, tagId: urgent.id },
]);
console.log('タグ:', [home, urgent]);

await closeDb();
