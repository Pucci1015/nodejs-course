// 第62章 4.1節: DATABASE_URL でつないでみる。sslmode で何が変わるかを見る
// 動かし方（章のフォルダで）: node samples/db-check.ts 'postgres://…?sslmode=…'
// パスワードは画面に出さない（URL を書くときは *** に替える。第6部の決まり）
import pg from 'pg';

const url = process.argv[2];
if (url === undefined) {
  console.error('使い方: node samples/db-check.ts <DATABASE_URL>');
  process.exit(2);
}
const shown = new URL(url);
if (shown.password !== '') shown.password = '***';
console.log(`つなぐ先: ${shown.href}`);

const pool = new pg.Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
try {
  const { rows } = await pool.query<{ ssl: boolean }>('SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()');
  console.log(`つながりました（暗号化: ${rows[0]?.ssl ? 'あり' : 'なし'}）`);
} catch (err) {
  console.log(`つながりません: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
