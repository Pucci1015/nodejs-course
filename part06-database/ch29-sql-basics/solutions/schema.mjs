// 練習問題6 の模範解答

export const schema = `
  CREATE TABLE users (
    id    INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE
  );

  CREATE TABLE tasks (
    id      INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title   TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
    status  TEXT    NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done'))
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
`;
