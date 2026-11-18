// 第64章 3.2節: 仕事を取って、処理して、終わったと書くワーカー
// 動かし方（章のフォルダで）: node samples/pg-worker.ts A      （別のターミナルで node samples/pg-worker.ts B）
//   LOCK=none で、SKIP LOCKED も FOR UPDATE も付けずに取る（2つのワーカーが同じ仕事を取ることがある）
//   Ctrl+C で、今の仕事を終えてから止まる
import pg from 'pg';
import { DATABASE_URL, claimNext, complete } from './pg-queue.ts';

const name = process.argv[2] ?? 'A';
const lock = process.env.LOCK === 'none' ? '' : 'FOR UPDATE SKIP LOCKED';
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let stopping = false;
process.on('SIGINT', () => {
  console.log(`[${name}] 止めます（今の仕事を終えてから）`);
  stopping = true;
});

let idleSince = Date.now();
while (!stopping) {
  const job = await claimNext(pool, 30, lock);
  if (job === undefined) {
    if (Date.now() - idleSince > 3000) break; // 3 秒、仕事が無ければ終わる（練習用）
    await sleep(200); // 仕事が無いときは、少し待ってから聞き直す（ポーリング）
    continue;
  }
  idleSince = Date.now();
  console.log(`[${name}] 仕事 ${job.id} を取りました（${job.kind}、${job.attempts} 回目）`);
  await sleep(300); // メールを送るつもり
  await complete(pool, job.id);
}
console.log(`[${name}] 終わります`);
await pool.end();
