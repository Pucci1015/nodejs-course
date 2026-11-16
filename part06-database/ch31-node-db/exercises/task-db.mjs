// 第31章のサンプルと練習問題で使う、タスクのテーブルを作る部品
// createTaskDb() で、メモリの中に tasks のテーブルと、5 つのタスクを作って返す
// 列は第5部の成果物のタスク（id・title・status・dueDate・createdAt・updatedAt・completedAt・version）に合わせてある
import { DatabaseSync } from 'node:sqlite';

export const TASKS_SQL = `
  CREATE TABLE tasks (
    id           INTEGER PRIMARY KEY,
    title        TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
    status       TEXT    NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
    due_date     TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL,
    completed_at TEXT,
    version      INTEGER NOT NULL DEFAULT 1
  );
  -- 終わっていないタスクの中では、題名が重ならない（6節）
  CREATE UNIQUE INDEX tasks_open_title ON tasks (title) WHERE status <> 'done';
`;

export const SEED_SQL = `
  INSERT INTO tasks (id, title, status, due_date, created_at, updated_at, completed_at, version) VALUES
    (1, '牛乳を買う',     'done',  '2026-11-01', '2026-11-01T00:00:00.000Z', '2026-11-01T03:00:00.000Z', '2026-11-01T03:00:00.000Z', 2),
    (2, '本を返す',       'todo',  '2026-11-12', '2026-11-02T00:00:00.000Z', '2026-11-02T00:00:00.000Z', NULL, 1),
    (3, '部屋の掃除',     'doing', '2026-11-15', '2026-11-03T00:00:00.000Z', '2026-11-04T00:00:00.000Z', NULL, 2),
    (4, 'Let''s ストレッチ', 'todo', NULL,       '2026-11-05T00:00:00.000Z', '2026-11-05T00:00:00.000Z', NULL, 1),
    (5, '報告書を書く',   'todo',  '2026-11-10', '2026-11-06T00:00:00.000Z', '2026-11-06T00:00:00.000Z', NULL, 1);
`;

export function createTaskDb({ seed = true } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(TASKS_SQL);
  if (seed) db.exec(SEED_SQL);
  return db;
}
