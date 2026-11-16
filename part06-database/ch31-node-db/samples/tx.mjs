// 第31章 4節で書く、withTransaction を試すプログラムの完成形
// 使い方（~/dev/part06/ch31-node-db で）: node samples/tx.mjs
import { createTaskDb } from './task-db.mjs';
import { withTransaction } from './with-transaction.mjs';

const db = createTaskDb();
const now = '2026-11-11T00:00:00.000Z';
const insert = db.prepare(`INSERT INTO tasks (title, created_at, updated_at) VALUES (?, ?, ?) RETURNING id`);
const count = () => db.prepare('SELECT count(*) AS n FROM tasks').get().n;

const ids = withTransaction(db, () => [insert.get('窓を拭く', now, now).id, insert.get('靴を洗う', now, now).id]);
console.log('足した id:', ids, '件数:', count());

try {
  withTransaction(db, () => {
    insert.get('棚を作る', now, now);
    insert.get('', now, now); // 空の題名は CHECK で断られる
  });
} catch (err) {
  console.log('失敗:', err.message, '件数:', count(), '（棚を作る も取り消された）');
}
console.log('トランザクションは閉じている:', !db.isTransaction);
db.close();
