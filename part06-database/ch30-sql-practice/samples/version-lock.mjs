// 第30章 5節で書く、version で「上書きの事故」を防ぐプログラムの完成形
// 使い方（~/dev/part06/ch30-sql-practice で）: node samples/version-lock.mjs
import { createTasksDb } from './tasks-db.mjs';

const db = createTasksDb();

// 読んだときの version と同じときだけ変え、version を 1 増やす。変えた行を RETURNING で受け取る
const rename = db.prepare(`
  UPDATE tasks SET title = ?, version = version + 1
  WHERE id = ? AND version = ?
  RETURNING id, title, version
`);

const seenByA = db.prepare('SELECT version FROM tasks WHERE id = 2').get().version; // A さんが読む
const seenByB = db.prepare('SELECT version FROM tasks WHERE id = 2').get().version; // B さんも読む

console.log('A:', rename.get('図書館に本を返す', 2, seenByA)); // 先に変える → 変わる
console.log('B:', rename.get('本を2冊返す', 2, seenByB)); // 古い version のまま → 変わらない（undefined）

// 同じキーの2回目を断る: 冪等キーの表に、ON CONFLICT DO NOTHING で入れる
db.exec('CREATE TABLE idempotency_keys (key TEXT PRIMARY KEY, task_id INTEGER NOT NULL)');
const remember = db.prepare('INSERT INTO idempotency_keys (key, task_id) VALUES (?, ?) ON CONFLICT (key) DO NOTHING');
console.log('1回目:', remember.run('key-abc', 2).changes); // 1: 入った
console.log('2回目:', remember.run('key-abc', 3).changes); // 0: もうあったので何もしない

db.close();
