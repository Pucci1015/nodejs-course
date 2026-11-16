// 第32章 8.1節で書く、SQL のファイルでマイグレーションをする部品の完成形
// 使い方: import { migrate } from './migrate.mjs';  await migrate(pool, 'migrations のフォルダ');
//   単独でも動かせる（~/dev/part06/ch32-docker-postgres で）: node samples/migrate.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { withTransaction } from './with-transaction.mjs';

// dir の中の *.sql を名前の順に読み、まだ動かしていないものだけを、1つずつトランザクションの中で動かす
// 動かしたファイルの名前は、schema_migrations の表に覚えておく（SQLite の user_version の代わり）
export async function migrate(pool, dir) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const done = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const applied = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    await withTransaction(pool, async (client) => {
      await client.query(sql); // PostgreSQL では、CREATE TABLE なども ROLLBACK で取り消せる
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });
    applied.push(file);
  }
  return applied;
}

// node samples/migrate.mjs で直接動かしたときだけ、ここを動かす（import されたときは動かない）
if (import.meta.main) {
  const { createPool } = await import('./db.mjs');
  const pool = createPool();
  const applied = await migrate(pool, path.join(import.meta.dirname, 'migrations'));
  console.log(applied.length === 0 ? 'もう最新です' : `動かしました: ${applied.join(', ')}`);
  await pool.end();
}
