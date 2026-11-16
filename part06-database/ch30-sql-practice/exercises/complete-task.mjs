// 練習問題5: タスクを終わらせて、記録も残す関数を、トランザクションで書いてください。
// 要件は README にあります。
// 確かめ方: node --test complete-task.test.mjs

export const EVENTS_SQL = `
  CREATE TABLE task_events (
    id      INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    kind    TEXT    NOT NULL,
    at      TEXT    NOT NULL
  )
`;

export function completeTask(db, id, at) {
  // ここを書く
}
