// 第32章 6.2節で書く、同時に数を増やすと数が合わなくなることと、その防ぎ方を確かめるプログラムの完成形
// 使い方（~/dev/part06/ch32-docker-postgres で）: node samples/lock.mjs
import { createPool } from './db.mjs';
import { withTransaction } from './with-transaction.mjs';

const pool = createPool({ max: 10 });
const reset = () => pool.query(`DROP TABLE IF EXISTS counters; CREATE TABLE counters (name text PRIMARY KEY, n integer NOT NULL); INSERT INTO counters VALUES ('views', 0);`);
const views = async () => (await pool.query(`SELECT n FROM counters WHERE name = 'views'`)).rows[0].n;
const tenAtOnce = (fn) => Promise.all(Array.from({ length: 10 }, fn));

// 1. 読んでから、JavaScript で 1 足して書く
await reset();
await tenAtOnce(() =>
  withTransaction(pool, async (client) => {
    const { n } = (await client.query(`SELECT n FROM counters WHERE name = 'views'`)).rows[0];
    await client.query(`UPDATE counters SET n = $1 WHERE name = 'views'`, [n + 1]);
  }),
);
console.log('1. 読んでから書く:          ', await views());

// 2. 足すことを、データベースに1つの SQL で頼む
await reset();
await tenAtOnce(() => pool.query(`UPDATE counters SET n = n + 1 WHERE name = 'views'`));
console.log('2. n = n + 1:               ', await views());

// 3. 読むときに、行をロックする（FOR UPDATE）。ほかのトランザクションは、COMMIT まで待たされる
await reset();
await tenAtOnce(() =>
  withTransaction(pool, async (client) => {
    const { n } = (await client.query(`SELECT n FROM counters WHERE name = 'views' FOR UPDATE`)).rows[0];
    await client.query(`UPDATE counters SET n = $1 WHERE name = 'views'`, [n + 1]);
  }),
);
console.log('3. SELECT … FOR UPDATE:     ', await views());

await pool.query('DROP TABLE counters');
await pool.end();
