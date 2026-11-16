// 第33章 6節で書く、Drizzle のトランザクションと、エラーの中身を確かめるプログラムの完成形
// 使い方（~/dev/part06/ch33-orm-drizzle で）: node samples/tx.mjs   （先に node samples/seed.mjs）
import { count, eq } from 'drizzle-orm';
import { closeDb, db } from './db.mjs';
import { tags, taskTags, tasks } from './schema.mjs';

const countTasks = async () => (await db.select({ n: count() }).from(tasks))[0].n;
console.log('最初:', await countTasks());

// db.transaction(async (tx) => { … }) の中では、db の代わりに tx を使う。例外を投げると ROLLBACK
try {
  await db.transaction(async (tx) => {
    const [t] = await tx.insert(tasks).values({ title: '窓を拭く' }).returning();
    const [g] = await tx.insert(tags).values({ name: '掃除' }).onConflictDoNothing().returning();
    console.log('トランザクションの中:', t.id, g);
    await tx.insert(tasks).values({ title: '本を返す' }); // 終わっていない「本を返す」がもうある → 23505
  });
} catch (err) {
  // Drizzle は、pg のエラーを DrizzleQueryError で包む。元のエラーは err.cause
  console.log('失敗:', err.constructor.name);
  console.log('  err.cause.code:', err.cause?.code, ' err.cause.constraint:', err.cause?.constraint);
}
console.log('取り消された後:', await countTasks(), ' タグ「掃除」:', await db.select().from(tags).where(eq(tags.name, '掃除')));

// 自分の判断で取り消すときは tx.rollback()（例外を投げて抜ける）
try {
  await db.transaction(async (tx) => {
    await tx.delete(taskTags);
    const left = (await tx.select({ n: count() }).from(taskTags))[0].n;
    if (left === 0) tx.rollback(); // やっぱりやめる
  });
} catch (err) {
  console.log('rollback():', err.constructor.name);
}
console.log('task_tags:', (await db.select({ n: count() }).from(taskTags))[0].n, '行（消えていない）');
await closeDb();
