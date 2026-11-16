// 4.3節: pg に型を付ける。第6部の PostgreSQL が動いていれば動かせる（~/dev/part06 で docker compose up -d --wait）
import pg from 'pg';

type Row = { n: number; at: Date; name: string };

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/app',
});
try {
  // query<Row> で「行はこの形」と書く。tsc は信じるだけで、本当にこの形かは確かめない（第38章）
  const { rows } = await pool.query<Row>("SELECT 1 AS n, now() AS at, 'alice' AS name");
  const row = rows[0];
  if (row !== undefined) console.log(row.n + 1, row.at instanceof Date, row.name.toUpperCase());
} finally {
  await pool.end();
}
