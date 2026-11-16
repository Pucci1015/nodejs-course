// 第29章 2節で書く、ファイルに保存するデータベースの完成形
// 使い方（~/dev/part06/ch29-sql-basics で）: node samples/file-db.mjs   （何回か動かす）
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('visits.db'); // 今いるフォルダの visits.db（無ければ作る）

db.exec(`
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY,
    at TEXT NOT NULL
  )
`);

db.prepare('INSERT INTO visits (at) VALUES (?)').run(new Date().toISOString());

const { n } = db.prepare('SELECT count(*) AS n FROM visits').get();
console.log(`${n} 回目の実行です`);

db.close();
