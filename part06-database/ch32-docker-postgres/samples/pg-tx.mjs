// 第32章 6.1節で書く、withTransaction でポイントを移すプログラムの完成形
// 使い方（~/dev/part06/ch32-docker-postgres で）: node samples/pg-tx.mjs
import { createPool } from './db.mjs';
import { withTransaction } from './with-transaction.mjs';

const pool = createPool();
await pool.query(`
  DROP TABLE IF EXISTS points;
  CREATE TABLE points (
    name    text PRIMARY KEY,
    balance integer NOT NULL CHECK (balance >= 0)
  );
  INSERT INTO points (name, balance) VALUES ('alice', 100), ('bob', 0);
`);

async function transfer(from, to, amount) {
  try {
    await withTransaction(pool, async (client) => {
      await client.query('UPDATE points SET balance = balance + $1 WHERE name = $2', [amount, to]);
      await client.query('UPDATE points SET balance = balance - $1 WHERE name = $2', [amount, from]);
    });
    console.log(`OK  ${from} → ${to} ${amount}`);
  } catch (err) {
    console.log(`NG  ${from} → ${to} ${amount}: ${err.message}`);
  }
}

await transfer('alice', 'bob', 30);
await transfer('alice', 'bob', 500);
console.table((await pool.query('SELECT * FROM points ORDER BY name')).rows);
await pool.query('DROP TABLE points');
await pool.end();
