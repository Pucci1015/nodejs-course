// 第30章の練習問題で使う、タスク管理のテーブルを作る部品（samples/tasks-db.mjs と同じもの。書き換えなくてよい）
// createTasksDb() で、メモリの中に users・tasks・tags・task_tags と、少しのデータを作って返す
import { DatabaseSync } from 'node:sqlite';

export const TASKS_SQL = `
  CREATE TABLE users (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE tasks (
    id       INTEGER PRIMARY KEY,
    user_id  INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title    TEXT    NOT NULL,
    status   TEXT    NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
    due_date TEXT,
    minutes  INTEGER NOT NULL CHECK (minutes > 0),
    version  INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE tags (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE task_tags (
    task_id INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
  );

  INSERT INTO users (id, name) VALUES (1, 'alice'), (2, 'bob'), (3, 'carol'), (4, 'dave');
  INSERT INTO tasks (id, user_id, title, status, due_date, minutes) VALUES
    (1, 1, '牛乳を買う',   'done',  '2026-11-01', 10),
    (2, 1, '本を返す',     'todo',  '2026-11-12', 20),
    (3, 1, '部屋の掃除',   'doing', '2026-11-15', 60),
    (4, 2, '報告書を書く', 'doing', '2026-11-10', 120),
    (5, 2, '歯医者の予約', 'todo',  NULL,         5),
    (6, 2, '洗濯',         'done',  '2026-11-02', 30),
    (7, 3, '旅行の計画',   'todo',  '2026-12-01', 90),
    (8, 3, '年賀状',       'todo',  '2026-12-20', 45);
  INSERT INTO tags (id, name) VALUES (1, '買い物'), (2, '家'), (3, '仕事'), (4, '急ぎ');
  INSERT INTO task_tags (task_id, tag_id) VALUES (1, 1), (2, 2), (3, 2), (4, 3), (4, 4), (5, 4), (6, 2), (8, 2);
`;

export function createTasksDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(TASKS_SQL);
  return db;
}
