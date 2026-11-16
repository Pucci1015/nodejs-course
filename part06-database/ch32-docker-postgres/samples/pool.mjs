// 第32章 5節で書く、接続のプール（Pool）の働きを確かめるプログラムの完成形
// 使い方（~/dev/part06/ch32-docker-postgres で）: node samples/pool.mjs
import { createPool } from './db.mjs';

const pool = createPool({ max: 3 }); // 同時に使う接続は 3 つまで
const show = (label) => console.log(`${label}: 接続 ${pool.totalCount} 本（空き ${pool.idleCount}）、待ち ${pool.waitingCount}`);

// 0.2 秒かかる SQL を、9 つ同時に送る
const start = performance.now();
const jobs = Array.from({ length: 9 }, (_, i) => pool.query('SELECT pg_sleep(0.2), $1::int AS n', [i]));
show('送った直後');
await Promise.all(jobs);
console.log(`9 つ終わるまで ${Math.round(performance.now() - start)} ms（3 本で 3 回に分けて動いた）`);
show('終わった後');

// 接続を1本借りて、同じ接続で続けて SQL を送る。使い終わったら、必ず返す（release）
const client = await pool.connect();
try {
  await client.query('SET application_name = $$pool-demo$$');
  const r = await client.query('SELECT pg_backend_pid() AS pid, current_setting($1) AS app', ['application_name']);
  console.log('借りた接続:', r.rows[0]);
  show('借りている間');
} finally {
  client.release();
}
show('返した後');

await pool.end();
