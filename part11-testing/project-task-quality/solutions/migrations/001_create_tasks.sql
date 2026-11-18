-- タスクの表（第5部の成果物のタスクの形を、そのまま列にした）
CREATE TABLE tasks (
  id           integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        text        NOT NULL CONSTRAINT tasks_title_check CHECK (length(title) BETWEEN 1 AND 100),
  status       text        NOT NULL DEFAULT 'todo' CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'doing', 'done')),
  due_date     date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  version      integer     NOT NULL DEFAULT 1
);

-- 終わっていないタスクの題名は重ならない（サービスも確かめるが、同時に2つ来たときは、ここで止める）
CREATE UNIQUE INDEX tasks_open_title ON tasks (title) WHERE status <> 'done';

-- 一覧の並べ方（sort）ごとの索引。最後に id を足して、並べ方を1通りに決める（第30章 6節）
CREATE INDEX tasks_created_at_id ON tasks (created_at, id);
CREATE INDEX tasks_due_date_id ON tasks (due_date, id);
CREATE INDEX tasks_title_id ON tasks (title COLLATE "C", id);
