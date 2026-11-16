-- 1: タスクのテーブル
CREATE TABLE tasks (
  id         integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title      text        NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  status     text        NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  due_date   date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version    integer     NOT NULL DEFAULT 1
);
