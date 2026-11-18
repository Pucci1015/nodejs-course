// 第64章 3.2節: 仕事を N 個入れる（表が無ければ作る）
// 動かし方（章のフォルダで）: node samples/pg-enqueue.ts 10
//   最初からやり直すとき: node samples/pg-enqueue.ts --reset
import pg from 'pg';
import { DATABASE_URL, SCHEMA_SQL, enqueue } from './pg-queue.ts';

const pool = new pg.Pool({ connectionString: DATABASE_URL });
await pool.query(SCHEMA_SQL);
if (process.argv[2] === '--reset') {
  await pool.query('TRUNCATE ch64.jobs RESTART IDENTITY');
  console.log('仕事の表を空にしました');
} else {
  const n = Number(process.argv[2] ?? 5);
  for (let i = 1; i <= n; i += 1) await enqueue(pool, 'send-mail', { to: `user${i}@example.com` });
  console.log(`${n} 個の仕事を入れました`);
}
await pool.end();
