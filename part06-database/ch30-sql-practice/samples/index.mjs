// 第30章 3節で書く、インデックスで探すのを速くするプログラムの完成形
// 使い方（~/dev/part06/ch30-sql-practice で）: node samples/index.mjs
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE events (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, kind TEXT NOT NULL)');

// 20 万行を足す（BEGIN と COMMIT で1つにまとめると速い。4節）
const insert = db.prepare('INSERT INTO events (user_id, kind) VALUES (?, ?)');
db.exec('BEGIN');
for (let i = 0; i < 200_000; i++) insert.run(i % 5000, i % 3 === 0 ? 'login' : 'view');
db.exec('COMMIT');

const sql = 'SELECT count(*) AS n FROM events WHERE user_id = ?';

function measure(label) {
  const stmt = db.prepare(sql);
  const start = performance.now();
  for (let i = 0; i < 200; i++) stmt.get(i);
  const ms = performance.now() - start;
  const plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(1).map((r) => r.detail);
  console.log(`${label}: 200 回で ${ms.toFixed(1)} ms  計画: ${plan.join(' / ')}`);
}

measure('インデックスなし');
db.exec('CREATE INDEX events_user_id ON events (user_id)');
measure('インデックスあり');

db.close();
