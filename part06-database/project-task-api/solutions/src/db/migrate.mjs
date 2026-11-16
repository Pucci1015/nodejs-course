// 追加（第6部）: migrations/ の SQL のファイルを、名前の順に、まだのものだけ動かす
// 第32章 練習問題8の模範解答（ch32-docker-postgres/solutions/safe-migrate.mjs）のコピー。単独でも動くようにした（「追加」）
//   - アドバイザリロックで、2台が同時に起動しても、1台ずつ動かす
//   - 動かした後で書き換えられたファイルがあれば、何も動かさずに止める（チェックサム）
// 使い方: サーバの起動のときに migrate(pool, dir) を呼ぶ。手で動かすなら npm run migrate
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// アドバイザリロックの番号。同じデータベースを使うほかのプログラムと重ならない数なら、何でもよい
const LOCK_KEY = 6_0001;

export const MIGRATIONS_DIR = path.join(import.meta.dirname, '..', '..', 'migrations');

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

export async function migrate(pool, dir = MIGRATIONS_DIR) {
  // ロックは「接続ごと」に持つので、最初から最後まで、同じ接続を使う
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          name       text PRIMARY KEY,
          checksum   text NOT NULL,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      const done = new Map((await client.query('SELECT name, checksum FROM schema_migrations')).rows.map((r) => [r.name, r.checksum]));
      const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

      const todo = [];
      for (const file of files) {
        const sql = await fs.readFile(path.join(dir, file), 'utf8');
        const sum = sha256(sql);
        if (done.has(file)) {
          if (done.get(file) !== sum) throw new Error(`${file} は、動かした後で書き換えられています`);
        } else {
          todo.push({ file, sql, sum });
        }
      }

      const applied = [];
      for (const { file, sql, sum } of todo) {
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [file, sum]);
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw new Error(`${file} に失敗しました: ${err.message}`, { cause: err });
        }
        applied.push(file);
      }
      return applied;
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}

// 追加: node src/db/migrate.mjs（npm run migrate）で直接動かしたときだけ
if (import.meta.main) {
  const { loadConfig } = await import('../config.mjs');
  const { createPool } = await import('./pool.mjs');
  const config = loadConfig(process.env);
  const pool = createPool({ url: config.databaseUrl, schema: config.databaseSchema, max: 1 });
  try {
    const applied = await migrate(pool);
    console.log(applied.length > 0 ? `動かしました: ${applied.join(', ')}` : 'もう最新です');
  } finally {
    await pool.end();
  }
}
