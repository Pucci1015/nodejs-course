// 第64章 3.3節: 2つのワーカーが「同時に」仕事を取ると、どうなるか
// 仕事を 20 個入れ、2つの接続から同時に claimNext を呼ぶことを、仕事が無くなるまで繰り返す
// 動かし方（章のフォルダで）: node samples/pg-race.ts          （FOR UPDATE SKIP LOCKED）
//                             LOCK=none node samples/pg-race.ts （ロックなし）
//                             LOCK='FOR UPDATE' node samples/pg-race.ts
import pg from 'pg';
import { DATABASE_URL, SCHEMA_SQL, claimNext, enqueue } from './pg-queue.ts';

const lock = process.env.LOCK === 'none' ? '' : (process.env.LOCK ?? 'FOR UPDATE SKIP LOCKED');
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });
await pool.query(SCHEMA_SQL);
await pool.query('TRUNCATE ch64.jobs RESTART IDENTITY');
for (let i = 1; i <= 20; i += 1) await enqueue(pool, 'send-mail', { n: i });

const taken: string[] = [];
let rounds = 0;
for (;;) {
  const [a, b] = await Promise.all([claimNext(pool, 30, lock), claimNext(pool, 30, lock)]);
  rounds += 1;
  if (a === undefined && b === undefined) break;
  for (const j of [a, b]) if (j !== undefined) taken.push(j.id);
}
const twice = taken.filter((id, i) => taken.indexOf(id) !== i);
console.log(`ロック: ${lock || 'なし'}`);
console.log(`${rounds} 回で、のべ ${taken.length} 個を取りました。2回取られた仕事: ${twice.length === 0 ? 'なし' : twice.join(', ')}`);
await pool.end();
