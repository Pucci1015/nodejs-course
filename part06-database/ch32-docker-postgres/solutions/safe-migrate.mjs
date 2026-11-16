// 練習問題8 の模範解答
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// アドバイザリロックの番号。同じデータベースを使うほかのプログラムと重ならない数なら、何でもよい
const LOCK_KEY = 32_0008;

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

export async function migrate(pool, dir) {
  // ロックは「接続ごと」に持つので、最初から最後まで、同じ接続を使う
  const client = await pool.connect();
  try {
    // ほかのプロセスが migrate の途中なら、終わるまでここで待つ
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

      // 先に全部を読み、動かした後で書き換えられたファイルが無いかを確かめる（1つでもあれば、何も動かさない）
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
