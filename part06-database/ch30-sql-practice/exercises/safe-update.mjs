// 練習問題7: 上書きの事故と、二重に作る事故を防ぐ関数を書いてください。
// 要件は README にあります。
// 確かめ方: node --test safe-update.test.mjs

export const KEYS_SQL = `
  CREATE TABLE idempotency_keys (
    key     TEXT PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE
  )
`;

export function renameTask(db, id, title, expectedVersion) {
  // ここを書く（{ ok: true, task: { id, title, version } } か { ok: false, reason: 'not_found' か 'conflict' }）
}

export function createTaskOnce(db, key, { userId, title, minutes }) {
  // ここを書く（{ id, created: true か false }）
}
