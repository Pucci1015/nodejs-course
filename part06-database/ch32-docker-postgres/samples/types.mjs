// 第32章 4.2節で書く、PostgreSQL の型が JavaScript の何になるかを確かめるプログラムの完成形
// 使い方（~/dev/part06/ch32-docker-postgres で）: node samples/types.mjs
// db.mjs は使わない（db.mjs がする DATE の設定の前と後を比べるため）
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/app';
const sql = `
  SELECT count(*)            AS count_all,
         count(*)::int       AS count_int,
         now()               AS now,
         DATE '2026-11-12'   AS due,
         12.5::numeric       AS price,
         true                AS flag,
         '{"tags": ["家"]}'::jsonb AS meta
`;

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const row = (await client.query(sql)).rows[0];
for (const [name, value] of Object.entries(row)) {
  const kind = value !== null && typeof value === 'object' ? value.constructor.name : typeof value;
  console.log(name.padEnd(9), kind.padEnd(7), value);
}
console.log('due を JSON にすると:', JSON.stringify({ due: row.due }));

// DATE は、文字列のまま受け取るように変える（db.mjs と同じ設定）
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
console.log('setTypeParser の後の due:', (await client.query(sql)).rows[0].due);

await client.end();
